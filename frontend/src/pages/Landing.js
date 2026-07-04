import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wrench, ArrowRight, Boxes, Smartphone, ScanLine, BellRing, ReceiptText,
  LineChart, ShieldCheck, Check, Zap, Cpu, Globe, Star, Menu, X,
} from "lucide-react";
import { Button } from "../components/ui";

const HERO = "https://images.unsplash.com/photo-1546146477-15a587cd3fcb?q=80&w=2000";
const SOLDER = "https://images.pexels.com/photos/7447036/pexels-photo-7447036.jpeg";
const STORE = "https://images.pexels.com/photos/11297769/pexels-photo-11297769.jpeg";

const FEATURES = [
  { icon: Smartphone, t: "Repair Job Tracking", d: "Log every device with IMEI, brand, model, lock, reported problems and parts. Full lifecycle from intake to pickup." },
  { icon: Boxes, t: "Smart Inventory", d: "Track parts & accessories, stock value, low-stock alerts and cost vs. price margins in real time." },
  { icon: ScanLine, t: "Barcode & POS", d: "Scan-to-stock and a fast point-of-sale that deducts inventory as you sell." },
  { icon: BellRing, t: "SMS Notifications", d: "Auto-text customers the moment their device is ready. Fully customizable templates." },
  { icon: LineChart, t: "Live Analytics", d: "Revenue trends, brand mix, pending vs. completed — a control-room view of your shop." },
  { icon: ReceiptText, t: "Print Tickets", d: "Branded repair receipts and job tickets, print-ready in one click." },
];

const PLANS = [
  { name: "Starter", price: "0", period: "forever", tag: "For solo technicians",
    features: ["Up to 50 jobs / month", "1 user", "Inventory basics", "Print tickets", "Community support"], cta: "Start free", variant: "secondary" },
  { name: "Pro", price: "1,499", period: "/mo", tag: "Most popular", popular: true,
    features: ["Unlimited repair jobs", "SMS customer alerts", "Full inventory + POS", "Live analytics dashboard", "Multi-currency", "Priority support"], cta: "Start 14-day trial", variant: "primary" },
  { name: "Business", price: "3,999", period: "/mo", tag: "For multi-store chains",
    features: ["Everything in Pro", "Up to 10 staff seats", "Advanced reporting", "Data export & backup", "Dedicated onboarding", "SLA support"], cta: "Talk to sales", variant: "secondary" },
];

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-bg/70 border-b border-line/60">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
          <span className="h-8 w-8 grid place-items-center bg-cyan text-black"><Wrench size={18} /></span>
          <span className="font-display font-extrabold tracking-tight text-lg">TECH<span className="text-cyan">GARAGE</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest text-ink-2">
          <a href="#features" className="hover:text-cyan transition-colors">Features</a>
          <a href="#how" className="hover:text-cyan transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-cyan transition-colors">Pricing</a>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login"><Button variant="ghost" data-testid="nav-signin-btn">Sign in</Button></Link>
          <Link to="/login"><Button data-testid="nav-getstarted-btn">Get Started</Button></Link>
        </div>
        <button className="md:hidden text-ink-1" onClick={() => setOpen(!open)} data-testid="mobile-menu-btn">{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <div className="md:hidden border-t border-line bg-surface px-5 py-4 flex flex-col gap-4 font-mono text-sm">
          <a href="#features" onClick={() => setOpen(false)}>Features</a>
          <a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
          <Link to="/login"><Button className="w-full">Get Started</Button></Link>
        </div>
      )}
    </nav>
  );
}

export default function Landing() {
  useEffect(() => { document.title = "TechGarage — Repair Shop Operating System"; }, []);
  return (
    <div className="bg-bg text-ink-1 min-h-screen">
      <Nav />

      {/* HERO */}
      <header className="relative pt-32 pb-24 overflow-hidden grid-bg">
        <div className="absolute inset-0">
          <img src={HERO} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-bg/70 via-bg/85 to-bg" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5">
          <div className="max-w-3xl fade-up">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-volt border border-volt/40 px-3 py-1">
              <Zap size={12} /> The Repair Shop Operating System
            </span>
            <h1 className="font-display font-black tracking-tighter leading-[0.95] text-5xl sm:text-7xl mt-6">
              Run your repair shop like a <span className="text-cyan text-glow">machine.</span>
            </h1>
            <p className="mt-6 text-lg text-ink-2 max-w-xl leading-relaxed">
              TechGarage replaces messy registers and spreadsheets with one lightning-fast platform for repair jobs, inventory, POS, customer SMS and live analytics.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login"><Button className="px-8 py-3.5" data-testid="hero-cta-btn">Start free <ArrowRight size={16} /></Button></Link>
              <a href="#features"><Button variant="secondary" className="px-8 py-3.5">See features</Button></a>
            </div>
            <div className="mt-8 flex items-center gap-6 font-mono text-xs text-ink-3">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-ok" /> No card required</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-ok" /> Setup in 2 minutes</span>
            </div>
          </div>
        </div>
      </header>

      {/* MARQUEE */}
      <div className="border-y border-line py-4 overflow-hidden">
        <div className="flex whitespace-nowrap marquee font-mono text-xs uppercase tracking-widest text-ink-3">
          {[...Array(2)].map((_, i) => (
            <span key={i} className="flex gap-10 pr-10">
              {["Apple","Samsung","OnePlus","Xiaomi","Realme","Vivo","Oppo","Google Pixel","Motorola","Nokia","POCO","Redmi"].map((b) => (
                <span key={b} className="flex items-center gap-2"><Cpu size={12} className="text-cyan" /> {b}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* STATS */}
      <section className="max-w-7xl mx-auto px-5 py-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line">
        {[["12k+","Jobs tracked"],["98%","On-time pickups"],["₹0","To get started"],["24/7","Cloud access"]].map(([v,l]) => (
          <div key={l} className="bg-bg p-8">
            <div className="font-mono text-4xl font-bold text-cyan">{v}</div>
            <div className="font-mono text-xs uppercase tracking-widest text-ink-3 mt-2">{l}</div>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-5 py-24">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-volt">// Capabilities</span>
          <h2 className="font-display font-black tracking-tight text-4xl mt-3">Everything a modern repair shop needs.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-line border border-line mt-12">
          {FEATURES.map((f) => (
            <div key={f.t} className="bg-surface p-8 hover:bg-surface-2 transition-colors group" data-testid="feature-card">
              <f.icon className="text-cyan mb-5 group-hover:scale-110 transition-transform" size={28} />
              <h3 className="font-display font-semibold text-lg">{f.t}</h3>
              <p className="text-ink-2 text-sm mt-2 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NARRATIVE / SOLDER */}
      <section id="how" className="max-w-7xl mx-auto px-5 py-24 grid md:grid-cols-2 gap-16 items-center">
        <div className="relative">
          <img src={SOLDER} alt="Technician soldering" className="w-full h-[420px] object-cover border border-line" />
          <div className="absolute -bottom-5 -right-5 bg-surface-2 border border-line p-5 hidden sm:block">
            <div className="font-mono text-xs text-ink-3 uppercase">Job #1042 · Status</div>
            <div className="font-mono text-ok text-lg mt-1">✓ Ready for pickup</div>
          </div>
        </div>
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-volt">// Precision workflow</span>
          <h2 className="font-display font-black tracking-tight text-4xl mt-3">From intake to pickup, zero friction.</h2>
          <div className="mt-8 space-y-6">
            {[
              ["Create the job", "Scan the IMEI, pick the device, tag the fault and parts — done in seconds."],
              ["Track & assign", "Assign to a technician, set the promised date, attach photos and notes."],
              ["Notify the customer", "One tap fires an SMS the moment the device is ready."],
              ["Get paid & report", "Record payment, print the ticket and watch revenue update live."],
            ].map(([t, d], i) => (
              <div key={t} className="flex gap-4">
                <span className="shrink-0 h-8 w-8 grid place-items-center border border-cyan text-cyan font-mono text-sm">{i + 1}</span>
                <div><h4 className="font-semibold">{t}</h4><p className="text-ink-2 text-sm mt-0.5">{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-7xl mx-auto px-5 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-volt">// Pricing</span>
          <h2 className="font-display font-black tracking-tight text-4xl mt-3">Plans that scale with your bench.</h2>
          <p className="text-ink-2 mt-3">Start free. Upgrade when you grow. Cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {PLANS.map((p) => (
            <div key={p.name} className={p.popular ? "trace-beam p-8 relative" : "bg-surface-2 border border-line p-8 relative"} data-testid={`plan-${p.name.toLowerCase()}`}>
              {p.popular && <span className="absolute -top-3 left-8 bg-volt text-black font-mono text-[10px] uppercase tracking-widest px-3 py-1">Most popular</span>}
              <div className="font-mono text-xs uppercase tracking-widest text-ink-3">{p.tag}</div>
              <h3 className="font-display font-bold text-2xl mt-2">{p.name}</h3>
              <div className="mt-4 flex items-end gap-1">
                <span className="font-mono text-4xl font-bold">₹{p.price}</span>
                <span className="font-mono text-ink-3 text-sm mb-1">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-2"><Check size={16} className="text-cyan shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
              <Link to="/login" className="block mt-8"><Button variant={p.variant} className="w-full py-3">{p.cta}</Button></Link>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-5 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["TechGarage cut our intake time in half. The SMS alerts alone save us dozens of calls a day.", "Imran Q.", "GadgetFix, Mumbai"],
            ["Finally an app built for real repair shops, not generic retail. Inventory + jobs in one place.", "Sarah L.", "PixelCare, Dubai"],
            ["The analytics showed us which repairs actually make money. Game changer.", "David O.", "CellMedic, Lagos"],
          ].map(([q, n, s]) => (
            <div key={n} className="bg-surface border border-line p-7">
              <div className="flex gap-1 text-volt mb-4">{[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}</div>
              <p className="text-ink-1 leading-relaxed">"{q}"</p>
              <div className="mt-5 font-mono text-xs text-ink-3">{n} · <span className="text-cyan">{s}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 overflow-hidden border-y border-line">
        <img src={STORE} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-bg/80" />
        <div className="relative max-w-3xl mx-auto px-5 text-center">
          <ShieldCheck className="mx-auto text-cyan mb-5" size={40} />
          <h2 className="font-display font-black tracking-tighter text-4xl sm:text-5xl">Your shop deserves better than a notebook.</h2>
          <p className="text-ink-2 mt-4 text-lg">Join repair shops worldwide running smarter with TechGarage.</p>
          <Link to="/login"><Button className="mt-8 px-10 py-4" data-testid="cta-bottom-btn">Get started free <ArrowRight size={16} /></Button></Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-5 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 grid place-items-center bg-cyan text-black"><Wrench size={15} /></span>
          <span className="font-display font-extrabold tracking-tight">TECH<span className="text-cyan">GARAGE</span></span>
        </div>
        <div className="font-mono text-xs text-ink-3 flex items-center gap-2"><Globe size={12} /> © 2026 TechGarage. Built for repair professionals.</div>
      </footer>
    </div>
  );
}
