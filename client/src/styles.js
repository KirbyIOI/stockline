export const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');";

export const COLORS = {
  bg: "#F3F5F9",
  panel: "#FFFFFF",
  ink: "#101828",
  sub: "#5B6472",
  line: "#E3E7EE",
  primary: "#4338CA",
  primarySoft: "#EEF0FD",
  teal: "#0D9488",
  tealSoft: "#E6F5F3",
  amber: "#B45309",
  amberSoft: "#FDF1E1",
  rose: "#BE123C",
  roseSoft: "#FCE9EE",
};

export const STATUS_META = {
  ok: { label: "Healthy", color: COLORS.teal, soft: COLORS.tealSoft },
  reorder: { label: "Reorder soon", color: COLORS.amber, soft: COLORS.amberSoft },
  critical: { label: "Critical", color: COLORS.rose, soft: COLORS.roseSoft },
  out: { label: "Out of stock", color: COLORS.rose, soft: COLORS.roseSoft },
};

// Currency symbol is configurable from Settings (admin only) and applies
// everywhere money() is used, without needing to thread it through props —
// App.jsx calls setCurrencySymbol() once after loading settings on startup.
let _currencySymbol = "TSh";
export const setCurrencySymbol = (symbol) => { _currencySymbol = symbol || "TSh"; };
export const money = (n) => `${_currencySymbol} ${Math.round(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(16,24,40,0.45)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20,
};
export const modalStyle = {
  background: COLORS.panel, borderRadius: 16, padding: 24, width: "100%", maxWidth: 520,
  boxShadow: "0 20px 60px rgba(16,24,40,0.25)", fontFamily: "Inter",
};
export const fieldLabelStyle = {
  display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: COLORS.sub, fontWeight: 500,
};
export const inputStyle = {
  border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 14,
  fontFamily: "'IBM Plex Mono', monospace", color: COLORS.ink, outline: "none",
};
export const iconBtnStyle = {
  border: "none", background: "transparent", cursor: "pointer", color: COLORS.sub,
  width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8,
};
export const primaryBtnStyle = {
  background: COLORS.primary, color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px",
  fontFamily: "Inter", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
};
export const secondaryBtnStyle = {
  background: "#fff", color: COLORS.ink, border: `1px solid ${COLORS.line}`, borderRadius: 9,
  padding: "9px 18px", fontFamily: "Inter", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
};
