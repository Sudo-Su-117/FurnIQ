import React, { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import NewProductModal from './NewProductModal'
import Pagination, { usePagination } from '../../components/Pagination'
import './ProductsPage.css'

const LOW_STOCK_THRESHOLD = 4

const TYPE_OPTIONS = ['All', 'Goods', 'Service', 'Combo']

const TYPE_COLORS = {
  GOODS:   'pp-type-badge--goods',
  SERVICE: 'pp-type-badge--service',
  COMBO:   'pp-type-badge--combo',
}

const AVATAR_COLORS = ['#A67C3D','#5A8C6A','#7B6E5A','#1A6FA8','#8B3D3D','#6A3D8B','#3D6A8B']
function productColor(name = 'P') {
  return AVATAR_COLORS[(name || 'P').charCodeAt(0) % AVATAR_COLORS.length]
}

function fmtPrice(n) {
  if (n === null || n === undefined) return 'N/A'
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

import { api, extractList } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

export default function ProductsPage() {
  const { role } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const isAdmin = role === 'ADMIN'
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [view, setView]             = useState('list')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editProduct, setEditProduct] = useState(null)

  const loadProducts = useCallback(() => {
    setLoading(true)
    api.products.list({ limit: 100 })
      .then(res => {
        const list = extractList(res)
        const mapped = list.map(p => ({
          ...p,
          imagePreview: p.image || p.imagePreview || null,
          stock: p.type === 'SERVICE' ? null : (p.stockQuantity ?? p.stock ?? 0),
        }))
        setProducts(mapped)
      })
      .catch(err => console.warn('Could not load live products:', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const lowStockCount = products.filter(p => p.stock !== null && p.stock < LOW_STOCK_THRESHOLD).length

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q)
    const matchType = typeFilter === 'All' || p.type === typeFilter.toUpperCase()
    return matchSearch && matchType
  })

  const { page: listPage, setPage: setListPage, paged: pagedProducts, total: totalFiltered } = usePagination(filtered, 10)

  const openAdd  = ()  => { setEditProduct(null); setModalOpen(true) }
  const openEdit = (p) => { setEditProduct(p);    setModalOpen(true) }
  const close    = ()  => { setModalOpen(false);  setEditProduct(null) }

  const handleSave = async (data) => {
    const payload = {
      name: data.name.trim(),
      type: data.type,
      salesPrice: Number(data.salesPrice),
      costPrice: data.costPrice !== '' ? Number(data.costPrice) : 0,
      category: data.category || undefined,
      image: data.imagePreview || data.image || null,
      stockQuantity: data.stock !== '' ? Number(data.stock) : 0,
    }

    try {
      if (editProduct) {
        await api.products.update(editProduct.id, payload)
        toast.success(`Product "${payload.name}" updated successfully!`)
      } else {
        await api.products.create(payload)
        toast.success(`Product "${payload.name}" created successfully!`)
      }
      loadProducts()
      close()
    } catch (err) {
      console.error('Error saving product to database:', err.message)
      toast.error(`Failed to save product: ${err.message}`)
    }
  }

  const handleArchive = async (id, name) => {
    const ok = await confirm({
      title: 'Archive Product',
      message: `Archive product "${name || 'selected item'}"?`,
      detail: 'This product will be hidden from the active catalog, but historical sales & purchase transactions remain intact.',
      confirmText: 'Archive',
      confirmVariant: 'warning',
    })
    if (ok) {
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.info('Product archived')
    }
  }

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Permanently Delete Product',
      message: `Permanently delete product "${name}"?`,
      detail: 'This will remove the product and cleanly remove any associated transaction line references.',
      confirmText: 'Delete Product',
      confirmVariant: 'danger',
    })
    if (ok) {
      try {
        await api.products.delete(id)
        toast.info(`Product "${name}" deleted permanently`)
        loadProducts()
      } catch (err) {
        console.error('Error deleting product:', err.message)
        toast.error(`Failed to delete product: ${err.message}`)
      }
    }
  }

  return (
    <DashboardLayout>
      <div className="pp-page">
        {/* Breadcrumb */}
        <div className="pp-breadcrumb">Master Data <span>›</span> Products</div>

        {/* Header */}
        <div className="pp-header">
          <div>
            <h1 className="pp-title">Products</h1>
            <p className="pp-subtitle">
              {products.length} items
              {lowStockCount > 0 && <span className="pp-low-warn"> · ⚠ {lowStockCount} low-stock warnings</span>}
            </p>
          </div>
          <button className="pp-add-btn" onClick={openAdd}>
            <PlusIcon /> Add Product
          </button>
        </div>

        {/* Toolbar */}
        <div className="pp-toolbar">
          <div className="pp-search-wrap">
            <SearchIcon />
            <input className="pp-search" type="search" placeholder="Search..."
              value={search} onChange={e => setSearch(e.target.value)} aria-label="Search products" />
          </div>
          <select className="pp-filter-select" value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)} aria-label="Filter by type">
            {TYPE_OPTIONS.map(o => <option key={o} value={o}>Type: {o}</option>)}
          </select>
          {/* View toggle */}
          <div className="pp-view-toggle" role="group" aria-label="View mode">
            <button className={`pp-view-btn${view === 'list' ? ' pp-view-btn--active' : ''}`}
              onClick={() => setView('list')} title="List view"><ListIcon /></button>
            <button className={`pp-view-btn${view === 'card' ? ' pp-view-btn--active' : ''}`}
              onClick={() => setView('card')} title="Card view"><CardIcon /></button>
          </div>
        </div>

        {/* ---- LIST VIEW ---- */}
        {view === 'list' && (
          <div className="pp-card">
            {filtered.length === 0
              ? <div className="pp-empty">No products found.</div>
              : (
                <table className="pp-table" aria-label="Products list">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th className="align-center">Type</th>
                      <th>Category</th>
                      <th className="align-right">Sales Price</th>
                      <th className="align-right">Cost Price</th>
                      <th className="align-right">Current Stock</th>
                      <th className="align-right">Tax Rate</th>
                      <th className="align-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedProducts.map(p => (
                      <tr key={p.id}>
                        {/* Name */}
                        <td>
                          <div className="pp-name-cell">
                            <div className="pp-avatar" style={{ background: productColor(p.name) }}>
                              {(p.imagePreview || p.image)
                                ? <img src={p.imagePreview || p.image} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />
                                : p.name.charAt(0).toUpperCase()
                              }
                            </div>
                            <div>
                              <div className="pp-name-text">{p.name}</div>
                              <div style={{ fontSize: '11px', color: '#8c827a', fontFamily: 'monospace', marginTop: '2px', fontWeight: 500 }}>{p.id}</div>
                            </div>
                          </div>
                        </td>
                        {/* Type */}
                        <td className="align-center"><span className={`pp-type-badge ${TYPE_COLORS[p.type] || ''}`}>{p.type}</span></td>
                        {/* Category */}
                        <td>{p.category}</td>
                        {/* Sales Price */}
                        <td className="align-right pp-price">{fmtPrice(p.salesPrice)}</td>
                        {/* Cost Price */}
                        <td className="align-right pp-cost">{fmtPrice(p.costPrice)}</td>
                        {/* Stock */}
                        <td className="align-right">
                          <StockCell stock={p.stock} />
                        </td>
                        {/* Tax */}
                        <td className="align-right">{p.taxRate != null && p.taxRate !== '' ? `${p.taxRate}%` : '—'}</td>
                        {/* Actions */}
                        <td className="align-right">
                          <div className="pp-actions">
                            <button className="pp-edit-btn" onClick={() => openEdit(p)}>Edit</button>
                            {isAdmin && (
                              <>
                                <button className="pp-delete-btn" onClick={() => handleDelete(p.id, p.name)}>Delete</button>
                                <button className="pp-archive-btn" onClick={() => handleArchive(p.id, p.name)}>Archive</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
            <Pagination total={totalFiltered} page={listPage} pageSize={10} onChange={setListPage} />
          </div>
        )}

        {/* ---- CARD VIEW ---- */}
        {view === 'card' && (
          <>
            {filtered.length === 0
              ? <div className="pp-empty-cards">No products found.</div>
              : (
                <div className="pp-card-grid">
                  {filtered.map(p => (
                    <div key={p.id} className="pp-product-card">
                      {/* Card image / avatar */}
                      <div className="ppc-image-wrap" style={{ background: productColor(p.name) }}>
                        {(p.imagePreview || p.image)
                          ? <img src={p.imagePreview || p.image} alt={p.name} className="ppc-image" />
                          : <span className="ppc-image-letter">{p.name.charAt(0).toUpperCase()}</span>
                        }
                        <span className={`pp-type-badge ppc-type-overlay ${TYPE_COLORS[p.type] || ''}`}>{p.type}</span>
                      </div>

                      {/* Card body */}
                      <div className="ppc-body">
                        <div className="ppc-name">{p.name}</div>
                        <div className="ppc-id" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{p.category}</span>
                          <span style={{ fontSize: '11px', color: '#8c827a', fontFamily: 'monospace', fontWeight: 600 }}>{p.id}</span>
                        </div>

                        <div className="ppc-prices">
                          <div className="ppc-price-item">
                            <span className="ppc-price-label">Sales</span>
                            <span className="ppc-price-val">{fmtPrice(p.salesPrice)}</span>
                          </div>
                          <div className="ppc-price-divider" />
                          <div className="ppc-price-item">
                            <span className="ppc-price-label">Cost</span>
                            <span className="ppc-price-val ppc-cost">{fmtPrice(p.costPrice)}</span>
                          </div>
                          <div className="ppc-price-divider" />
                          <div className="ppc-price-item">
                            <span className="ppc-price-label">Tax</span>
                            <span className="ppc-price-val">{p.taxRate}%</span>
                          </div>
                        </div>

                        <div className="ppc-stock-row">
                          <StockCell stock={p.stock} />
                          <span className="ppc-stock-label">in stock</span>
                        </div>
                      </div>

                      {/* Card footer */}
                      <div className="ppc-footer">
                        <div className="pp-actions">
                          <button className="pp-edit-btn" onClick={() => openEdit(p)}>Edit</button>
                          {isAdmin && (
                            <>
                              <button className="pp-delete-btn" onClick={() => handleDelete(p.id, p.name)}>Delete</button>
                              <button className="pp-archive-btn" onClick={() => handleArchive(p.id, p.name)}>Archive</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
            <div className="pp-cards-footer">
              <span className="pp-count">Showing {filtered.length} of {products.length}</span>
            </div>
          </>
        )}
      </div>

      <NewProductModal isOpen={modalOpen} onClose={close}
        onSave={handleSave} editProduct={editProduct}
        existingCategories={[...new Set(products.map(p => p.category))]}
      />
    </DashboardLayout>
  )
}

function StockCell({ stock }) {
  if (stock === null || stock === undefined) return <span className="pp-stock-na">N/A</span>
  if (stock < LOW_STOCK_THRESHOLD) return <span className="pp-stock-low">⚠ {stock}</span>
  return <span className="pp-stock-ok">{stock}</span>
}

/* Icons */
function PlusIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function SearchIcon() { return <svg className="pp-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function ListIcon()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
function CardIcon()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }
