import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './SignUpPage.css'

import { api, setTokens, setUser } from '../services/api'
import { useToast } from '../context/ToastContext'

function SignUpPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'ADMIN',
    password: '',
    rePassword: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showRePass, setShowRePass] = useState(false)

  const validate = () => {
    const e = {}

    // Full name
    if (!formData.name.trim())
      e.name = 'Full name is required'

    // Email
    if (!formData.email.trim())
      e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = 'Enter a valid email address'

    // Password: >8 chars, uppercase, lowercase, special char
    if (!formData.password)
      e.password = 'Password is required'
    else if (formData.password.length <= 8)
      e.password = 'Password must be more than 8 characters'
    else if (!/[a-z]/.test(formData.password))
      e.password = 'Must contain at least one lowercase letter'
    else if (!/[A-Z]/.test(formData.password))
      e.password = 'Must contain at least one uppercase letter'
    else if (!/[^a-zA-Z0-9]/.test(formData.password))
      e.password = 'Must contain at least one special character'

    // Re-enter password
    if (!formData.rePassword)
      e.rePassword = 'Please confirm your password'
    else if (formData.password !== formData.rePassword)
      e.rePassword = 'Passwords do not match'

    return e
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length > 0) { setErrors(v); return }
    setLoading(true)
    setErrors({})
    try {
      const res = await api.auth.register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      })
      if (res?.tokens) setTokens(res.tokens)
      if (res?.user) setUser(res.user)

      const roleLabels = {
        ADMIN: 'Administrator',
        ACCOUNTANT: 'Invoicing User',
        CONTACT_USER: 'Portal User',
      }
      const roleDisplay = roleLabels[formData.role] || formData.role

      toast.success(
        `Welcome to FurnIQ, ${formData.name.trim()}! Your account was registered as ${roleDisplay}.`,
        'Registration Successful'
      )

      if (formData.role === 'CONTACT_USER') {
        navigate('/portal')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      const msg = err.message || 'Sign up failed. Please try again.'
      setErrors({ general: msg })
      toast.error(msg, 'Registration Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-page">
      <div className="auth-brand">
        <div className="auth-logo"><span>F</span></div>
        <h1 className="auth-brand-name">FurnIQ</h1>
        <p className="auth-brand-subtitle">Furniture Management System</p>
      </div>

      <div className="signup-card">
        <h2 className="card-title">Sign Up</h2>
        <p className="card-subtitle">Create your invoicing account</p>

        {errors.general && (
          <div className="error-banner" role="alert">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name">FULL NAME</label>
            <input
              id="name" name="name" type="text"
              className={`form-input${errors.name ? ' form-input--error' : ''}`}
              placeholder="e.g. Rajesh Sharma"
              value={formData.name} onChange={handleChange}
              autoComplete="name"
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          {/* System Role Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="role">SYSTEM ROLE</label>
            <select
              id="role"
              name="role"
              className="form-input"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="ADMIN">Administrator (Business Owner — Full Control)</option>
              <option value="ACCOUNTANT">Invoicing User (Accountant — Sales, Purchases, Reports)</option>
              <option value="CONTACT_USER">Customer / Vendor (Contact Portal Access)</option>
            </select>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">ENTER EMAIL ID</label>
            <input
              id="email" name="email" type="email"
              className={`form-input${errors.email ? ' form-input--error' : ''}`}
              placeholder="you@example.com"
              value={formData.email} onChange={handleChange}
              autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">ENTER PASSWORD</label>
            <div className="input-wrap">
              <input
                id="password" name="password"
                type={showPass ? 'text' : 'password'}
                className={`form-input${errors.password ? ' form-input--error' : ''}`}
                placeholder="Min 8 chars, upper, lower, special"
                value={formData.password} onChange={handleChange}
                autoComplete="new-password"
              />
              <button type="button" className="eye-btn"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}>
                {showPass ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
            {/* Password strength hints */}
            {formData.password && !errors.password && (
              <div className="pass-hints">
                <StrengthDot ok={formData.password.length > 8} label="8+ characters" />
                <StrengthDot ok={/[A-Z]/.test(formData.password)} label="Uppercase" />
                <StrengthDot ok={/[a-z]/.test(formData.password)} label="Lowercase" />
                <StrengthDot ok={/[^a-zA-Z0-9]/.test(formData.password)} label="Special char" />
              </div>
            )}
          </div>

          {/* Re-enter Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="rePassword">RE-ENTER PASSWORD</label>
            <div className="input-wrap">
              <input
                id="rePassword" name="rePassword"
                type={showRePass ? 'text' : 'password'}
                className={`form-input${errors.rePassword ? ' form-input--error' : ''}`}
                placeholder="Confirm your password"
                value={formData.rePassword} onChange={handleChange}
                autoComplete="new-password"
              />
              <button type="button" className="eye-btn"
                onClick={() => setShowRePass(v => !v)}
                aria-label={showRePass ? 'Hide password' : 'Show password'}>
                {showRePass ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.rePassword && <span className="field-error">{errors.rePassword}</span>}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign Up'}
          </button>
        </form>

        <div className="footer-links">
          <Link to="/forgot-password">Forgot Password</Link>
          <span className="divider">|</span>
          <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  )
}

function StrengthDot({ ok, label }) {
  return (
    <span className={`strength-dot ${ok ? 'strength-dot--ok' : ''}`}>
      {ok ? '✓' : '○'} {label}
    </span>
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

export default SignUpPage
