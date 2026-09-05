import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './LoginPage.css'

function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ loginId: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validate = () => {
    const e = {}
    if (!formData.loginId.trim()) e.loginId = 'Login ID is required'
    else if (formData.loginId.length < 6 || formData.loginId.length > 12)
      e.loginId = 'Login ID must be 6–12 characters'
    if (!formData.password) e.password = 'Password is required'
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
      await new Promise(r => setTimeout(r, 800))
      navigate('/dashboard')
    } catch {
      setErrors({ general: 'Invalid Login ID or Password' })
    } finally {
      setLoading(false)
    }
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
            <label className="form-label" htmlFor="loginId">LOGIN ID</label>
            <input
              id="loginId" name="loginId" type="text"
              className={`form-input${errors.loginId ? ' form-input--error' : ''}`}
              placeholder="Enter your login ID"
              value={formData.loginId} onChange={handleChange}
              autoComplete="username"
            />
            {errors.loginId && <span className="field-error">{errors.loginId}</span>}
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
