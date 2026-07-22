import React, { useState } from "react";
import { X } from "lucide-react";
import {
  overlayStyle, modalStyle, fieldLabelStyle, inputStyle,
  iconBtnStyle, primaryBtnStyle, secondaryBtnStyle, COLORS, money,
} from "../styles.js";

export function ProductModal({ initial, onClose, onSave, error, allCategories = [] }) {
  const [form, setForm] = useState(initial || {
    name: "", sku: "", category: "", stock: 0, unitCost: 0, price: 0, leadTimeDays: 14, safetyStock: 10,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const numField = (k, label, step = 1) => (
    <label style={fieldLabelStyle}>
      {label}
      <input
        type="number" step={step} value={form[k]}
        onChange={(e) => set(k, e.target.value === "" ? "" : Number(e.target.value))}
        style={inputStyle}
      />
    </label>
  );
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontFamily: "\"Space Grotesk\", sans-serif", fontSize: 18, margin: 0, color: COLORS.ink }}>
            {initial ? "Edit product" : "Add product"}
          </h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>
        {error && (
          <div style={{ background: COLORS.roseSoft, color: COLORS.rose, borderRadius: 8, padding: "8px 12px", fontFamily: "Inter", fontSize: 12.5, marginBottom: 14 }}>
            {error}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label style={{ ...fieldLabelStyle, gridColumn: "1 / -1" }}>
            Product name
            <input value={form.name} onChange={(e) => set("name", e.target.value)} style={inputStyle} placeholder="e.g. Wimbi Flour 50kg" />
          </label>
          <label style={fieldLabelStyle}>
            SKU
            <input value={form.sku} onChange={(e) => set("sku", e.target.value)} style={inputStyle} placeholder="WMB-050" />
          </label>
          <label style={fieldLabelStyle}>
            Category
            <input value={form.category} onChange={(e) => set("category", e.target.value)} style={inputStyle} placeholder="Grains and Flour" list="category-list" />
            <datalist id="category-list">
              {allCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </label>
          {numField("stock", "Current stock (units)")}
          {numField("unitCost", "Unit cost (TSh)", 500)}
          {numField("price", "Sale price (TSh)", 500)}
          {numField("leadTimeDays", "Supplier lead time (days)")}
          {numField("safetyStock", "Safety stock (units)")}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onSave(form)} style={primaryBtnStyle} disabled={!form.name || !form.sku}>
            {initial ? "Save changes" : "Add product"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SaleModal({ product, onClose, onRecord }) {
  const [units, setUnits] = useState(0);
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "\"Space Grotesk\", sans-serif", fontSize: 17, margin: 0 }}>Record this week's sales</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>
        <p style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, marginTop: 0 }}>{product.name} &middot; {product.sku}</p>
        <label style={fieldLabelStyle}>
          Units sold this week
          <input type="number" min={0} value={units} onChange={(e) => setUnits(Number(e.target.value))} style={inputStyle} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onRecord(units)} style={primaryBtnStyle}>Record and update stock</button>
        </div>
      </div>
    </div>
  );
}

export function ReceiveModal({ product, suggested, onClose, onReceive }) {
  const [units, setUnits] = useState(suggested || 0);
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "\"Space Grotesk\", sans-serif", fontSize: 17, margin: 0 }}>Receive shipment</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>
        <p style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, marginTop: 0 }}>{product.name} &middot; {product.sku}</p>
        <label style={fieldLabelStyle}>
          Units received
          <input type="number" min={0} value={units} onChange={(e) => setUnits(Number(e.target.value))} style={inputStyle} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onReceive(units)} style={primaryBtnStyle}>Add to stock</button>
        </div>
      </div>
    </div>
  );
}

export function PurchaseOrderModal({ items, onClose, onConfirm }) {
  const total = items.reduce((a, i) => a + i.cost, 0);
  const text = [
    "PURCHASE ORDER",
    new Date().toLocaleDateString(),
    "",
    ...items.map((i) => i.product.name + " (" + i.product.sku + ") - " + i.qty + " units - " + money(i.cost)),
    "",
    "Total: " + money(total),
  ].join("\n");
  const [copied, setCopied] = useState(false);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "\"Space Grotesk\", sans-serif", fontSize: 17, margin: 0 }}>Purchase order draft</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>
        <div style={{ border: "1px solid " + COLORS.line, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
          {items.map((i) => (
            <div key={i.product.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid " + COLORS.line, fontFamily: "Inter", fontSize: 13 }}>
              <span style={{ flex: 1 }}>{i.product.name} <span style={{ color: COLORS.sub, fontFamily: "\"IBM Plex Mono\", monospace", fontSize: 11.5 }}>{i.qty} units</span></span>
              <span style={{ fontFamily: "\"IBM Plex Mono\", monospace" }}>{money(i.cost)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontFamily: "Inter", fontWeight: 700, fontSize: 13.5, background: "#FAFBFD" }}>
            <span>Total</span><span style={{ fontFamily: "\"IBM Plex Mono\", monospace" }}>{money(total)}</span>
          </div>
        </div>
        <textarea readOnly value={text} rows={items.length + 4}
          style={{ ...inputStyle, width: "100%", resize: "vertical", fontSize: 12.5, marginBottom: 6 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <button
            onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={secondaryBtnStyle}
          >
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
          <button onClick={onConfirm} style={primaryBtnStyle}>Mark items as ordered</button>
        </div>
      </div>
    </div>
  );
}
