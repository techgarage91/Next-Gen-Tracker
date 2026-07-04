import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, X, Printer, Pencil, Trash2, MessageSquare, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { api, apiError, formatMoney } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Label, Select, Modal, StatusBadge, Card, Spinner, cx } from "../components/ui";

const BLANK = {
  job_no: "", customer_name: "", contacts: [""], imei: "", brand: "", device_model: "",
  lock_type: "Nil", lock_value: "", sim_storage: [], problems: [], parts: [], photos: [],
  estimate: 0, advance: 0, parts_cost: 0, payment_status: "Unpaid", payment_method: "",
  status: "Pending", ready_by: "", assigned_to: "", notes: "",
};

function TagPicker({ label, options, selected, onChange, onAddNew, testid }) {
  const [q, setQ] = useState("");
  const avail = options.filter((o) => !selected.includes(o) && o.toLowerCase().includes(q.toLowerCase()));
  const add = (v) => { onChange([...selected, v]); setQ(""); };
  const create = async () => { const v = q.trim(); if (!v) return; await onAddNew(v); onChange([...selected, v]); setQ(""); };
  return (
    <div>
      <Label>{label}</Label>
      <div className="border border-line bg-bg p-2">
        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[10px]">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 bg-surface-2 border border-line text-cyan px-2 py-0.5 text-xs font-mono">
              {s}<button type="button" onClick={() => onChange(selected.filter((x) => x !== s))}><X size={12} /></button>
            </span>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or type to add…" data-testid={testid}
          className="w-full bg-transparent text-sm font-mono outline-none text-ink-1 placeholder:text-ink-3" />
        {q && (
          <div className="mt-2 max-h-40 overflow-y-auto border-t border-line pt-2 space-y-0.5">
            {avail.slice(0, 8).map((o) => (
              <button type="button" key={o} onClick={() => add(o)} className="block w-full text-left px-2 py-1 text-xs font-mono text-ink-2 hover:bg-surface-2 hover:text-cyan">{o}</button>
            ))}
            {!options.some((o) => o.toLowerCase() === q.toLowerCase()) && (
              <button type="button" onClick={create} className="block w-full text-left px-2 py-1 text-xs font-mono text-volt hover:bg-surface-2">+ Add "{q}"</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Jobs() {
  const { currencySymbol, shop } = useAuth();
  const [jobs, setJobs] = useState(null);
  const [catalog, setCatalog] = useState({ brand_models: {}, problems: [], parts: [] });
  const [filters, setFilters] = useState({ status: "all", brand: "all", payment: "all", q: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v && v !== "all") params[k] = v; });
    const { data } = await api.get("/jobs", { params });
    setJobs(data);
  }, [filters]);

  useEffect(() => { api.get("/catalog").then((r) => setCatalog(r.data)); }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = async () => {
    const { data } = await api.get("/jobs/next-number");
    setEditing({ ...BLANK, job_no: data.job_no, contacts: [""] });
    setFormOpen(true);
  };
  const openEdit = (j) => { setEditing({ ...BLANK, ...j, contacts: j.contacts?.length ? j.contacts : [""] }); setDetail(null); setFormOpen(true); };

  return (
    <div className="space-y-6" data-testid="jobs-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-volt">// Workshop</span>
          <h1 className="font-display font-black tracking-tight text-3xl mt-1">Repair Jobs {jobs && <span className="text-ink-3 text-xl">({jobs.length})</span>}</h1>
        </div>
        <Button onClick={openNew} data-testid="new-job-btn"><Plus size={16} /> New Job</Button>
      </div>

      {/* filters */}
      <Card className="p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-2 top-3 text-ink-3" />
            <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search job, customer, IMEI…"
              className="w-full bg-bg border border-line pl-8 pr-2 py-2.5 text-sm font-mono outline-none focus:border-cyan text-ink-1 placeholder:text-ink-3" data-testid="job-search-input" />
          </div>
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} data-testid="filter-status">
            <option value="all">All Status</option><option>Pending</option><option>Done</option><option>Returned</option>
          </Select>
          <Select value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })} data-testid="filter-brand">
            <option value="all">All Brands</option>{Object.keys(catalog.brand_models).map((b) => <option key={b}>{b}</option>)}
          </Select>
          <Select value={filters.payment} onChange={(e) => setFilters({ ...filters, payment: e.target.value })} data-testid="filter-payment">
            <option value="all">All Payment</option><option>Paid</option><option>Unpaid</option>
          </Select>
        </div>
      </Card>

      {/* table */}
      {!jobs ? <Spinner label="Loading jobs" /> : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-ink-3 border-b border-line">
                <th className="p-4">Job #</th><th className="p-4">Customer</th><th className="p-4">Device</th><th className="p-4">Problem</th><th className="p-4">Status</th><th className="p-4">Payment</th><th className="p-4 text-right">Estimate</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && <tr><td colSpan={7} className="p-10 text-center font-mono text-ink-3">No jobs found.</td></tr>}
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-line/40 hover:bg-surface-2/50 cursor-pointer font-mono text-sm" onClick={() => setDetail(j)} data-testid="job-row">
                  <td className="p-4 text-cyan">#{j.job_no}</td>
                  <td className="p-4 text-ink-1">{j.customer_name || "—"}<div className="text-ink-3 text-xs">{j.contacts?.[0]}</div></td>
                  <td className="p-4 text-ink-2">{j.brand} {j.device_model}</td>
                  <td className="p-4 text-ink-3 text-xs max-w-[160px] truncate">{j.problems?.join(", ") || "—"}</td>
                  <td className="p-4"><StatusBadge value={j.status} /></td>
                  <td className="p-4"><StatusBadge value={j.payment_status} /></td>
                  <td className="p-4 text-right text-ink-1">{formatMoney(j.estimate, currencySymbol)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {formOpen && <JobForm job={editing} catalog={catalog} setCatalog={setCatalog} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />}
      {detail && <JobDetail job={detail} shop={shop} cur={currencySymbol} onClose={() => setDetail(null)} onEdit={openEdit} onChanged={() => { setDetail(null); load(); }} />}
    </div>
  );
}

function JobForm({ job, catalog, setCatalog, onClose, onSaved }) {
  const [f, setF] = useState(job);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const models = catalog.brand_models[f.brand] || [];

  const addCat = async (endpoint, value, extra = {}) => {
    const { data } = await api.post(`/catalog/${endpoint}`, { value, ...extra });
    setCatalog(data);
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    const payload = { ...f, contacts: f.contacts.filter((c) => c.trim()), estimate: +f.estimate || 0, advance: +f.advance || 0, parts_cost: +f.parts_cost || 0 };
    try {
      if (f.id) await api.put(`/jobs/${f.id}`, payload);
      else await api.post("/jobs", payload);
      toast.success(f.id ? "Job updated" : "Job created");
      onSaved();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };

  const toggleSim = (v) => set("sim_storage", f.sim_storage.includes(v) ? f.sim_storage.filter((x) => x !== v) : [...f.sim_storage, v]);

  return (
    <Modal open onClose={onClose} title={f.id ? `Edit Job #${f.job_no}` : "New Repair Job"} wide>
      <form onSubmit={submit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        <Section title="Identification">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Job Number *</Label><Input required value={f.job_no} onChange={(e) => set("job_no", e.target.value)} data-testid="jf-jobno" /></div>
            <div><Label>Assigned To</Label><Input value={f.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} placeholder="Technician" /></div>
          </div>
        </Section>

        <Section title="Customer">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Customer Name</Label><Input value={f.customer_name} onChange={(e) => set("customer_name", e.target.value)} data-testid="jf-customer" /></div>
            <div>
              <Label>Contact Number(s)</Label>
              {f.contacts.map((c, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input value={c} onChange={(e) => { const a = [...f.contacts]; a[i] = e.target.value; set("contacts", a); }} placeholder="+91…" data-testid={i===0?"jf-contact":undefined} />
                  {i === f.contacts.length - 1 ? <button type="button" onClick={() => set("contacts", [...f.contacts, ""])} className="text-cyan px-2"><Plus size={16} /></button>
                    : <button type="button" onClick={() => set("contacts", f.contacts.filter((_, x) => x !== i))} className="text-err px-2"><X size={16} /></button>}
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Device">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>IMEI / Serial</Label><Input value={f.imei} onChange={(e) => set("imei", e.target.value)} data-testid="jf-imei" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Brand *</Label>
                <div className="flex gap-1">
                  <Select required value={f.brand} onChange={(e) => { set("brand", e.target.value); set("device_model", ""); }} data-testid="jf-brand">
                    <option value="">Select</option>{Object.keys(catalog.brand_models).map((b) => <option key={b}>{b}</option>)}
                  </Select>
                  <AddBtn onAdd={(v) => addCat("brand", v)} />
                </div>
              </div>
              <div>
                <Label>Model *</Label>
                <div className="flex gap-1">
                  <Select required value={f.device_model} onChange={(e) => set("device_model", e.target.value)} data-testid="jf-model">
                    <option value="">Select</option>{models.map((m) => <option key={m}>{m}</option>)}
                  </Select>
                  <AddBtn disabled={!f.brand} onAdd={(v) => addCat("model", v, { brand: f.brand })} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            <div><Label>Lock Type</Label><Select value={f.lock_type} onChange={(e) => set("lock_type", e.target.value)}><option>Nil</option><option>PIN</option><option>Pattern</option><option>Password</option></Select></div>
            <div><Label>Lock Value</Label><Input value={f.lock_value} onChange={(e) => set("lock_value", e.target.value)} /></div>
            <div>
              <Label>SIM / Storage</Label>
              <div className="flex gap-2 pt-2">
                {["SIM 1", "SIM 2", "MMC"].map((s) => (
                  <button type="button" key={s} onClick={() => toggleSim(s)} className={cx("px-3 py-1 text-xs font-mono border", f.sim_storage.includes(s) ? "border-cyan text-cyan" : "border-line text-ink-3")}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Diagnosis">
          <div className="grid sm:grid-cols-2 gap-4">
            <TagPicker label="Problems Reported" options={catalog.problems} selected={f.problems} onChange={(v) => set("problems", v)} onAddNew={(v) => addCat("problem", v)} testid="jf-problems" />
            <TagPicker label="Parts / Repair" options={catalog.parts} selected={f.parts} onChange={(v) => set("parts", v)} onAddNew={(v) => addCat("part", v)} testid="jf-parts" />
          </div>
        </Section>

        <Section title="Financials & Status">
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label>Estimate</Label><Input type="number" value={f.estimate} onChange={(e) => set("estimate", e.target.value)} data-testid="jf-estimate" /></div>
            <div><Label>Advance</Label><Input type="number" value={f.advance} onChange={(e) => set("advance", e.target.value)} /></div>
            <div><Label>Parts Cost</Label><Input type="number" value={f.parts_cost} onChange={(e) => set("parts_cost", e.target.value)} /></div>
            <div><Label>Payment Status</Label><Select value={f.payment_status} onChange={(e) => set("payment_status", e.target.value)} data-testid="jf-payment"><option>Unpaid</option><option>Paid</option></Select></div>
            <div><Label>Payment Method</Label><Select value={f.payment_method} onChange={(e) => set("payment_method", e.target.value)}><option value="">— Not set</option><option>Cash</option><option>UPI</option><option>Card</option></Select></div>
            <div><Label>Job Status</Label><Select value={f.status} onChange={(e) => set("status", e.target.value)} data-testid="jf-status"><option>Pending</option><option>Done</option><option>Returned</option></Select></div>
          </div>
          <div className="mt-4"><Label>Notes</Label><Input value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        </Section>

        <div className="flex gap-3 pt-2 sticky bottom-0 bg-surface">
          <Button type="submit" disabled={busy} data-testid="save-job-btn">{busy ? "Saving…" : "Save Job"}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddBtn({ onAdd, disabled }) {
  return <button type="button" disabled={disabled} onClick={() => { const v = prompt("Add new value:"); if (v && v.trim()) onAdd(v.trim()); }}
    className="shrink-0 px-2 border border-line text-volt hover:border-volt disabled:opacity-30" title="Add new"><Plus size={16} /></button>;
}

function Section({ title, children }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-cyan border-b border-line pb-2 mb-4">{title}</div>
      {children}
    </div>
  );
}

function JobDetail({ job, shop, cur, onClose, onEdit, onChanged }) {
  const [busy, setBusy] = useState(false);
  const del = async () => {
    if (!window.confirm(`Delete job #${job.job_no}?`)) return;
    await api.delete(`/jobs/${job.id}`); toast.success("Job deleted"); onChanged();
  };
  const sms = async (kind) => {
    setBusy(true);
    try {
      const { data } = await api.post("/sms/send", { job_id: job.id, kind });
      toast.success(data.simulated ? "SMS simulated (add Twilio keys to send live)" : `SMS sent to ${data.to}`);
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const print = () => window.print();

  return (
    <Modal open onClose={onClose} title={`Job #${job.job_no}`} wide>
      <div id="print-ticket" className="space-y-5">
        <div className="hidden print:block text-center mb-4">
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{shop?.shop_name}</h2>
          <div>{shop?.tagline}</div><div>{shop?.address} · {shop?.phone}</div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 font-mono text-sm">
          <Info label="Customer" value={job.customer_name} />
          <Info label="Contact" value={job.contacts?.join(", ")} />
          <Info label="Device" value={`${job.brand} ${job.device_model}`} />
          <Info label="IMEI" value={job.imei} />
          <Info label="Lock" value={`${job.lock_type}${job.lock_value ? " · " + job.lock_value : ""}`} />
          <Info label="Assigned" value={job.assigned_to} />
          <Info label="Status" value={job.status} />
          <Info label="Ready by" value={job.ready_by} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <TagList title="Problems Reported" items={job.problems} />
          <TagList title="Parts / Repair" items={job.parts} />
        </div>
        {job.notes && <div><div className="font-mono text-[10px] uppercase tracking-widest text-cyan mb-1">Notes</div><p className="text-ink-2 text-sm">{job.notes}</p></div>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line">
          <Money label="Estimate" v={formatMoney(job.estimate, cur)} />
          <Money label="Advance" v={formatMoney(job.advance, cur)} />
          <Money label="Parts Cost" v={formatMoney(job.parts_cost, cur)} />
          <Money label="Payment" v={job.payment_status} />
        </div>
        <div className="hidden print:block text-center text-xs mt-4">{shop?.ticket_footer}</div>
      </div>

      <div className="flex flex-wrap gap-2 pt-5 border-t border-line mt-5 print:hidden">
        <Button variant="secondary" onClick={print} data-testid="print-ticket-btn"><Printer size={15} /> Print Ticket</Button>
        <Button variant="secondary" disabled={busy} onClick={() => sms("done")} data-testid="sms-done-btn"><MessageSquare size={15} /> SMS: Ready</Button>
        <Button variant="ghost" disabled={busy} onClick={() => sms("created")}><MessageSquare size={15} /> SMS: Received</Button>
        <div className="flex-1" />
        <Button variant="secondary" onClick={() => onEdit(job)} data-testid="edit-job-btn"><Pencil size={15} /> Edit</Button>
        <Button variant="danger" onClick={del} data-testid="delete-job-btn"><Trash2 size={15} /> Delete</Button>
      </div>
    </Modal>
  );
}

const Info = ({ label, value }) => (
  <div><div className="text-[10px] uppercase tracking-widest text-ink-3">{label}</div><div className="text-ink-1">{value || "—"}</div></div>
);
const Money = ({ label, v }) => (
  <div className="bg-surface p-3"><div className="font-mono text-[10px] uppercase tracking-widest text-ink-3">{label}</div><div className="font-mono text-ink-1 text-lg">{v}</div></div>
);
const TagList = ({ title, items }) => (
  <div><div className="font-mono text-[10px] uppercase tracking-widest text-cyan mb-2">{title}</div>
    <div className="flex flex-wrap gap-1.5">{items?.length ? items.map((i) => <span key={i} className="border border-line text-ink-2 px-2 py-0.5 text-xs font-mono">{i}</span>) : <span className="text-ink-3 text-sm">—</span>}</div>
  </div>
);
