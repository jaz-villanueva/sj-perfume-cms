import { useEffect, useState } from 'react'
import { Swash } from '../../components/Ornament.jsx'
import { formatPeso } from '../sales/saleUtils.js'
import ChannelBreakdown from './ChannelBreakdown.jsx'
import DailySalesChart from './DailySalesChart.jsx'
import RecentSales from './RecentSales.jsx'
import StockWatch from './StockWatch.jsx'
import TopBuyers from './TopBuyers.jsx'
import TopProducts from './TopProducts.jsx'
import { dashboardApi } from './dashboardApi.js'
import { PERIODS } from './dashboardUtils.js'
import styles from './dashboard.module.css'

const count = new Intl.NumberFormat('en-PH')

// The sample sales have fixed dates, so sample mode opens on "All time"; real data opens on 30 days.
const DEFAULT_PERIOD = dashboardApi.isSample ? 0 : 30

export default function DashboardPage() {
  const [period, setPeriod] = useState(DEFAULT_PERIOD)
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    dashboardApi
      .getDashboard({ days: period })
      .then((result) => {
        if (!active) return
        setData(result)
        setLoadError('')
      })
      .catch((error) => active && setLoadError(`Could not load the dashboard: ${error.message}`))
    return () => {
      active = false
    }
  }, [period])

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Overview</p>
          <h1 className={styles.title}>Dashboard</h1>
          <Swash className={styles.titleSwash} />
          <p className={styles.lead}>Sales, stock and customer activity at a glance.</p>
        </div>
        <label className={styles.period}>
          <span className={styles.eyebrow}>Period</span>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
      </header>

      {dashboardApi.isSample && (
        <p className={styles.sampleNote}>Showing sample data. The database is not connected yet.</p>
      )}
      {loadError && <p role="alert" className={styles.error}>{loadError}</p>}
      {!data && !loadError && <p className={styles.muted}>Loading…</p>}

      {data && (
        <>
          <div className={styles.tiles}>
            <div className={`${styles.tile} ${styles.hero}`}>
              <p className={styles.tileLabel}>Revenue</p>
              <p className={styles.tileValue}>{formatPeso(data.summary.revenue)}</p>
            </div>
            <div className={styles.tile}>
              <p className={styles.tileLabel}>Sales</p>
              <p className={styles.tileValue}>{count.format(data.summary.salesCount)}</p>
            </div>
            <div className={styles.tile}>
              <p className={styles.tileLabel}>Units sold</p>
              <p className={styles.tileValue}>{count.format(data.summary.units)}</p>
            </div>
            <div className={styles.tile}>
              <p className={styles.tileLabel}>Average sale</p>
              <p className={styles.tileValue}>{formatPeso(data.summary.averageSale)}</p>
            </div>
          </div>

          <div className={styles.rowWide}>
            <DailySalesChart days={data.daily} />
            <ChannelBreakdown rows={data.byChannel} />
          </div>

          <div className={styles.rowThree}>
            <TopProducts products={data.topProducts} />
            <TopBuyers buyers={data.topBuyers} />
            <StockWatch products={data.stockWatch} />
          </div>

          <RecentSales sales={data.recentSales} />

          <div className={`${styles.panel} ${styles.planned}`}>
            <h2>Reorder suggestions</h2>
            <p>Appears here once demand forecasting is running (FR-14, FR-15).</p>
          </div>
        </>
      )}
    </section>
  )
}
