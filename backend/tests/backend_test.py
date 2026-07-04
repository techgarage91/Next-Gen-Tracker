"""
TechGarage backend regression tests.
Covers: auth, shop settings, catalog, jobs, products, sales, sms, dashboard, multi-tenant isolation.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://next-gen-app-38.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@techgarage.app"
DEMO_PW = "Demo@1234"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def demo_token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PW}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


@pytest.fixture(scope="session")
def fresh_account():
    """Create a brand new tenant for isolation tests."""
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    pw = "Passw0rd!"
    r = requests.post(f"{API}/auth/register", json={
        "shop_name": "TEST Shop", "email": email, "password": pw, "owner_name": "TEST Owner"
    }, timeout=30)
    assert r.status_code == 200, r.text
    return {"email": email, "password": pw, "token": r.json()["token"],
            "headers": {"Authorization": f"Bearer {r.json()['token']}"}}


# ---------- Auth ----------
class TestAuth:
    def test_login_demo(self, demo_token):
        assert isinstance(demo_token, str) and len(demo_token) > 20

    def test_me(self, demo_headers):
        r = requests.get(f"{API}/auth/me", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == DEMO_EMAIL
        assert d["shop"]["shop_name"] == "Tech Garage"

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_register_duplicate_email(self):
        r = requests.post(f"{API}/auth/register", json={
            "shop_name": "Dup", "email": DEMO_EMAIL, "password": "whatever123"
        }, timeout=15)
        assert r.status_code == 400

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_change_password_requires_current(self, fresh_account):
        r = requests.post(f"{API}/auth/change-password",
                          json={"current_password": "wrong", "new_password": "NewPass1!"},
                          headers=fresh_account["headers"], timeout=15)
        assert r.status_code == 400

    def test_change_password_success(self, fresh_account):
        new_pw = "NewPass1!"
        r = requests.post(f"{API}/auth/change-password",
                          json={"current_password": fresh_account["password"], "new_password": new_pw},
                          headers=fresh_account["headers"], timeout=15)
        assert r.status_code == 200
        # login with new password
        r2 = requests.post(f"{API}/auth/login", json={"email": fresh_account["email"], "password": new_pw}, timeout=15)
        assert r2.status_code == 200
        fresh_account["password"] = new_pw
        fresh_account["token"] = r2.json()["token"]
        fresh_account["headers"] = {"Authorization": f"Bearer {fresh_account['token']}"}


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_demo(self, demo_headers):
        r = requests.get(f"{API}/dashboard", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["total_jobs"] >= 60
        assert isinstance(d["series"], list) and len(d["series"]) == 7
        assert isinstance(d["brand_dist"], list)
        assert isinstance(d["recent"], list)


# ---------- Multi-tenant isolation ----------
class TestMultiTenant:
    def test_new_shop_zero_jobs(self, fresh_account):
        r = requests.get(f"{API}/jobs", headers=fresh_account["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json() == []

    def test_new_shop_dashboard_zero(self, fresh_account):
        r = requests.get(f"{API}/dashboard", headers=fresh_account["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["total_jobs"] == 0


# ---------- Jobs ----------
class TestJobs:
    def test_list_jobs(self, demo_headers):
        r = requests.get(f"{API}/jobs", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        jobs = r.json()
        assert len(jobs) >= 60
        assert all("id" in j and "_id" not in j for j in jobs)

    def test_filter_status(self, demo_headers):
        r = requests.get(f"{API}/jobs?status=Pending", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        assert all(j["status"] == "Pending" for j in r.json())

    def test_filter_brand(self, demo_headers):
        r = requests.get(f"{API}/jobs?brand=Apple", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        assert all(j["brand"] == "Apple" for j in r.json())

    def test_filter_payment(self, demo_headers):
        r = requests.get(f"{API}/jobs?payment=Paid", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        assert all(j["payment_status"] == "Paid" for j in r.json())

    def test_search_q(self, demo_headers):
        r = requests.get(f"{API}/jobs?q=iPhone", headers=demo_headers, timeout=15)
        assert r.status_code == 200

    def test_next_number(self, demo_headers):
        r = requests.get(f"{API}/jobs/next-number", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        assert "job_no" in r.json()

    def test_create_update_delete(self, demo_headers):
        nn = requests.get(f"{API}/jobs/next-number", headers=demo_headers, timeout=15).json()["job_no"]
        payload = {"job_no": f"TEST-{nn}", "customer_name": "TEST_Cust",
                   "contacts": ["+919000000000"], "brand": "Apple", "device_model": "iPhone 14 Pro",
                   "problems": ["Screen Cracked / Broken"], "estimate": 3500}
        r = requests.post(f"{API}/jobs", json=payload, headers=demo_headers, timeout=15)
        assert r.status_code == 200, r.text
        jid = r.json()["id"]
        # GET
        g = requests.get(f"{API}/jobs/{jid}", headers=demo_headers, timeout=15)
        assert g.status_code == 200 and g.json()["customer_name"] == "TEST_Cust"
        # PUT
        payload["customer_name"] = "TEST_Updated"
        u = requests.put(f"{API}/jobs/{jid}", json=payload, headers=demo_headers, timeout=15)
        assert u.status_code == 200 and u.json()["customer_name"] == "TEST_Updated"
        # DELETE
        d = requests.delete(f"{API}/jobs/{jid}", headers=demo_headers, timeout=15)
        assert d.status_code == 200
        g2 = requests.get(f"{API}/jobs/{jid}", headers=demo_headers, timeout=15)
        assert g2.status_code == 404


# ---------- Catalog ----------
class TestCatalog:
    def test_get_catalog(self, demo_headers):
        r = requests.get(f"{API}/catalog", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        c = r.json()
        assert "brand_models" in c and "problems" in c and "parts" in c

    def test_add_brand_model_problem_part(self, fresh_account):
        h = fresh_account["headers"]
        assert requests.post(f"{API}/catalog/brand", json={"value": "TESTBrand"}, headers=h).status_code == 200
        assert requests.post(f"{API}/catalog/model", json={"value": "TESTModel", "brand": "TESTBrand"}, headers=h).status_code == 200
        assert requests.post(f"{API}/catalog/problem", json={"value": "TESTProblem"}, headers=h).status_code == 200
        assert requests.post(f"{API}/catalog/part", json={"value": "TESTPart"}, headers=h).status_code == 200
        c = requests.get(f"{API}/catalog", headers=h).json()
        assert "TESTBrand" in c["brand_models"]
        assert "TESTModel" in c["brand_models"]["TESTBrand"]
        assert "TESTProblem" in c["problems"]
        assert "TESTPart" in c["parts"]


# ---------- Products / Sales ----------
class TestProducts:
    def test_list_and_stats(self, demo_headers):
        r = requests.get(f"{API}/products", headers=demo_headers, timeout=15)
        assert r.status_code == 200 and len(r.json()) >= 6
        s = requests.get(f"{API}/products/stats", headers=demo_headers, timeout=15)
        assert s.status_code == 200
        assert {"products", "units", "stock_value", "low_stock"} <= set(s.json().keys())

    def test_create_scan_update_delete(self, demo_headers):
        payload = {"name": "TEST_Widget", "category": "Parts", "barcode": "TESTBC01",
                   "stock": 5, "cost": 10, "price": 25, "low_stock_at": 2}
        c = requests.post(f"{API}/products", json=payload, headers=demo_headers, timeout=15)
        assert c.status_code == 200
        pid = c.json()["id"]
        # scan
        s = requests.post(f"{API}/products/{pid}/scan", headers=demo_headers, timeout=15)
        assert s.status_code == 200 and s.json()["stock"] == 6
        # update
        payload["price"] = 30
        u = requests.put(f"{API}/products/{pid}", json=payload, headers=demo_headers, timeout=15)
        assert u.status_code == 200 and u.json()["price"] == 30
        # delete
        d = requests.delete(f"{API}/products/{pid}", headers=demo_headers, timeout=15)
        assert d.status_code == 200

    def test_sale_deducts_stock(self, demo_headers):
        # create a product with 10 stock
        p = requests.post(f"{API}/products", json={
            "name": "TEST_SaleItem", "category": "Accessories", "stock": 10, "cost": 5, "price": 15
        }, headers=demo_headers, timeout=15).json()
        pid = p["id"]
        # sell 3
        sale = requests.post(f"{API}/sales", json={
            "items": [{"product_id": pid, "name": p["name"], "qty": 3, "price": 15}],
            "payment_method": "Cash", "customer_name": "TEST_Buyer"
        }, headers=demo_headers, timeout=15)
        assert sale.status_code == 200
        # verify stock
        prods = requests.get(f"{API}/products", headers=demo_headers).json()
        after = next(x for x in prods if x["id"] == pid)
        assert after["stock"] == 7
        # cleanup
        requests.delete(f"{API}/products/{pid}", headers=demo_headers, timeout=15)


# ---------- Shop settings / Currency ----------
class TestShop:
    def test_currencies_list(self):
        r = requests.get(f"{API}/currencies", timeout=15)
        assert r.status_code == 200
        codes = [c["code"] for c in r.json()]
        assert "USD" in codes and "INR" in codes

    def test_update_shop(self, fresh_account):
        h = fresh_account["headers"]
        r = requests.put(f"{API}/shop", json={"currency": "USD", "phone": "+15555550100"},
                        headers=h, timeout=15)
        assert r.status_code == 200
        assert r.json()["currency"] == "USD"
        assert r.json()["phone"] == "+15555550100"


# ---------- SMS ----------
class TestSMS:
    def test_sms_simulated(self, demo_headers):
        jobs = requests.get(f"{API}/jobs", headers=demo_headers, timeout=15).json()
        jid = jobs[0]["id"]
        r = requests.post(f"{API}/sms/send", json={"job_id": jid, "kind": "done"},
                          headers=demo_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("simulated") is True
        assert "message" in d
