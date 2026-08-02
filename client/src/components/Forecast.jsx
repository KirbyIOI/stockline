import React, { useMemo } from "react";
import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { COLORS, primaryBtnStyle } from "../styles.js";
import { SectionHeader, StatCard } from "./Shared.jsx";

export default function Forecast({ products, selected, detail, onSelect }) {
  const metrics = detail?.metrics;

  const chartData = useMemo(() => {
    if (!detail || !metrics) return [];
    const hist = detail.weekly.map((v, i) => ({ week: `Wk ${i + 1}`, actual: v }));
    const lastIdx = hist.length;
    const forecastPts = metrics.forecast.map((f, i) => ({
      week: `Wk ${lastIdx + i + 1}`, forecast: f.value, band: [f.low, f.high],
    }));
    if (hist.length) hist[hist.length - 1] = { ...hist[hist.length - 1], forecast: hist[hist.length - 1].actual };
    return [...hist, ...forecastPts];
  }, [detail, metrics]);

  return (
    <div>
      <SectionHeader title="Sales Forecast" subtitle="Linear-trend projection with a residual-based confidence band, computed by the backend." />
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              border: `1px solid ${p.id === selected?.id ? COLORS.primary : COLORS.line}`,
              background: p.id === selected?.id ? COLORS.primarySoft : "#fff",
              color: p.id === selected?.id ? COLORS.primary : COLORS.ink,
              borderRadius: 20, padding: "6px 13px", fontFamily: "Inter", fontSize: 12.5, fontWeight: 500, cursor: "pointer",
            }}
          >
            {p.displayName || p.name}
          </button>
        ))}
      </div>

      {!detail || !metrics ? (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 60, textAlign: "center", color: COLORS.sub, fontFamily: "Inter" }}>
          Loading forecast…
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "2 1 480px", background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "18px 20px" }}>
            <ForecastHeader detail={detail} metrics={metrics} />
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 6, right: 10, left: -14, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.line} vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fontFamily: "Inter", fill: COLORS.sub }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: "Inter", fill: COLORS.sub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12.5, borderRadius: 8, border: `1px solid ${COLORS.line}` }} />
                <Legend wrapperStyle={{ fontFamily: "Inter", fontSize: 12 }} />
                <Area dataKey="band" fill={COLORS.primary} fillOpacity={0.08} stroke="none" name="Confidence band" legendType="none" />
                <Bar dataKey="actual" fill={COLORS.primarySoft} radius={[4, 4, 0, 0]} name="Actual sales" barSize={16} />
                <Line dataKey="forecast" stroke={COLORS.primary} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 2.5 }} name="Forecast" />
              </ComposedChart>
            </ResponsiveContainer>
            <ReorderSummary product={detail} metrics={metrics} />
          </div>

          <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 14 }}>
            <StatCard label="Avg. weekly sell-through" value={`${metrics.avgWeekly.toFixed(1)} units`} />
            <StatCard label="Forecasted demand, next 6 wks" value={`${metrics.demandNext6} units`} />
            <StatCard label="Reorder point" value={`${metrics.reorderPoint} units`} />
            <StatCard label="Suggested order quantity" value={`${metrics.suggestedOrder} units`} highlight={metrics.suggestedOrder > 0} />
          </div>
        </div>
      )}
    </div>
  );
}

function ReorderSummary({ product, metrics }) {
  // Plain-language explanation of why this reorder quantity is suggested,
  // tying the sales trend to the number below the chart.
  const slope = metrics.slope;
  const trendWord = slope > 0.15 ? "rising" : slope < -0.15 ? "declining" : "holding steady";
  const direction = slope > 0.15 ? "up" : slope < -0.15 ? "down" : "steady";
  const runway =
    Number.isFinite(metrics.daysOfStock)
      ? `${Math.round(metrics.daysOfStock)} days of current stock left`
      : "no recent sales history to project a runway";
  const need = `next-6-week demand of ${metrics.demandNext6} units`;

  const reason =
    metrics.suggestedOrder <= 0
      ? `Sales are ${trendWord} and you already hold ${product.stock} units, so no reorder is suggested right now — current stock covers ${need}.`
      : `With sales ${trendWord} (${direction === "up" ? "rising" : direction === "down" ? "declining" : "holding steady"} at ${Math.abs(slope).toFixed(1)} units/week) and ${runway}, the suggested reorder of ${metrics.suggestedOrder} units tops your stock back up toward the ${metrics.reorderPoint}-unit reorder point plus the next ${need}.`;

  return (
    <div style={{
      marginTop: 14, padding: "12px 14px", borderRadius: 10, fontFamily: "Inter", fontSize: 12.5, lineHeight: 1.55,
      background: "#EFF6FF", border: `1px solid #BFDBFE`, color: COLORS.ink,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 3, color: COLORS.primary }}>Why reorder {metrics.suggestedOrder} units?</div>
      {reason}
    </div>
  );
}

function ForecastHeader({ detail, metrics }) {
  const trendLabel = metrics.slope > 0.15 ? "trending up" : metrics.slope < -0.15 ? "trending down" : "roughly flat";
  const TrendIcon = metrics.slope > 0.15 ? ArrowUpRight : metrics.slope < -0.15 ? ArrowDownRight : Clock;
  const trendColor = metrics.slope > 0.15 ? COLORS.teal : metrics.slope < -0.15 ? COLORS.rose : COLORS.sub;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: 0 }}>{detail.displayName || detail.name}</h3>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: COLORS.sub }}>{detail.sku} · {detail.category}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: trendColor, fontFamily: "Inter", fontSize: 12.5, fontWeight: 600 }}>
        <TrendIcon size={15} /> {trendLabel}
      </div>
    </div>
  );
}

