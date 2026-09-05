import React, { useState, useEffect, useRef, useCallback } from 'react'
import './NewContactModal.css'

const EMPTY_FORM = {
  name: '',
  type: 'CUSTOMER',
  email: '',
  mobile: '',
  street: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  address: '',
  image: null,
  imagePreview: null,
}

function validate(fields) {
  const errors = {}
  if (!fields.name.trim()) errors.name = 'Name is required.'
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
    errors.email = 'Enter a valid email address.'
  if (fields.mobile && !/^[+\d\s\-()\\.]{7,20}$/.test(fields.mobile.trim()))
    errors.mobile = 'Enter a valid mobile number.'
  return errors
}

export default function NewContactModal({ isOpen, onClose, onSave, editContact }) {
  const [fields, setFields] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [confirmed, setConfirmed] = useState(false)
  const firstInputRef = useRef(null)
  const imageInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (editContact) {
        setFields({
          name:         editContact.name         || '',
          type:         editContact.type         || 'CUSTOMER',
          email:        editContact.email        || '',
          mobile:       editContact.mobile       || '',
          street:       editContact.street       || '',
          city:         editContact.city         || '',
          state:        editContact.state        || '',
          country:      editContact.country      || 'India',
          pincode:      editContact.pincode      || '',
          address:      editContact.address      || '',
          image:        editContact.image        || null,
          imagePreview: editContact.imagePreview || null,
        })
      } else {
        setFields(EMPTY_FORM)
      }
      setErrors({})
      setConfirmed(false)
    }
  }, [isOpen, editContact])

  useEffect(() => {
    if (isOpen) setTimeout(() => firstInputRef.current?.focus(), 60)
  }, [isOpen])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFields(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
    setConfirmed(false)
  }

  const handleTypeSelect = (type) => {
    setFields(prev => ({ ...prev, type }))
    setConfirmed(false)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setFields(prev => ({ ...prev, image: file, imagePreview: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleImageDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setFields(prev => ({ ...prev, image: file, imagePreview: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleConfirm = () => {
    const validationErrors = validate(fields)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setConfirmed(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    const validationErrors = validate(fields)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    onSave(fields)
  }

  const isEditing = Boolean(editContact)

  return (
    <div
      className="ncm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ncm-title"
      onClick={handleOverlayClick}
    >
      <div className="ncm-panel">
        {/* ---- Top action bar ---- */}
        <div className="ncm-topbar">
          <div className="ncm-topbar-left">
            <button type="button" className="ncm-topbar-btn ncm-topbar-btn--new"
              onClick={() => { setFields(EMPTY_FORM); setErrors({}); setConfirmed(false) }}
              title="Reset form for new contact">
              New
            </button>
            <button type="button"
              className={`ncm-topbar-btn ncm-topbar-btn--confirm${confirmed ? ' ncm-topbar-btn--confirmed' : ''}`}
              onClick={handleConfirm}>
              {confirmed ? '✓ Confirmed' : 'Confirm'}
            </button>
          </div>
          <div className="ncm-topbar-right">
            <button type="button" className="ncm-topbar-btn ncm-topbar-btn--back" onClick={onClose}>
              Back
            </button>
            <button className="ncm-close" onClick={onClose} aria-label="Close" type="button">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* ---- Title ---- */}
        <h2 className="ncm-title" id="ncm-title">
          {isEditing ? 'Edit Contact' : 'New Contact'}
        </h2>

        <form onSubmit={handleSave} noValidate>
          {/* ---- Two-column layout: fields left, image right ---- */}
          <div className="ncm-body">
            {/* Left: form fields */}
            <div className="ncm-fields-col">

              {/* Contact Name */}
              <div className="ncm-field ncm-field--inline">
                <label className="ncm-label ncm-label--inline" htmlFor="ncm-name">
                  Contact Name
                </label>
                <div className="ncm-input-wrap">
                  <input
                    ref={firstInputRef}
                    id="ncm-name" name="name" type="text"
                    className={`ncm-input ncm-input--underline${errors.name ? ' ncm-input--error' : ''}`}
                    placeholder="Full name or business name"
                    value={fields.name} onChange={handleChange}
                    autoComplete="off"
                  />
                  {errors.name && <span className="ncm-error-msg">{errors.name}</span>}
                </div>
              </div>

              {/* TYPE toggle */}
              <div className="ncm-field ncm-field--inline">
                <label className="ncm-label ncm-label--inline">Type</label>
                <div className="ncm-type-group" role="group" aria-label="Contact type">
                  {['CUSTOMER', 'VENDOR', 'BOTH'].map(t => (
                    <button key={t} type="button"
                      className={`ncm-type-btn${fields.type === t ? ' ncm-type-btn--active' : ''}`}
                      onClick={() => handleTypeSelect(t)}
                      aria-pressed={fields.type === t}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div className="ncm-field ncm-field--inline">
                <label className="ncm-label ncm-label--inline" htmlFor="ncm-email">Email</label>
                <div className="ncm-input-wrap">
                  <input
                    id="ncm-email" name="email" type="email"
                    className={`ncm-input ncm-input--underline${errors.email ? ' ncm-input--error' : ''}`}
                    placeholder="Unique Email"
                    value={fields.email} onChange={handleChange}
                    autoComplete="off"
                  />
                  {errors.email && <span className="ncm-error-msg">{errors.email}</span>}
                </div>
              </div>

              {/* Phone */}
              <div className="ncm-field ncm-field--inline">
                <label className="ncm-label ncm-label--inline" htmlFor="ncm-mobile">Phone</label>
                <div className="ncm-input-wrap">
                  <input
                    id="ncm-mobile" name="mobile" type="tel"
                    className={`ncm-input ncm-input--underline${errors.mobile ? ' ncm-input--error' : ''}`}
                    placeholder="+91 98200 00000"
                    value={fields.mobile} onChange={handleChange}
                    autoComplete="off"
                  />
                  {errors.mobile && <span className="ncm-error-msg">{errors.mobile}</span>}
                </div>
              </div>

              {/* Address section */}
              <div className="ncm-field ncm-field--inline ncm-field--addr-group">
                <label className="ncm-label ncm-label--inline ncm-label--addr">Address</label>
                <div className="ncm-addr-col">
                  <input name="street" type="text"
                    className="ncm-input ncm-input--underline"
                    placeholder="Street"
                    value={fields.street} onChange={handleChange} />
                  <input name="city" type="text"
                    className="ncm-input ncm-input--underline"
                    placeholder="City"
                    value={fields.city} onChange={handleChange} />
                  <input name="state" type="text"
                    className="ncm-input ncm-input--underline"
                    placeholder="State"
                    value={fields.state} onChange={handleChange} />
                </div>
              </div>

              {/* Country + Pincode in a row (bottom) */}
              <div className="ncm-field ncm-field--inline">
                <label className="ncm-label ncm-label--inline" style={{visibility:'hidden'}}>–</label>
                <div className="ncm-row-2">
                  <input name="country" type="text"
                    className="ncm-input ncm-input--underline"
                    placeholder="Country"
                    value={fields.country} onChange={handleChange} />
                  <input name="pincode" type="text"
                    className="ncm-input ncm-input--underline"
                    placeholder="Pincode"
                    value={fields.pincode} onChange={handleChange} />
                </div>
              </div>

            </div>{/* end fields col */}

            {/* Right: image upload */}
            <div className="ncm-image-col">
              <div
                className="ncm-image-upload"
                onDragOver={e => e.preventDefault()}
                onDrop={handleImageDrop}
                onClick={() => imageInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload contact image"
                onKeyDown={e => e.key === 'Enter' && imageInputRef.current?.click()}
              >
                {fields.imagePreview ? (
                  <>
                    <img src={fields.imagePreview} alt="Contact" className="ncm-image-preview" />
                    <button type="button" className="ncm-image-remove"
                      onClick={e => { e.stopPropagation(); setFields(prev => ({...prev, image: null, imagePreview: null})) }}
                      aria-label="Remove image">✕</button>
                  </>
                ) : (
                  <div className="ncm-image-placeholder">
                    <UploadIcon />
                    <span>Upload Image</span>
                    <span className="ncm-image-hint">Click or drag</span>
                  </div>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/*"
                style={{ display: 'none' }} onChange={handleImageChange} />
            </div>
          </div>{/* end body */}

          {/* ---- Save / Cancel footer ---- */}
          <div className="ncm-footer">
            <button type="submit" className="ncm-save-btn">
              {isEditing ? 'Update Contact' : 'Save Contact'}
            </button>
            <button type="button" className="ncm-cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
    </svg>
  )
}
