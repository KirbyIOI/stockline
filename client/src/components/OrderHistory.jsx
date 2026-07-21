import React, { useState, useEffect } from "react";
import { Search, Download, Clock, CheckCircle, XCircle } from "lucide-react";
import { COLORS, money, secondaryBtnStyle } from "../styles.js";
import { SectionHeader } from "./Shared.jsx";
import { api } from "../api.js";
import { downloadCSV } from "../csv.js";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "received", label: "Received" },
  { id: "cancelled", label: "Cancelled" },
];
const META = {
  open: { label: "Open", color: COLORS.amber, icon: Clock },
  received: { label: "Received", color: COLORS.teal, icon: CheckCircle },
  cancelled: { label: "Cancelled", color: COLORS.rose, icon: XCircle },
};

function Badge({ status }) {
  const m = META[status] || META.cancelled;
  const I = m.icon;
  return React.createElement("span", {
    style: {
      fontFamily: "Inter",
      fontSize: 11,
      fontWeight: 600,
      color: m.color,
      background: m.color + "18",
      padding: "3px 10px",
      borderRadius: 20,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
    }
  }, React.createElement(I, { size: 12 }), m.label);
}

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getOrders().then(setOrders).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const f = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search && !(o.productName || "").toLowerCase().includes(search.toLowerCase()) && !(o.productSku || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const mainDiv = React.createElement("div", null,
    React.createElement(SectionHeader, {
      title: "Purchase Order History",
      subtitle: "All stock orders placed to suppliers.",
      action: React.createElement("button", {
        onClick: () => {
          const h = ["Date Placed", "Product", "SKU", "Qty", "Status", "Date Received"];
          const r = f.map((o) => [o.placedAt, o.productName || "---", o.productSku || "---", o.qty, o.status, o.receivedAt || "---"]);
          downloadCSV(`orders-${new Date().toISOString().slice(0, 10)}.csv`, [h, ...r]);
        },
        disabled: f.length === 0,
        style: secondaryBtnStyle,
      }, React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 6 } }, React.createElement(Download, { size: 15 }), " Export CSV")),
    }),
    React.createElement("div", { style: { display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" } },
      React.createElement("div", { style: { background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 } },
        React.createElement("div", { style: { fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 } }, "Total"),
        React.createElement("div", { style: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.ink } }, orders.length),
      ),
      React.createElement("div", { style: { background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 } },
        React.createElement("div", { style: { fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 } }, "Open"),
        React.createElement("div", { style: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.amber } }, orders.filter((o) => o.status === "open").length),
      ),
      React.createElement("div", { style: { background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 } },
        React.createElement("div", { style: { fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 } }, "Received"),
        React.createElement("div", { style: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.teal } }, orders.filter((o) => o.status === "received").length),
      ),
      React.createElement("div", { style: { background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 } },
        React.createElement("div", { style: { fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 } }, "Cancelled"),
        React.createElement("div", { style: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.rose } }, orders.filter((o) => o.status === "cancelled").length),
      ),
    ),
    React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid " + COLORS.line, borderRadius: 9, padding: "8px 12px", flex: 1, maxWidth: 320 } },
        React.createElement(Search, { size: 15, color: COLORS.sub }),
        React.createElement("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search by name or SKU", style: { border: "none", outline: "none", fontFamily: "Inter", fontSize: 13.5, width: "100%" } }),
      ),
      React.createElement("div", { style: { display: "flex", gap: 4 } },
        FILTERS.map((fi) => React.createElement("button", {
          key: fi.id,
          onClick: () => setFilter(fi.id),
          style: {
            fontFamily: "Inter",
            fontSize: 12.5,
            fontWeight: filter === fi.id ? 600 : 400,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid " + COLORS.line,
            background: filter === fi.id ? COLORS.primary : "#fff",
            color: filter === fi.id ? "#fff" : COLORS.ink,
            cursor: "pointer",
          }
        }, fi.label)),
      ),
    ),
    React.createElement("div", { style: { background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 14, overflow: "hidden" } },
      React.createElement("table", null,
        React.createElement("thead", null, React.createElement("tr", null,
          React.createElement("th", null, "Date Placed"),
          React.createElement("th", null, "Product"),
          React.createElement("th", null, "SKU"),
          React.createElement("th", null, "Qty"),
          React.createElement("th", null, "Status"),
          React.createElement("th", null, "Received"),
        )),
        React.createElement("tbody", null,
          loading
            ? React.createElement("tr", null, React.createElement("td", { colSpan: 6, style: { textAlign: "center", color: COLORS.sub, padding: 30 } }, "Loading..."))
            : f.length === 0
              ? React.createElement("tr", null, React.createElement("td", { colSpan: 6, style: { textAlign: "center", color: COLORS.sub, padding: 30 } }, search || filter !== "all" ? "No matches." : "No orders yet."))
              : f.map((o) => React.createElement("tr", { key: o.id },
                  React.createElement("td", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: COLORS.sub, whiteSpace: "nowrap" } }, new Date(o.placedAt).toLocaleString()),
                  React.createElement("td", { style: { fontWeight: 500 } }, o.productName || "---"),
                  React.createElement("td", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: COLORS.sub } }, o.productSku || "---"),
                  React.createElement("td", { style: { fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600 } }, o.qty),
                  React.createElement("td", null, React.createElement(Badge, { status: o.status })),
                  React.createElement("td", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: COLORS.sub, whiteSpace: "nowrap" } }, o.receivedAt ? new Date(o.receivedAt).toLocaleString() : "---"),
                )),
        ),
      ),
    ),
    error ? React.createElement("div", { style: { background: COLORS.roseSoft, color: COLORS.rose, borderRadius: 8, padding: "10px 16px", fontFamily: "Inter", fontSize: 13, marginTop: 16 } }, error) : null,
  );
  return mainDiv;
}
