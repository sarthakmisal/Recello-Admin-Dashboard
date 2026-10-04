import { useState, useEffect, useMemo } from "react"
import { get_brands, getModels } from "../../../api/system_service"
import { getQuickSell, createQuickSell, updateQuickSell, deleteQuickSell, getModelsForBrand } from "../../../api/system_service"
import Swal from "sweetalert2"
import ThemedTablePage from 'src/components/ThemedTablePage'

const QuickSell = () => {
    const [items, setItems] = useState([])
    const [brands, setBrands] = useState([])
    const [models, setModels] = useState([])
    const [loading, setLoading] = useState(true)
    const [isForm, setIsForm] = useState(false)
    const [isEdit, setIsEdit] = useState(false)
    const [editId, setEditId] = useState(null)
    const [selectedBrand, setSelectedBrand] = useState('')
    const [selectedModel, setSelectedModel] = useState('')
    const [filteredModels, setFilteredModels] = useState([])
    const [currentPage, setCurrentPage] = useState(1)
    const [query, setQuery] = useState('')
    const itemsPerPage = 10

    const loadData = async () => {
        try {
            const [itemRes, brandRes, modelRes] = await Promise.all([
                getQuickSell(),
                get_brands(),
                getModels()
            ])
            setItems(Array.isArray(itemRes) ? itemRes : itemRes?.data || [])
            setBrands(Array.isArray(brandRes) ? brandRes : brandRes?.data || [])
            setModels(Array.isArray(modelRes) ? modelRes : modelRes?.data || [])
        } catch (err) {
            console.error(err)
            Swal.fire('Error', 'Failed to load data', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        if (selectedBrand) {
            loadModelsForBrand(selectedBrand)
        } else {
            setFilteredModels([])
        }
    }, [selectedBrand, models])

    const resetForm = () => {
        setIsForm(false)
        setIsEdit(false)
        setEditId(null)
        setSelectedBrand('')
        setSelectedModel('')
    }

    const handleEdit = (item) => {
        if (!item?.id) return
        setIsForm(true)
        setIsEdit(true)
        setEditId(item.id)
        setSelectedBrand(String(item.brand_slug || item.brand_id || ''))
        setSelectedModel(String(item.model_id || ''))
    }

    const handleSubmit = async () => {
        if (!selectedBrand || !selectedModel) {
            return Swal.fire('Missing Fields', 'Brand and Model are required', 'warning')
        }

        const confirm = await Swal.fire({
            title: isEdit ? 'Update Quick Sell?' : 'Create Quick Sell?',
            text: 'Continue?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes',
        })

        if (!confirm.isConfirmed) return

        try {
            const data = { brand_id: parseInt(selectedBrand), model_id: parseInt(selectedModel), status: true }
            if (isEdit) {
                await updateQuickSell(editId, data)
            } else {
                await createQuickSell(data)
            }
            await loadData()
            resetForm()
            Swal.fire({ icon: 'success', title: isEdit ? 'Updated' : 'Created', timer: 1000, showConfirmButton: false })
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Operation failed', 'error')
        }
    }
    const loadModelsForBrand = async (brandSlug) => {
        if (!brandSlug) {
            setFilteredModels([])
            return
        }
        try {
            const brandValue = String(brandSlug)
            const resolvedBrandSlug = brands.find(b => String(b.slug) === brandValue || String(b.id) === brandValue)?.slug || brandValue
            const res = await getModelsForBrand(resolvedBrandSlug)
            const nextModels = Array.isArray(res) ? res : res?.data || []
            setFilteredModels(nextModels)
        } catch (error) {
            console.error('Error loading models for brand:', error)
            setFilteredModels([])
        }
    }
    const handleDelete = async (item) => {
        if (!item?.id) return
        if (!window.confirm('Are you sure?')) return

        try {
            await deleteQuickSell(item.id)
            await loadData()
            Swal.fire({ icon: 'success', title: 'Deleted', timer: 1000, showConfirmButton: false })
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to delete', 'error')
        }
    }

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        return items.filter((item) => !q ||
            String(item?.brand_name || '').toLowerCase().includes(q) ||
            String(item?.model_name || '').toLowerCase().includes(q)
        )
    }, [items, query])

    const indexOfLast = currentPage * itemsPerPage
    const indexOfFirst = indexOfLast - itemsPerPage
    const currentItems = filtered.slice(indexOfFirst, indexOfLast)
    const totalPages = Math.ceil(filtered.length / itemsPerPage)

    const rows = currentItems.map((item, i) => ({ ...item, _idx: indexOfFirst + i + 1 }))

    const columns = [
        { key: '_idx', label: 'Sr', render: (c) => c._idx, headerStyle: { width: 60 } },
        { key: 'brand_name', label: 'Brand', render: (c) => c.brand_name },
        { key: 'model_name', label: 'Model', render: (c) => c.model_name },
        { key: 'status', label: 'Status', render: (c) => c.status ? 'Active' : 'Inactive', headerStyle: { width: 80 } },
        { key: 'created_at', label: 'Date', render: (c) => new Date(c.created_at).toLocaleDateString('en-IN'), headerStyle: { width: 100 } },
        {
            key: 'actions',
            label: 'Actions',
            headerStyle: { width: 140 },
            render: (c) => (
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary btn-sm" onClick={() => handleEdit(c)}>Edit</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(c)}>Delete</button>
                </div>
            )
        },
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
                            <h4 className="fw-bold mb-0 text-uppercase">Manage Quick Sell</h4>
                            <button onClick={() => setIsForm(true)} className="btn btn-primary btn-sm">+ Add Item</button>
                        </div>

                        {isForm && (
                            <div className="card p-3 mb-4">
                                <div className="row g-2">
                                    <div className="col-12 col-md-6">
                                        <label className="form-label small">Brand</label>
                                        <select className="form-select form-select-sm" value={selectedBrand} onChange={(e) => { setSelectedBrand(e.target.value); setSelectedModel(''); loadModelsForBrand(e.target.value) }}>
                                            <option value="">Select Brand ({brands.length})</option>
                                            {brands.map(b => <option key={b.id} value={b.slug}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className="form-label small">Model</label>
                                        <select className="form-select form-select-sm" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={!selectedBrand || filteredModels.length === 0}>
                                            <option value="">{selectedBrand ? filteredModels.length > 0 ? `Select Model (${filteredModels.length})` : 'No models for this brand' : 'Choose a brand first'}</option>
                                            {filteredModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
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
                                <input className="form-control form-control-sm" placeholder="Search brand or model..." value={query} onChange={(e) => { setQuery(e.target.value); setCurrentPage(1) }} />
                            </div>
                        </div>
                    </>
                }
            />
        </div>
    )
}

export default QuickSell
