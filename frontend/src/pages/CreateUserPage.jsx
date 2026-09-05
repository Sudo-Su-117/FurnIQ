import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './CreateUserPage.css'

const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'administrator', label: 'Administrator' }
]

function CreateUserPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    loginId: '',
    email: '',
    role: 'user',
    password: '',
    rePassword: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showRePass, setShowRePass] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const validate = () => {
    const e = {}
    if (!formData.name.trim()) e.name = 'Name is required'

    if (!formData.loginId.trim())
      e.loginId = 'Login ID is required'
    else if (formData.loginId.length < 6 || formData.loginId.length > 12)
      e.loginId = 'Login ID must be 6–12 characters'

    if (!formData.email.trim())
      e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = 'Enter a valid email address'

    if (!formData.password)
      e.password = 'Password is required'
    else if (formData.password.length <= 8)
      e.password = 'Must be more than 8 characters'
    else if (!/[a-z]/.test(formData.password))
      e.password = 'Must contain at least one lowercase letter'
    else if (!/[A-Z]/.test(formData.password))
      e.password = 'Must contain at least one uppercase letter'
    else if (!/[^a-zA-Z0-9]/.test(formData.password))
      e.password = 'Must contain at least one special character'

    if (!formData.rePassword)
      e.rePassword = 'Please confirm the password'
    else if (formData.password !== formData.rePassword)
      e.rePassword = 'Passwords do not match'

    return e
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    setSuccessMsg('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length > 0) { setErrors(v); return }
    setLoading(true)
    setErrors({})
    try {
      // TODO: POST to /api/admin/users
      await new Promise(r => setTimeout(r, 800))
      setSuccessMsg(`User "${formData.name}" created successfully!`)
      setFormData({ name: '', loginId: '', email: '', role: 'user', password: '', rePassword: '' })
    } catch (err) {
      setErrors({ general: err.message || 'Failed to create user. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => navigate(-1)

  return (
    <div className="cu-page">
      {/* Page Header */}
      <div className="cu-page-header">
        <div className="cu-logo-wrap">
          <div className="cu-logo"><span>F</span></div>
          <span className="cu-app-name">FurnIQ</span>
        </div>
        <h1 className="cu-page-title">Create User</h1>
      </div>

      <div className="cu-layout">
        {/* Form Card */}
        <div className="cu-card">
          {errors.general && (
            <div className="error-banner" role="alert">{errors.general}</div>
          )}
          {successMsg && (
            <div className="success-banner" role="status">{successMsg}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className="cu-field">
              <label className="cu-label" htmlFor="name">Name</label>
              <div className="cu-input-col">
                <input
                  id="name" name="name" type="text"
                  className={`cu-input${errors.name ? ' cu-input--error' : ''}`}
                  placeholder="Full name"
                  value={formData.name} onChange={handleChange}
                  autoComplete="name"
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
            </div>

            {/* Login ID */}
            <div className="cu-field">
              <label className="cu-label" htmlFor="loginId">Login id</label>
              <div className="cu-input-col">
                <input
                  id="loginId" name="loginId" type="text"
                  className={`cu-input${errors.loginId ? ' cu-input--error' : ''}`}
                  placeholder="Unique, 6–12 characters"
                  value={formData.loginId} onChange={handleChange}
                  autoComplete="off"
                />
                {errors.loginId && <span className="field-error">{errors.loginId}</span>}
              </div>
            </div>

            {/* Email */}
            <div className="cu-field">
              <label className="cu-label" htmlFor="email">E-mail id</label>
              <div className="cu-input-col">
                <input
                  id="email" name="email" type="email"
                  className={`cu-input${errors.email ? ' cu-input--error' : ''}`}
                  placeholder="user@example.com"
                  value={formData.email} onChange={handleChange}
                  autoComplete="email"
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
            </div>

            {/* Role */}
            <div className="cu-field cu-field--role">
              <span className="cu-label">Role</span>
              <div className="cu-radio-group">
                {ROLES.map(r => (
                  <label key={r.value} className="cu-radio-label">
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={formData.role === r.value}
                      onChange={handleChange}
                      className="cu-radio"
                    />
                    <span className="cu-radio-custom" aria-hidden="true" />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Password */}
            <div className="cu-field">
              <label className="cu-label" htmlFor="cu-password">Password</label>
              <div className="cu-input-col">
                <div className="input-wrap">
                  <input
                    id="cu-password" name="password"
                    type={showPass ? 'text' : 'password'}
                    className={`cu-input${errors.password ? ' cu-input--error' : ''}`}
                    placeholder="Min 8 chars, upper, lower, special"
                    value={formData.password} onChange={handleChange}
                    autoComplete="new-password"
                  />
                  <button type="button" className="eye-btn"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide' : 'Show'}>
                    {showPass ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>
            </div>

            {/* Re-enter Password */}
            <div className="cu-field">
              <label className="cu-label" htmlFor="cu-rePassword">Re-Enter Password</label>
              <div className="cu-input-col">
                <div className="input-wrap">
                  <input
                    id="cu-rePassword" name="rePassword"
                    type={showRePass ? 'text' : 'password'}
                    className={`cu-input${errors.rePassword ? ' cu-input--error' : ''}`}
                    placeholder="Confirm password"
                    value={formData.rePassword} onChange={handleChange}
                    autoComplete="new-password"
                  />
                  <button type="button" className="eye-btn"
                    onClick={() => setShowRePass(v => !v)}
                    aria-label={showRePass ? 'Hide' : 'Show'}>
                    {showRePass ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {errors.rePassword && <span className="field-error">{errors.rePassword}</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="cu-actions">
              <button type="submit" className="btn-create" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Create'}
              </button>
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Info Panel */}
        <div className="cu-info-panel">
          <div className="cu-info-section">
            <h3 className="cu-info-title">Validation Rules</h3>
            <ol className="cu-info-list">
              <li>Login ID should be unique and must be between <strong>6–12 characters</strong></li>
              <li>Email should not be a duplicate in database</li>
              <li>Password must be unique and must contain a <strong>small case</strong>, a <strong>large case</strong> and a <strong>special character</strong> and must have more than <strong>8 characters</strong></li>
            </ol>
          </div>

          <div className="cu-info-section">
            <h3 className="cu-info-title">Role Permissions</h3>
            <div className="cu-role-card">
              <div className="cu-role-item">
                <span className="cu-role-badge cu-role-badge--admin">Admin</span>
                <p>Have all access rights</p>
              </div>
              <div className="cu-role-item">
                <span className="cu-role-badge cu-role-badge--user">User</span>
                <p>Can only see his invoices/bills in paid/unpaid status and can directly pay his dues from portal</p>
              </div>
              <div className="cu-role-item">
                <span className="cu-role-badge cu-role-badge--accountant">Accountant</span>
                <p>Create Master data, record Transactions and View reports. Can manage customers/vendors, access accounting dashboard, create journal entries. Can create and manage invoices, bills, and payments</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Eye() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOff() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default CreateUserPage
