import React, { useState } from "react";
import { Save, UserPlus, Trash2, KeyRound, ShieldCheck, User as UserIcon } from "lucide-react";
import { api } from "../api.js";
import { COLORS, inputStyle, fieldLabelStyle, primaryBtnStyle, secondaryBtnStyle, setCurrencySymbol } from "../styles.js";
import { SectionHeader } from "./Shared.jsx";

const FORECAST_METHODS = [
  { id: "linear", label: "Linear trend", blurb: "Steady, stable projection over your whole sales history. Good default, especially with under ~6 weeks of data." },
  { id: "smoothed", label: "Smoothed (Holt's method)", blurb: "Weights recent weeks more heavily, so it reacts faster to a real change in sell-through. Best once you have 6+ weeks of history." },
  { id: "seasonal", label: "Seasonal (Holt-Winters)", blurb: "Adds a repeating cycle on top of the trend, e.g. a monthly pattern. Needs at least two full cycles of history, or it quietly falls back to Smoothed." },
];

function Card({ title, subtitle, children }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "20px 22px", marginBottom: 18 }}>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15.5, margin: "0 0 3px", color: COLORS.ink }}>{title}</h3>
      {subtitle && <p style={{ fontFamily: "Inter", fontSize: 12.5, color: COLORS.sub, margin: "0 0 16px" }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 4 }} />}
      {children}
    </div>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "Inter", fontSize: 11, fontWeight: 600,
      color: isAdmin ? COLORS.primary : COLORS.sub, background: isAdmin ? COLORS.primarySoft : "#F1F3F7",
      padding: "2px 9px", borderRadius: 20,
    }}>
      {isAdmin ? <ShieldCheck size={11} /> : <UserIcon size={11} />} {isAdmin ? "Admin" : "Staff"}
    </span>
  );
}

export default function Settings({ me, onSettingsChanged }) {
  const isAdmin = me?.role === "admin";
  return (
    <div>
      <SectionHeader title="Settings" subtitle="Business details, forecasting behavior, your team, and your own account." />
      <div style={{ maxWidth: 640 }}>
        <GeneralSection isAdmin={isAdmin} onSettingsChanged={onSettingsChanged} />
        {isAdmin && <TeamSection me={me} />}
        <AccountSection me={me} />
      </div>
    </div>
  );
}

function GeneralSection({ isAdmin, onSettingsChanged }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  React.useEffect(() => {
    api.getSettings().then(setSettings).catch((e) => setErr(e.message));
  }, []);

  if (err) return <Card title="Business & forecasting"><p style={{ color: COLORS.rose, fontFamily: "Inter", fontSize: 13 }}>{err}</p></Card>;
  if (!settings) return <Card title="Business & forecasting"><p style={{ color: COLORS.sub, fontFamily: "Inter", fontSize: 13 }}>Loading…</p></Card>;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setCurrencySymbol(updated.currencySymbol);
      onSettingsChanged?.(updated);
      setMsg("Saved.");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Business & forecasting" subtitle={isAdmin ? "Visible to your whole team; only admins can change these." : "Read-only — ask an admin to make changes here."}>
      <form onSubmit={save}>
        <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
          <label style={{ ...fieldLabelStyle, flex: "1 1 220px" }}>
            Company name
            <input
              value={settings.companyName} disabled={!isAdmin}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              placeholder="e.g. Mama Ntilie General Store" style={{ ...inputStyle, fontFamily: "Inter" }}
            />
          </label>
          <label style={{ ...fieldLabelStyle, flex: "0 1 140px" }}>
            Currency symbol
            <input
              value={settings.currencySymbol} disabled={!isAdmin}
              onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
              placeholder="TSh" style={inputStyle}
            />
          </label>
        </div>

        <div style={{ fontFamily: "Inter", fontSize: 12.5, color: COLORS.sub, fontWeight: 500, marginBottom: 8 }}>
          Forecasting method
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {FORECAST_METHODS.map((m) => (
            <label key={m.id} style={{
              display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10,
              border: `1px solid ${settings.forecastMethod === m.id ? COLORS.primary : COLORS.line}`,
              background: settings.forecastMethod === m.id ? COLORS.primarySoft : "#fff",
              cursor: isAdmin ? "pointer" : "default",
            }}>
              <input
                type="radio" name="forecastMethod" checked={settings.forecastMethod === m.id} disabled={!isAdmin}
                onChange={() => setSettings({ ...settings, forecastMethod: m.id })}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: COLORS.ink }}>{m.label}</div>
                <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginTop: 2 }}>{m.blurb}</div>
              </div>
            </label>
          ))}
        </div>

        {settings.forecastMethod === "seasonal" && (
          <label style={{ ...fieldLabelStyle, maxWidth: 220, marginBottom: 16 }}>
            Season length (weeks)
            <input
              type="number" min={2} max={52} value={settings.seasonLength} disabled={!isAdmin}
              onChange={(e) => setSettings({ ...settings, seasonLength: Number(e.target.value) })}
              style={inputStyle}
            />
          </label>
        )}

        {isAdmin && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="submit" disabled={saving} style={primaryBtnStyle}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Save size={14} /> {saving ? "Saving…" : "Save changes"}</span>
            </button>
            {msg && <span style={{ color: COLORS.teal, fontFamily: "Inter", fontSize: 12.5 }}>{msg}</span>}
            {err && <span style={{ color: COLORS.rose, fontFamily: "Inter", fontSize: 12.5 }}>{err}</span>}
          </div>
        )}
      </form>
    </Card>
  );
}

function TeamSection({ me }) {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "staff" });
  const [busy, setBusy] = useState(false);

  const load = () => api.getUsers().then(setUsers).catch((e) => setErr(e.message));
  React.useEffect(() => { load(); }, []);

  const addUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.createUser(form);
      setForm({ username: "", password: "", role: "staff" });
      setShowAdd(false);
      await load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = async (u) => {
    setErr(null);
    try {
      await api.setUserRole(u.id, u.role === "admin" ? "staff" : "admin");
      await load();
    } catch (e2) { setErr(e2.message); }
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Remove ${u.username}? They'll be signed out immediately and won't be able to log back in.`)) return;
    setErr(null);
    try {
      await api.deleteUser(u.id);
      await load();
    } catch (e2) { setErr(e2.message); }
  };

  const resetPassword = async (u) => {
    const password = window.prompt(`New password for ${u.username} (at least 8 characters):`);
    if (!password) return;
    setErr(null);
    try {
      await api.setUserPassword(u.id, password);
      window.alert(`Password updated for ${u.username}.`);
    } catch (e2) { setErr(e2.message); }
  };

  return (
    <Card title="Team" subtitle="Everyone who can sign in to Stockline. Add one account per person rather than sharing a login.">
      {err && <div style={{ background: COLORS.roseSoft, color: COLORS.rose, borderRadius: 8, padding: "8px 11px", fontFamily: "Inter", fontSize: 12.5, marginBottom: 12 }}>{err}</div>}

      {!users ? (
        <p style={{ color: COLORS.sub, fontFamily: "Inter", fontSize: 13 }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {users.map((u) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 9, border: `1px solid ${COLORS.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13.5, color: COLORS.ink }}>{u.username}</span>
                <RoleBadge role={u.role} />
                {u.id === me?.id && <span style={{ fontFamily: "Inter", fontSize: 11, color: COLORS.sub }}>(you)</span>}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button title="Reset password" onClick={() => resetPassword(u)} style={{ ...secondaryBtnStyle, padding: "5px 9px" }}>
                  <KeyRound size={13} />
                </button>
                <button title={u.role === "admin" ? "Make staff" : "Make admin"} onClick={() => toggleRole(u)} style={{ ...secondaryBtnStyle, padding: "5px 9px" }}>
                  {u.role === "admin" ? "Make staff" : "Make admin"}
                </button>
                {u.id !== me?.id && (
                  <button title="Remove" onClick={() => removeUser(u)} style={{ ...secondaryBtnStyle, padding: "5px 9px", color: COLORS.rose }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!showAdd ? (
        <button onClick={() => setShowAdd(true)} style={secondaryBtnStyle}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><UserPlus size={14} /> Add team member</span>
        </button>
      ) : (
        <form onSubmit={addUser} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", padding: 12, background: COLORS.bg, borderRadius: 10 }}>
          <label style={{ ...fieldLabelStyle, flex: "1 1 140px" }}>
            Username
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required style={{ ...inputStyle, fontFamily: "Inter" }} />
          </label>
          <label style={{ ...fieldLabelStyle, flex: "1 1 160px" }}>
            Temporary password
            <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} style={{ ...inputStyle, fontFamily: "Inter" }} />
          </label>
          <label style={{ ...fieldLabelStyle, flex: "0 1 120px" }}>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ ...inputStyle, fontFamily: "Inter" }}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit" disabled={busy} style={primaryBtnStyle}>{busy ? "Adding…" : "Add"}</button>
          <button type="button" onClick={() => setShowAdd(false)} style={secondaryBtnStyle}>Cancel</button>
        </form>
      )}
    </Card>
  );
}

function AccountSection({ me }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMsg("Password updated.");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Your account" subtitle={me ? `Signed in as ${me.username}.` : undefined}>
      <form onSubmit={submit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ ...fieldLabelStyle, flex: "1 1 180px" }}>
          Current password
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={{ ...inputStyle, fontFamily: "Inter" }} />
        </label>
        <label style={{ ...fieldLabelStyle, flex: "1 1 180px" }}>
          New password
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} style={{ ...inputStyle, fontFamily: "Inter" }} />
        </label>
        <button type="submit" disabled={busy} style={primaryBtnStyle}>{busy ? "Updating…" : "Change password"}</button>
      </form>
      {msg && <p style={{ color: COLORS.teal, fontFamily: "Inter", fontSize: 12.5, marginTop: 10, marginBottom: 0 }}>{msg}</p>}
      {err && <p style={{ color: COLORS.rose, fontFamily: "Inter", fontSize: 12.5, marginTop: 10, marginBottom: 0 }}>{err}</p>}
    </Card>
  );
}
