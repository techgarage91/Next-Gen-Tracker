import React, { useEffect, useState, useCallback } from "react";
import { Plus, Package, Boxes, Wallet, AlertTriangle, ScanLine, ShoppingCart, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, apiError, formatMoney } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Label, Select, Modal, Card, Spinner, StatusBadge, cx } from "../components/ui";

const BLANK = { barcode: "", name: "", category: "", stock: 0, cost: 0, price: 0, low_stock_at: 3 };

export default function Inventory() {
  const { currencySymbol } = useAuth();
  const [products, setProducts] = useState(null);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState(null);
  const [pos, setPos] = useState(false);
  const [scan, setScan] = useState(false);

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([api.get("/products"), api.get("/products/stats")]);
    setProducts(p.data); setStats(s.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (id) => { if (!window.confirm("Delete product?")) return; await api.delete(`/products/${id}`); toast.success("Deleted"); load(); };

  const KPIS = stats ? [
    { icon: Package, label: "Products", value: stats.products, color: "text-cyan" },
    { icon: Boxes, label: "Units in Stock", value: stats.units, color: "text-volt" },
    { icon: Wallet, label: "Stock Value", value: formatMoney(stats.stock_value, currencySymbol), color: "text-ok" },
    { icon: AlertTriangle, label: "Low Stock", value: stats.low_stock, color: "text-err" },
  ] : [];

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-volt">// Stock Control</span>
          <h1 className="font-display font-black tracking-tight text-3xl mt-1">Inventory</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setScan(true)} data-testid="scan-btn"><ScanLine size={16} /> Scan</Button>
          <Button variant="volt" onClick={() => setPos(true)} data-testid="new-sale-btn"><ShoppingCart size={16} /> New Sale</Button>
          <Button onClick={() => setForm(BLANK)} data-testid="add-product-btn"><Plus size={16} /> Add Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-surface p-5" data-testid={`inv-kpi-${k.label.split(" ")[0].toLowerCase()}`}>
            <k.icon className={k.color} size={20} />
            <div className={`font-mono text-2xl font-bold mt-3 ${k.color}`}>{k.value}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink-3 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {!products ? <Spinner label="Loading inventory" /> : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead><tr className="text-left font-mono text-[10px] uppercase tracking-wider text-ink-3 border-b border-line">
              <th className="p-4">Barcode</th><th className="p-4">Product</th><th className="p-4">Category</th><th className="p-4 text-right">Stock</th><th className="p-4 text-right">Cost</th><th className="p-4 text-right">Price</th><th className="p-4 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {products.length === 0 && <tr><td colSpan={7} className="p-10 text-center font-mono text-ink-3">No products yet. Scan or add your first product.</td></tr>}
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line/40 hover:bg-surface-2/50 font-mono text-sm" data-testid="product-row">
                  <td className="p-4 text-ink-3">{p.barcode || "—"}</td>
                  <td className="p-4 text-ink-1">{p.name}</td>
                  <td className="p-4 text-ink-2">{p.category || "—"}</td>
                  <td className="p-4 text-right"><span className={p.stock <= (p.low_stock_at || 3) ? "text-err" : "text-ink-1"}>{p.stock}</span></td>
                  <td className="p-4 text-right text-ink-2">{formatMoney(p.cost, currencySymbol)}</td>
                  <td className="p-4 text-right text-volt">{formatMoney(p.price, currencySymbol)}</td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button onClick={() => setForm(p)} className="text-cyan hover:text-cyan-hi mr-3" data-testid="edit-product-btn"><Pencil size={15} /></button>
                    <button onClick={() => del(p.id)} className="text-err/70 hover:text-err"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {form && <ProductForm product={form} cur={currencySymbol} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      {pos && <POS products={products || []} cur={currencySymbol} onClose={() => setPos(false)} onDone={() => { setPos(false); load(); }} />}
      {scan && <ScanModal products={products || []} onClose={() => setScan(false)} onScanned={load} />}
    </div>
  );
}

function ProductForm({ product, cur, onClose, onSaved }) {
  const [f, setF] = useState(product);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    const payload = { ...f, stock: +f.stock || 0, cost: +f.cost || 0, price: +f.price || 0, low_stock_at: +f.low_stock_at || 3 };
    try {
      if (f.id) await api.put(`/products/${f.id}`, payload); else await api.post("/products", payload);
      toast.success("Saved"); onSaved();
    } catch (e2) { toast.error(apiError(e2)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={f.id ? "Edit Product" : "Add Product"}>
      <form onSubmit={submit} className="space-y-4">
        <div><Label>Product Name *</Label><Input required value={f.name} onChange={(e) => set("name", e.target.value)} data-testid="pf-name" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Barcode</Label><Input value={f.barcode} onChange={(e) => set("barcode", e.target.value)} data-testid="pf-barcode" /></div>
          <div><Label>Category</Label><Input value={f.category} onChange={(e) => set("category", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Stock</Label><Input type="number" value={f.stock} onChange={(e) => set("stock", e.target.value)} data-testid="pf-stock" /></div>
          <div><Label>Low Stock Alert</Label><Input type="number" value={f.low_stock_at} onChange={(e) => set("low_stock_at", e.target.value)} /></div>
          <div><Label>Cost ({cur})</Label><Input type="number" value={f.cost} onChange={(e) => set("cost", e.target.value)} /></div>
          <div><Label>Price ({cur})</Label><Input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} data-testid="pf-price" /></div>
        </div>
        <Button type="submit" disabled={busy} className="w-full" data-testid="save-product-btn">{busy ? "Saving…" : "Save Product"}</Button>
      </form>
    </Modal>
  );
}

function POS({ products, cur, onClose, onDone }) {
  const [cart, setCart] = useState([]);
  const [method, setMethod] = useState("Cash");
  const [busy, setBusy] = useState(false);
  const add = (p) => {
    setCart((c) => {
      const ex = c.find((i) => i.product_id === p.id);
      if (ex) return c.map((i) => i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { product_id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  };
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const checkout = async () => {
    if (!cart.length) return;
    setBusy(true);
    try { await api.post("/sales", { items: cart, payment_method: method }); toast.success(`Sale recorded · ${formatMoney(total, cur)}`); onDone(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="New Sale · POS" wide>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label>Products</Label>
          <div className="max-h-80 overflow-y-auto space-y-1 border border-line p-2">
            {products.length === 0 && <p className="text-ink-3 font-mono text-sm p-2">Add products first.</p>}
            {products.map((p) => (
              <button key={p.id} onClick={() => add(p)} className="w-full flex justify-between items-center px-3 py-2 font-mono text-sm text-ink-2 hover:bg-surface-2 hover:text-cyan" data-testid="pos-add-item">
                <span>{p.name}</span><span className="text-volt">{formatMoney(p.price, cur)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          <Label>Cart</Label>
          <div className="flex-1 border border-line p-2 min-h-[120px] space-y-1">
            {cart.length === 0 && <p className="text-ink-3 font-mono text-sm p-2">Tap products to add.</p>}
            {cart.map((i) => (
              <div key={i.product_id} className="flex justify-between items-center font-mono text-sm px-2 py-1">
                <span className="text-ink-1">{i.name} × {i.qty}</span>
                <div className="flex items-center gap-3">
                  <span className="text-volt">{formatMoney(i.qty * i.price, cur)}</span>
                  <button onClick={() => setCart(cart.filter((x) => x.product_id !== i.product_id))} className="text-err"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3"><Label>Payment Method</Label><Select value={method} onChange={(e) => setMethod(e.target.value)}><option>Cash</option><option>UPI</option><option>Card</option></Select></div>
          <div className="flex items-center justify-between mt-4 font-mono">
            <span className="text-ink-3 uppercase text-xs">Total</span>
            <span className="text-2xl font-bold text-cyan" data-testid="pos-total">{formatMoney(total, cur)}</span>
          </div>
          <Button disabled={busy || !cart.length} onClick={checkout} className="w-full mt-4" data-testid="pos-checkout-btn">{busy ? "Processing…" : "Complete Sale"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ScanModal({ products, onClose, onScanned }) {
  const [code, setCode] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    const p = products.find((x) => x.barcode && x.barcode === code.trim());
    if (!p) { toast.error("No product with that barcode"); return; }
    await api.post(`/products/${p.id}/scan`); toast.success(`+1 stock · ${p.name}`); setCode(""); onScanned();
  };
  return (
    <Modal open onClose={onClose} title="Barcode Scanner">
      <p className="text-ink-2 text-sm mb-4">Scan or type a barcode to add 1 unit to stock.</p>
      <form onSubmit={submit} className="flex gap-2">
        <Input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Barcode…" data-testid="scan-input" />
        <Button type="submit">Add</Button>
      </form>
    </Modal>
  );
}
