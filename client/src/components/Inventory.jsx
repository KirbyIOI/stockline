import React from "react";
import { Plus, Search, TrendingUp, Pencil, Trash2, Download, ShoppingCart } from "lucide-react";
import { COLORS, primaryBtnStyle, secondaryBtnStyle, iconBtnStyle } from "../styles.js";
import { SectionHeader, RunwayBar, StatusPill } from "./Shared.jsx";
import { downloadCSV } from "../csv.js";

export default function Inventory({ products, metrics, search, setSearch, onAdd, onEdit, onDelete, onRecordSale, onSelectProduct }) {
  const exportCSV = () => {
    const header = ["Name", "SKU", "Category", "Stock", "Reorder point", "Days runway", "Status", "Unit cost", "Price"];
    const rows = products.map((p) => {
      const m = metrics[p.id];
      return [p.name, p.sku, p.category, p.stock, m.reorderPoint, Number.isFinite(m.daysOfStock) ? Math.round(m.daysOfStock) : "", m.status, p.unitCost, p.price];
    });
    downloadCSV(`stockline-inventory-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  };

  return (
    <div>
      <SectionHeader
        title="Inventory" subtitle="Every SKU, its stock position, and reorder status."
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportCSV} style={secondaryBtnStyle}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Download size={15} /> Export CSV</span>
            </button>
            <button onClick={onAdd} style={primaryBtnStyle}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Plus size={15} /> Add product</span>
            </button>
          </div>
        }
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 9, padding: "8px 12px", marginBottom: 16, maxWidth: 320 }}>
        <Search size={15} color={COLORS.sub} />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, SKU, category"
          style={{ border: "none", outline: "none", fontFamily: "Inter", fontSize: 13.5, width: "100%" }}
        />
      </div>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Stock</th><th>Reorder pt.</th><th>Runway</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const m = metrics[p.id];
              return (
                <tr key={p.id} className="row-hover">
                  <td>
                    <div onClick={() => onSelectProduct(p.id)} style={{ cursor: "pointer" }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: COLORS.sub }}>{p.sku}</div>
                  </td>
                  <td style={{ color: COLORS.sub }}>{p.category}</td>
                  <td style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.stock}</td>
                  <td style={{ fontFamily: "'IBM Plex Mono', monospace", color: COLORS.sub }}>{m.reorderPoint}</td>
                  <td style={{ width: 160 }}><RunwayBar p={p} m={m} /></td>
                  <td><StatusPill status={m.status} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
                      <button
                        title="Record sale — automatically decreases stock"
                        onClick={() => onRecordSale(p)}
                        style={{
                          ...iconBtnStyle,
                          background: "#E8F5E9",
                          color: "#2E7D32",
                          fontWeight: 600,
                          fontSize: 11.5,
                          padding: "6px 10px",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          border: "1px solid #C8E6C9",
                        }}
                      >
                        <ShoppingCart size={13} /> Record sale
                      </button>
                      <button
                        title="Edit product details, price, stock correction"
                        onClick={() => onEdit(p)}
                        style={{
                          ...iconBtnStyle,
                          background: "#FFF3E0",
                          color: "#E65100",
                          fontSize: 11,
                          padding: "6px 8px",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          border: "1px solid #FFE0B2",
                        }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button title="Delete product" onClick={() => onDelete(p.id)} style={iconBtnStyle}><Trash2 size={15} color={COLORS.rose} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: COLORS.sub, padding: 30 }}>No products match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
  );
}
