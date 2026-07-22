import React, { useState } from "react";
import { AlertTriangle, Boxes, PackageCheck, Search, X, ChevronRight, Download } from "lucide-react";
import { COLORS, money, secondaryBtnStyle, iconBtnStyle, primaryBtnStyle } from "../styles.js";
import { KpiCard, SectionHeader, StatusPill } from "./Shared.jsx";
import { PurchaseOrderModal } from "./Modals.jsx";
import { downloadCSV } from "../csv.js";

const ALERT_FILTERS = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "reorder", label: "Reorder soon" },
  { id: "out", label: "Out of stock" },
  { id: "ordered", label: "On order" },
];

const SORTS = [
  { id: "urgency", label: "Urgency (days left)" },
  { id: "cost", label: "Suggested order cost" },
  { id: "name", label: "Name (A–Z)" },
];

export default function Alerts({ products, needsAttention, metrics, orders, onSelectProduct, onPlaceOrder, onCancelOrder, onReceive, alertOrdered = {}, onAlertMarkOrdered, onAlertReceive, onAlertCancel }) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("urgency");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState({});
  const [poOpen, setPoOpen] = useState(false);

  const orderedIds = [...new Set([...Object.keys(orders), ...Object.keys(alertOrdered)])];
  const pool = filter === "ordered"
    ? products.filter((p) => orderedIds.includes(p.id))
    : (filter === "all" ? needsAttention : needsAttention.filter((p) => metrics[p.id].status === filter));

  const visible = pool
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "urgency") return metrics[a.id].daysOfStock - metrics[b.id].daysOfStock;
      if (sortBy === "cost") return metrics[b.id].suggestedOrder * b.unitCost - metrics[a.id].suggestedOrder * a.unitCost;
      return a.name.localeCompare(b.name);
    });

  const selectedProducts = visible.filter((p) => selected[p.id]);
  const totalSuggestedCost = needsAttention.reduce((a, p) => a + metrics[p.id].suggestedOrder * p.unitCost, 0);
  const criticalCount = needsAttention.filter((p) => metrics[p.id].status === "critical" || metrics[p.id].status === "out").length;

  const exportCSV = () => {
    const header = ["Name", "SKU", "Stock", "Reorder point", "Lead time (days)", "Days left", "Suggested order", "Suggested order cost", "Status"];
    const rows = visible.map((p) => {
      const m = metrics[p.id];
      return [p.name, p.sku, p.stock, m.reorderPoint, p.leadTimeDays, Number.isFinite(m.daysOfStock) ? Math.round(m.daysOfStock) : "", m.suggestedOrder, m.suggestedOrder * p.unitCost, m.status];
    });
    downloadCSV(`stockline-alerts-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  };

  const toggleAll = () => {
    const allSelected = visible.length > 0 && visible.every((p) => selected[p.id]);
    const next = { ...selected };
    visible.forEach((p) => (next[p.id] = !allSelected));
    setSelected(next);
  };

  return (
    <div>
      <SectionHeader
        title="Alerts"
        subtitle="Products at or below their reorder point, ranked by urgency."
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportCSV} style={secondaryBtnStyle}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Download size={15} /> Export CSV</span>
            </button>
            {selectedProducts.length > 0 && (
              <button onClick={() => setPoOpen(true)} style={primaryBtnStyle}>
                Create purchase order ({selectedProducts.length})
              </button>
            )}
          </div>
        }
      />

      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <KpiCard icon={AlertTriangle} label="Open alerts" value={needsAttention.length}
          sub={`${criticalCount} critical or out of stock`} tone={{ color: COLORS.amber, soft: COLORS.amberSoft }} />
        <KpiCard icon={Boxes} label="Suggested reorder value" value={money(totalSuggestedCost)}
          sub="Across all open alerts" tone={{ color: COLORS.primary, soft: COLORS.primarySoft }} />
        <KpiCard icon={PackageCheck} label="On order" value={orderedIds.length}
          sub="Awaiting delivery" tone={{ color: COLORS.teal, soft: COLORS.tealSoft }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ALERT_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              border: `1px solid ${filter === f.id ? COLORS.primary : COLORS.line}`,
              background: filter === f.id ? COLORS.primarySoft : "#fff",
              color: filter === f.id ? COLORS.primary : COLORS.ink,
              borderRadius: 20, padding: "6px 13px", fontFamily: "Inter", fontSize: 12.5, fontWeight: 500, cursor: "pointer",
            }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 9, padding: "6px 10px" }}>
            <Search size={14} color={COLORS.sub} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
              style={{ border: "none", outline: "none", fontFamily: "Inter", fontSize: 13, width: 120 }} />
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ border: `1px solid ${COLORS.line}`, borderRadius: 9, padding: "7px 10px", fontFamily: "Inter", fontSize: 12.5, color: COLORS.ink, background: "#fff" }}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>Sort: {s.label}</option>)}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 40, textAlign: "center" }}>
          <PackageCheck size={28} color={COLORS.teal} style={{ marginBottom: 10 }} />
          <p style={{ fontFamily: "Inter", color: COLORS.sub, margin: 0 }}>
            {needsAttention.length === 0 ? "Every SKU is above its reorder point. Nothing needs action right now." : "No alerts match this filter or search."}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 4 }}>
            <input type="checkbox" checked={visible.length > 0 && visible.every((p) => selected[p.id])} onChange={toggleAll} />
            <span style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub }}>Select all shown</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visible.map((p) => {
              const m = metrics[p.id];
              const meta = { ok: COLORS.teal, reorder: COLORS.amber, critical: COLORS.rose, out: COLORS.rose }[m.status];
              const order = orders[p.id];
              const eta = Number.isFinite(m.daysOfStock)
                ? new Date(Date.now() + Math.round(m.daysOfStock) * 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : null;
              return (
                <div key={p.id} style={{
                  background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderLeft: `4px solid ${meta}`,
                  borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
                }}>
                  <input type="checkbox" checked={!!selected[p.id]}
                    onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))} />
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onSelectProduct(p.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: COLORS.ink }}>{p.name}</span>
                      {(order || alertOrdered[p.id]) && (
                        <span style={{ fontFamily: "Inter", fontSize: 10.5, fontWeight: 600, color: COLORS.teal, background: COLORS.tealSoft, padding: "2px 8px", borderRadius: 20 }}>
                          On order · {order ? order.qty + ' units' : 'Awaiting'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "Inter", fontSize: 12.5, color: COLORS.sub, marginTop: 2 }}>
                      {p.stock} units on hand · reorder point {m.reorderPoint} · lead time {p.leadTimeDays}d
                      {eta && <> · runs out ~{eta}</>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 90 }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: meta }}>
                      {Number.isFinite(m.daysOfStock) ? `${Math.round(m.daysOfStock)}d left` : "—"}
                    </div>
                    <div style={{ fontFamily: "Inter", fontSize: 11.5, color: COLORS.sub }}>
                      order {m.suggestedOrder} · {money(m.suggestedOrder * p.unitCost)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(order || alertOrdered[p.id]) ? (
                      <>
                        <button onClick={() => order ? onReceive(p) : onAlertReceive(p.id)} style={secondaryBtnStyle}>Receive</button>
                        <button onClick={() => order ? onCancelOrder(order.orderId) : onAlertCancel(p.id)} style={{...iconBtnStyle, color: COLORS.rose}} title={order ? 'Cancel order' : 'Cancel alert order'}><X size={16} /></button>
                      </>
                    ) : (
                      <button onClick={() => onAlertMarkOrdered ? onAlertMarkOrdered(p.id) : onPlaceOrder(p.id, m.suggestedOrder)} style={secondaryBtnStyle}>Mark ordered</button>
                    )}
                    <button onClick={() => onSelectProduct(p.id)} style={iconBtnStyle}><ChevronRight size={18} color={COLORS.sub} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {poOpen && (
        <PurchaseOrderModal
          items={selectedProducts.map((p) => ({ product: p, qty: metrics[p.id].suggestedOrder, cost: metrics[p.id].suggestedOrder * p.unitCost }))}
          onClose={() => setPoOpen(false)}
          onConfirm={async () => {
            for (const p of selectedProducts) await onPlaceOrder(p.id, metrics[p.id].suggestedOrder);
            setSelected({});
            setPoOpen(false);
          }}
        />
      )}
    </div>
  );
}
