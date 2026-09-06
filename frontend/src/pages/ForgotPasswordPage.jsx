import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import './SignUpPage.css'

function ForgotPasswordPage() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Email is required'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email'); return }
    setLoading(true)
    setError('')
    try {
      await new Promise(r => setTimeout(r, 800))
      setSent(true)
      toast.success(`Password reset instructions sent to ${email.trim()}`, 'Email Sent')
    } catch {
      setError('Something went wrong. Please try again.')
      toast.error('Something went wrong. Please try again.', 'Error')
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
        <h2 className="card-title">Forgot Password</h2>

        {sent ? (
          <div>
            <div className="success-banner" role="status">
              Password reset link sent to <strong>{email}</strong>. Check your inbox.
            </div>
            <div className="footer-links" style={{ marginTop: 8 }}>
              <Link to="/login">← Back to Sign in</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="card-subtitle">Enter your registered email to receive a reset link</p>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-email">EMAIL ID</label>
                <input
                  id="fp-email" type="email"
                  className={`form-input${error ? ' form-input--error' : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Send Reset Link'}
              </button>
            </form>
            <div className="footer-links">
              <Link to="/login">← Back to Sign in</Link>
              <span className="divider">|</span>
              <Link to="/signup">Sign Up</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordPage
