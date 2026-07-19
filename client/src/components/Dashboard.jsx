import React from "react";
import { TrendingUp, Boxes, AlertTriangle, PackageX } from "lucide-react";
import { COLORS, money } from "../styles.js";
import { KpiCard, SectionHeader, RunwayBar, StatusPill } from "./Shared.jsx";

export default function Dashboard({ products, metrics, summary, needsAttention, onSelectProduct }) {
  return (
    <div>
      <SectionHeader title="Dashboard" subtitle="Live snapshot of revenue, inventory health, and restock urgency." />
      <div style={{ display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <KpiCard icon={TrendingUp} label="Revenue, last 4 weeks" value={money(summary?.last4WeeksRevenue)}
          sub={summary ? `${summary.revenueDelta >= 0 ? "+" : ""}${summary.revenueDelta.toFixed(1)}% vs prior 4 weeks` : "…"}
          tone={{ color: COLORS.primary, soft: COLORS.primarySoft }} />
        <KpiCard icon={Boxes} label="Inventory value" value={money(summary?.totalInventoryValue)}
          sub={`${products.length} SKUs tracked`} tone={{ color: COLORS.teal, soft: COLORS.tealSoft }} />
        <KpiCard icon={AlertTriangle} label="Needs attention" value={needsAttention.length}
          sub="Below reorder point or critical" tone={{ color: COLORS.amber, soft: COLORS.amberSoft }} />
        <KpiCard icon={PackageX} label="Out of stock" value={products.filter((p) => metrics[p.id].status === "out").length}
          sub="Zero units on hand" tone={{ color: COLORS.rose, soft: COLORS.roseSoft }} />
      </div>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15.5, margin: 0, color: COLORS.ink }}>Stock runway</h3>
          <span style={{ fontSize: 12, color: COLORS.sub, fontFamily: "Inter" }}>Days of inventory left at current sell-through rate</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {products
            .slice()
            .sort((a, b) => metrics[a.id].daysOfStock - metrics[b.id].daysOfStock)
            .map((p) => (
              <div key={p.id} onClick={() => onSelectProduct(p.id)} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13.5, color: COLORS.ink }}>{p.name}</span>
                  <StatusPill status={metrics[p.id].status} />
                </div>
                <RunwayBar p={p} m={metrics[p.id]} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
