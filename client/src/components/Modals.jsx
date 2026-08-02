import React, { useState } from "react";
import { X, AlertCircle, TrendingUp } from "lucide-react";
import {
  overlayStyle, modalStyle, fieldLabelStyle, inputStyle,
  iconBtnStyle, primaryBtnStyle, secondaryBtnStyle, COLORS, money,
} from "../styles.js";

// Fixed product categories offered as a dropdown when creating/editing a
// product. The "Other…" option opens a manual-entry field, and any category
// that ends up on a product is also offered afterwards (via allCategories),
// so custom categories become reusable options.
const FIXED_CATEGORIES = [
  "Grains & Flour",
  "Cooking Oil",
  "Textiles",
  "Building Materials",
  "Electronics",
];
const OTHER_CATEGORY = "__other__";

// SI and common retail units offered as a dropdown for the "unit label" field,
// so bulk products like "Wimbi Flour (50 kg)" or "Jerrican Oil (20 litres)"
// are entered from a fixed list instead of free text. "Quantity per unit"
// holds the amount (e.g. 20) and this list provides the unit (e.g. kg).
const UNIT_OPTIONS = [
  // Mass
  "kg", "g", "mg", "tonnes", "lb", "oz",
  // Volume
  "litres", "millilitres", "gallons",
  // Length
  "metres", "centimetres", "millimetres",
  "yards", "feet", "inches",
  // Pieces / packaging
  "pieces", "dozen", "packets", "cartons", "boxes", "rolls", "bottles", "cans",
];

export function ProductModal({ initial, onClose, onSave, error, allCategories = [] }) {
  const initialCategory = initial?.category || "";
  const isCustomInitial =
    initialCategory !== "" && !FIXED_CATEGORIES.includes(initialCategory);

  const [form, setForm] = useState(initial || {
    name: "", sku: "", category: "", stock: 0, unitCost: 0, price: 0, leadTimeDays: 14, safetyStock: 10, safetyStockAuto: true,
    qtyPerUnit: 0, qtyUnitLabel: "",
  });
  const [customOpen, setCustomOpen] = useState(isCustomInitial);
  const [customValue, setCustomValue] = useState(isCustomInitial ? initialCategory : "");
  const [localError, setLocalError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Unique category options: fixed ones first, then any categories already in
  // use (so a previously manually-entered category becomes selectable).
  const knownCategories = [
    ...FIXED_CATEGORIES,
    ...allCategories.filter((c) => c && !FIXED_CATEGORIES.includes(c)),
  ];
  if (initialCategory && !knownCategories.includes(initialCategory)) {
    knownCategories.push(initialCategory);
  }

  const cost = Number(form.unitCost) || 0;
  const price = Number(form.price) || 0;
  const margin = price - cost;
  const marginPct = price > 0 ? (margin / price) * 100 : 0;

  const selectValue = customOpen
    ? OTHER_CATEGORY
    : FIXED_CATEGORIES.includes(form.category)
    ? form.category
    : form.category || "";

  const handleCategorySelect = (e) => {
    const val = e.target.value;
    if (val === OTHER_CATEGORY) {
      setCustomOpen(true);
      setLocalError(null);
    } else {
      setCustomOpen(false);
      set("category", val);
      setLocalError(null);
    }
  };

  const handleSave = () => {
    if (cost > price) {
      setLocalError("Sale price must be greater than or equal to the unit cost — you can't sell below cost.");
      return;
    }
    let category = form.category;
    if (customOpen) {
      category = customValue.trim();
      if (!category) {
        setLocalError("Please enter a category name for the product.");
        return;
      }
    }
    setLocalError(null);
    onSave({ ...form, category });
  };

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
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, margin: 0, color: COLORS.ink }}>
            {initial ? "Edit product" : "Add product"}
          </h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>

        {(error || localError) && (
          <div style={{ background: COLORS.roseSoft, color: COLORS.rose, borderRadius: 8, padding: "8px 12px", fontFamily: "Inter", fontSize: 12.5, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={14} />
            {error || localError}
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
            <select
              value={selectValue}
              onChange={handleCategorySelect}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {!initialCategory && !customOpen && !form.category && (
                <option value="" disabled>Select a category…</option>
              )}
              {knownCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value={OTHER_CATEGORY}>Other… (enter your own)</option>
            </select>
          </label>

          {customOpen && (
            <label style={{ ...fieldLabelStyle, gridColumn: "1 / -1" }}>
              Custom category name
              <input
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Beverages"
                autoFocus
              />
            </label>
          )}

          {numField("stock", "Current stock (units)")}
          {numField("unitCost", "Unit cost", 500)}
          {numField("price", "Sale price", 500)}
          {numField("leadTimeDays", "Supplier lead time (days)")}

          <label style={fieldLabelStyle}>
            Safety stock (units)
            <input
              type="number" step={1} value={form.safetyStock}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : Number(e.target.value);
                set("safetyStock", val);
                // Typing in the field manually counts as a manual override
                if (initial?.safetyStockAuto) set("safetyStockAuto", false);
              }}
              style={inputStyle}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span style={{
                fontFamily: "Inter", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                color: form.safetyStockAuto ? COLORS.teal : COLORS.amber,
                background: (form.safetyStockAuto ? COLORS.teal : COLORS.amber) + "18",
              }}>
                {form.safetyStockAuto ? "Auto-calculated" : "Manually set"}
              </span>
              {initial && !form.safetyStockAuto && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); set("safetyStockAuto", true); }}
                  style={{ ...secondaryBtnStyle, padding: "2px 8px", fontSize: 11 }}
                >
                  Re-enable auto
                </button>
              )}
            </div>
            {form.safetyStockAuto && (
              <div style={{ fontFamily: "Inter", fontSize: 11, color: COLORS.sub, marginTop: 4 }}>
                Updated automatically from sales variability after each sale (needs 8+ weeks of history).
              </div>
            )}
          </label>

          <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
            <div style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>
              Sold in bulk / packets? <span style={{ color: COLORS.sub, fontWeight: 400 }}>(optional)</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {numField("qtyPerUnit", "Quantity per unit", 1)}
              <label style={fieldLabelStyle}>
                Unit label
                <select
                  value={form.qtyUnitLabel}
                  onChange={(e) => set("qtyUnitLabel", e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {!form.qtyUnitLabel && (
                    <option value="" disabled>Select a unit…</option>
                  )}
                  {/* Keep the existing label selectable if it isn't in the list */}
                  {form.qtyUnitLabel && !UNIT_OPTIONS.includes(form.qtyUnitLabel) && (
                    <option value={form.qtyUnitLabel}>{form.qtyUnitLabel}</option>
                  )}
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </label>
            </div>
            {Number(form.qtyPerUnit) > 0 && (
              <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginTop: 6 }}>
                Will display as: <strong style={{ color: COLORS.ink }}>{form.name || "(name)"} ({form.qtyPerUnit} {form.qtyUnitLabel || "units"})</strong>
              </div>
            )}
          </div>
        </div>

        {(cost > 0 || price > 0) && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 8, fontFamily: "Inter", fontSize: 12.5,
            background: margin < 0 ? COLORS.roseSoft : "#E8F5E9",
            color: margin < 0 ? COLORS.rose : "#2E7D32",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <TrendingUp size={14} />
            {margin < 0
              ? `Warning: selling below cost — unit cost is ${money(cost)} but sale price is ${money(price)}.`
              : `Profit per unit: ${money(margin)} (${marginPct.toFixed(1)}% margin)`}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={handleSave} style={primaryBtnStyle} disabled={!form.name || !form.sku}>
            {initial ? "Save changes" : "Add product"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SaleModal({ product, onClose, onRecord }) {
  const [units, setUnits] = useState("");
  const [saleError, setSaleError] = useState(null);
  const canSubmit = units !== "" && Number(units) > 0;
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, margin: 0 }}>Record this week's sales</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>
        <p style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, marginTop: 0 }}>
          {product.displayName || product.name} &middot; {product.sku} &middot; <strong>{product.stock} in stock</strong>
        </p>
        {saleError && (
          <div style={{ background: COLORS.roseSoft, color: COLORS.rose, borderRadius: 8, padding: "8px 12px", fontFamily: "Inter", fontSize: 12.5, marginBottom: 12 }}>
            {saleError}
          </div>
        )}
        <label style={fieldLabelStyle}>
          Units sold this week
          <input
            type="number" min={0} max={product.stock} value={units}
            onChange={(e) => {
              setSaleError(null);
              setUnits(e.target.value === "" ? "" : Number(e.target.value));
            }}
            style={inputStyle}
          />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button
            onClick={() => {
              const qty = Number(units);
              if (qty > product.stock) {
                setSaleError("Cannot sell " + qty + " units \u2014 only " + product.stock + " in stock.");
                return;
              }
              onRecord(qty);
            }}
            style={primaryBtnStyle}
            disabled={!canSubmit}
          >
            Record and update stock
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReceiveModal({ product, suggested, onClose, onReceive }) {
  const [units, setUnits] = useState(suggested || "");
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, margin: 0 }}>Receive shipment</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>
        <p style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, marginTop: 0 }}>{product.displayName || product.name} &middot; {product.sku}</p>
        <label style={fieldLabelStyle}>
          Units received
          <input type="number" min={0} value={units}
            onChange={(e) => setUnits(e.target.value === "" ? "" : Number(e.target.value))}
            style={inputStyle}
          />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onReceive(Number(units))} style={primaryBtnStyle}>Add to stock</button>
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
    ...items.map((i) => (i.product.displayName || i.product.name) + " (" + i.product.sku + ") - " + i.qty + " units - " + money(i.cost)),
    "",
    "Total: " + money(total),
  ].join("\n");
  const [copied, setCopied] = useState(false);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, margin: 0 }}>Purchase order draft</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>
        <div style={{ border: "1px solid " + COLORS.line, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
          {items.map((i) => (
            <div key={i.product.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid " + COLORS.line, fontFamily: "Inter", fontSize: 13 }}>
              <span style={{ flex: 1 }}>{i.product.displayName || i.product.name} <span style={{ color: COLORS.sub, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>{i.qty} units</span></span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{money(i.cost)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontFamily: "Inter", fontWeight: 700, fontSize: 13.5, background: "#FAFBFD" }}>
            <span>Total</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{money(total)}</span>
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

