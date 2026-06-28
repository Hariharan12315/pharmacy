import styles from './UI.module.css'

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {children && <div className={styles.pageActions}>{children}</div>}
    </div>
  )
}

export function Btn({ variant = 'primary', size = 'md', children, ...props }) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${styles[size]}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>
}

export function Badge({ color = 'blue', children }) {
  return <span className={`${styles.badge} ${styles['badge_' + color]}`}>{children}</span>
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  )
}

export function Input(props) {
  return <input className={styles.input} {...props} />
}

export function Select({ children, ...props }) {
  return <select className={styles.input} {...props}>{children}</select>
}

export function Textarea(props) {
  return <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} {...props} />
}

export function Table({ columns, data, emptyMsg = 'No data yet.' }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.length === 0
            ? <tr><td colSpan={columns.length} className={styles.empty}>{emptyMsg}</td></tr>
            : data.map((row, i) => (
              <tr key={i}>
                {columns.map(c => (
                  <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                ))}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  )
}

export function Spinner() {
  return <div className={styles.spinner} />
}

export function StatCard({ icon, label, value, color = 'blue' }) {
  return (
    <div className={styles.statCard}>
      <div className={`${styles.statIcon} ${styles['ic_' + color]}`}>{icon}</div>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  )
}
