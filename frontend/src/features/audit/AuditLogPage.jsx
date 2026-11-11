// Audit log (FR-17, NFR-7). The Owner sees who changed what and when. Entries are written by
// the database and can't be edited or deleted. Staff get no view (SRS §4).
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../app/auth.js'
import { PAGE_SIZE, auditApi } from './auditApi.js'
import { ACTION_GROUPS, AREAS, actionLabel, areaLabel, describeChanges, formatWhen, recordLabel } from './auditUtils.js'
import styles from '../users/admin.module.css'

const NO_FILTERS = { area: '', actionGroup: '', actorId: '', from: '', to: '' }

export default function AuditLogPage() {
  const { role } = useAuth()
  if (role !== 'owner') {
    return (
      <section className={styles.page}>
        <h1>Audit log</h1>
        <p>Only the Owner can view the audit log.</p>
      </section>
    )
  }
  return <AuditLog />
}

function AuditLog() {
  const [filters, setFilters] = useState(NO_FILTERS)
  const [entries, setEntries] = useState([])
  const [actors, setActors] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const latest = useRef(0) // only the newest request may update the list

  const fetchPage = useCallback((activeFilters, beforeId) => {
    const request = ++latest.current
    return auditApi
      .listEntries(activeFilters, beforeId)
      .then((page) => {
        if (request !== latest.current) return
        setEntries((list) => (beforeId === null ? page : [...list, ...page]))
        setHasMore(page.length === PAGE_SIZE)
      })
      .catch((e) => request === latest.current && setError(e.message))
      .finally(() => request === latest.current && setLoading(false))
  }, [])

  useEffect(() => {
    auditApi.listActors().then(setActors).catch(() => setActors([]))
    fetchPage(NO_FILTERS, null)
  }, [fetchPage])

  function applyFilters(next) {
    setFilters(next)
    setLoading(true)
    setError('')
    fetchPage(next, null)
  }

  function showOlder() {
    setLoading(true)
    setError('')
    fetchPage(filters, entries.at(-1).id)
  }

  const set = (field) => (e) => applyFilters({ ...filters, [field]: e.target.value })
  const actorName = (entry) => {
    if (!entry.actorId) return 'System'
    const name = actors.find((a) => a.id === entry.actorId)?.fullName ?? 'Unknown user'
    return entry.actorRole ? `${name} (${entry.actorRole === 'owner' ? 'Owner' : 'Staff'})` : name
  }

  return (
    <section className={styles.page}>
      <h1>Audit log</h1>
      {auditApi.isSample && (
        <p className={styles.sampleNote}>Showing sample data. The database is not connected yet.</p>
      )}
      <p className={styles.muted}>
        Every change to products, stock, sales, customers, resellers and user accounts, newest first. Entries can’t be
        edited or deleted. Customer and reseller personal details are never stored here, only that they changed.
      </p>

      <div className={styles.filters} role="search" aria-label="Filter the audit log">
        <label>
          Area
          <select value={filters.area} onChange={set('area')}>
            <option value="">All areas</option>
            {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <label>
          Action
          <select value={filters.actionGroup} onChange={set('actionGroup')}>
            <option value="">All actions</option>
            {ACTION_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </label>
        <label>
          Done by
          <select value={filters.actorId} onChange={set('actorId')}>
            <option value="">Anyone</option>
            {actors.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
          </select>
        </label>
        <label>
          From
          <input type="date" value={filters.from} onChange={set('from')} />
        </label>
        <label>
          To
          <input type="date" value={filters.to} onChange={set('to')} />
        </label>
      </div>

      {error && <p role="alert" className={styles.error}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Area</th>
              <th>Action</th>
              <th>Record</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className={styles.nowrap}>{formatWhen(entry.createdAt)}</td>
                <td>{actorName(entry)}</td>
                <td>{areaLabel(entry.tableName)}</td>
                <td>{actionLabel(entry.action, entry.tableName)}</td>
                <td>{recordLabel(entry)}</td>
                <td><Changes entry={entry} /></td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.muted}>No entries match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.actions}>
        {loading && <p className={styles.muted}>Loading…</p>}
        {!loading && hasMore && (
          <button type="button" className={styles.secondary} onClick={showOlder}>
            Show older entries
          </button>
        )}
        {filters !== NO_FILTERS && (
          <button type="button" className={styles.secondary} onClick={() => applyFilters(NO_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>
    </section>
  )
}

function Changes({ entry }) {
  const changes = describeChanges(entry)
  if (changes.length === 0) return <span className={styles.muted}>—</span>
  return (
    <ul className={styles.changes}>
      {changes.map((c) => (
        <li key={c.field}>
          {c.field}: {'from' in c && 'to' in c ? `${c.from} → ${c.to}` : (c.to ?? c.from)}
        </li>
      ))}
    </ul>
  )
}
