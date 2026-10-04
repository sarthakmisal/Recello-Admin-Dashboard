import { useState, useEffect, useMemo } from "react"
import { getContacts, createContact, updateContact, deleteContact } from "../../../api/system_service"
import Swal from "sweetalert2"
import ThemedTablePage from 'src/components/ThemedTablePage'

// Reviews shown on the customer site are powered by this same contact_us table
// (see sell-home's "Customer reviews" section, which reads first_name/last_name/message
// off GET /api/contact_us). These are the table's real columns — keep the form in sync
// with them, not with unrelated fields from elsewhere in the app.
const STATUS_LABELS = {
    1: { label: 'New', badge: 'info' },
    2: { label: 'In Progress', badge: 'warning' },
    3: { label: 'Resolved', badge: 'success' },
    4: { label: 'Closed', badge: 'secondary' },
}

const emptyForm = { first_name: '', last_name: '', message: '', status: 1 }

const ContactUs = () => {
    const [contacts, setContacts] = useState([])
    const [loading, setLoading] = useState(true)
    const [isForm, setIsForm] = useState(false)
    const [isEdit, setIsEdit] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [currentPage, setCurrentPage] = useState(1)
    const [query, setQuery] = useState('')
    const contactsPerPage = 10

    const loadContacts = async () => {
        try {
            const res = await getContacts()
            setContacts(res.data || [])
        } catch (err) {
            console.error(err)
            Swal.fire('Error', 'Failed to load reviews', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadContacts()
    }, [])

    const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

    const resetForm = () => {
        setIsForm(false)
        setIsEdit(false)
        setEditId(null)
        setForm(emptyForm)
    }

    const handleEdit = (item) => {
        if (!item?.id) return
        setIsForm(true)
        setIsEdit(true)
        setEditId(item.id)
        setForm({
            first_name: item.first_name || '',
            last_name: item.last_name || '',
            message: item.message || '',
            status: item.status ?? 1,
        })
    }

    const handleSubmit = async () => {
        if (!form.first_name.trim() || !form.message.trim()) {
            return Swal.fire('Missing Fields', 'Name and review text are required', 'warning')
        }

        const confirm = await Swal.fire({
            title: isEdit ? 'Update Review?' : 'Create Review?',
            text: 'Continue?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes',
        })

        if (!confirm.isConfirmed) return

        try {
            const data = {
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                message: form.message.trim(),
                status: Number(form.status),
            }
            if (isEdit) {
                await updateContact(editId, data)
            } else {
                await createContact(data)
            }
            await loadContacts()
            resetForm()
            Swal.fire({ icon: 'success', title: isEdit ? 'Updated' : 'Created', timer: 1000, showConfirmButton: false })
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Operation failed', 'error')
        }
    }

    const handleDelete = async (item) => {
        if (!item?.id) return
        if (!window.confirm('Are you sure?')) return

        try {
            await deleteContact(item.id)
            await loadContacts()
            Swal.fire({ icon: 'success', title: 'Deleted', timer: 1000, showConfirmButton: false })
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to delete', 'error')
        }
    }

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return contacts
        return contacts.filter((c) => {
            const name = `${c?.first_name || ''} ${c?.last_name || ''}`.toLowerCase()
            return name.includes(q) || String(c?.message || '').toLowerCase().includes(q)
        })
    }, [contacts, query])

    const indexOfLast = currentPage * contactsPerPage
    const indexOfFirst = indexOfLast - contactsPerPage
    const currentItems = filtered.slice(indexOfFirst, indexOfLast)
    const totalPages = Math.ceil(filtered.length / contactsPerPage)

    const rows = currentItems.map((item, i) => ({ ...item, _idx: indexOfFirst + i + 1 }))

    const columns = [
        { key: '_idx', label: 'Sr', render: (c) => c._idx, headerStyle: { width: 60 } },
        { key: 'name', label: 'Name', render: (c) => [c.first_name, c.last_name].filter(Boolean).join(' ') || '—' },
        { key: 'message', label: 'Review', render: (c) => <span title={c.message}>{c.message?.length > 60 ? c.message.slice(0, 60) + '...' : c.message}</span> },
        {
            key: 'status', label: 'Status', headerStyle: { width: 110 }, render: (c) => {
                const info = STATUS_LABELS[c.status] || { label: '—', badge: 'secondary' }
                return <span className={`badge bg-${info.badge}`}>{info.label}</span>
            }
        },
        { key: 'created_at', label: 'Date', render: (c) => c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—', headerStyle: { width: 100 } },
    ]

    return (
        <div className="container py-4">
            <ThemedTablePage
                columns={columns}
                rows={rows}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onEdit={handleEdit}
                onDelete={handleDelete}
                topContent={
                    <>
                        <div className="mb-3 d-flex justify-content-between align-items-center">
                            <h4 className="fw-bold mb-0 text-uppercase">Manage Reviews</h4>
                            <button onClick={() => { setForm(emptyForm); setIsForm(true) }} className="btn btn-primary btn-sm">+ Add Review</button>
                        </div>

                        {isForm && (
                            <div className="card p-3 mb-4">
                                <div className="row g-2">
                                    <div className="col-12 col-md-4">
                                        <label className="form-label small">First Name</label>
                                        <input className="form-control form-control-sm" placeholder="First name" value={form.first_name} onChange={setField('first_name')} />
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <label className="form-label small">Last Name</label>
                                        <input className="form-control form-control-sm" placeholder="Last name" value={form.last_name} onChange={setField('last_name')} />
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <label className="form-label small">Status</label>
                                        <select className="form-select form-select-sm" value={form.status} onChange={setField('status')}>
                                            {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                                                <option key={val} value={val}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small">Review</label>
                                        <textarea className="form-control form-control-sm" rows={3} placeholder="What the customer said" value={form.message} onChange={setField('message')} />
                                    </div>
                                </div>
                                <div className="d-flex gap-2 mt-2 justify-content-end">
                                    <button className="btn btn-success btn-sm" onClick={handleSubmit}>{isEdit ? 'Update' : 'Save'}</button>
                                    <button className="btn btn-outline-secondary btn-sm" onClick={resetForm}>Cancel</button>
                                </div>
                            </div>
                        )}

                        <div className="row g-2 mb-3">
                            <div className="col-12">
                                <input className="form-control form-control-sm" placeholder="Search by name or review..." value={query} onChange={(e) => { setQuery(e.target.value); setCurrentPage(1) }} />
                            </div>
                        </div>
                    </>
                }
            />
        </div>
    )
}

export default ContactUs
