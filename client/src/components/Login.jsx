import React, { useState } from "react";
import { Boxes, Lock, User } from "lucide-react";
import { api, auth } from "../api.js";
import { COLORS, inputStyle, fieldLabelStyle, primaryBtnStyle } from "../styles.js";

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await api.login(username.trim(), password);
      auth.setToken(token);
      onLoggedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: COLORS.bg, fontFamily: "Inter, sans-serif",
    }}>
      <form onSubmit={submit} style={{
        background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16,
        padding: "32px 30px", width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(16,24,40,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Boxes size={17} color="#fff" />
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: COLORS.ink }}>Stockline</span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, margin: "0 0 4px", color: COLORS.ink }}>Sign in</h1>
        <p style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, margin: "0 0 22px" }}>
          Enter your admin credentials to access the inventory dashboard.
        </p>

        {error && (
          <div style={{ background: COLORS.roseSoft, color: COLORS.rose, borderRadius: 8, padding: "9px 12px", fontFamily: "Inter", fontSize: 12.5, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={fieldLabelStyle}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><User size={13} /> Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} autoFocus autoComplete="username" />
          </label>
          <label style={fieldLabelStyle}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Lock size={13} /> Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} autoComplete="current-password" />
          </label>
        </div>

        <button type="submit" disabled={loading || !username || !password} style={{ ...primaryBtnStyle, width: "100%", marginTop: 22, padding: "10px 18px" }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p style={{ fontFamily: "Inter", fontSize: 11.5, color: COLORS.sub, marginTop: 18, marginBottom: 0, textAlign: "center" }}>
          Default credentials are set in <code style={{ fontFamily: "'IBM Plex Mono', monospace" }}>server/.env</code> — change them before going live.
        </p>
      </form>
    </div>
  );
}
