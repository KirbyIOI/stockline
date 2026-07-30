import React, { useState, useMemo } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle } from "lucide-react";
import { COLORS, primaryBtnStyle, secondaryBtnStyle, iconBtnStyle, money } from "../styles.js";
import { SectionHeader } from "./Shared.jsx";

export default function Sales({ products, onCreateSale }) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [saleResult, setSaleResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const filteredProducts = products.filter(
    (p) =>
      p.stock > 0 &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, units: Math.min(i.units + 1, product.stock) }
            : i
        );
      }
      return [...prev, { product, units: 1 }];
    });
    setError(null);
  };

  const updateQty = (productId, units) => {
    if (units <= 0) {
      removeFromCart(productId);
      return;
    }
    const product = products.find((p) => p.id === productId);
    const maxStock = product ? product.stock : 9999;
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, units: Math.min(units, maxStock) }
          : i
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.units * i.product.price, 0),
    [cart]
  );

  const cartItemCount = useMemo(
    () => cart.reduce((sum, i) => sum + i.units, 0),
    [cart]
  );

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const items = cart.map((i) => ({ productId: i.product.id, units: i.units }));
      const result = await onCreateSale(items);
      setSaleResult(result);
      setCart([]);
      setSearch("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetSale = () => {
    setSaleResult(null);
    setError(null);
  };

  if (saleResult) {
    return (
      <div>
        <SectionHeader title="Sales" subtitle="Record customer purchases." />
        <div style={{ maxWidth: 560, margin: "0 auto", background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 16, padding: 32, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: COLORS.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <CheckCircle size={28} color={COLORS.teal} />
          </div>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, margin: "0 0 4px", color: COLORS.ink }}>Sale completed</h3>
          <p style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, margin: "0 0 20px" }}>{new Date(saleResult.timestamp).toLocaleString()}</p>
          <div style={{ border: "1px solid " + COLORS.line, borderRadius: 12, overflow: "hidden", marginBottom: 20, textAlign: "left" }}>
            <div style={{ padding: "10px 16px", background: "#FAFBFD", borderBottom: "1px solid " + COLORS.line, fontFamily: "Inter", fontSize: 11.5, fontWeight: 600, color: COLORS.sub, textTransform: "uppercase", letterSpacing: "0.04em" }}>Receipt</div>
            {saleResult.items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: idx < saleResult.items.length - 1 ? "1px solid " + COLORS.line : "none", fontFamily: "Inter", fontSize: 13 }}>
                <div><span style={{ fontWeight: 500 }}>{item.productName}</span><span style={{ color: COLORS.sub, marginLeft: 6 }}> x {item.units}</span></div>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{money(item.subtotal)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#FAFBFD", borderTop: "1px solid " + COLORS.line, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>
              <span>Total</span>
              <span style={{ color: COLORS.primary }}>{money(saleResult.total)}</span>
            </div>
          <button onClick={resetSale} style={primaryBtnStyle}>New sale</button>
        </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Sales" subtitle="Select products, set quantities, and complete the sale." />
      {error && (
        <div style={{ background: COLORS.roseSoft, color: COLORS.rose, borderRadius: 10, padding: "10px 16px", fontFamily: "Inter", fontSize: 13, marginBottom: 18, display: "flex", justifyContent: "space-between" }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: COLORS.rose, cursor: "pointer", fontWeight: 700 }}>x</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid " + COLORS.line, borderRadius: 9, padding: "8px 12px", marginBottom: 16, maxWidth: 400 }}>
            <Search size={15} color={COLORS.sub} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, SKU, category" style={{ border: "none", outline: "none", fontFamily: "Inter", fontSize: 13.5, width: "100%" }} />
          </div>
          <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 14, overflow: "auto" }}>
            <table style={{ minWidth: 500 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="row-hover">
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: COLORS.sub }}>{p.sku}</div>
                    </td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.stock}</td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", color: COLORS.sub }}>{money(p.price)}</td>
                    <td>
                      <button onClick={() => addToCart(p)} style={{ ...iconBtnStyle, background: COLORS.primarySoft, color: COLORS.primary, width: 32, height: 32, borderRadius: 8, border: "1px solid " + COLORS.primary + "22" }} title="Add to cart">
                        <Plus size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: COLORS.sub, padding: 30 }}>
                      {search ? "No products match your search." : "No products with stock available."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        <div style={{ width: 380, minWidth: 320, background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 14, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 140px)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid " + COLORS.line, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: 0, color: COLORS.ink, display: "flex", alignItems: "center", gap: 8 }}><ShoppingCart size={18} /> Cart</h3>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.sub, background: COLORS.bg, padding: "2px 10px", borderRadius: 20 }}>{cartItemCount} {cartItemCount === 1 ? "item" : "items"}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", color: COLORS.sub, fontFamily: "Inter", fontSize: 13, padding: "40px 20px" }}>
                <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ margin: 0 }}>Your cart is empty.<br />Browse products and click + to add items.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid " + COLORS.line }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.product.name}</div>
<div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: COL
                    <button onClick={() => updateQty(item.product.id, item.units - 1)} style={{ ...iconBtnStyle, width: 28, height: 28, border: "1px solid " + COLORS.line, borderRadius: 6 }}><Minus size={12} /></button>
                    <input type="number" min={1} max={item.product.stock} value={item.units} onChange={(e) => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      if (val !== "" && !isNaN(val)) updateQty(item.product.id, val);
                    }} style={{ width: 48, textAlign: "center", border: "1px solid " + COLORS.line, borderRadius: 6, padding: "4px 2px", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", outline: "none" }} />
                    <button onClick={() => updateQty(item.product.id, item.units + 1)} style={{ ...iconBtnStyle, width: 28, height: 28, border: "1px solid " + COLORS.line, borderRadius: 6 }} disabled={item.units >= item.product.stock}><Plus size={12} /></button>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 500, minWidth: 60, textAlign: "right", color: COLORS.ink }}>{money(item.units * item.product.price)}</div>
                  <button onClick={() => removeFromCart(item.product.id)} style={{ ...iconBtnStyle, color: COLORS.rose, flexShrink: 0 }} title="Remove"><Trash2 size={14} /></button>
                </div>
              ))
            )}
          </div>
          <div style={{ borderTop: "1px solid " + COLORS.line, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: cart.length > 0 ? 16 : 0 }}>
              <span style={{ fontFamily: "Inter", fontSize: 14, fontWeight: 600, color: COLORS.sub }}>Total</span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: COLORS.primary }}>{money(cartTotal)}</span>
            </div>
            {cart.length > 0 && (
              <button onClick={handleCompleteSale} disabled={submitting} style={{ ...primaryBtnStyle, width: "100%", padding: "12px 20px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {submitting ? "Processing..." : <><CheckCircle size={18} /> Complete sale</>}
              </button>
            )}
          </div>
      </div>
        </div>
    </div>
  </div>
  );
}
