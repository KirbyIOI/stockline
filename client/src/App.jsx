import React, { useState, useEffect, useCallback, useMemo } from "react";
import { LayoutDashboard, Boxes, TrendingUp, AlertTriangle, LogOut, Menu, X, Settings as SettingsIcon, ShieldCheck, User as UserIcon } from "lucide-react";
import { api, auth, setUnauthorizedHandler } from "./api.js";
import { FONT_IMPORT, COLORS, setCurrencySymbol } from "./styles.js";
import { ProductModal, SaleModal, ReceiveModal } from "./components/Modals.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Inventory from "./components/Inventory.jsx";
import Forecast from "./components/Forecast.jsx";
import Alerts from "./components/Alerts.jsx";
import Login from "./components/Login.jsx";
import Settings from "./components/Settings.jsx";
import AIAssistant from "./components/AIAssistant.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "forecast", label: "Sales Forecast", icon: TrendingUp },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const FORECAST_METHOD_BLURB = {
  linear: "Forecasts use a linear trend over each product's sales history.",
  smoothed: "Forecasts use Holt's smoothing, weighted toward recent weeks.",
  seasonal: "Forecasts use Holt-Winters seasonal smoothing.",
};

function useIsMobile(breakpoint = 860) {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

export default function App() {
  const [authed, setAuthed] = useState(Boolean(auth.getToken()));
  const [me, setMe] = useState(null);
  const [appSettings, setAppSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState({}); // productId -> { orderId, qty, placedOn }
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [saleFor, setSaleFor] = useState(null);
  const [receiveFor, setReceiveFor] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setUnauthorizedHandler(() => { setAuthed(false); setMe(null); });
  }, []);

  const refreshProducts = useCallback(async () => {
    const list = await api.getProducts();
    setProducts(list);
    if (!selectedId && list.length) setSelectedId(list[0].id);
    return list;
  }, [selectedId]);

  const refreshOrders = useCallback(async () => {
    const list = await api.getOrders("open");
    const map = {};
    list.forEach((o) => { map[o.productId] = { orderId: o.id, qty: o.qty, placedOn: o.placedAt }; });
    setOrders(map);
  }, []);

  const refreshSummary = useCallback(async () => {
    setSummary(await api.getDashboardSummary());
  }, []);

  const refreshMeAndSettings = useCallback(async () => {
    const [meRes, settingsRes] = await Promise.all([api.getMe(), api.getSettings()]);
    setMe(meRes);
    setAppSettings(settingsRes);
    setCurrencySymbol(settingsRes.currencySymbol);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshProducts(), refreshOrders(), refreshSummary(), refreshMeAndSettings()]);
  }, [refreshProducts, refreshOrders, refreshSummary, refreshMeAndSettings]);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    refreshAll().catch((e) => setError(e.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  useEffect(() => {
    if (!authed || !selectedId) return;
    let cancelled = false;
    api.getProduct(selectedId).then((d) => { if (!cancelled) setSelectedDetail(d); }).catch((e) => setError(e.message));
    return () => { cancelled = true; };
  }, [authed, selectedId, products]);

  const metrics = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.metrics])), [products]);
  const needsAttention = useMemo(() => products.filter((p) => p.metrics.status !== "ok"), [products]);
  const criticalCount = useMemo(
    () => products.filter((p) => p.metrics.status === "critical" || p.metrics.status === "out").length,
    [products]
  );
  const filteredInventory = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const withErrorHandling = (fn) => async (...args) => {
    try { await fn(...args); } catch (e) { setError(e.message); }
  };

  const saveProduct = withErrorHandling(async (form) => {
    setFormError(null);
    try {
      if (editing && editing.id) await api.updateProduct(editing.id, form);
      else await api.createProduct(form);
    } catch (e) {
      setFormError(e.message);
      return;
    }
    setEditing(null);
    await Promise.all([refreshProducts(), refreshSummary()]);
  });

  const deleteProduct = withErrorHandling(async (id) => {
    await api.deleteProduct(id);
    if (selectedId === id) setSelectedId(null);
    await refreshAll();
  });

  const recordSale = withErrorHandling(async (product, units) => {
    await api.recordSale(product.id, units);
    setSaleFor(null);
    await Promise.all([refreshProducts(), refreshSummary()]);
    if (selectedId === product.id) api.getProduct(product.id).then(setSelectedDetail);
  });

  const placeOrder = withErrorHandling(async (productId, qty) => {
    await api.createOrder(productId, qty);
    await refreshOrders();
  });

  const cancelOrder = withErrorHandling(async (orderId) => {
    await api.cancelOrder(orderId);
    await refreshOrders();
  });

  const receiveShipment = withErrorHandling(async (product, units) => {
    const order = orders[product.id];
    if (!order) return;
    await api.receiveOrder(order.orderId, units);
    setReceiveFor(null);
    await Promise.all([refreshProducts(), refreshOrders(), refreshSummary()]);
    if (selectedId === product.id) api.getProduct(product.id).then(setSelectedDetail);
  });

  const logout = () => {
    auth.clearToken();
    setAuthed(false);
    setMe(null);
    setAppSettings(null);
    setProducts([]);
    setSummary(null);
    setOrders({});
    setSelectedId(null);
    setSelectedDetail(null);
    setView("dashboard");
  };

  const selected = products.find((p) => p.id === selectedId) || null;

  if (!authed) {
    return <Login onLoggedIn={() => setAuthed(true)} />;
  }

  const globalStyle = (
    <style>{`
      ${FONT_IMPORT}
      html, body, #root { height: 100%; margin: 0; }
      * { box-sizing: border-box; }
      button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 1px; }
      button:disabled { opacity: 0.5; cursor: not-allowed; }
      table { border-collapse: collapse; width: 100%; }
      th { text-align: left; font-family: Inter; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: ${COLORS.sub}; font-weight: 600; padding: 10px 14px; border-bottom: 1px solid ${COLORS.line}; }
      td { padding: 12px 14px; border-bottom: 1px solid ${COLORS.line}; font-size: 13.5px; color: ${COLORS.ink}; vertical-align: middle; }
      tr:last-child td { border-bottom: none; }
      .row-hover:hover { background: #FAFBFD; }
    `}</style>
  );

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, minHeight: "100vh", fontFamily: "Inter", color: COLORS.sub, background: COLORS.bg }}>
        {globalStyle}
        <div style={{
          width: 30, height: 30, borderRadius: "50%", border: `3px solid ${COLORS.line}`,
          borderTopColor: COLORS.primary, animation: "stockline-spin 0.8s linear infinite",
        }} />
        <span style={{ fontSize: 13.5 }}>Loading Stockline…</span>
        <style>{`@keyframes stockline-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const NavList = ({ onNavigate }) => (
    <>
      {NAV.map((n) => {
        const Icon = n.icon;
        const active = view === n.id;
        return (
          <button key={n.id} onClick={() => { setView(n.id); onNavigate?.(); }} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9,
            border: "none", cursor: "pointer", textAlign: "left",
            background: active ? "rgba(67,56,202,0.35)" : "transparent",
            color: active ? "#fff" : "#9AA4B2",
            fontFamily: "Inter", fontWeight: 500, fontSize: 13.5,
          }}>
            <Icon size={16} />
            {n.label}
            {n.id === "alerts" && criticalCount > 0 && (
              <span style={{ marginLeft: "auto", background: COLORS.rose, color: "#fff", borderRadius: 20, fontSize: 10.5, padding: "1px 7px", fontFamily: "'IBM Plex Mono', monospace" }}>
                {criticalCount}
              </span>
            )}
          </button>
        );
      })}
    </>
  );

  const forecastBlurb = FORECAST_METHOD_BLURB[appSettings?.forecastMethod] || FORECAST_METHOD_BLURB.linear;

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: "100vh", background: COLORS.bg, fontFamily: "Inter, sans-serif" }}>
      {globalStyle}

      {isMobile ? (
        <div style={{ background: "#0F1729", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Boxes size={15} color="#fff" />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>Stockline</span>
          </div>
          <button onClick={() => setNavOpen((o) => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      ) : null}

      {(!isMobile || navOpen) && (
        <div style={{
          width: isMobile ? "100%" : 210, background: "#0F1729", padding: isMobile ? "10px 14px 16px" : "22px 14px",
          display: "flex", flexDirection: "column", gap: 4, flexShrink: 0,
        }}>
          {!isMobile && (
            <div style={{ padding: "0 10px", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Boxes size={15} color="#fff" />
                </div>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>Stockline</span>
              </div>
              {appSettings?.companyName && (
                <div style={{ fontFamily: "Inter", fontSize: 11, color: "#6B7688", marginTop: 4, marginLeft: 35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {appSettings.companyName}
                </div>
              )}
            </div>
          )}
          <NavList onNavigate={() => setNavOpen(false)} />
          <div style={{ marginTop: isMobile ? 10 : "auto", padding: "12px 12px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {!isMobile && (
              <p style={{ color: "#6B7688", fontSize: 11, lineHeight: 1.5, fontFamily: "Inter", margin: "0 0 10px" }}>
                {forecastBlurb}
              </p>
            )}
            {me && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 2px", marginBottom: 8 }}>
                {me.role === "admin" ? <ShieldCheck size={13} color="#9AA4B2" /> : <UserIcon size={13} color="#9AA4B2" />}
                <span style={{ fontFamily: "Inter", fontSize: 12, color: "#9AA4B2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {me.username}
                </span>
              </div>
            )}
            <button onClick={logout} style={{
              display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
              color: "#9AA4B2", borderRadius: 9, padding: "8px 12px", fontFamily: "Inter", fontSize: 12.5, cursor: "pointer", width: "100%",
            }}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, padding: isMobile ? "16px" : "24px 28px", overflowY: "auto", minWidth: 0 }}>
        {error && (
          <div style={{ background: COLORS.roseSoft, color: COLORS.rose, borderRadius: 10, padding: "10px 16px", fontFamily: "Inter", fontSize: 13, marginBottom: 18, display: "flex", justifyContent: "space-between" }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: COLORS.rose, cursor: "pointer", fontWeight: 700 }}>×</button>
          </div>
        )}

        {view === "dashboard" && (
          <Dashboard
            products={products} metrics={metrics} summary={summary} needsAttention={needsAttention}
            onSelectProduct={(id) => { setSelectedId(id); setView("forecast"); }}
          />
        )}
        {view === "inventory" && (
          <Inventory
            products={filteredInventory} metrics={metrics} search={search} setSearch={setSearch}
            onAdd={() => { setFormError(null); setEditing({}); }}
            onEdit={(p) => { setFormError(null); setEditing(p); }}
            onDelete={deleteProduct}
            onRecordSale={(p) => setSaleFor(p)}
            onSelectProduct={(id) => { setSelectedId(id); setView("forecast"); }}
          />
        )}
        {view === "forecast" && (
          <Forecast products={products} selected={selected} detail={selectedDetail} onSelect={setSelectedId} />
        )}
        {view === "alerts" && (
          <Alerts
            products={products} needsAttention={needsAttention} metrics={metrics} orders={orders}
            onSelectProduct={(id) => { setSelectedId(id); setView("forecast"); }}
            onPlaceOrder={placeOrder} onCancelOrder={cancelOrder}
            onReceive={(p) => setReceiveFor(p)}
          />
        )}
        {view === "settings" && (
          <Settings me={me} onSettingsChanged={(updated) => setAppSettings(updated)} />
        )}
      </div>

      {editing !== null && (
        <ProductModal initial={editing.id ? editing : null} onClose={() => { setEditing(null); setFormError(null); }} onSave={saveProduct} error={formError} />
      )}
      {saleFor && (
        <SaleModal product={saleFor} onClose={() => setSaleFor(null)} onRecord={(units) => recordSale(saleFor, units)} />
      )}
      {receiveFor && (
        <ReceiveModal product={receiveFor} suggested={metrics[receiveFor.id]?.suggestedOrder}
          onClose={() => setReceiveFor(null)} onReceive={(units) => receiveShipment(receiveFor, units)} />
      )}

      <AIAssistant />
    </div>
  );
}
