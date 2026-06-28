import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  PageHeader, Btn, Table, Badge, Modal,
  Field, Input, Select, Spinner
} from '../components/UI'
import { api } from '../api'

const COLS = [
  { key: 'customer_name', label: 'Customer' },
  { key: 'medicine_name', label: 'Medicine' },
  { key: 'quantity', label: 'Qty' },
  { key: 'unit_price', label: 'Unit Price', render: r => `₹${Number(r.unit_price).toFixed(2)}` },
  { key: 'total_amount', label: 'Total', render: r => `₹${Number(r.total_amount).toFixed(2)}` },
  { key: 'created_at', label: 'Date', render: r => new Date(r.created_at).toLocaleDateString('en-IN') },
  { key: 'sms_notification_sent', label: 'SMS', render: r => r.sms_notification_sent
    ? <Badge color="green">Sent</Badge>
    : <Badge color="gray">No</Badge>
  },
]

const EMPTY = { custPhone: '', medicineId: '', medicineName: '', qty: 1, unitPrice: '', sendSms: 'no' }

export default function Billing() {
  const [txns, setTxns] = useState([])
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([api.getTransactions(), api.getMedicines()])
      .then(([t, m]) => { setTxns(t); setMedicines(m) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const total = (Number(form.qty) * Number(form.unitPrice)).toFixed(2)

  const onMedicineChange = e => {
    const med = medicines.find(m => m.id === e.target.value)
    setForm(f => ({
      ...f,
      medicineId: e.target.value,
      medicineName: med?.name || '',
      unitPrice: med ? Number(med.price_per_unit).toFixed(2) : '',
    }))
  }

  const submit = async e => {
    e.preventDefault()
    if (!form.custPhone || !form.medicineId) return alert('Please fill all required fields.')
    setSaving(true)
    try {
      await api.addTransaction({
        customer_name: 'Customer',
        phone: form.custPhone,
        medicine_name: form.medicineName,
        quantity: form.qty,
        unit_price: form.unitPrice,
        total,
        send_sms: form.sendSms,
      })
      setOpen(false)
      setForm(EMPTY)
      load()
      alert('✅ Sale completed!' + (form.sendSms === 'yes' ? ' SMS/call sent.' : ''))
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Billing & Sales" subtitle="Create transactions and send SMS receipts">
        <Btn onClick={() => setOpen(true)}><Plus size={16} /> New Sale</Btn>
      </PageHeader>

      {loading ? <Spinner /> : (
        <Table
          columns={COLS}
          data={txns}
          emptyMsg="No transactions yet. Click New Sale to start."
        />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Sale Transaction">
        <form onSubmit={submit}>
          <Field label="Customer Phone *">
            <Input
              type="tel"
              value={form.custPhone}
              onChange={set('custPhone')}
              placeholder="10-digit phone number"
              pattern="[0-9]{10}"
              required
            />
          </Field>
          <Field label="Medicine *">
            <Select value={form.medicineId} onChange={onMedicineChange} required>
              <option value="">Select medicine</option>
              {medicines.map(m => (
                <option key={m.id} value={m.id}>{m.name} (Stock: {m.current_stock})</option>
              ))}
            </Select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Quantity *">
              <Input type="number" min="1" value={form.qty} onChange={set('qty')} required />
            </Field>
            <Field label="Unit Price (₹)">
              <Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={set('unitPrice')} required />
            </Field>
          </div>
          <Field label="Total">
            <div style={{
              padding: '9px 12px', background: 'var(--gray-50)', borderRadius: 8,
              fontWeight: 700, fontSize: 16, color: 'var(--blue)'
            }}>
              ₹ {total}
            </div>
          </Field>
          <Field label="Send SMS & Voice Call Receipt?">
            <Select value={form.sendSms} onChange={set('sendSms')}>
              <option value="no">No</option>
              <option value="yes">Yes (via Fast2SMS + Twilio)</option>
            </Select>
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" disabled={saving}>{saving ? 'Processing…' : 'Complete Sale'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
