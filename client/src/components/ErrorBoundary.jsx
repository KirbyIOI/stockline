import React from "react";
import { AlertTriangle } from "lucide-react";
import { COLORS, primaryBtnStyle } from "../styles.js";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In production you'd wire this to a logging service. Kept as a plain
    // console.error so it's visible in the browser dev tools without
    // requiring any extra setup.
    console.error("Stockline crashed:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: COLORS.bg, fontFamily: "Inter, sans-serif", padding: 20,
      }}>
        <div style={{
          background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16,
          padding: "30px 28px", maxWidth: 420, textAlign: "center",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: COLORS.roseSoft, display: "flex",
            alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          }}>
            <AlertTriangle size={22} color={COLORS.rose} />
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, margin: "0 0 8px", color: COLORS.ink }}>
            Something went wrong
          </h2>
          <p style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, margin: "0 0 20px", lineHeight: 1.5 }}>
            Stockline hit an unexpected error and had to stop. Your data on the server is safe —
            reloading the page usually fixes this.
          </p>
          <button onClick={() => window.location.reload()} style={primaryBtnStyle}>
            Reload Stockline
          </button>
        </div>
      </div>
    );
  }
}
