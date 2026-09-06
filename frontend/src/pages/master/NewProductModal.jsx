import React, { useState, useEffect, useRef, useCallback } from 'react'
import { compressImage } from '../../utils/imageHelper'
import './NewProductModal.css'

const EMPTY = {
  name: '',
  type: 'GOODS',
  category: '',
  salesPrice: '',
  costPrice: '',
  stock: '',
  taxRate: 18,
  image: null,
  imagePreview: null,
}

const PRODUCT_TYPES = ['GOODS', 'SERVICE', 'COMBO']
const TAX_RATES = [0, 5, 12, 18, 28]

function validate(f) {
  const e = {}
  if (!f.name.trim()) e.name = 'Product name is required.'
  if (!f.type) e.type = 'Product type is required.'
  if (f.salesPrice === '' || f.salesPrice === null || f.salesPrice === undefined) e.salesPrice = 'Sales price is required.'
  else if (isNaN(Number(f.salesPrice)) || Number(f.salesPrice) < 0) e.salesPrice = 'Enter a valid sales price (min ₹0).'
  if (f.costPrice !== '' && f.costPrice !== null && f.costPrice !== undefined && (isNaN(Number(f.costPrice)) || Number(f.costPrice) < 0)) e.costPrice = 'Enter a valid cost price (min ₹0).'
  return e
}

export default function NewProductModal({ isOpen, onClose, onSave, editProduct, existingCategories = [] }) {
  const [fields, setFields]     = useState(EMPTY)
  const [errors, setErrors]     = useState({})
  const [confirmed, setConfirmed] = useState(false)
  // Category input with creatable dropdown
  const [catInput, setCatInput]   = useState('')
  const [catDropOpen, setCatDropOpen] = useState(false)
  const firstRef  = useRef(null)
  const imageRef  = useRef(null)
  const catRef    = useRef(null)

  // Combine existing + any new the user typed
  const [allCats, setAllCats] = useState([...new Set((existingCategories || []).filter(Boolean))])

  useEffect(() => {
    setAllCats([...new Set((existingCategories || []).filter(Boolean))])
  }, [existingCategories])

  useEffect(() => {
    if (isOpen) {
      if (editProduct) {
        setFields({
          name:         editProduct.name         ?? '',
          type:         editProduct.type         ?? 'GOODS',
          category:     editProduct.category     ?? '',
          salesPrice:   editProduct.salesPrice   ?? '',
          costPrice:    editProduct.costPrice     ?? '',
          stock:        editProduct.stock        ?? '',
          taxRate:      editProduct.taxRate      ?? 18,
          image:        editProduct.image        ?? null,
          imagePreview: editProduct.imagePreview ?? editProduct.image ?? null,
        })
        setCatInput(editProduct.category || '')
      } else {
        setFields(EMPTY)
        setCatInput('')
      }
      setErrors({})
      setCatDropOpen(false)
      setConfirmed(false)
    }
  }, [isOpen, editProduct])

  useEffect(() => {
    if (isOpen) setTimeout(() => firstRef.current?.focus(), 60)
  }, [isOpen])

  const handleKey = useCallback((e) => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, handleKey])

  // Close cat dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setCatDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!isOpen) return null

  const change = (e) => {
    const { name, value } = e.target
    setFields(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }))
    setConfirmed(false)
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const compressedUri = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 })
      setFields(p => ({ ...p, image: file, imagePreview: compressedUri }))
    } catch (err) {
      console.error('Error compressing product image:', err)
    }
  }

  const handleImageDrop = async (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file?.type.startsWith('image/')) return
    try {
      const compressedUri = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 })
      setFields(p => ({ ...p, image: file, imagePreview: compressedUri }))
    } catch (err) {
      console.error('Error compressing dropped product image:', err)
    }
  }

  // Category creatable logic
  const safeCatInput = (catInput || '').toLowerCase()
  const catFiltered = allCats.filter(c => Boolean(c) && String(c).toLowerCase().includes(safeCatInput))
  const canCreate   = catInput.trim() && !allCats.some(c => Boolean(c) && String(c).toLowerCase() === catInput.trim().toLowerCase())

  const selectCat = (c) => {
    setFields(p => ({ ...p, category: c }))
    setCatInput(c)
    setCatDropOpen(false)
  }
  const createCat = () => {
    const newCat = catInput.trim()
    setAllCats(prev => [...prev, newCat])
    selectCat(newCat)
  }

  const handleConfirm = () => {
    const v = validate(fields)
    if (Object.keys(v).length) { setErrors(v); return }
    setConfirmed(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    const v = validate(fields)
    if (Object.keys(v).length) { setErrors(v); return }
    onSave({
      ...fields,
      salesPrice: Number(fields.salesPrice),
      costPrice:  fields.costPrice !== '' ? Number(fields.costPrice) : null,
      stock:      fields.type === 'SERVICE' ? null : (fields.stock !== '' ? Number(fields.stock) : null),
      taxRate:    Number(fields.taxRate),
    })
  }

  return (
    <div className="npm-overlay" role="dialog" aria-modal="true" aria-labelledby="npm-title"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="npm-panel">

        {/* Top bar */}
        <div className="npm-topbar">
          <div className="npm-topbar-left">
            <button type="button" className="npm-topbar-btn npm-btn--new"
              onClick={() => { setFields(EMPTY); setCatInput(''); setErrors({}); setConfirmed(false) }}>
              New
            </button>
            <button type="button"
              className={`npm-topbar-btn npm-btn--confirm${confirmed ? ' npm-btn--confirmed' : ''}`}
              onClick={handleConfirm}>
              {confirmed ? '✓ Confirmed' : 'Confirm'}
            </button>
          </div>
          <div className="npm-topbar-right">
            <button type="button" className="npm-topbar-btn npm-btn--back" onClick={onClose}>Back</button>
            <button type="button" className="npm-close" onClick={onClose} aria-label="Close"><XIcon /></button>
          </div>
        </div>

        <h2 className="npm-title" id="npm-title">
          {editProduct ? 'Edit Product' : 'New Product'}
        </h2>

        <form onSubmit={handleSave} noValidate>
          <div className="npm-body">

            {/* ---- Left: form fields ---- */}
            <div className="npm-fields">

              {/* Product Name */}
              <div className="npm-row">
                <label className="npm-lbl" htmlFor="npm-name">
                  Product Name <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <div className="npm-input-wrap">
                  <input ref={firstRef} id="npm-name" name="name" type="text"
                    className={`npm-input npm-input--ul${errors.name ? ' npm-input--err' : ''}`}
                    placeholder="Enter product name"
                    value={fields.name} onChange={change} autoComplete="off" />
                  {errors.name && <span className="npm-err">{errors.name}</span>}
                </div>
              </div>

              {/* Product Type — dropdown */}
              <div className="npm-row">
                <label className="npm-lbl" htmlFor="npm-type">
                  Product Type <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <div className="npm-input-wrap">
                  <select id="npm-type" name="type"
                    className={`npm-input npm-input--ul npm-select${errors.type ? ' npm-input--err' : ''}`}
                    value={fields.type} onChange={change}>
                    {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.type && <span className="npm-err">{errors.type}</span>}
                </div>
              </div>

              {/* Category — creatable */}
              <div className="npm-row" ref={catRef}>
                <label className="npm-lbl" htmlFor="npm-cat">Category</label>
                <div className="npm-input-wrap npm-cat-wrap">
                  <input id="npm-cat" type="text"
                    className="npm-input npm-input--ul"
                    placeholder="Select or create..."
                    value={catInput}
                    onChange={e => { setCatInput(e.target.value); setCatDropOpen(true); setFields(p => ({...p, category: e.target.value})) }}
                    onFocus={() => setCatDropOpen(true)}
                    autoComplete="off"
                  />
                  {catDropOpen && (catFiltered.length > 0 || canCreate) && (
                    <div className="npm-cat-dropdown">
                      {catFiltered.map(c => (
                        <button type="button" key={c} className="npm-cat-option" onClick={() => selectCat(c)}>{c}</button>
                      ))}
                      {canCreate && (
                        <button type="button" className="npm-cat-option npm-cat-create" onClick={createCat}>
                          <PlusSmIcon /> Create "{catInput.trim()}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sales Price */}
              <div className="npm-row">
                <label className="npm-lbl" htmlFor="npm-sales">
                  Sales Price <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <div className="npm-input-wrap">
                  <div className="npm-price-wrap">
                    <span className="npm-price-prefix">₹</span>
                    <input id="npm-sales" name="salesPrice" type="number" min="0" step="0.01"
                      className={`npm-input npm-input--ul npm-input--price${errors.salesPrice ? ' npm-input--err' : ''}`}
                      placeholder="0.00"
                      value={fields.salesPrice} onChange={change} />
                  </div>
                  {errors.salesPrice && <span className="npm-err">{errors.salesPrice}</span>}
                </div>
              </div>

              {/* Cost Price */}
              <div className="npm-row">
                <label className="npm-lbl" htmlFor="npm-cost">Cost Price</label>
                <div className="npm-input-wrap">
                  <div className="npm-price-wrap">
                    <span className="npm-price-prefix">₹</span>
                    <input id="npm-cost" name="costPrice" type="number" min="0" step="0.01"
                      className={`npm-input npm-input--ul npm-input--price${errors.costPrice ? ' npm-input--err' : ''}`}
                      placeholder="0.00"
                      value={fields.costPrice} onChange={change} />
                  </div>
                  {errors.costPrice && <span className="npm-err">{errors.costPrice}</span>}
                </div>
              </div>

              {/* Stock (hidden for SERVICE) */}
              {fields.type !== 'SERVICE' && (
                <div className="npm-row">
                  <label className="npm-lbl" htmlFor="npm-stock">Current Stock</label>
                  <div className="npm-input-wrap">
                    <input id="npm-stock" name="stock" type="number" min="0"
                      className="npm-input npm-input--ul"
                      placeholder="0"
                      value={fields.stock} onChange={change} />
                  </div>
                </div>
              )}

              {/* Tax Rate */}
              <div className="npm-row">
                <label className="npm-lbl" htmlFor="npm-tax">Tax Rate</label>
                <div className="npm-input-wrap">
                  <select id="npm-tax" name="taxRate"
                    className="npm-input npm-input--ul npm-select"
                    value={fields.taxRate} onChange={change}>
                    {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>

            </div>{/* end fields */}

            {/* ---- Right: image upload ---- */}
            <div className="npm-image-col">
              <div className="npm-image-box"
                onDragOver={e => e.preventDefault()}
                onDrop={handleImageDrop}
                onClick={() => imageRef.current?.click()}
                role="button" tabIndex={0}
                aria-label="Upload product image"
                onKeyDown={e => e.key === 'Enter' && imageRef.current?.click()}>
                {fields.imagePreview ? (
                  <>
                    <img src={fields.imagePreview} alt="Product" className="npm-img-preview" />
                    <button type="button" className="npm-img-remove"
                      onClick={e => { e.stopPropagation(); setFields(p => ({...p, image: null, imagePreview: null})) }}
                      aria-label="Remove">✕</button>
                  </>
                ) : (
                  <div className="npm-img-placeholder">
                    <UploadIcon />
                    <span>Upload Image</span>
                    <span className="npm-img-hint">Click or drag & drop</span>
                  </div>
                )}
              </div>
              <input ref={imageRef} type="file" accept="image/*"
                style={{ display: 'none' }} onChange={handleImageChange} />
            </div>

          </div>{/* end body */}

          {/* Footer */}
          <div className="npm-footer">
            <button type="submit" className="npm-save-btn">
              {editProduct ? 'Update Product' : 'Save Product'}
            </button>
            <button type="button" className="npm-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function XIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function UploadIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
}
function PlusSmIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
