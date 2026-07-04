from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict
from bson import ObjectId

from catalog_seed import BM_DEFAULT, PROBS_DEFAULT, PARTS_DEFAULT, CURRENCIES

# ------------------------------------------------------------------ DB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ------------------------------------------------------------------ App
app = FastAPI(title="TechGarage API")
api = APIRouter(prefix="/api")

JWT_ALGO = "HS256"
def jwt_secret(): return os.environ["JWT_SECRET"]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("techgarage")

# ------------------------------------------------------------------ Helpers
PyObjectId = Annotated[str, BeforeValidator(str)]

def now_iso(): return datetime.now(timezone.utc).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(uid: str, email: str) -> str:
    payload = {"sub": uid, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALGO)

def clean(doc: dict) -> dict:
    if not doc: return doc
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "): token = h[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGO])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user: raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

def shop_id_of(user: dict) -> str:
    return str(user["_id"])

# ------------------------------------------------------------------ Models
class RegisterIn(BaseModel):
    shop_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    owner_name: Optional[str] = ""

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ChangePwIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)

class ShopSettings(BaseModel):
    shop_name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    gst: Optional[str] = None
    currency: Optional[str] = None
    ticket_footer: Optional[str] = None
    sms_created_tmpl: Optional[str] = None
    sms_done_tmpl: Optional[str] = None

class JobIn(BaseModel):
    model_config = ConfigDict(extra="allow")
    job_no: str
    customer_name: str = ""
    contacts: List[str] = []
    imei: str = ""
    brand: str = ""
    device_model: str = ""
    lock_type: str = "Nil"
    lock_value: str = ""
    sim_storage: List[str] = []
    problems: List[str] = []
    parts: List[str] = []
    photos: List[str] = []
    estimate: float = 0
    advance: float = 0
    parts_cost: float = 0
    payment_status: str = "Unpaid"
    payment_method: str = ""
    status: str = "Pending"
    ready_by: str = ""
    assigned_to: str = ""
    notes: str = ""

class ProductIn(BaseModel):
    barcode: str = ""
    name: str
    category: str = ""
    stock: int = 0
    cost: float = 0
    price: float = 0
    low_stock_at: int = 3

class SaleItem(BaseModel):
    product_id: str
    name: str
    qty: int
    price: float

class SaleIn(BaseModel):
    items: List[SaleItem]
    payment_method: str = "Cash"
    customer_name: str = ""

class CatalogItem(BaseModel):
    value: str
    brand: Optional[str] = None

# ------------------------------------------------------------------ Auth routes
def set_cookie(resp: Response, token: str):
    resp.set_cookie("access_token", token, httponly=True, secure=True,
                    samesite="none", max_age=604800, path="/")

@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    doc = {
        "email": email, "password_hash": hash_password(body.password),
        "owner_name": body.owner_name or "", "role": "owner",
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    await db.shops.insert_one({
        "shop_id": uid, "shop_name": body.shop_name, "tagline": "Mobile & Tablet Repair",
        "address": "", "phone": "", "gst": "", "currency": "INR",
        "plan": "free",
        "ticket_footer": "Please keep this receipt safe to collect your device.",
        "sms_created_tmpl": "Hi {CUSTOMER}, your repair job #{JOB} for {DEVICE} is received. Estimate: {CUR}{ESTIMATE}. - {SHOP}",
        "sms_done_tmpl": "Hi {CUSTOMER}, your {DEVICE} (job #{JOB}) is repaired and ready for pickup. Amount: {CUR}{ESTIMATE}. - {SHOP}",
        "created_at": now_iso(),
    })
    await db.catalogs.insert_one({
        "shop_id": uid, "brand_models": BM_DEFAULT,
        "problems": PROBS_DEFAULT, "parts": PARTS_DEFAULT,
    })
    token = create_access_token(uid, email)
    set_cookie(response, token)
    user = await db.users.find_one({"_id": res.inserted_id})
    return {"user": clean(user), "token": token}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(str(user["_id"]), email)
    set_cookie(response, token)
    return {"user": clean(user), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    shop = await db.shops.find_one({"shop_id": shop_id_of(user)}, {"_id": 0})
    return {"user": clean(user), "shop": shop}

@api.post("/auth/change-password")
async def change_password(body: ChangePwIn, user: dict = Depends(get_current_user)):
    if not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(400, "Current password is incorrect")
    await db.users.update_one({"_id": user["_id"]},
                              {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"ok": True}

# ------------------------------------------------------------------ Shop / settings
@api.get("/shop")
async def get_shop(user: dict = Depends(get_current_user)):
    shop = await db.shops.find_one({"shop_id": shop_id_of(user)}, {"_id": 0})
    return shop

@api.put("/shop")
async def update_shop(body: ShopSettings, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.shops.update_one({"shop_id": shop_id_of(user)}, {"$set": upd})
    return await db.shops.find_one({"shop_id": shop_id_of(user)}, {"_id": 0})

@api.get("/currencies")
async def currencies():
    return CURRENCIES

# ------------------------------------------------------------------ Catalog
@api.get("/catalog")
async def get_catalog(user: dict = Depends(get_current_user)):
    c = await db.catalogs.find_one({"shop_id": shop_id_of(user)}, {"_id": 0})
    return c or {"brand_models": {}, "problems": [], "parts": []}

@api.post("/catalog/brand")
async def add_brand(body: CatalogItem, user: dict = Depends(get_current_user)):
    sid = shop_id_of(user)
    await db.catalogs.update_one({"shop_id": sid},
        {"$set": {f"brand_models.{body.value}": []}})
    return await db.catalogs.find_one({"shop_id": sid}, {"_id": 0})

@api.post("/catalog/model")
async def add_model(body: CatalogItem, user: dict = Depends(get_current_user)):
    sid = shop_id_of(user)
    await db.catalogs.update_one({"shop_id": sid},
        {"$addToSet": {f"brand_models.{body.brand}": body.value}})
    return await db.catalogs.find_one({"shop_id": sid}, {"_id": 0})

@api.post("/catalog/problem")
async def add_problem(body: CatalogItem, user: dict = Depends(get_current_user)):
    sid = shop_id_of(user)
    await db.catalogs.update_one({"shop_id": sid}, {"$addToSet": {"problems": body.value}})
    return await db.catalogs.find_one({"shop_id": sid}, {"_id": 0})

@api.post("/catalog/part")
async def add_part(body: CatalogItem, user: dict = Depends(get_current_user)):
    sid = shop_id_of(user)
    await db.catalogs.update_one({"shop_id": sid}, {"$addToSet": {"parts": body.value}})
    return await db.catalogs.find_one({"shop_id": sid}, {"_id": 0})

# ------------------------------------------------------------------ Jobs
@api.get("/jobs")
async def list_jobs(user: dict = Depends(get_current_user),
                    status: Optional[str] = None, brand: Optional[str] = None,
                    payment: Optional[str] = None, q: Optional[str] = None):
    query = {"shop_id": shop_id_of(user)}
    if status and status != "all": query["status"] = status
    if brand and brand != "all": query["brand"] = brand
    if payment and payment != "all": query["payment_status"] = payment
    if q:
        query["$or"] = [
            {"job_no": {"$regex": q, "$options": "i"}},
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"imei": {"$regex": q, "$options": "i"}},
            {"device_model": {"$regex": q, "$options": "i"}},
            {"contacts": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.jobs.find(query).sort("created_at", -1).to_list(2000)
    return [clean(d) for d in docs]

@api.get("/jobs/next-number")
async def next_number(user: dict = Depends(get_current_user)):
    count = await db.jobs.count_documents({"shop_id": shop_id_of(user)})
    return {"job_no": str(count + 1)}

@api.get("/jobs/{job_id}")
async def get_job(job_id: str, user: dict = Depends(get_current_user)):
    d = await db.jobs.find_one({"_id": ObjectId(job_id), "shop_id": shop_id_of(user)})
    if not d: raise HTTPException(404, "Job not found")
    return clean(d)

@api.post("/jobs")
async def create_job(body: JobIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["shop_id"] = shop_id_of(user)
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    res = await db.jobs.insert_one(doc)
    d = await db.jobs.find_one({"_id": res.inserted_id})
    return clean(d)

@api.put("/jobs/{job_id}")
async def update_job(job_id: str, body: JobIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["updated_at"] = now_iso()
    r = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "shop_id": shop_id_of(user)}, {"$set": doc})
    if r.matched_count == 0: raise HTTPException(404, "Job not found")
    d = await db.jobs.find_one({"_id": ObjectId(job_id)})
    return clean(d)

@api.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    await db.jobs.delete_one({"_id": ObjectId(job_id), "shop_id": shop_id_of(user)})
    return {"ok": True}

# ------------------------------------------------------------------ Dashboard
@api.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    sid = shop_id_of(user)
    jobs = await db.jobs.find({"shop_id": sid}).to_list(5000)
    today = datetime.now(timezone.utc).date().isoformat()
    total = len(jobs)
    pending = sum(1 for j in jobs if j.get("status") == "Pending")
    completed = sum(1 for j in jobs if j.get("status") == "Done")
    unpaid = sum(1 for j in jobs if j.get("payment_status") == "Unpaid")
    today_rev = sum(float(j.get("estimate") or 0) for j in jobs
                    if (j.get("updated_at") or "")[:10] == today and j.get("payment_status") == "Paid")
    total_rev = sum(float(j.get("estimate") or 0) for j in jobs if j.get("payment_status") == "Paid")
    # last 7 days revenue
    series = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).date().isoformat()
        rev = sum(float(j.get("estimate") or 0) for j in jobs
                  if (j.get("updated_at") or "")[:10] == d and j.get("payment_status") == "Paid")
        cnt = sum(1 for j in jobs if (j.get("created_at") or "")[:10] == d)
        series.append({"date": d, "revenue": rev, "jobs": cnt})
    # brand distribution
    brands = {}
    for j in jobs:
        b = j.get("brand") or "Other"
        brands[b] = brands.get(b, 0) + 1
    brand_dist = sorted([{"name": k, "value": v} for k, v in brands.items()],
                        key=lambda x: -x["value"])[:6]
    recent = [clean(j) for j in sorted(jobs, key=lambda x: x.get("created_at", ""), reverse=True)[:6]]
    return {
        "total_jobs": total, "pending": pending, "completed": completed,
        "unpaid": unpaid, "today_revenue": today_rev, "total_revenue": total_rev,
        "series": series, "brand_dist": brand_dist, "recent": recent,
    }

# ------------------------------------------------------------------ Inventory
@api.get("/products")
async def list_products(user: dict = Depends(get_current_user)):
    docs = await db.products.find({"shop_id": shop_id_of(user)}).sort("name", 1).to_list(2000)
    return [clean(d) for d in docs]

@api.get("/products/stats")
async def product_stats(user: dict = Depends(get_current_user)):
    docs = await db.products.find({"shop_id": shop_id_of(user)}).to_list(5000)
    return {
        "products": len(docs),
        "units": sum(int(d.get("stock") or 0) for d in docs),
        "stock_value": sum(float(d.get("cost") or 0) * int(d.get("stock") or 0) for d in docs),
        "low_stock": sum(1 for d in docs if int(d.get("stock") or 0) <= int(d.get("low_stock_at") or 3)),
    }

@api.post("/products")
async def create_product(body: ProductIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["shop_id"] = shop_id_of(user)
    doc["created_at"] = now_iso()
    res = await db.products.insert_one(doc)
    return clean(await db.products.find_one({"_id": res.inserted_id}))

@api.put("/products/{pid}")
async def update_product(pid: str, body: ProductIn, user: dict = Depends(get_current_user)):
    await db.products.update_one(
        {"_id": ObjectId(pid), "shop_id": shop_id_of(user)}, {"$set": body.model_dump()})
    return clean(await db.products.find_one({"_id": ObjectId(pid)}))

@api.post("/products/{pid}/scan")
async def scan_product(pid: str, user: dict = Depends(get_current_user)):
    await db.products.update_one(
        {"_id": ObjectId(pid), "shop_id": shop_id_of(user)}, {"$inc": {"stock": 1}})
    return clean(await db.products.find_one({"_id": ObjectId(pid)}))

@api.delete("/products/{pid}")
async def delete_product(pid: str, user: dict = Depends(get_current_user)):
    await db.products.delete_one({"_id": ObjectId(pid), "shop_id": shop_id_of(user)})
    return {"ok": True}

# ------------------------------------------------------------------ Sales
@api.get("/sales")
async def list_sales(user: dict = Depends(get_current_user)):
    docs = await db.sales.find({"shop_id": shop_id_of(user)}).sort("created_at", -1).to_list(1000)
    return [clean(d) for d in docs]

@api.post("/sales")
async def create_sale(body: SaleIn, user: dict = Depends(get_current_user)):
    sid = shop_id_of(user)
    total = sum(i.qty * i.price for i in body.items)
    doc = {"shop_id": sid, "items": [i.model_dump() for i in body.items],
           "payment_method": body.payment_method, "customer_name": body.customer_name,
           "total": total, "created_at": now_iso()}
    res = await db.sales.insert_one(doc)
    for i in body.items:
        try:
            await db.products.update_one(
                {"_id": ObjectId(i.product_id), "shop_id": sid}, {"$inc": {"stock": -i.qty}})
        except Exception:
            pass
    return clean(await db.sales.find_one({"_id": res.inserted_id}))

# ------------------------------------------------------------------ SMS
class SmsIn(BaseModel):
    job_id: str
    kind: str = "done"  # created | done

@api.post("/sms/send")
async def send_sms(body: SmsIn, user: dict = Depends(get_current_user)):
    sid = shop_id_of(user)
    job = await db.jobs.find_one({"_id": ObjectId(body.job_id), "shop_id": sid})
    if not job: raise HTTPException(404, "Job not found")
    shop = await db.shops.find_one({"shop_id": sid})
    contacts = job.get("contacts") or []
    if not contacts: raise HTTPException(400, "No customer contact number on this job")
    cur = next((c["symbol"] for c in CURRENCIES if c["code"] == shop.get("currency", "INR")), "")
    tmpl = shop.get("sms_done_tmpl") if body.kind == "done" else shop.get("sms_created_tmpl")
    msg = (tmpl or "")\
        .replace("{CUSTOMER}", job.get("customer_name") or "Customer")\
        .replace("{JOB}", job.get("job_no", ""))\
        .replace("{DEVICE}", f"{job.get('brand','')} {job.get('device_model','')}".strip())\
        .replace("{ESTIMATE}", str(job.get("estimate") or 0))\
        .replace("{CUR}", cur)\
        .replace("{SHOP}", shop.get("shop_name", "TechGarage"))
    to = contacts[0]
    if not to.startswith("+"):
        to = "+91" + to.lstrip("0")
    sid_tw = os.environ.get("TWILIO_ACCOUNT_SID")
    tok_tw = os.environ.get("TWILIO_AUTH_TOKEN")
    frm = os.environ.get("TWILIO_PHONE_NUMBER")
    if sid_tw and tok_tw and frm:
        try:
            from twilio.rest import Client
            tw = Client(sid_tw, tok_tw)
            tw.messages.create(body=msg, from_=frm, to=to)
            return {"ok": True, "sent": True, "to": to, "message": msg}
        except Exception as e:
            logger.error(f"Twilio error: {e}")
            raise HTTPException(400, f"SMS failed: {e}")
    logger.info(f"[SMS SIMULATED] to={to} msg={msg}")
    return {"ok": True, "sent": False, "simulated": True, "to": to, "message": msg}

# ------------------------------------------------------------------ Startup
async def _seed_demo_data(uid: str):
    import random
    brands = [("Apple", "iPhone 14 Pro"), ("Samsung", "Galaxy S24 Ultra"), ("OnePlus", "12R"),
              ("Xiaomi", "14 Pro"), ("Realme", "13 Pro"), ("Vivo", "V40 Pro"),
              ("Oppo", "Reno 12 Pro"), ("Google", "Pixel 8 Pro"), ("Redmi", "Note 14 Pro")]
    names = ["Rahul Sharma", "Priya Nair", "Arjun Mehta", "Sneha Patel", "Vikram Singh",
             "Ananya Rao", "Karthik Iyer", "Divya Menon", "Rohan Gupta", "Meera Joshi"]
    probs = [["Screen Cracked / Broken"], ["Battery Draining Fast"], ["Charging Port Damaged"],
             ["Back Glass Broken"], ["Water / Liquid Damage"], ["Phone Not Turning On"]]
    parts = [["Display / Screen Replacement"], ["Battery Replacement"], ["Charging Port Repair / Replacement"],
             ["Back Glass Replacement"], ["Motherboard Repair"], ["Display / Screen Replacement"]]
    docs = []
    for i in range(65):
        b, m = random.choice(brands)
        st = random.choices(["Done", "Pending", "Returned"], [0.72, 0.18, 0.10])[0]
        pay = "Paid" if st == "Done" and random.random() > 0.15 else ("Unpaid" if random.random() > 0.6 else "Paid")
        days_ago = random.randint(0, 20)
        ts = (datetime.now(timezone.utc) - timedelta(days=days_ago, hours=random.randint(0, 10))).isoformat()
        est = random.choice([1200, 1800, 2500, 3200, 4500, 5500, 7800, 9500, 13400])
        idx = random.randint(0, 5)
        docs.append({
            "shop_id": uid, "job_no": str(i + 1), "customer_name": random.choice(names),
            "contacts": ["+9198" + str(random.randint(10000000, 99999999))],
            "imei": str(random.randint(10**14, 10**15 - 1)), "brand": b, "device_model": m,
            "lock_type": random.choice(["Nil", "PIN", "Pattern"]), "lock_value": "",
            "sim_storage": ["SIM 1"], "problems": probs[idx], "parts": parts[idx], "photos": [],
            "estimate": est, "advance": 0, "parts_cost": round(est * 0.5),
            "payment_status": pay, "payment_method": random.choice(["Cash", "UPI", "Card"]),
            "status": st, "ready_by": "", "assigned_to": random.choice(["Amit", "Suresh", "Self"]),
            "notes": "", "created_at": ts, "updated_at": ts,
        })
    if docs: await db.jobs.insert_many(docs)
    prods = [
        {"name": "iPhone 14 Pro OLED Display", "category": "Display", "barcode": "890100001", "stock": 8, "cost": 4500, "price": 6500, "low_stock_at": 3},
        {"name": "Samsung S24 Battery", "category": "Battery", "barcode": "890100002", "stock": 2, "cost": 900, "price": 1600, "low_stock_at": 3},
        {"name": "Type-C Charging Port Flex", "category": "Parts", "barcode": "890100003", "stock": 25, "cost": 120, "price": 350, "low_stock_at": 5},
        {"name": "OnePlus 12R Back Glass", "category": "Body", "barcode": "890100004", "stock": 1, "cost": 400, "price": 900, "low_stock_at": 3},
        {"name": "Tempered Glass (Universal)", "category": "Accessories", "barcode": "890100005", "stock": 140, "cost": 15, "price": 99, "low_stock_at": 20},
        {"name": "20W Fast Charger", "category": "Accessories", "barcode": "890100006", "stock": 12, "cost": 180, "price": 499, "low_stock_at": 5},
    ]
    for p in prods:
        p["shop_id"] = uid; p["created_at"] = now_iso()
    await db.products.insert_many(prods)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.jobs.create_index("shop_id")
    await db.products.create_index("shop_id")
    # seed demo account
    email = os.environ.get("ADMIN_EMAIL", "demo@techgarage.app")
    pw = os.environ.get("ADMIN_PASSWORD", "Demo@1234")
    existing = await db.users.find_one({"email": email})
    if not existing:
        res = await db.users.insert_one({
            "email": email, "password_hash": hash_password(pw),
            "owner_name": "Demo Owner", "role": "owner", "created_at": now_iso()})
        uid = str(res.inserted_id)
        await db.shops.insert_one({
            "shop_id": uid, "shop_name": "Tech Garage", "tagline": "Mobile & Tablet Repair",
            "address": "12 Market Road, Bengaluru", "phone": "+919000000000", "gst": "",
            "currency": "INR", "plan": "pro",
            "ticket_footer": "Please keep this receipt safe to collect your device.",
            "sms_created_tmpl": "Hi {CUSTOMER}, your repair job #{JOB} for {DEVICE} is received. Estimate: {CUR}{ESTIMATE}. - {SHOP}",
            "sms_done_tmpl": "Hi {CUSTOMER}, your {DEVICE} (job #{JOB}) is repaired and ready for pickup. Amount: {CUR}{ESTIMATE}. - {SHOP}",
            "created_at": now_iso()})
        await db.catalogs.insert_one({"shop_id": uid, "brand_models": BM_DEFAULT,
                                      "problems": PROBS_DEFAULT, "parts": PARTS_DEFAULT})
        await _seed_demo_data(uid)
    elif not verify_password(pw, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw)}})

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
   allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
