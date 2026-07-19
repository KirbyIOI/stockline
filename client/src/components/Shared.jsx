import React from "react";
import { COLORS, STATUS_META } from "../styles.js";

export function KpiCard({ icon: Icon, label, value, sub, tone }) {
  return (
    <div style={{
      background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 180,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, fontWeight: 500 }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: tone.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={tone.color} />
        </div>
      </div>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.ink }}>{value}</span>
      {sub && <span style={{ fontFamily: "Inter", fontSize: 12.5, color: COLORS.sub }}>{sub}</span>}
    </div>
  );
}

export function StatusPill({ status }) {
  const meta = STATUS_META[status];
  return (
    <span style={{
      fontFamily: "Inter", fontSize: 11, fontWeight: 600, color: meta.color, background: meta.soft,
      padding: "2px 9px", borderRadius: 20,
    }}>{meta.label}</span>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
      <div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, margin: 0, color: COLORS.ink, fontWeight: 700 }}>{title}</h2>
        {subtitle && <p style={{ fontFamily: "Inter", fontSize: 13.5, color: COLORS.sub, margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function RunwayBar({ p, m }) {
  const cap = Math.max(m.reorderPoint * 2.2, p.stock, 1);
  const stockPct = Math.min(100, (p.stock / cap) * 100);
  const reorderPct = Math.min(100, (m.reorderPoint / cap) * 100);
  const meta = STATUS_META[m.status];
  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", height: 10, borderRadius: 6, background: "#EEF1F6", overflow: "visible" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: `${stockPct}%`,
          borderRadius: 6, background: meta.color, transition: "width .3s ease",
        }} />
        <div title={`Reorder point: ${m.reorderPoint} units`} style={{
          position: "absolute", left: `${reorderPct}%`, top: -3, bottom: -3, width: 2,
          background: COLORS.ink, opacity: 0.35,
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.sub }}>
        <span>{p.stock} in stock</span>
        <span>{Number.isFinite(m.daysOfStock) ? `${Math.round(m.daysOfStock)}d runway` : "—"}</span>
      </div>
    </div>
  );
}

export function StatCard({ label, value, highlight }) {
  return (
    <div style={{
      background: highlight ? COLORS.primarySoft : COLORS.panel,
      border: `1px solid ${highlight ? COLORS.primary : COLORS.line}`,
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: highlight ? COLORS.primary : COLORS.ink }}>{value}</div>
    </div>
  );
}
