import React, { useState, useEffect } from "react"
import { Search, Download, Clock, CheckCircle, XCircle, Plus, X, PackageCheck } from "lucide-react"
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
  const firstId = products.length > 0 ? products[0].id : ""
  const [productId, setProductId] = useState(firstId)
  const sel = products.find((p) => p.id === productId)
  const [qty, setQty] = useState(sel ? Math.max(1, sel.safetyStock) : 1)
  const [supplierName, setSupplierName] = useState("")

  const handleProductChange = (id) => {
    setProductId(id)
    const p = products.find((x) => x.id === id)
    if (p) setQty(Math.max(1, p.safetyStock))
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, margin: 0 }}>Create Purchase Order</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>
        <label style={{ ...fieldLabelStyle, marginBottom: 14 }}>
          Product
          <select value={productId} onChange={(e) => handleProductChange(e.target.value)} style={{ ...inputStyle, fontFamily: "Inter" }}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </label>
        <label style={{ ...fieldLabelStyle, marginBottom: 14 }}>
          Supplier Name
          <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="e.g. TZ Wholesale Ltd" style={inputStyle} />
        </label>
        <label style={{ ...fieldLabelStyle, marginBottom: 20 }}>
          Quantity (defaults to safety stock)
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} style={inputStyle} />
        </label>
        {sel && (
          <div style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, marginBottom: 16 }}>
            Safety stock: {sel.safetyStock} units &middot; Estimated cost: {money(qty * sel.unitCost)}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onCreate(productId, qty, supplierName)} style={primaryBtnStyle} disabled={!productId}>
            Place order
          </button>
        </div>
    </div>
  )
}

function ReceiveModal({ order, onClose, onReceive }) {
  const [units, setUnits] = useState(order.qty)
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, margin: 0 }}>Receive Shipment</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>
        <p style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, marginTop: 0 }}>
          {order.productName} &middot; {order.qty} units ordered
        </p>
        <label style={fieldLabelStyle}>
          Units received
          <input type="number" min={0} value={units} onChange={(e) => setUnits(Number(e.target.value))} style={inputStyle} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onReceive(order.id, units)} style={primaryBtnStyle}>Add to stock</button>
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
  const [receiveFor, setReceiveFor] = useState(null)
  const [products, setProducts] = useState([])

  const load = () => {
    setLoading(true)
    Promise.all([
      api.getOrders().then(setOrders),
      api.getProducts().then(setProducts),
    ]).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (productId, qty, supplierName) => {
    try {
      await api.createOrder(productId, qty, supplierName)
      setShowCreateModal(false)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleCancel = async (orderId) => {
    try {
      await api.cancelOrder(orderId)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleReceive = async (orderId, units) => {
    try {
      await api.receiveOrder(orderId, units)
      setReceiveFor(null)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      const nameMatch = (o.productName || "").toLowerCase().includes(q)
      const skuMatch = (o.productSku || "").toLowerCase().includes(q)
      const supplierMatch = (o.supplierName || "").toLowerCase().includes(q)
      if (!nameMatch && !skuMatch && !supplierMatch) return false
    }
    return true
  })

  const exportCSV = () => {
    const h = ["Date Placed", "Product", "SKU", "Supplier", "Qty", "Status", "Date Received"]
    const r = filteredOrders.map((o) => [
      o.placedAt, o.productName || "---", o.productSku || "---",
      o.supplierName || "---", o.qty, o.status, o.receivedAt || "---",
    ])
    downloadCSV("orders-" + new Date().toISOString().slice(0, 10) + ".csv", [h, ...r])
  }

  return (
    <div>
      <SectionHeader
        title="Purchase Order History"
        subtitle="All stock orders placed to suppliers."
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportCSV} disabled={filteredOrders.length === 0} style={secondaryBtnStyle}>
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, or supplier"
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
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.sub, textAlign: "left", padding: "12px 16px", borderBottom: "1px solid " + COLORS.line }}>Date Placed</th>
              <th style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.sub, textAlign: "left", padding: "12px 16px", borderBottom: "1px solid " + COLORS.line }}>Product</th>
              <th style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.sub, textAlign: "left", padding: "12px 16px", borderBottom: "1px solid " + COLORS.line }}>SKU</th>
              <th style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.sub, textAlign: "left", padding: "12px 16px", borderBottom: "1px solid " + COLORS.line }}>Supplier</th>
              <th style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.sub, textAlign: "left", padding: "12px 16px", borderBottom: "1px solid " + COLORS.line }}>Qty</th>
              <th style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.sub, textAlign: "left", padding: "12px 16px", borderBottom: "1px solid " + COLORS.line }}>Source</th>
              <th style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.sub, textAlign: "left", padding: "12px 16px", borderBottom: "1px solid " + COLORS.line }}>Status</th>
              <th style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.sub, textAlign: "left", padding: "12px 16px", borderBottom: "1px solid " + COLORS.line }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: "center", color: COLORS.sub, padding: 30, fontFamily: "Inter", fontSize: 13 }}>Loading...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", color: COLORS.sub, padding: 30, fontFamily: "Inter", fontSize: 13 }}>
                {search || filter !== "all" ? "No matches." : "No orders yet."}
              </td></tr>
            ) : filteredOrders.map((o) => (
              <tr key={o.id} style={{ borderBottom: "1px solid " + COLORS.line }}>
                <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: COLORS.sub, whiteSpace: "nowrap", padding: "12px 16px" }}>
                  {new Date(o.placedAt).toLocaleString()}
                </td>
                <td style={{ fontWeight: 500, padding: "12px 16px", fontFamily: "Inter", fontSize: 13.5 }}>{o.productName || "---"}</td>
                <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: COLORS.sub, padding: "12px 16px" }}>
                  {o.productSku || "---"}
                </td>
                <td style={{ fontFamily: "Inter", fontSize: 13, padding: "12px 16px" }}>
                  {o.supplierName || <span style={{ color: COLORS.sub, fontStyle: "italic" }}>N/A</span>}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {o.source === "manual" ? (
                    <span style={{ fontFamily: "Inter", fontSize: 11, fontWeight: 600, color: COLORS.primary, background: COLORS.primarySoft, padding: "3px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Manual PO
                    </span>
                  ) : (
                    <span style={{ fontFamily: "Inter", fontSize: 11, fontWeight: 600, color: COLORS.teal, background: COLORS.tealSoft, padding: "3px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Alert
                    </span>
                  )}
                </td>
                <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, padding: "12px 16px" }}>{o.qty}</td>
                <td style={{ padding: "12px 16px" }}><Badge status={o.status} /></td>
                <td style={{ padding: "12px 16px" }}>
                  {o.status === "open" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setReceiveFor(o)} style={{
                        ...secondaryBtnStyle, padding: "5px 10px", fontSize: 12,
                      }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <PackageCheck size={13} /> Receive
                        </span>
                      </button>
                      <button onClick={() => handleCancel(o.id)} style={{
                        ...secondaryBtnStyle, padding: "5px 10px", fontSize: 12, color: COLORS.rose,
                      }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <XCircle size={13} /> Cancel
                        </span>
                      </button>
                    </div>
                  ) : o.status === "received" ? (
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: COLORS.sub, display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle size={13} color={COLORS.teal} />
                      {o.receivedAt ? new Date(o.receivedAt).toLocaleString() : "Yes"}
                    </span>
                  ) : (
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: COLORS.sub, display: "flex", alignItems: "center", gap: 6 }}>
                      <XCircle size={13} color={COLORS.rose} />
                      Cancelled
                    </span>
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

      {receiveFor && (
        <ReceiveModal
          order={receiveFor}
          onClose={() => setReceiveFor(null)}
          onReceive={handleReceive}
        />
      )}
    </div>
  )
}
