import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setShop(data.shop);
    } catch {
      setUser(null);
      setShop(null);
      localStorage.removeItem("tg_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("tg_token")) refresh();
    else setLoading(false);
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("tg_token", data.token);
    await refresh();
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("tg_token", data.token);
    await refresh();
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("tg_token");
    setUser(null);
    setShop(null);
  };

  const currencySymbol = shop?.currency ? symbolFor(shop.currency) : "\u20b9";

  return (
    <AuthCtx.Provider value={{ user, shop, setShop, loading, login, register, logout, refresh, currencySymbol }}>
      {children}
    </AuthCtx.Provider>
  );
}

function symbolFor(code) {
  const map = { INR: "\u20b9", USD: "$", EUR: "\u20ac", GBP: "\u00a3", AED: "\u062f.\u0625", PKR: "\u20a8", NGN: "\u20a6", ZAR: "R", AUD: "A$", CAD: "C$" };
  return map[code] || code + " ";
}
