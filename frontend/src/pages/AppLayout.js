import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Wrench, Boxes, Settings as SettingsIcon, LogOut, KeyRound, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Label, Modal } from "../components/ui";
import { api, apiError } from "../lib/api";

const NAV = [
  { to: "/app", end: true, icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/jobs", icon: Wrench, label: "Repair Jobs" },
  { to: "/app/inventory", icon: Boxes, label: "Inventory" },
  { to: "/app/settings", icon: SettingsIcon, label: "Settings" },
];

export default function AppLayout() {
  const { user, shop, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const doLogout = async () => { await logout(); nav("/login"); };

  const SidebarInner = () => (
    <>
      <div className="px-5 h-16 flex items-center gap-2 border-b border-line">
        <span className="h-8 w-8 grid place-items-center bg-cyan text-black"><Wrench size={17} /></span>
        <span className="font-display font-extrabold tracking-tight">TECH<span className="text-cyan">GARAGE</span></span>
      </div>
      <div className="px-4 py-5 border-b border-line">
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink-3">Shop</div>
        <div className="font-display font-semibold truncate">{shop?.shop_name || "My Shop"}</div>
        <span className="inline-block mt-2 border border-volt/40 text-volt px-2 py-0.5 text-[10px] font-mono uppercase">{shop?.plan || "free"} plan</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 font-mono text-sm uppercase tracking-wide transition-colors ${isActive ? "bg-surface-2 text-cyan border-l-2 border-cyan" : "text-ink-2 hover:text-ink-1 hover:bg-surface-2 border-l-2 border-transparent"}`}
            data-testid={`nav-${n.label.toLowerCase().replace(/\s/g,'-')}`}>
            <n.icon size={17} /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-line space-y-1">
        <button onClick={() => { setPwOpen(true); setOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 font-mono text-sm text-ink-2 hover:text-ink-1 hover:bg-surface-2 transition-colors" data-testid="change-pw-btn">
          <KeyRound size={16} /> Change Password
        </button>
        <button onClick={doLogout} className="w-full flex items-center gap-3 px-3 py-2.5 font-mono text-sm text-err hover:bg-surface-2 transition-colors" data-testid="logout-btn">
          <LogOut size={16} /> Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-bg flex">
      {/* desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-line fixed inset-y-0">
        <SidebarInner />
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
          <aside className="flex flex-col w-64 bg-surface border-r border-line" onClick={(e) => e.stopPropagation()}><SidebarInner /></aside>
          <div className="flex-1 bg-black/60" />
        </div>
      )}

      <div className="flex-1 lg:ml-64 min-w-0">
        <header className="h-16 border-b border-line flex items-center justify-between px-5 sticky top-0 z-30 backdrop-blur-xl bg-bg/70">
          <button className="lg:hidden text-ink-1" onClick={() => setOpen(true)} data-testid="open-sidebar-btn"><Menu /></button>
          <div className="font-mono text-xs text-ink-3 uppercase tracking-widest hidden sm:block">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="font-mono text-xs text-ink-1">{user?.owner_name || user?.email}</div>
              <div className="font-mono text-[10px] text-ink-3">{user?.email}</div>
            </div>
            <div className="h-9 w-9 grid place-items-center bg-surface-2 border border-line text-cyan font-mono font-bold">{(user?.owner_name || user?.email || "?")[0].toUpperCase()}</div>
          </div>
        </header>
        <main className="p-5 sm:p-8"><Outlet /></main>
      </div>

      <ChangePassword open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function ChangePassword({ open, onClose }) {
  const [cur, setCur] = useState(""); const [nw, setNw] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post("/auth/change-password", { current_password: cur, new_password: nw });
      toast.success("Password updated"); setCur(""); setNw(""); onClose();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Change Password">
      <form onSubmit={submit} className="space-y-5">
        <div><Label>Current password</Label><Input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} data-testid="cur-pw-input" /></div>
        <div><Label>New password</Label><Input type="password" required minLength={6} value={nw} onChange={(e) => setNw(e.target.value)} data-testid="new-pw-input" /></div>
        <Button type="submit" disabled={busy} className="w-full" data-testid="save-pw-btn">{busy ? "Saving…" : "Update password"}</Button>
      </form>
    </Modal>
  );
}
