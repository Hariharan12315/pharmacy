import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Receipt, Users,
  Bell, BarChart3, FlaskConical
} from 'lucide-react'
import styles from './Layout.module.css'

const navItems = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory',     icon: Package,          label: 'Inventory' },
  { to: '/billing',       icon: Receipt,          label: 'Billing & Sales' },
  { to: '/customers',     icon: Users,            label: 'Customers' },
  { to: '/notifications', icon: Bell,             label: 'Notifications' },
  { to: '/reports',       icon: BarChart3,        label: 'Reports' },
]

export default function Layout({ children }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <FlaskConical size={22} strokeWidth={2.2} className={styles.brandIcon} />
          <span>MediStock Pro</span>
        </div>
        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <span className={styles.version}>v2.0 React</span>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
