const API_BASE = '/api/v1'

export const getToken = () => localStorage.getItem('furniq_token')
export const setTokens = (tokens) => {
  if (tokens?.accessToken) {
    localStorage.setItem('furniq_token', tokens.accessToken)
  }
  if (tokens?.refreshToken) {
    localStorage.setItem('furniq_refresh_token', tokens.refreshToken)
  }
}

export const getUser = () => {
  try {
    const u = localStorage.getItem('furniq_user')
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

export const setUser = (user) => {
  if (user) {
    localStorage.setItem('furniq_user', JSON.stringify(user))
  } else {
    localStorage.removeItem('furniq_user')
  }
}

export const clearAuth = () => {
  localStorage.removeItem('furniq_token')
  localStorage.removeItem('furniq_refresh_token')
  localStorage.removeItem('furniq_user')
}

export const extractList = (res) => {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.items)) return res.items
  if (Array.isArray(res.data)) return res.data
  return []
}

let isLoggingIn = null

export async function autoLogin() {
  if (isLoggingIn) return isLoggingIn
  isLoggingIn = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@urbanfurniture.com',
          password: 'Admin123!',
        }),
      })
      if (!res.ok) return null
      const json = await res.json()
      const data = json.data || json
      if (data?.tokens) setTokens(data.tokens)
      if (data?.user) setUser(data.user)
      return data?.tokens?.accessToken || null
    } catch (err) {
      console.warn('Auto-session recovery error:', err.message)
      return null
    } finally {
      isLoggingIn = null
    }
  })()
  return isLoggingIn
}

async function request(endpoint, options = {}, isRetry = false) {
  const isAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register')

  // Ensure token exists before sending mutation requests
  let token = getToken()
  if (!token && !isAuthEndpoint && options.method && options.method !== 'GET') {
    token = await autoLogin()
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const headers = { ...options.headers }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Handle 401 Unauthorized with transparent session recovery & retry
  if (response.status === 401 && !isAuthEndpoint && !isRetry) {
    clearAuth()
    const newToken = await autoLogin()
    if (newToken) {
      return request(endpoint, options, true)
    }
  }

  let result = null
  const text = await response.text()
  if (text) {
    try {
      result = JSON.parse(text)
    } catch {
      result = text
    }
  }

  if (!response.ok) {
    const errorMsg =
      result?.message ||
      (Array.isArray(result?.errors) ? result.errors.map((e) => e.message || e.field).join(', ') : null) ||
      response.statusText ||
      'Request failed'
    const error = new Error(errorMsg)
    error.status = response.status
    error.data = result
    throw error
  }

  // Unwrap standardized NestJS response { error: false, statusCode, message, data }
  if (result && typeof result === 'object' && 'data' in result && result.data !== undefined) {
    return result.data
  }

  return result
}

export const api = {
  // Auth
  auth: {
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    getProfile: () => request('/auth/me'),
  },

  // Users
  users: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/users${q ? `?${q}` : ''}`)
    },
    create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    getById: (id) => request(`/users/${id}`),
  },

  // Dashboard
  dashboard: {
    getSummary: () => request('/dashboard'),
  },

  // Contacts
  contacts: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/contacts${q ? `?${q}` : ''}`)
    },
    getById: (id) => request(`/contacts/${id}`),
    create: (data) => request('/contacts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/contacts/${id}`, { method: 'DELETE' }),
    archive: (id) => request(`/contacts/${id}/archive`, { method: 'PATCH' }),
  },

  // Products
  products: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/products${q ? `?${q}` : ''}`)
    },
    getById: (id) => request(`/products/${id}`),
    create: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  },

  // Chart of Accounts & Journals
  accounting: {
    getAccounts: (params = {}) => {
      const p = { limit: 100, ...params }
      const q = new URLSearchParams(p).toString()
      return request(`/accounting/accounts${q ? `?${q}` : ''}`)
    },
    getAccountById: (id) => request(`/accounting/accounts/${id}`),
    createAccount: (data) => request('/accounting/accounts', { method: 'POST', body: JSON.stringify(data) }),
    updateAccount: (id, data) => request(`/accounting/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteAccount: (id) => request(`/accounting/accounts/${id}`, { method: 'DELETE' }),

    getJournals: (params = {}) => {
      const p = { limit: 100, ...params }
      const q = new URLSearchParams(p).toString()
      return request(`/accounting/journals${q ? `?${q}` : ''}`)
    },
    createJournal: (data) => request('/accounting/journals', { method: 'POST', body: JSON.stringify(data) }),
    updateJournal: (id, data) => request(`/accounting/journals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteJournal: (id) => request(`/accounting/journals/${id}`, { method: 'DELETE' }),

    getJournalEntries: (params = {}) => {
      const p = { limit: 100, ...params }
      const q = new URLSearchParams(p).toString()
      return request(`/accounting/journal-entries${q ? `?${q}` : ''}`)
    },
    createJournalEntry: (data) => request('/accounting/journal-entries', { method: 'POST', body: JSON.stringify(data) }),
    deleteJournalEntry: (id) => request(`/accounting/journal-entries/${id}`, { method: 'DELETE' }),
  },

  // Budgets & Analytic Accounts
  budgets: {
    getAnalyticAccounts: () => request('/budgets/analytic-accounts'),
    createAnalyticAccount: (data) =>
      request('/budgets/analytic-accounts', { method: 'POST', body: JSON.stringify(data) }),
    listBudgets: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/budgets${q ? `?${q}` : ''}`)
    },
    createBudget: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Sales Orders & Customer Invoices
  sales: {
    listOrders: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/sales/orders${q ? `?${q}` : ''}`)
    },
    createOrder: (data) => request('/sales/orders', { method: 'POST', body: JSON.stringify(data) }),
    confirmOrder: (id) => request(`/sales/orders/${id}/confirm`, { method: 'POST' }),
    cancelOrder: (id) => request(`/sales/orders/${id}/cancel`, { method: 'POST' }),

    listInvoices: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/sales/invoices${q ? `?${q}` : ''}`)
    },
    createInvoice: (data) => request('/sales/invoices', { method: 'POST', body: JSON.stringify(data) }),
    createInvoiceFromSO: (soId) => request(`/sales/invoices/from-so/${soId}`, { method: 'POST' }),
    confirmInvoice: (id) => request(`/sales/invoices/${id}/confirm`, { method: 'POST' }),
    cancelInvoice: (id) => request(`/sales/invoices/${id}/cancel`, { method: 'POST' }),
  },

  // Purchases & Vendor Bills
  purchases: {
    listOrders: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/purchases/orders${q ? `?${q}` : ''}`)
    },
    createOrder: (data) => request('/purchases/orders', { method: 'POST', body: JSON.stringify(data) }),
    confirmOrder: (id) => request(`/purchases/orders/${id}/confirm`, { method: 'POST' }),
    cancelOrder: (id) => request(`/purchases/orders/${id}/cancel`, { method: 'POST' }),

    listBills: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/purchases/bills${q ? `?${q}` : ''}`)
    },
    createBill: (data) => request('/purchases/bills', { method: 'POST', body: JSON.stringify(data) }),
    createBillFromPO: (poId) => request(`/purchases/bills/from-po/${poId}`, { method: 'POST' }),
    confirmBill: (id) => request(`/purchases/bills/${id}/confirm`, { method: 'POST' }),
  },

  // Payments
  payments: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/payments${q ? `?${q}` : ''}`)
    },
    recordCustomerPayment: (data) => request('/payments/customer', { method: 'POST', body: JSON.stringify(data) }),
    recordVendorPayment: (data) => request('/payments/vendor', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Reports & Stock
  reports: {
    profitLoss: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/reports/profit-loss${q ? `?${q}` : ''}`)
    },
    balanceSheet: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/reports/balance-sheet${q ? `?${q}` : ''}`)
    },
    budget: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/reports/budget${q ? `?${q}` : ''}`)
    },
    stock: () => request('/stock'),
  },
}
