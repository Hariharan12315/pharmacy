import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Billing from './pages/Billing'
import Customers from './pages/Customers'
import Notifications from './pages/Notifications'
import Reports from './pages/Reports'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Layout>
  )
}
