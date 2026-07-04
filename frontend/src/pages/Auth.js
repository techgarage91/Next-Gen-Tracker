import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wrench, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Label } from "../components/ui";
import { apiError } from "../lib/api";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ shop_name: "", owner_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") { await login(form.email, form.password); }
      else { await register(form); }
      toast.success("Welcome to TechGarage");
      nav("/app");
    } catch (err) {
      toast.error(apiError(err));
    } finally { setBusy(false); }
  };

  const useDemo = () => setForm({ ...form, email: "demo@techgarage.app", password: "Demo@1234" });

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* left panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-line grid-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-bg via-bg/90 to-surface" />
        <div className="relative">
          <Link to="/" className="flex items-center gap-2">
            <span className="h-9 w-9 grid place-items-center bg-cyan text-black"><Wrench size={18} /></span>
            <span className="font-display font-extrabold tracking-tight text-xl">TECH<span className="text-cyan">GARAGE</span></span>
          </Link>
        </div>
        <div className="relative">
          <h2 className="font-display font-black tracking-tighter text-4xl leading-tight">The command center<br /> for your repair bench.</h2>
          <p className="text-ink-2 mt-4 max-w-sm">Jobs, inventory, POS, customer SMS and analytics — all in one lightning-fast platform.</p>
        </div>
        <div className="relative font-mono text-xs text-ink-3">© 2026 TechGarage</div>
      </div>

      {/* form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm fade-up">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8 text-ink-3 font-mono text-xs uppercase"><ArrowLeft size={14} /> Home</Link>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-volt">{mode === "login" ? "// Welcome back" : "// Create account"}</span>
          <h1 className="font-display font-black tracking-tight text-3xl mt-2">{mode === "login" ? "Sign in" : "Start your shop"}</h1>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {mode === "register" && (
              <>
                <div><Label>Shop name</Label><Input required value={form.shop_name} onChange={set("shop_name")} placeholder="Tech Garage" data-testid="reg-shop-input" /></div>
                <div><Label>Owner name</Label><Input value={form.owner_name} onChange={set("owner_name")} placeholder="Your name" data-testid="reg-owner-input" /></div>
              </>
            )}
            <div><Label>Email</Label><Input type="email" required value={form.email} onChange={set("email")} placeholder="you@shop.com" data-testid="auth-email-input" /></div>
            <div><Label>Password</Label><Input type="password" required value={form.password} onChange={set("password")} placeholder="••••••••" data-testid="auth-password-input" /></div>
            <Button type="submit" disabled={busy} className="w-full py-3" data-testid="auth-submit-btn">
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16} />
            </Button>
          </form>

          {mode === "login" && (
            <button onClick={useDemo} className="mt-3 w-full text-center font-mono text-xs text-cyan hover:text-cyan-hi transition-colors" data-testid="demo-fill-btn">
              → Use demo account
            </button>
          )}

          <div className="mt-6 text-center font-mono text-xs text-ink-3">
            {mode === "login" ? "New shop?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-cyan hover:underline" data-testid="auth-toggle-btn">
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
