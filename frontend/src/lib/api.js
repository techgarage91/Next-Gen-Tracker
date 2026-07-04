import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tg_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const CURRENCY_FALLBACK = { code: "INR", symbol: "\u20b9" };

export function formatMoney(amount, symbol = "\u20b9") {
  const n = Number(amount || 0);
  return symbol + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function apiError(e) {
  const d = e?.response?.data?.detail;
  if (!d) return e.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join(" ");
  return String(d);
}
