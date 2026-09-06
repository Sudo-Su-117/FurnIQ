import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './LoginPage.css'

import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const toast = useToast()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validate = () => {
    const e = {}
    if (!formData.email.trim()) e.email = 'Email address is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      e.email = 'Please enter a valid email address'
    if (!formData.password) e.password = 'Password is required'
    return e
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const doLogin = async (email, password) => {
    setLoading(true)
    setErrors({})
    try {
      const res = await login({
        email: email.trim(),
        password: password,
      })
      const user = res?.user
      const role = user?.role?.toUpperCase?.() || ''
      const name = user?.name || 'User'

      const roleLabels = {
        ADMIN: 'Administrator',
        ACCOUNTANT: 'Invoicing User',
        CONTACT_USER: 'Portal User',
      }
      const roleDisplay = roleLabels[role] || role || 'User'

      toast.success(
        `Welcome back, ${name}! Signed in successfully as ${roleDisplay}.`,
        'Login Successful'
      )

      if (role === 'CONTACT_USER') {
        navigate('/portal')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      const errorMsg = err.message || 'Invalid Email or Password'
      setErrors({ general: errorMsg })
      toast.error(errorMsg, 'Login Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length > 0) { setErrors(v); return }
    doLogin(formData.email, formData.password)
  }

  const handleQuickLogin = (email, password = 'Admin123!') => {
    setFormData({ email, password })
    doLogin(email, password)
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-logo"><span>F</span></div>
        <h1 className="login-brand-name">FurnIQ</h1>
        <p className="login-brand-subtitle">Furniture Management System</p>
      </div>

      <div className="login-card">
        <h2 className="login-title">Sign in</h2>

        {errors.general && (
          <div className="error-banner" role="alert">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">EMAIL ADDRESS</label>
            <input
              id="email" name="email" type="email"
              className={`form-input${errors.email ? ' form-input--error' : ''}`}
              placeholder="e.g. admin@urbanfurniture.com"
              value={formData.email} onChange={handleChange}
              autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">PASSWORD</label>
            <div className="input-wrap">
              <input
                id="password" name="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input${errors.password ? ' form-input--error' : ''}`}
                placeholder="Enter password"
                value={formData.password} onChange={handleChange}
                autoComplete="current-password"
              />
              <button type="button" className="eye-btn"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign in'}
          </button>
        </form>

        <div className="footer-links">
          <Link to="/forgot-password">Forgot Password</Link>
          <span className="divider">|</span>
          <Link to="/signup">Sign Up</Link>
        </div>

        {/* Quick 1-Click Demo Logins */}
        <div className="quick-login-section">
          <div className="quick-login-label">⚡ QUICK DEMO LOGINS (1-CLICK)</div>
          <div className="quick-login-grid">
            <button
              type="button"
              className="quick-login-btn quick-login-btn--admin"
              onClick={() => handleQuickLogin('admin@urbanfurniture.com')}
              disabled={loading}
              title="Administrator: Full access, master data, archiving, user provisioning"
            >
              <div className="ql-top">
                <span className="ql-role">👑 Administrator</span>
                <span className="ql-badge">Admin</span>
              </div>
              <span className="ql-email">admin@urbanfurniture.com</span>
            </button>

            <button
              type="button"
              className="quick-login-btn quick-login-btn--accountant"
              onClick={() => handleQuickLogin('accountant@urbanfurniture.com')}
              disabled={loading}
              title="Accountant: Sales, purchases, bills, invoices, accounting, reports"
            >
              <div className="ql-top">
                <span className="ql-role">💼 Invoicing User</span>
                <span className="ql-badge">Accountant</span>
              </div>
              <span className="ql-email">accountant@urbanfurniture.com</span>
            </button>

            <button
              type="button"
              className="quick-login-btn quick-login-btn--customer"
              onClick={() => handleQuickLogin('ratan.mehra@prestigeliving.co.in')}
              disabled={loading}
              title="Customer Portal: Prestige Living Interiors"
            >
              <div className="ql-top">
                <span className="ql-role">🏢 Customer Portal</span>
                <span className="ql-badge">Customer</span>
              </div>
              <span className="ql-email">ratan.mehra@prestigeliving.co.in</span>
            </button>

            <button
              type="button"
              className="quick-login-btn quick-login-btn--vendor"
              onClick={() => handleQuickLogin('suresh.patel@timbercrafts.in')}
              disabled={loading}
              title="Vendor Portal: Timber Crafts Lumber Co."
            >
              <div className="ql-top">
                <span className="ql-role">🌲 Vendor Portal</span>
                <span className="ql-badge">Vendor</span>
              </div>
              <span className="ql-email">suresh.patel@timbercrafts.in</span>
            </button>
          </div>
          <div className="quick-login-hint">Pass: <code>Admin123!</code> · Instant switch between roles</div>
        </div>

        <p className="role-info">
          On success, <strong>ADMIN</strong> and <strong>ACCOUNTANT</strong> roles are routed
          to <code>/dashboard</code>. The <strong>CONTACT</strong> role is routed to <code>/portal</code>.
        </p>
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

export default LoginPage
