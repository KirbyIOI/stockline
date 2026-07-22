import React, { useState, useEffect } from "react"
import { Search, Download, Clock, CheckCircle, XCircle, Plus, X } from "lucide-react"
import { COLORS, money, primaryBtnStyle, secondaryBtnStyle, iconBtnStyle, overlayStyle, modalStyle, fieldLabelStyle, inputStyle } from "../styles.js"
import { SectionHeader } from "./Shared.jsx"
import { api } from "../api.js"
import { downloadCSV } from "../csv.js"

const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "received", label: "Received" },
  { id: "cancelled", label: "Cancelled" },
]
const META = {
  open: { label: "Open", color: COLORS.amber, icon: Clock },
  received: { label: "Received", color: COLORS.teal, icon: CheckCircle },
  cancelled: { label: "Cancelled", color: COLORS.rose, icon: XCircle },
}

function Badge({ status }) {
  const m = META[status] || META.cancelled
  const I = m.icon
  return (
    <span style={{
      fontFamily: "Inter", fontSize: 11, fontWeight: 600,
      color: m.color, background: m.color + "18",
      padding: "3px 10px", borderRadius: 20,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <I size={12} /> {m.label}
    </span>
  )
}

function CreateOrderModal({ products, onClose, onCreate }) {
  const [productId, setProductId] = useState(products.length > 0 ? products[0].id : "")
  const [qty, setQty] = useState(1)
  const selectedProduct = products.find((p) => p.id === productId)

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, margin: 0 }}>Create Purchase Order</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>
        <label style={{ ...fieldLabelStyle, marginBottom: 14 }}>
          Product
          <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ ...inputStyle, fontFamily: "Inter" }}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </label>
        <label style={{ ...fieldLabelStyle, marginBottom: 20 }}>
          Quantity
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} style={inputStyle} />
        </label>
        {selectedProduct && (
          <div style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, marginBottom: 16 }}>
            Estimated cost: {money(qty * selectedProduct.unitCost)}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onCreate(productId, qty)} style={primaryBtnStyle} disabled={!productId}>
            Place order
          </button>
        </div>
    </div>
  )
}

export default function OrderHistory() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [products, setProducts] = useState([])

  const load = () => {
    setLoading(true)
    Promise.all([
      api.getOrders().then(setOrders),
      api.getProducts().then(setProducts),
    ]).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (productId, qty) => {
    try {
      await api.createOrder(productId, qty)
      setShowCreateModal(false)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const f = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(o.productName || "").toLowerCase().includes(q) && !(o.productSku || "").toLowerCase().includes(q)) return false
    }
    return true
  })

  const exportCSV = () => {
    const h = ["Date Placed", "Product", "SKU", "Qty", "Status", "Date Received"]
    const r = f.map((o) => [o.placedAt, o.productName || "---", o.productSku || "---", o.qty, o.status, o.receivedAt || "---"])
    downloadCSV("orders-" + new Date().toISOString().slice(0, 10) + ".csv", [h, ...r])
  }

  return (
    <div>
      <SectionHeader
        title="Purchase Order History"
        subtitle="All stock orders placed to suppliers."
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportCSV} disabled={f.length === 0} style={secondaryBtnStyle}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Download size={15} /> Export CSV</span>
            </button>
            <button onClick={() => setShowCreateModal(true)} style={primaryBtnStyle}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Plus size={15} /> Create Purchase Order</span>
            </button>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Total</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{orders.length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Open</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.amber }}>{orders.filter((o) => o.status === "open").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Received</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.teal }}>{orders.filter((o) => o.status === "received").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Cancelled</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.rose }}>{orders.filter((o) => o.status === "cancelled").length}</div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid " + COLORS.line, borderRadius: 9, padding: "8px 12px", flex: 1, maxWidth: 320 }}>
          <Search size={15} color={COLORS.sub} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or SKU"
            style={{ border: "none", outline: "none", fontFamily: "Inter", fontSize: 13.5, width: "100%" }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {FILTERS.map((fi) => (
            <button key={fi.id} onClick={() => setFilter(fi.id)} style={{
              fontFamily: "Inter", fontSize: 12.5, fontWeight: filter === fi.id ? 600 : 400,
              padding: "6px 12px", borderRadius: 8, border: "1px solid " + COLORS.line,
              background: filter === fi.id ? COLORS.primary : "#fff",
              color: filter === fi.id ? "#fff" : COLORS.ink, cursor: "pointer",
            }}>
              {fi.label}
            </button>
          ))}
        </div>

      <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 14, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>Date Placed</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", color: COLORS.sub, padding: 30 }}>Loading...</td></tr>
            ) : f.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", color: COLORS.sub, padding: 30 }}>
                {search || filter !== "all" ? "No matches." : "No orders yet."}
              </td></tr>
            ) : f.map((o) => (
              <tr key={o.id}>
                <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: COLORS.sub, whiteSpace: "nowrap" }}>
                  {new Date(o.placedAt).toLocaleString()}
                </td>
                <td style={{ fontWeight: 500 }}>{o.productName || "---"}</td>
                <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: COLORS.sub }}>
                  {o.productSku || "---"}
                </td>
                <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600 }}>{o.qty}</td>
                <td><Badge status={o.status} /></td>
                <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: COLORS.sub, whiteSpace: "nowrap" }}>
                  {o.status === "received" ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle size={13} color={COLORS.teal} />
                      {o.receivedAt ? new Date(o.receivedAt).toLocaleString() : "Yes"}
                    </span>
                  ) : o.status === "open" ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={13} color={COLORS.amber} />
                      <span style={{ color: COLORS.amber, fontWeight: 500 }}>Pending</span>
                  ) : (
                    <span style={{ color: COLORS.sub }}>---</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div style={{ background: COLORS.roseSoft, color: COLORS.rose, borderRadius: 8, padding: "10px 16px", fontFamily: "Inter", fontSize: 13, marginTop: 16 }}>
          {error}
        </div>
      )}

      {showCreateModal && (
        <CreateOrderModal
          products={products}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
