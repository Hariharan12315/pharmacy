const BASE = '/api'

async function req(url, opts = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Dashboard
  getDashboardStats: () => req('/dashboard/stats'),

  // Medicines
  getMedicines: () => req('/medicines'),
  addMedicine: (data) => req('/medicines', { method: 'POST', body: JSON.stringify(data) }),

  // Customers
  getCustomers: () => req('/customers'),
  addCustomer: (data) => req('/customers', { method: 'POST', body: JSON.stringify(data) }),

  // Transactions
  getTransactions: () => req('/transactions'),
  addTransaction: (data) => req('/transactions', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => req('/notifications'),
}
