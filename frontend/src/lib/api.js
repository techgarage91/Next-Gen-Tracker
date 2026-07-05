// Supabase-backed data layer for the TechGarage / Repair Tracker frontend.
// Reimplements the REST surface the app used against the old FastAPI backend,
// so every page keeps calling api.get/post/put/delete unchanged.
import { createClient } from "@supabase/supabase-js";
import { BM_DEFAULT, PROBS_DEFAULT, PARTS_DEFAULT, CURRENCIES } from "./seed";

const SUPA_URL = process.env.REACT_APP_SUPABASE_URL || "https://ulcdlgxtoilvkbcmynsg.supabase.co";
const SUPA_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "sb_publishable_R-HOcoFy8IoU8hy6EGrREQ_F5eQf4hs";
export const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const CURRENCY_FALLBACK = { code: "INR", symbol: "₹" };

export function formatMoney(amount, symbol = "₹") {
  const n = Number(amount || 0);
  return symbol + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function apiError(e) {
  if (!e) return "Something went wrong";
  return e.message || String(e);
}

// ---- helpers -------------------------------------------------------------
async function requireUser() {
  const { data } = await supabase.auth.getUser();
  if (!data || !data.user) throw new Error("Not authenticated");
  return data.user;
}

function cleanUser(u, profile) {
  return {
    id: u.id,
    email: u.email,
    owner_name: (profile && profile.owner_name) || u.user_metadata?.owner_name || "",
    role: "owner",
    created_at: u.created_at,
  };
}

const DEFAULT_SHOP = {
  tagline: "Mobile & Tablet Repair",
  address: "",
  phone: "",
  gst: "",
  currency: "INR",
  plan: "free",
  ticket_footer: "Please keep this receipt safe to collect your device.",
  sms_created_tmpl: "Hi {CUSTOMER}, your repair job #{JOB} for {DEVICE} is received. Estimate: {CUR}{ESTIMATE}. - {SHOP}",
  sms_done_tmpl: "Hi {CUSTOMER}, your {DEVICE} (job #{JOB}) is repaired and ready for pickup. Amount: {CUR}{ESTIMATE}. - {SHOP}",
};

async function getProfile(userId) {
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

async function ensureProfile(user, shopName) {
  let p = await getProfile(user.id);
  if (!p) {
    const row = {
      user_id: user.id,
      email: user.email,
      owner_name: user.user_metadata?.owner_name || "",
      shop_name: shopName || user.user_metadata?.shop_name || "My Shop",
      ...DEFAULT_SHOP,
    };
    const { data } = await supabase.from("profiles").upsert(row, { onConflict: "user_id" }).select().maybeSingle();
    p = data || row;
  }
  return p;
}

async function ensureCatalog(userId) {
  let { data } = await supabase.from("rt_catalogs").select("*").eq("user_id", userId).maybeSingle();
  if (!data) {
    const row = { user_id: userId, brand_models: BM_DEFAULT, problems: PROBS_DEFAULT, parts: PARTS_DEFAULT };
    const r = await supabase.from("rt_catalogs").upsert(row, { onConflict: "user_id" }).select().maybeSingle();
    data = r.data || row;
  }
  return { brand_models: data.brand_models || {}, problems: data.problems || [], parts: data.parts || [] };
}

const JOB_COLS = ["job_no","customer_name","contacts","imei","brand","device_model","lock_type","lock_value","sim_storage","problems","parts","photos","estimate","advance","parts_cost","payment_status","payment_method","status","ready_by","assigned_to","notes"];
const PROD_COLS = ["barcode","name","category","stock","cost","price","low_stock_at"];

function pick(body, cols) {
  const o = {};
  cols.forEach((k) => { if (body[k] !== undefined) o[k] = body[k]; });
  return o;
}
function orderErr(r) { if (r && r.error) throw new Error(r.error.message); return r ? r.data : null; }

// ---- endpoint implementations -------------------------------------------
async function authRegister(body) {
  const { data, error } = await supabase.auth.signUp({
    email: (body.email || "").toLowerCase(),
    password: body.password,
    options: { data: { owner_name: body.owner_name || "", shop_name: body.shop_name || "" } },
  });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error("Check your email to confirm your account, then log in. (Or disable email confirmation in Supabase.)");
  const profile = await ensureProfile(data.user, body.shop_name);
  await ensureCatalog(data.user.id);
  return { user: cleanUser(data.user, profile), token: data.session.access_token };
}

async function authLogin(body) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: (body.email || "").toLowerCase(),
    password: body.password,
  });
  if (error) throw new Error("Invalid email or password");
  const profile = await ensureProfile(data.user);
  await ensureCatalog(data.user.id);
  return { user: cleanUser(data.user, profile), token: data.session.access_token };
}

async function authMe() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  return { user: cleanUser(user, profile), shop: profile };
}

async function authChangePassword(body) {
  const user = await requireUser();
  const check = await supabase.auth.signInWithPassword({ email: user.email, password: body.current_password });
  if (check.error) throw new Error("Current password is incorrect");
  const { error } = await supabase.auth.updateUser({ password: body.new_password });
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function getShop() { const user = await requireUser(); return await ensureProfile(user); }
async function putShop(body) {
  const user = await requireUser();
  const upd = {}; Object.keys(body || {}).forEach((k) => { if (body[k] !== undefined && body[k] !== null) upd[k] = body[k]; });
  upd.user_id = user.id;
  const { data, error } = await supabase.from("profiles").upsert(upd, { onConflict: "user_id" }).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function catalogAdd(kind, body) {
  const user = await requireUser();
  const cat = await ensureCatalog(user.id);
  if (kind === "brand") { if (!cat.brand_models[body.value]) cat.brand_models[body.value] = []; }
  else if (kind === "model") { const arr = cat.brand_models[body.brand] || []; if (!arr.includes(body.value)) arr.push(body.value); cat.brand_models[body.brand] = arr; }
  else if (kind === "problem") { if (!cat.problems.includes(body.value)) cat.problems.push(body.value); }
  else if (kind === "part") { if (!cat.parts.includes(body.value)) cat.parts.push(body.value); }
  const { error } = await supabase.from("rt_catalogs").upsert({ user_id: user.id, brand_models: cat.brand_models, problems: cat.problems, parts: cat.parts }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  return cat;
}

async function listJobs(params) {
  const user = await requireUser();
  let query = supabase.from("rt_jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(2000);
  if (params) {
    if (params.status && params.status !== "all") query = query.eq("status", params.status);
    if (params.brand && params.brand !== "all") query = query.eq("brand", params.brand);
    if (params.payment && params.payment !== "all") query = query.eq("payment_status", params.payment);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let rows = data || [];
  if (params && params.q) {
    const q = String(params.q).toLowerCase();
    rows = rows.filter((j) =>
      (j.job_no || "").toLowerCase().includes(q) ||
      (j.customer_name || "").toLowerCase().includes(q) ||
      (j.imei || "").toLowerCase().includes(q) ||
      (j.device_model || "").toLowerCase().includes(q) ||
      (Array.isArray(j.contacts) ? j.contacts.join(",") : "").toLowerCase().includes(q));
  }
  return rows;
}

async function nextNumber() {
  const user = await requireUser();
  const { count } = await supabase.from("rt_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  return { job_no: String((count || 0) + 1) };
}

async function getJob(id) {
  const user = await requireUser();
  const { data, error } = await supabase.from("rt_jobs").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Job not found");
  return data;
}

async function createJob(body) {
  const user = await requireUser();
  const now = new Date().toISOString();
  const row = { ...pick(body, JOB_COLS), user_id: user.id, created_at: now, updated_at: now };
  const { data, error } = await supabase.from("rt_jobs").insert(row).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function updateJob(id, body) {
  const user = await requireUser();
  const row = { ...pick(body, JOB_COLS), updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("rt_jobs").update(row).eq("id", id).eq("user_id", user.id).select().maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Job not found");
  return data;
}

async function deleteJob(id) {
  const user = await requireUser();
  const { error } = await supabase.from("rt_jobs").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function dashboard() {
  const user = await requireUser();
  const { data, error } = await supabase.from("rt_jobs").select("*").eq("user_id", user.id).limit(5000);
  if (error) throw new Error(error.message);
  const jobs = data || [];
  const today = new Date().toISOString().slice(0, 10);
  const num = (v) => Number(v || 0);
  const total = jobs.length;
  const pending = jobs.filter((j) => j.status === "Pending").length;
  const completed = jobs.filter((j) => j.status === "Done").length;
  const unpaid = jobs.filter((j) => j.payment_status === "Unpaid").length;
  const today_revenue = jobs.filter((j) => (j.updated_at || "").slice(0, 10) === today && j.payment_status === "Paid").reduce((a, j) => a + num(j.estimate), 0);
  const total_revenue = jobs.filter((j) => j.payment_status === "Paid").reduce((a, j) => a + num(j.estimate), 0);
  const series = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const revenue = jobs.filter((j) => (j.updated_at || "").slice(0, 10) === d && j.payment_status === "Paid").reduce((a, j) => a + num(j.estimate), 0);
    const cnt = jobs.filter((j) => (j.created_at || "").slice(0, 10) === d).length;
    series.push({ date: d, revenue, jobs: cnt });
  }
  const brands = {};
  jobs.forEach((j) => { const b = j.brand || "Other"; brands[b] = (brands[b] || 0) + 1; });
  const brand_dist = Object.keys(brands).map((k) => ({ name: k, value: brands[k] })).sort((a, b) => b.value - a.value).slice(0, 6);
  const recent = [...jobs].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 6);
  return { total_jobs: total, pending, completed, unpaid, today_revenue, total_revenue, series, brand_dist, recent };
}

async function listProducts() {
  const user = await requireUser();
  const { data, error } = await supabase.from("rt_products").select("*").eq("user_id", user.id).order("name", { ascending: true }).limit(2000);
  if (error) throw new Error(error.message);
  return data || [];
}
async function productStats() {
  const user = await requireUser();
  const { data, error } = await supabase.from("rt_products").select("*").eq("user_id", user.id).limit(5000);
  if (error) throw new Error(error.message);
  const docs = data || [];
  const int = (v) => parseInt(v || 0, 10) || 0;
  return {
    products: docs.length,
    units: docs.reduce((a, d) => a + int(d.stock), 0),
    stock_value: docs.reduce((a, d) => a + Number(d.cost || 0) * int(d.stock), 0),
    low_stock: docs.filter((d) => int(d.stock) <= int(d.low_stock_at || 3)).length,
  };
}
async function createProduct(body) {
  const user = await requireUser();
  const row = { ...pick(body, PROD_COLS), user_id: user.id, created_at: new Date().toISOString() };
  const { data, error } = await supabase.from("rt_products").insert(row).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
async function updateProduct(id, body) {
  const user = await requireUser();
  const { data, error } = await supabase.from("rt_products").update(pick(body, PROD_COLS)).eq("id", id).eq("user_id", user.id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
async function scanProduct(id) {
  const user = await requireUser();
  const cur = await supabase.from("rt_products").select("stock").eq("id", id).eq("user_id", user.id).maybeSingle();
  const stock = (cur.data ? parseInt(cur.data.stock || 0, 10) : 0) + 1;
  const { data, error } = await supabase.from("rt_products").update({ stock }).eq("id", id).eq("user_id", user.id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
async function deleteProduct(id) {
  const user = await requireUser();
  const { error } = await supabase.from("rt_products").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function listSales() {
  const user = await requireUser();
  const { data, error } = await supabase.from("rt_sales").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  return data || [];
}
async function createSale(body) {
  const user = await requireUser();
  const items = body.items || [];
  const total = items.reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const row = { user_id: user.id, items, payment_method: body.payment_method || "Cash", customer_name: body.customer_name || "", total, created_at: new Date().toISOString() };
  const { data, error } = await supabase.from("rt_sales").insert(row).select().maybeSingle();
  if (error) throw new Error(error.message);
  for (const i of items) {
    try {
      const cur = await supabase.from("rt_products").select("stock").eq("id", i.product_id).eq("user_id", user.id).maybeSingle();
      if (cur.data) await supabase.from("rt_products").update({ stock: (parseInt(cur.data.stock || 0, 10) - (parseInt(i.qty, 10) || 0)) }).eq("id", i.product_id).eq("user_id", user.id);
    } catch (e) { /* ignore stock update errors */ }
  }
  return data;
}

async function sendSms(body) {
  const user = await requireUser();
  const job = await getJob(body.job_id);
  const shop = await ensureProfile(user);
  const contacts = job.contacts || [];
  if (!contacts.length) throw new Error("No customer contact number on this job");
  const cur = (CURRENCIES.find((c) => c.code === (shop.currency || "INR")) || {}).symbol || "";
  const tmpl = body.kind === "done" ? shop.sms_done_tmpl : shop.sms_created_tmpl;
  const msg = (tmpl || "")
    .replace("{CUSTOMER}", job.customer_name || "Customer")
    .replace("{JOB}", job.job_no || "")
    .replace("{DEVICE}", `${job.brand || ""} ${job.device_model || ""}`.trim())
    .replace("{ESTIMATE}", String(job.estimate || 0))
    .replace("{CUR}", cur)
    .replace("{SHOP}", shop.shop_name || "TechGarage");
  let to = contacts[0];
  if (!to.startsWith("+")) to = "+91" + to.replace(/^0+/, "");
  return { ok: true, sent: false, simulated: true, to, message: msg };
}

// ---- router --------------------------------------------------------------
function match(path, pattern) {
  const pp = pattern.split("/"), sp = path.split("?")[0].split("/");
  if (pp.length !== sp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) params[pp[i].slice(1)] = decodeURIComponent(sp[i]);
    else if (pp[i] !== sp[i]) return null;
  }
  return params;
}

async function GET(path, opts) {
  const p = (opts && opts.params) || {};
  let m;
  if (path === "/auth/me") return { data: await authMe() };
  if (path === "/shop") return { data: await getShop() };
  if (path === "/currencies") return { data: CURRENCIES };
  if (path === "/catalog") { const u = await requireUser(); return { data: await ensureCatalog(u.id) }; }
  if (path === "/jobs/next-number") return { data: await nextNumber() };
  if (path === "/jobs" || path.startsWith("/jobs?")) return { data: await listJobs(p) };
  if ((m = match(path, "/jobs/:id"))) return { data: await getJob(m.id) };
  if (path === "/dashboard") return { data: await dashboard() };
  if (path === "/products") return { data: await listProducts() };
  if (path === "/products/stats") return { data: await productStats() };
  if (path === "/sales") return { data: await listSales() };
  throw new Error("Unknown GET " + path);
}

async function POST(path, body) {
  let m;
  if (path === "/auth/register") return { data: await authRegister(body) };
  if (path === "/auth/login") return { data: await authLogin(body) };
  if (path === "/auth/logout") { await supabase.auth.signOut(); return { data: { ok: true } }; }
  if (path === "/auth/change-password") return { data: await authChangePassword(body) };
  if (path === "/catalog/brand") return { data: await catalogAdd("brand", body) };
  if (path === "/catalog/model") return { data: await catalogAdd("model", body) };
  if (path === "/catalog/problem") return { data: await catalogAdd("problem", body) };
  if (path === "/catalog/part") return { data: await catalogAdd("part", body) };
  if (path === "/jobs") return { data: await createJob(body) };
  if ((m = match(path, "/products/:id/scan"))) return { data: await scanProduct(m.id) };
  if (path === "/products") return { data: await createProduct(body) };
  if (path === "/sales") return { data: await createSale(body) };
  if (path === "/sms/send") return { data: await sendSms(body) };
  throw new Error("Unknown POST " + path);
}

async function PUT(path, body) {
  let m;
  if (path === "/shop") return { data: await putShop(body) };
  if ((m = match(path, "/jobs/:id"))) return { data: await updateJob(m.id, body) };
  if ((m = match(path, "/products/:id"))) return { data: await updateProduct(m.id, body) };
  throw new Error("Unknown PUT " + path);
}

async function DELETE(path) {
  let m;
  if ((m = match(path, "/jobs/:id"))) return { data: await deleteJob(m.id) };
  if ((m = match(path, "/products/:id"))) return { data: await deleteProduct(m.id) };
  throw new Error("Unknown DELETE " + path);
}

export const api = {
  get: (path, opts) => GET(path, opts),
  post: (path, body) => POST(path, body),
  put: (path, body) => PUT(path, body),
  delete: (path) => DELETE(path),
};

export const API = "supabase";
