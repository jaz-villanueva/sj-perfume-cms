import { useEffect, useMemo, useState } from 'react'
import { salesApi } from '../sales/salesApi.js'
import { formatPeso } from '../sales/saleUtils.js'
import ChannelBreakdown from './ChannelBreakdown.jsx'
import DailySalesChart from './DailySalesChart.jsx'
import { PERIODS, byChannel, dailyRevenue, salesInPeriod, summarize } from './dashboardUtils.js'
import styles from './dashboard.module.css'

const count = new Intl.NumberFormat('en-PH')

// The sample sales have fixed dates, so sample mode opens on "All time"; real data opens on 30 days.
const DEFAULT_PERIOD = salesApi.isSample ? 0 : 30

export default function DashboardPage() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [period, setPeriod] = useState(DEFAULT_PERIOD)

  useEffect(() => {
    let active = true
    salesApi
      .listSales()
      .then((rows) => active && setSales(rows))
      .catch((error) => active && setLoadError(`Could not load the dashboard: ${error.message}`))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const inPeriod = useMemo(() => salesInPeriod(sales, period), [sales, period])
  const summary = useMemo(() => summarize(inPeriod), [inPeriod])
  const channels = useMemo(() => byChannel(inPeriod), [inPeriod])
  // "All time" charts the last 90 days, so the columns stay readable.
  const days = useMemo(() => dailyRevenue(sales, period || 90), [sales, period])

  return (
    <section>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <label className={styles.period}>
          Period
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
      </div>

      {salesApi.isSample && (
        <p className={styles.sampleNote}>Showing sample data. The database is not connected yet.</p>
      )}
      {loadError && <p role="alert" className={styles.error}>{loadError}</p>}
      {loading && <p className={styles.muted}>Loading…</p>}

      {!loading && !loadError && (
        <div className={styles.tiles}>
          <div className={`${styles.tile} ${styles.hero}`}>
            <p className={styles.tileLabel}>Revenue</p>
            <p className={styles.tileValue}>{formatPeso(summary.revenue)}</p>
          </div>
          <div className={styles.tile}>
            <p className={styles.tileLabel}>Sales</p>
            <p className={styles.tileValue}>{count.format(summary.salesCount)}</p>
          </div>
          <div className={styles.tile}>
            <p className={styles.tileLabel}>Units sold</p>
            <p className={styles.tileValue}>{count.format(summary.units)}</p>
          </div>
          <div className={styles.tile}>
            <p className={styles.tileLabel}>Average sale</p>
            <p className={styles.tileValue}>{formatPeso(summary.averageSale)}</p>
          </div>
        </div>
      )}

      {!loading && !loadError && (
        <div className={styles.panels}>
          <DailySalesChart days={days} />
          <ChannelBreakdown rows={channels} />
        </div>
      )}
    </section>
  )
}
