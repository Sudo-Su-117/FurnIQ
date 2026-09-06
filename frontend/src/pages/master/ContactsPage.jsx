import React, { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import NewContactModal from './NewContactModal'
import Pagination, { usePagination } from '../../components/Pagination'
import './ContactsPage.css'

const TYPE_OPTIONS = ['All', 'Customer', 'Vendor', 'Both']

/* Avatar background colors per letter */
const AVATAR_COLORS = ['#A67C3D','#5A8C6A','#7B6E5A','#1A6FA8','#8B3D3D','#3D6A8B','#6A3D8B']
function avatarColor(name = 'C') {
  const i = (name || 'C').charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[i]
}

import { api, extractList } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

export default function ContactsPage() {
  const { role } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const isAdmin = role === 'ADMIN'
  const [contacts, setContacts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [view, setView]             = useState('list') // 'list' | 'card'

  const loadContacts = useCallback(() => {
    setLoading(true)
    api.contacts.list({ limit: 100 })
      .then(res => {
        const list = extractList(res)
        setContacts(list.map(c => ({
          ...c,
          imagePreview: c.profileImage || c.imagePreview || null,
        })))
      })
      .catch(err => console.warn('Could not load live contacts:', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.mobile?.includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.id?.toLowerCase().includes(q)
    const matchType = typeFilter === 'All' || c.type === typeFilter.toUpperCase()
    return matchSearch && matchType
  })

  const { page, setPage, paged: pagedContacts, total: totalFiltered } = usePagination(filtered, 10)

  const openAddModal  = () => { setEditContact(null); setModalOpen(true) }
  const openEditModal = (c)  => { setEditContact(c);  setModalOpen(true) }
  const closeModal    = () => { setModalOpen(false); setEditContact(null) }

  const handleSave = async (formData) => {
    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      ...(formData.email?.trim() ? { email: formData.email.trim() } : {}),
      ...(formData.mobile?.trim() ? { mobile: formData.mobile.trim() } : {}),
      ...(formData.city?.trim() ? { city: formData.city.trim() } : {}),
      ...(formData.state?.trim() ? { state: formData.state.trim() } : {}),
      ...(formData.pincode?.trim() ? { pincode: formData.pincode.trim() } : {}),
      profileImage: formData.imagePreview || formData.profileImage || null,
    }

    try {
      if (editContact) {
        await api.contacts.update(editContact.id, payload)
        toast.success(`Contact "${payload.name}" updated successfully!`)
      } else {
        await api.contacts.create(payload)
        toast.success(`Contact "${payload.name}" created successfully!`)
      }
      loadContacts()
      closeModal()
    } catch (err) {
      console.error('Error saving contact to database:', err.message)
      toast.error(`Failed to save contact: ${err.message}`)
    }
  }

  const handleArchive = async (id, name) => {
    const ok = await confirm({
      title: 'Archive Contact',
      message: `Archive contact "${name || 'this contact'}"?`,
      detail: 'This contact will be hidden from the active directory, but linked invoices, bills, and orders will remain intact.',
      confirmText: 'Archive',
      confirmVariant: 'warning',
    })
    if (ok) {
      try {
        await api.contacts.archive(id)
        toast.info('Contact archived')
        loadContacts()
      } catch (err) {
        console.error('Error archiving contact:', err.message)
        setContacts(prev => prev.filter(c => c.id !== id))
        toast.info('Contact archived')
      }
    }
  }

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Permanently Delete Contact',
      message: `Permanently delete contact "${name}"?`,
      detail: 'This will remove the contact and cleanly remove any associated transaction references.',
      confirmText: 'Delete Contact',
      confirmVariant: 'danger',
    })
    if (ok) {
      try {
        await api.contacts.delete(id)
        toast.info(`Contact "${name}" deleted permanently`)
        loadContacts()
      } catch (err) {
        console.error('Error deleting contact:', err.message)
        toast.error(`Failed to delete contact: ${err.message}`)
      }
    }
  }

  return (
    <DashboardLayout>
      <div className="cp-page">
        {/* Breadcrumb */}
        <div className="cp-breadcrumb">Master Data <span>›</span> Contacts</div>

        {/* Header */}
        <div className="cp-header">
          <div className="cp-header-left">
            <h1 className="cp-title">Contacts</h1>
            <p className="cp-subtitle">{contacts.length} active contacts</p>
          </div>
          <button className="cp-add-btn" onClick={openAddModal}>
            <PlusIcon /> Add Contact
          </button>
        </div>

        {/* Toolbar: search + filter + view toggle */}
        <div className="cp-toolbar">
          <div className="cp-search-wrap">
            <SearchIcon />
            <input className="cp-search" type="search" placeholder="Search contacts..."
              value={search} onChange={e => setSearch(e.target.value)} aria-label="Search contacts" />
          </div>
          <select className="cp-filter-select" value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)} aria-label="Filter by type">
            {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          {/* View toggle */}
          <div className="cp-view-toggle" role="group" aria-label="View mode">
            <button
              className={`cp-view-btn${view === 'list' ? ' cp-view-btn--active' : ''}`}
              onClick={() => setView('list')} aria-label="List view" title="List view">
              <ListIcon />
            </button>
            <button
              className={`cp-view-btn${view === 'card' ? ' cp-view-btn--active' : ''}`}
              onClick={() => setView('card')} aria-label="Card view" title="Card view">
              <CardIcon />
            </button>
          </div>
        </div>

        {/* ---- LIST VIEW ---- */}
        {view === 'list' && (
          <div className="cp-card">
            {filtered.length === 0 ? (
              <div className="cp-empty">No contacts found.</div>
            ) : (
              <table className="cp-table" aria-label="Contacts list">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>City</th>
                    <th className="align-center">Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedContacts.map(contact => (
                    <tr key={contact.id}>
                      <td>
                        <div className="cp-name-cell">
                          <div className="cp-avatar" style={{ background: avatarColor(contact.name) }}
                            aria-hidden="true">
                            {(contact.imagePreview || contact.profileImage)
                              ? <img src={contact.imagePreview || contact.profileImage} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />
                              : contact.name.charAt(0).toUpperCase()
                            }
                          </div>
                          <div>
                            <div className="cp-name-text">{contact.name}</div>
                          </div>
                        </div>
                      </td>
                      <td><TypeBadge type={contact.type} /></td>
                      <td className="cp-email">{contact.email}</td>
                      <td>{contact.mobile}</td>
                      <td>{contact.city}</td>
                      <td className="align-center">
                        <span className="cp-status-badge">{contact.status}</span>
                      </td>
                      <td>
                        <div className="cp-actions">
                          <button className="cp-edit-btn" onClick={() => openEditModal(contact)}>Edit</button>
                          {isAdmin && (
                            <>
                              <button className="cp-delete-btn" onClick={() => handleDelete(contact.id, contact.name)}>Delete</button>
                              <button className="cp-archive-btn" onClick={() => handleArchive(contact.id, contact.name)}>Archive</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Pagination total={totalFiltered} page={page} pageSize={10} onChange={setPage} />
          </div>
        )}

        {/* ---- CARD VIEW ---- */}
        {view === 'card' && (
          <>
            {filtered.length === 0 ? (
              <div className="cp-empty-card">No contacts found.</div>
            ) : (
              <div className="cp-card-grid">
                {filtered.map(contact => (
                  <div key={contact.id} className="cp-contact-card">
                    {/* Card header: avatar + name */}
                    <div className="ccc-header">
                      <div className="ccc-avatar" style={{ background: avatarColor(contact.name) }}>
                        {(contact.imagePreview || contact.profileImage)
                          ? <img src={contact.imagePreview || contact.profileImage} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />
                          : contact.name.charAt(0).toUpperCase()
                        }
                      </div>
                      <div className="ccc-name-wrap">
                        <span className="ccc-name">{contact.name}</span>
                      </div>
                      <TypeBadge type={contact.type} />
                    </div>

                    {/* Card body: details */}
                    <div className="ccc-body">
                      {contact.email && (
                        <div className="ccc-row">
                          <MailIcon /><span>{contact.email}</span>
                        </div>
                      )}
                      {contact.mobile && (
                        <div className="ccc-row">
                          <PhoneIcon /><span>{contact.mobile}</span>
                        </div>
                      )}
                      {contact.city && (
                        <div className="ccc-row">
                          <LocationIcon /><span>{contact.city}{contact.state ? `, ${contact.state}` : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Card footer: status + actions */}
                    <div className="ccc-footer">
                      <span className="cp-status-badge">{contact.status}</span>
                      <div className="cp-actions">
                        <button className="cp-edit-btn" onClick={() => openEditModal(contact)}>Edit</button>
                        {isAdmin && (
                          <>
                            <button className="cp-delete-btn" onClick={() => handleDelete(contact.id, contact.name)}>Delete</button>
                            <button className="cp-archive-btn" onClick={() => handleArchive(contact.id, contact.name)}>Archive</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="cp-card-footer">
              <span className="cp-count">Showing {filtered.length} of {contacts.length}</span>
            </div>
          </>
        )}
      </div>

      <NewContactModal isOpen={modalOpen} onClose={closeModal}
        onSave={handleSave} editContact={editContact} />
    </DashboardLayout>
  )
}

/* ---- Sub-components ---- */
function TypeBadge({ type }) {
  const map = { CUSTOMER: 'cp-type-badge--customer', VENDOR: 'cp-type-badge--vendor', BOTH: 'cp-type-badge--both' }
  return <span className={`cp-type-badge ${map[type] || ''}`}>{type}</span>
}

/* ---- Icons ---- */
function PlusIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function SearchIcon()   { return <svg className="cp-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function ListIcon()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
function CardIcon()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }
function MailIcon()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function PhoneIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.14 1.21 2 2 0 012.12 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.63a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg> }
function LocationIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> }
