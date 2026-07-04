import React, { useEffect, useState } from "react";
import { Store, Coins, MessageSquare, Save, Crown } from "lucide-react";
import { toast } from "sonner";
import { api, apiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Label, Select, Textarea, Card, Spinner } from "../components/ui";

export default function Settings() {
  const { shop, refresh } = useAuth();
  const [f, setF] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/currencies").then((r) => setCurrencies(r.data));
    if (shop) setF({ ...shop });
  }, [shop]);

  if (!f) return <Spinner label="Loading settings" />;
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/shop", {
        shop_name: f.shop_name, tagline: f.tagline, address: f.address, phone: f.phone, gst: f.gst,
        currency: f.currency, ticket_footer: f.ticket_footer, sms_created_tmpl: f.sms_created_tmpl, sms_done_tmpl: f.sms_done_tmpl,
      });
      await refresh(); toast.success("Settings saved");
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl" data-testid="settings-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-volt">// Configuration</span>
          <h1 className="font-display font-black tracking-tight text-3xl mt-1">Settings</h1>
        </div>
        <Button onClick={save} disabled={busy} data-testid="save-settings-btn"><Save size={16} /> {busy ? "Saving…" : "Save Changes"}</Button>
      </div>

      <Card>
        <h3 className="font-display font-semibold flex items-center gap-2 mb-5"><Store size={18} className="text-cyan" /> Shop Profile</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Shop Name</Label><Input value={f.shop_name || ""} onChange={(e) => set("shop_name", e.target.value)} data-testid="set-shopname" /></div>
          <div><Label>Tagline</Label><Input value={f.tagline || ""} onChange={(e) => set("tagline", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div><Label>GST / Tax ID</Label><Input value={f.gst || ""} onChange={(e) => set("gst", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input value={f.address || ""} onChange={(e) => set("address", e.target.value)} /></div>
        </div>
      </Card>

      <Card>
        <h3 className="font-display font-semibold flex items-center gap-2 mb-5"><Coins size={18} className="text-volt" /> Currency</h3>
        <div className="max-w-xs">
          <Label>Display Currency</Label>
          <Select value={f.currency || "INR"} onChange={(e) => set("currency", e.target.value)} data-testid="set-currency">
            {currencies.map((c) => <option key={c.code} value={c.code}>{`${c.symbol} · ${c.name} (${c.code})`}</option>)}
          </Select>
        </div>
      </Card>

      <Card>
        <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><MessageSquare size={18} className="text-ok" /> SMS Templates</h3>
        <p className="text-ink-3 font-mono text-xs mb-5">Variables: {"{CUSTOMER} {JOB} {DEVICE} {ESTIMATE} {CUR} {SHOP}"}</p>
        <div className="space-y-4">
          <div><Label>Job Received Message</Label><Textarea rows={3} value={f.sms_created_tmpl || ""} onChange={(e) => set("sms_created_tmpl", e.target.value)} data-testid="set-sms-created" /></div>
          <div><Label>Ready For Pickup Message</Label><Textarea rows={3} value={f.sms_done_tmpl || ""} onChange={(e) => set("sms_done_tmpl", e.target.value)} data-testid="set-sms-done" /></div>
        </div>
        <p className="text-ink-3 font-mono text-xs mt-4">Note: live SMS sending requires Twilio credentials in the backend. Until configured, messages run in simulation mode.</p>
      </Card>

      <Card>
        <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Save size={18} className="text-cyan" /> Ticket Footer</h3>
        <Textarea rows={2} value={f.ticket_footer || ""} onChange={(e) => set("ticket_footer", e.target.value)} data-testid="set-footer" />
      </Card>

      <Card className="trace-beam">
        <h3 className="font-display font-semibold flex items-center gap-2"><Crown size={18} className="text-volt" /> Current Plan</h3>
        <p className="text-ink-2 mt-2">You are on the <span className="text-cyan font-mono uppercase">{f.plan || "free"}</span> plan.</p>
        <a href="/#pricing"><Button variant="volt" className="mt-4">View Plans</Button></a>
      </Card>
    </div>
  );
}
