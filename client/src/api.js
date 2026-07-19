// Same-origin "/api" works when the backend serves the built frontend itself
// (the default, single-service deployment). If you deploy the frontend and
// backend separately (e.g. frontend on Netlify/Vercel, backend on Render),
// set VITE_API_BASE_URL at build time to your backend's full URL, e.g.
// https://your-api.onrender.com/api — see DEPLOYMENT.md.
const BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_KEY = "stockline_token";

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

// Fired when a request comes back 401 so the app can drop to the login screen.
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, options = {}, { auth: needsAuth = true } = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (needsAuth) {
    const token = auth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && needsAuth) {
    auth.clearToken();
    onUnauthorized();
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }, { auth: false }),
  getMe: () => request("/auth/me"),
  changePassword: (currentPassword, newPassword) =>
    request("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),

  getProducts: () => request("/products"),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
  recordSale: (id, units) => request(`/products/${id}/sales`, { method: "POST", body: JSON.stringify({ units }) }),

  getOrders: (status) => request(`/orders${status ? `?status=${status}` : ""}`),
  createOrder: (productId, qty) => request("/orders", { method: "POST", body: JSON.stringify({ productId, qty }) }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: "PATCH" }),
  receiveOrder: (id, units) => request(`/orders/${id}/receive`, { method: "PATCH", body: JSON.stringify({ units }) }),

  getDashboardSummary: () => request("/dashboard/summary"),

  getAssistantStatus: () => request("/assistant/status", {}, { auth: false }),
  askAssistant: (message, history) =>
    request("/assistant/chat", { method: "POST", body: JSON.stringify({ message, history }) }),

  getSettings: () => request("/settings"),
  updateSettings: (data) => request("/settings", { method: "PUT", body: JSON.stringify(data) }),

  getUsers: () => request("/users"),
  createUser: (data) => request("/users", { method: "POST", body: JSON.stringify(data) }),
  setUserRole: (id, role) => request(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  setUserPassword: (id, password) => request(`/users/${id}/password`, { method: "PATCH", body: JSON.stringify({ password }) }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),
};
