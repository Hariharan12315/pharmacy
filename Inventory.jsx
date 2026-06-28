import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  PageHeader, Btn, Table, Badge, Modal,
  Field, Input, Select, Textarea, Spinner
} from '../components/UI'
import { api } from '../api'

const CATEGORIES = ['Analgesic', 'Antibiotic', 'Antipyretic', 'Anti-inflammatory', 'Supplements', 'Other']

function stockStatus(med) {
  if (med.current_stock === 0) return <Badge color="red">Out of Stock</Badge>
  if (med.current_stock <= med.min_stock_level) return <Badge color="amber">Low Stock</Badge>
  return <Badge color="green">Available</Badge>
}

function expiryStatus(expiryDate) {
  const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000)
  if (days < 0) return <Badge color="red">Expired</Badge>
  if (days <= 30) return <span style={{ color: 'var(--amber)', fontWeight: 600 }}>⚠ {expiryDate}</span>
  return expiryDate
}

const COLS = [
  { key: 'name', label: 'Medicine' },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'category', label: 'Category' },
  { key: 'current_stock', label: 'Stock', render: r => r.current_stock },
  { key: 'price_per_unit', label: 'Price', render: r => `₹${Number(r.price_per_unit).toFixed(2)}` },
  { key: 'expiry_date', label: 'Expiry', render: r => expiryStatus(r.expiry_date) },
  { key: 'status', label: 'Status', render: r => stockStatus(r) },
]

const EMPTY_FORM = {
  name: '', manufacturer: '', category: '', currentStock: '',
  minStockLevel: '', pricePerUnit: '', expiryDate: '', batchNumber: '', description: ''
}

export default function Inventory() {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.getMedicines()
      .then(setMedicines)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.addMedicine(form)
      setOpen(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Manage medicines, stock & batches">
        <Btn onClick={() => setOpen(true)}><Plus size={16} /> Add Medicine</Btn>
      </PageHeader>

      {loading ? <Spinner /> : (
        <Table
          columns={COLS}
          data={medicines}
          emptyMsg="No medicines yet. Click Add Medicine to get started."
        />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add New Medicine">
        <form onSubmit={submit}>
          <Field label="Medicine Name *">
            <Input value={form.name} onChange={set('name')} required placeholder="e.g. Paracetamol 500mg" />
          </Field>
          <Field label="Manufacturer *">
            <Input value={form.manufacturer} onChange={set('manufacturer')} required placeholder="Manufacturer name" />
          </Field>
          <Field label="Category *">
            <Select value={form.category} onChange={set('category')} required>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Current Stock *">
              <Input type="number" min="0" value={form.currentStock} onChange={set('currentStock')} required />
            </Field>
            <Field label="Min Stock Level *">
              <Input type="number" min="0" value={form.minStockLevel} onChange={set('minStockLevel')} required />
            </Field>
            <Field label="Price per Unit (₹) *">
              <Input type="number" min="0" step="0.01" value={form.pricePerUnit} onChange={set('pricePerUnit')} required />
            </Field>
            <Field label="Expiry Date *">
              <Input type="date" value={form.expiryDate} onChange={set('expiryDate')} required />
            </Field>
          </div>
          <Field label="Batch Number *">
            <Input value={form.batchNumber} onChange={set('batchNumber')} required placeholder="Batch/lot number" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={set('description')} placeholder="Optional notes..." />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Medicine'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
