import React, { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import Pagination, { usePagination } from '../components/Pagination'
import { api, extractList } from '../services/api'
import { useToast } from '../context/ToastContext'
import './CreateUserPage.css'

const ROLES = [
  { value: 'ACCOUNTANT', label: 'Invoicing User (Accountant)', desc: 'Full operational access: Sales, Purchases, Invoices, Bills, Accounting & Reports' },
  { value: 'ADMIN', label: 'Administrator', desc: 'Full system control: User provisioning, master data archiving, settings' },
  { value: 'CONTACT_USER', label: 'Customer / Vendor Portal', desc: 'Restricted portal: Can only view their own invoices/bills and make payments' }
]

const ROLE_BADGES = {
  ADMIN:        { label: 'Administrator',  cls: 'um-role--admin' },
  ACCOUNTANT:   { label: 'Accountant',     cls: 'um-role--accountant' },
  CONTACT_USER: { label: 'Portal User',    cls: 'um-role--portal' },
}

export default function CreateUserPage() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [modalOpen, setModalOpen] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'ACCOUNTANT',
    contactId: '',
    password: '',
    rePassword: ''
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showRePass, setShowRePass] = useState(false)
  const [notification, setNotification] = useState(null)

  // Load users and contacts from backend
  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const [userRes, contactRes] = await Promise.allSettled([
        api.users.list({ limit: 100 }),
        api.contacts.list({ limit: 100 })
      ])

      if (userRes.status === 'fulfilled') {
        setUsers(extractList(userRes.value))
      }
      if (contactRes.status === 'fulfilled') {
        setContacts(extractList(contactRes.value))
      }
    } catch (err) {
      console.error('Failed to load user management data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const validate = () => {
    const e = {}
    if (!formData.name.trim()) e.name = 'Full name is required'

    if (!formData.email.trim()) {
      e.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      e.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      e.password = 'Password is required'
    } else if (formData.password.length <= 8) {
      e.password = 'Password must be more than 8 characters'
    } else if (!/[a-z]/.test(formData.password)) {
      e.password = 'Must contain at least one lowercase letter'
    } else if (!/[A-Z]/.test(formData.password)) {
      e.password = 'Must contain at least one uppercase letter'
    } else if (!/[^a-zA-Z0-9]/.test(formData.password)) {
      e.password = 'Must contain at least one special character'
    }

    if (!formData.rePassword) {
      e.rePassword = 'Confirm your password'
    } else if (formData.password !== formData.rePassword) {
      e.rePassword = 'Passwords do not match'
    }

    if (formData.role === 'CONTACT_USER' && !formData.contactId) {
      e.contactId = 'Select a linked customer or vendor'
    }

    return e
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleOpenModal = () => {
    setFormData({
      name: '',
      email: '',
      role: 'ACCOUNTANT',
      contactId: contacts[0]?.id || '',
      password: '',
      rePassword: ''
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setErrors({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length > 0) {
      setErrors(v)
      return
    }

    setSubmitting(true)
    setErrors({})
    try {
      await api.users.create({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        ...(formData.role === 'CONTACT_USER' && formData.contactId ? { contactId: formData.contactId } : {})
      })

      setNotification({ type: 'success', text: `User "${formData.name}" created successfully!` })
      toast.success(`User "${formData.name}" created successfully!`)
      setTimeout(() => setNotification(null), 5000)
      handleCloseModal()
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to create user')
      setErrors({ general: err.message || 'Failed to create user. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered users list
  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.contact?.name?.toLowerCase().includes(q)
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const { page, setPage, paged: pagedUsers, total: totalFiltered } = usePagination(filteredUsers, 10)

  return (
    <DashboardLayout>
      <div className="um-page">
        {/* Breadcrumb */}
        <div className="um-breadcrumb">
          Settings <span>›</span> User Management
        </div>

        {/* Header */}
        <div className="um-header">
          <div className="um-header-left">
            <h1 className="um-title">User Management</h1>
            <p className="um-subtitle">
              {users.length} registered system accounts · Provision staff, assign roles and configure access
            </p>
          </div>
          <button className="um-add-btn" onClick={handleOpenModal}>
            <PlusIcon /> Create User
          </button>
        </div>

        {/* Global Notification */}
        {notification && (
          <div className={`um-banner um-banner--${notification.type}`} role="alert">
            {notification.text}
          </div>
        )}

        {/* Toolbar */}
        <div className="um-toolbar">
          <div className="um-search-wrap">
            <SearchIcon />
            <input
              type="search"
              className="um-search-input"
              placeholder="Search users by name, email or company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search users"
            />
          </div>

          <div className="um-filter-wrap">
            <label htmlFor="role-filter" className="um-filter-lbl">Role:</label>
            <select
              id="role-filter"
              className="um-filter-select"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles ({users.length})</option>
              <option value="ADMIN">Administrators</option>
              <option value="ACCOUNTANT">Accountants</option>
              <option value="CONTACT_USER">Portal Users</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="um-table-card">
          {loading ? (
            <div className="um-loading">
              <div className="um-spinner" />
              <span>Loading system users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="um-empty">
              No system users found matching the filter criteria.
            </div>
          ) : (
            <table className="um-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Login Email</th>
                  <th>Role</th>
                  <th>Linked Contact / Portal</th>
                  <th>Created Date</th>
                  <th className="align-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map(u => {
                  const roleConfig = ROLE_BADGES[u.role] || { label: u.role, cls: '' }
                  const initial = u.name ? u.name.charAt(0).toUpperCase() : 'U'
                  const createdDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

                  return (
                    <tr key={u.id}>
                      {/* Name + Avatar */}
                      <td>
                        <div className="um-user-cell">
                          <div className={`um-avatar um-avatar--${u.role?.toLowerCase()}`}>
                            {initial}
                          </div>
                          <div>
                            <span className="um-user-name">{u.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="um-email-cell">{u.email}</td>

                      {/* Role Badge */}
                      <td>
                        <span className={`um-role-badge ${roleConfig.cls}`}>
                          {roleConfig.label}
                        </span>
                      </td>

                      {/* Linked Contact */}
                      <td>
                        {u.contact ? (
                          <span className="um-contact-link">
                            🏢 {u.contact.name} ({u.contact.type})
                          </span>
                        ) : u.role === 'CONTACT_USER' ? (
                          <span className="um-text-muted">Portal User</span>
                        ) : (
                          <span className="um-text-muted">Internal Staff</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="um-date-cell">{createdDate}</td>

                      {/* Status */}
                      <td className="align-center">
                        <span className="um-status-badge">Active</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <Pagination total={totalFiltered} page={page} pageSize={10} onChange={setPage} />
        </div>

        {/* Create User Modal */}
        {modalOpen && (
          <div className="um-modal-overlay" onClick={e => e.target === e.currentTarget && handleCloseModal()}>
            <div className="um-modal-card" role="dialog" aria-modal="true">
              {/* Modal Header */}
              <div className="um-modal-header">
                <div>
                  <h2 className="um-modal-title">Create New System User</h2>
                  <p className="um-modal-sub">Provision credentials and assign system access rights</p>
                </div>
                <button type="button" className="um-modal-close" onClick={handleCloseModal} aria-label="Close">
                  ✕
                </button>
              </div>

              {errors.general && (
                <div className="um-banner um-banner--error">{errors.general}</div>
              )}

              {/* Modal Content: 2-Column Split */}
              <div className="um-modal-body">
                {/* Form Column */}
                <form className="um-form" onSubmit={handleSubmit} noValidate>
                  {/* Name */}
                  <div className="um-field">
                    <label className="um-lbl" htmlFor="um-name">Full Name *</label>
                    <input
                      id="um-name"
                      name="name"
                      type="text"
                      className={`um-input${errors.name ? ' um-input--error' : ''}`}
                      placeholder="e.g. Vikram Verma"
                      value={formData.name}
                      onChange={handleChange}
                      autoComplete="name"
                    />
                    {errors.name && <span className="um-field-error">{errors.name}</span>}
                  </div>

                  {/* Email */}
                  <div className="um-field">
                    <label className="um-lbl" htmlFor="um-email">E-mail / Login ID *</label>
                    <input
                      id="um-email"
                      name="email"
                      type="email"
                      className={`um-input${errors.email ? ' um-input--error' : ''}`}
                      placeholder="e.g. vikram.verma@urbanfurniture.in"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                    />
                    {errors.email && <span className="um-field-error">{errors.email}</span>}
                  </div>

                  {/* Role Selector */}
                  <div className="um-field">
                    <label className="um-lbl" htmlFor="um-role">Assigned System Role *</label>
                    <select
                      id="um-role"
                      name="role"
                      className="um-input um-select"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Linked Contact (Only if CONTACT_USER) */}
                  {formData.role === 'CONTACT_USER' && (
                    <div className="um-field">
                      <label className="um-lbl" htmlFor="um-contact">Link to Contact *</label>
                      <select
                        id="um-contact"
                        name="contactId"
                        className={`um-input um-select${errors.contactId ? ' um-input--error' : ''}`}
                        value={formData.contactId}
                        onChange={handleChange}
                      >
                        <option value="">-- Select Contact Entity --</option>
                        {contacts.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.type}) · {c.city || 'India'}
                          </option>
                        ))}
                      </select>
                      {errors.contactId && <span className="um-field-error">{errors.contactId}</span>}
                    </div>
                  )}

                  {/* Password */}
                  <div className="um-field">
                    <label className="um-lbl" htmlFor="um-pass">Password *</label>
                    <div className="um-pass-wrap">
                      <input
                        id="um-pass"
                        name="password"
                        type={showPass ? 'text' : 'password'}
                        className={`um-input${errors.password ? ' um-input--error' : ''}`}
                        placeholder="Min 8 chars, uppercase, lowercase, special"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="um-eye-btn"
                        onClick={() => setShowPass(!showPass)}
                        aria-label={showPass ? 'Hide password' : 'Show password'}
                      >
                        {showPass ? '👁' : '👁‍🗨'}
                      </button>
                    </div>
                    {errors.password && <span className="um-field-error">{errors.password}</span>}
                  </div>

                  {/* Confirm Password */}
                  <div className="um-field">
                    <label className="um-lbl" htmlFor="um-repass">Confirm Password *</label>
                    <div className="um-pass-wrap">
                      <input
                        id="um-repass"
                        name="rePassword"
                        type={showRePass ? 'text' : 'password'}
                        className={`um-input${errors.rePassword ? ' um-input--error' : ''}`}
                        placeholder="Re-enter password"
                        value={formData.rePassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="um-eye-btn"
                        onClick={() => setShowRePass(!showRePass)}
                        aria-label={showRePass ? 'Hide password' : 'Show password'}
                      >
                        {showRePass ? '👁' : '👁‍🗨'}
                      </button>
                    </div>
                    {errors.rePassword && <span className="um-field-error">{errors.rePassword}</span>}
                  </div>

                  {/* Action Buttons */}
                  <div className="um-modal-actions">
                    <button type="submit" className="um-btn-save" disabled={submitting}>
                      {submitting ? 'Creating User...' : 'Create User'}
                    </button>
                    <button type="button" className="um-btn-cancel" onClick={handleCloseModal} disabled={submitting}>
                      Cancel
                    </button>
                  </div>
                </form>

                {/* Info Panel: Rules & Roles */}
                <div className="um-side-panel">
                  <div className="um-info-box">
                    <h3 className="um-info-heading">Password Policy</h3>
                    <ul className="um-info-checklist">
                      <li>Minimum <strong>8 characters</strong> in length</li>
                      <li>At least one <strong>uppercase letter (A–Z)</strong></li>
                      <li>At least one <strong>lowercase letter (a–z)</strong></li>
                      <li>At least one <strong>special symbol (!@#$%^&*)</strong></li>
                      <li>Email must be globally unique in database</li>
                    </ul>
                  </div>

                  <div className="um-info-box">
                    <h3 className="um-info-heading">Role Permissions Guide</h3>
                    <div className="um-role-desc-list">
                      <div className="um-role-desc-item">
                        <span className="um-role-badge um-role--admin">Administrator</span>
                        <p>Full control over master data, archiving, user provisioning, transactions & financial statements.</p>
                      </div>
                      <div className="um-role-desc-item">
                        <span className="um-role-badge um-role--accountant">Invoicing User</span>
                        <p>Manages Sales Orders, Purchases, Customer Invoices, Vendor Bills, Payments, Journals & Reports.</p>
                      </div>
                      <div className="um-role-desc-item">
                        <span className="um-role-badge um-role--portal">Portal User</span>
                        <p>Restricted to <code>/portal</code>. Can only view invoices/bills for their linked entity and pay dues.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

/* ---- Icons ---- */
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
