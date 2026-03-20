import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Cell,
} from 'recharts'
import { fetchDashboardMonthlyOverview } from '../services/api'
import {
  buildMonthlyOverviewChartRows,
  type DashboardMonthlyOverviewData,
  type MonthlyOverviewChartRow,
} from '../lib/dashboardMonthlyOverviewTransform'

/** Align with app convention (e.g. ProjectStatistics): green / red where sign matters (KPI, månedligt i tooltip) */
const RESULT_GREEN = '#10b981'
const RESULT_RED = '#ef4444'
/** Én rolig grøn til den akkumulerede kurve — kontinuitet uden farveskift */
const ACCUMULATED_LINE_GREEN = '#0d9488'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'] as const

type ChartRowVisual = MonthlyOverviewChartRow & {
  hasPipeline: boolean
}

/** Kept for API compatibility with FinancePage; cache data does not use overrides yet. */
interface FinanceRoadmap2026Props {
  overrideBreakEven?: number | null
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0 kr.'
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatAxisTick(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')} m`
  if (abs >= 1000) return `${Math.round(value / 1000)} k`
  return `${Math.round(value)}`
}

function MonthlyTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartRowVisual }>
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white px-4 py-3.5 shadow-md shadow-neutral-900/5 max-w-xs">
      <p className="text-[13px] font-medium text-neutral-900 tracking-tight mb-3">{row.month_label}</p>
      <div className="space-y-1.5 text-[12px] text-neutral-600 leading-snug">
        <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 border-b border-neutral-100 pb-2 mb-2">
          Faktisk
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-neutral-500">Omsætning</span>
          <span className="font-medium text-neutral-900 tabular-nums">{formatCurrency(row.actual_revenue)}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-neutral-500">Omkostninger</span>
          <span className="font-medium text-neutral-900 tabular-nums">{formatCurrency(row.actual_costs)}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-neutral-500">Resultat for måneden</span>
          <span
            className="font-medium tabular-nums"
            style={{ color: row.actual_result >= 0 ? RESULT_GREEN : RESULT_RED }}
          >
            {formatCurrency(row.actual_result)}
          </span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-neutral-500">Akkumuleret resultat</span>
          <span className="font-medium tabular-nums text-neutral-800">{formatCurrency(row.cumulative_result)}</span>
        </div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 border-b border-neutral-100 pb-2 mb-2 pt-3">
          Pipeline
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-neutral-500">Forventet omsætning</span>
          <span className="font-medium text-neutral-700 tabular-nums">{formatCurrency(row.pipeline_revenue)}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-neutral-500">Forventede omkostninger</span>
          <span className="font-medium text-neutral-700 tabular-nums">{formatCurrency(row.pipeline_cost)}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-neutral-500">Forventet resultat</span>
          <span className="font-medium tabular-nums text-neutral-700">{formatCurrency(row.pipeline_expected_result)}</span>
        </div>
        <div className="flex justify-between gap-8 pt-0.5">
          <span className="text-neutral-500">Antal projekter</span>
          <span className="font-medium text-neutral-800 tabular-nums">{row.project_count}</span>
        </div>
        <div className="pt-3 mt-1 border-t border-neutral-100">
          {row.projects.length > 0 ? (
            <>
              <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Projekter</p>
              <ul className="space-y-1.5">
                {row.projects.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="text-neutral-600 text-[12px]">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-700 underline decoration-neutral-200 underline-offset-2 hover:text-neutral-900"
                      >
                        {p.name}
                      </a>
                    ) : (
                      <span>{p.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[12px] text-neutral-400">Ingen pipeline projekter</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FinanceRoadmap2026(_props: FinanceRoadmap2026Props) {
  const [overview, setOverview] = useState<DashboardMonthlyOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchDashboardMonthlyOverview()
        setOverview(data)
      } catch (e) {
        console.error(e)
        setError('Kunne ikke indlæse årsoverblik')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const chartRows = useMemo(() => (overview ? buildMonthlyOverviewChartRows(overview) : []), [overview])

  const chartRowsVisual = useMemo((): ChartRowVisual[] => {
    return chartRows.map((row) => {
      const hasPipeline =
        row.pipeline_revenue !== 0 ||
        row.pipeline_cost !== 0 ||
        row.pipeline_expected_result !== 0 ||
        row.project_count > 0
      return {
        ...row,
        hasPipeline,
      }
    })
  }, [chartRows])

  /** Highlight current calendar month when viewing 2026 in real time */
  const currentMonthTick = useMemo(() => {
    const now = new Date()
    if (now.getFullYear() !== 2026) return null
    return MONTH_LABELS[now.getMonth()]
  }, [])

  const tooltipContent = useCallback((props: { active?: boolean; payload?: unknown }) => {
    const payload = props.payload as Array<{ payload: ChartRowVisual }> | undefined
    return <MonthlyTooltip active={props.active} payload={payload} />
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 lg:p-8 shadow-sm">
        <div className="h-7 w-48 rounded-md bg-neutral-100 animate-pulse mb-2" />
        <div className="h-4 w-72 rounded-md bg-neutral-100 animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-8 lg:p-10 shadow-sm text-center">
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">Årsoverblik 2026</h2>
        <p className="text-sm text-neutral-500 max-w-md mx-auto">
          {error ||
            'Ingen data i cachen endnu. Tjek at rækken findes i he_dashboard_finance_cache (main_dashboard / 2026 / dashboard_monthly_overview).'}
        </p>
      </div>
    )
  }

  const { totals } = overview
  const t = totals.company_actuals
  const p = totals.project_pipeline

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 lg:p-8 shadow-sm">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-neutral-900">Årsoverblik for 2026</h3>
            <p className="mt-1.5 text-sm text-neutral-500 max-w-xl leading-relaxed">
              Søjlerne viser månedlig aktivitet — mørke for det bogførte, lyse for det forventede fremad. Den grønne linje
              følger virksomhedens akkumulerede resultat gennem året.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1">
              <span className="h-2 w-2 rounded-sm bg-neutral-800" />
              Faktisk omsætning
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1">
              <span className="h-2 w-2 rounded-sm bg-neutral-400/80" />
              Pipeline omsætning
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1">
              <span
                className="h-2 w-2 rounded-full ring-1 ring-black/5"
                style={{ backgroundColor: ACCUMULATED_LINE_GREEN }}
              />
              Akkumuleret resultat
            </span>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="rounded-2xl border border-neutral-200/60 bg-neutral-50/50 p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Faktisk omsætning i år</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 tabular-nums">
              {formatCurrency(t.revenue)}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200/60 bg-neutral-50/50 p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Faktisk resultat i år</p>
            <p
              className="mt-2 text-2xl font-semibold tracking-tight tabular-nums"
              style={{ color: t.result >= 0 ? RESULT_GREEN : RESULT_RED }}
            >
              {formatCurrency(t.result)}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200/60 bg-neutral-50/40 p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Pipeline omsætning</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-700 tabular-nums">
              {formatCurrency(p.expected_revenue)}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200/60 bg-neutral-50/40 p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              Pipeline forventet resultat
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-700 tabular-nums">
              {formatCurrency(p.expected_result)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/30 p-4 lg:p-6">
          <div className="h-[min(420px,55vh)] w-full min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartRowsVisual}
                margin={{ top: 20, right: 18, left: 6, bottom: 8 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 8" stroke="#f0f0f0" vertical={false} />
                {currentMonthTick ? (
                  <ReferenceLine
                    x={currentMonthTick}
                    stroke="#d4d4d4"
                    strokeWidth={0.75}
                    strokeDasharray="2 6"
                    strokeOpacity={0.55}
                  />
                ) : null}
                <XAxis
                  dataKey="month_short"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                />
                <YAxis
                  tickFormatter={formatAxisTick}
                  tick={{ fill: '#a3a3a3', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  label={{
                    value: 'Beløb (kr)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 4,
                    style: { fill: '#a8a8a8', fontSize: 10, fontWeight: 500 },
                  }}
                />
                <Tooltip content={tooltipContent} cursor={{ fill: 'rgba(0,0,0,0.025)' }} />
                <Legend
                  wrapperStyle={{ paddingTop: 20 }}
                  formatter={(value) => <span className="text-xs text-neutral-500">{value}</span>}
                />
                <ReferenceLine
                  y={0}
                  stroke="#e5e5e5"
                  strokeWidth={0.75}
                  strokeOpacity={1}
                  ifOverflow="extendDomain"
                />
                <Bar
                  dataKey="actual_revenue"
                  name="Faktisk omsætning"
                  fill="#171717"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="pipeline_revenue"
                  name="Pipeline omsætning"
                  fill="#a3a3a3"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                >
                  {chartRowsVisual.map((entry, index) => {
                    const emphasis =
                      entry.pipeline_revenue !== 0 ||
                      entry.pipeline_expected_result !== 0 ||
                      entry.project_count > 0
                    return (
                      <Cell
                        key={`pipe-rev-${index}`}
                        fill="#9ca3af"
                        fillOpacity={emphasis ? 0.62 : 0.3}
                      />
                    )
                  })}
                </Bar>
                <Line
                  type="linear"
                  dataKey="cumulative_result"
                  name="Akkumuleret resultat"
                  stroke={ACCUMULATED_LINE_GREEN}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  connectNulls
                  dot={(props: {
                    cx?: number
                    cy?: number
                    index?: number
                    payload?: ChartRowVisual
                  }) => {
                    const { cx, cy, index, payload } = props
                    if (cx == null || cy == null) return <g key={`acc-${index}`} />
                    const isNow = currentMonthTick && payload?.month_short === currentMonthTick
                    const r = isNow ? 3.25 : 2.5
                    return (
                      <circle
                        key={`acc-${index}`}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={ACCUMULATED_LINE_GREEN}
                        fillOpacity={0.95}
                        stroke="#fafafa"
                        strokeWidth={1}
                      />
                    )
                  }}
                  activeDot={{ r: 4, fill: ACCUMULATED_LINE_GREEN, stroke: '#fff', strokeWidth: 1.5 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-[1.7] text-neutral-500">
          Faktiske tal viser hele virksomhedens bogførte økonomi. Pipeline viser forventet projektøkonomi for kommende
          opgaver og inkluderer ikke fuld overhead som løn, husleje og øvrige faste omkostninger.
        </p>
      </div>
    </div>
  )
}
