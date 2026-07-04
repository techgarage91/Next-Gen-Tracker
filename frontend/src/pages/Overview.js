import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, Clock, CheckCircle2, AlertTriangle, IndianRupee, TrendingUp } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { api, formatMoney } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card, StatusBadge, Spinner, Button } from "../components/ui";

const PIE_COLORS = ["#00F0FF", "#CCFF00", "#00FF66", "#FFB800", "#A1A1AA", "#FF2A2A"];

export default function Overview() {
  const [d, setD] = useState(null);
  const { currencySymbol } = useAuth();
  const nav = useNavigate();

  useEffect(() => { api.get("/dashboard").then((r) => setD(r.data)); }, []);
  if (!d) return <Spinner label="Loading dashboard" />;

  const cur = currencySymbol;
  const KPIS = [
    { icon: Wrench, label: "Total Jobs", value: d.total_jobs, color: "text-cyan", tid: "kpi-total" },
    { icon: Clock, label: "Pending", value: d.pending, color: "text-warn", tid: "kpi-pending" },
    { icon: CheckCircle2, label: "Completed", value: d.completed, color: "text-ok", tid: "kpi-completed" },
    { icon: AlertTriangle, label: "Unpaid", value: d.unpaid, color: "text-err", tid: "kpi-unpaid" },
    { icon: IndianRupee, label: "Today's Revenue", value: formatMoney(d.today_revenue, cur), color: "text-volt", tid: "kpi-today-rev" },
    { icon: TrendingUp, label: "Total Revenue", value: formatMoney(d.total_revenue, cur), color: "text-cyan", tid: "kpi-total-rev" },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-overview">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-volt">// Control Room</span>
          <h1 className="font-display font-black tracking-tight text-3xl mt-1">Dashboard</h1>
        </div>
        <Button onClick={() => nav("/app/jobs")} data-testid="dash-newjob-btn"><Wrench size={16} /> New Job</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-px bg-line border border-line">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-surface p-5" data-testid={k.tid}>
            <k.icon className={k.color} size={20} />
            <div className={`font-mono text-2xl font-bold mt-3 ${k.color}`}>{k.value}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink-3 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* revenue chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-semibold">Revenue · Last 7 days</h3>
            <span className="font-mono text-xs text-ink-3">{cur} paid jobs</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={d.series} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#00F0FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} stroke="#52525B" fontSize={11} fontFamily="JetBrains Mono" />
              <YAxis stroke="#52525B" fontSize={11} fontFamily="JetBrains Mono" />
              <Tooltip contentStyle={{ background: "#121216", border: "1px solid #1E1E24", fontFamily: "JetBrains Mono", fontSize: 12 }} labelStyle={{ color: "#fff" }} formatter={(v) => [formatMoney(v, cur), "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#00F0FF" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* brand distribution */}
        <Card>
          <h3 className="font-display font-semibold mb-4">Top Brands</h3>
          {d.brand_dist.length === 0 ? <p className="text-ink-3 font-mono text-sm">No data yet</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={d.brand_dist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {d.brand_dist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#050505" />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#121216", border: "1px solid #1E1E24", fontFamily: "JetBrains Mono", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 space-y-1.5">
            {d.brand_dist.map((b, i) => (
              <div key={b.name} className="flex items-center justify-between font-mono text-xs">
                <span className="flex items-center gap-2 text-ink-2"><span className="h-2.5 w-2.5" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} /> {b.name}</span>
                <span className="text-ink-1">{b.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* recent jobs */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Recent Jobs</h3>
          <button onClick={() => nav("/app/jobs")} className="font-mono text-xs text-cyan hover:text-cyan-hi" data-testid="view-all-jobs-btn">View all →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-ink-3 border-b border-line">
                <th className="pb-3">Job #</th><th className="pb-3">Customer</th><th className="pb-3">Device</th><th className="pb-3">Status</th><th className="pb-3 text-right">Estimate</th>
              </tr>
            </thead>
            <tbody>
              {d.recent.map((j) => (
                <tr key={j.id} className="border-b border-line/40 hover:bg-surface-2/50 cursor-pointer font-mono text-sm" onClick={() => nav("/app/jobs")}>
                  <td className="py-3 text-cyan">#{j.job_no}</td>
                  <td className="py-3 text-ink-1">{j.customer_name || "—"}</td>
                  <td className="py-3 text-ink-2">{j.brand} {j.device_model}</td>
                  <td className="py-3"><StatusBadge value={j.status} /></td>
                  <td className="py-3 text-right text-ink-1">{formatMoney(j.estimate, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
