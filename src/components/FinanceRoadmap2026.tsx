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
} from 'recharts'
import { fetchDashboardMonthlyOverview } from '../services/api'
import {
  buildMonthlyOverviewChartRows,
  type DashboardMonthlyOverviewData,
  type MonthlyOverviewChartRow,
} from '../lib/dashboardMonthlyOverviewTransform'

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
  payload?: Array<{ payload: MonthlyOverviewChartRow }>
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload

  return (
    <div className="rounded-xl border border-neutral-200/90 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm max-w-xs">
      <p className="text-sm font-semibold text-neutral-900 mb-3">{row.month_label}</p>
      <div className="space-y-2 text-xs text-neutral-600">
        <div className="font-medium text-neutral-800 border-b border-neutral-100 pb-2 mb-2">Virksomhed (faktisk)</div>
        <div className="flex justify-between gap-6">
          <span>Omsætning</span>
          <span className="font-medium text-neutral-900 tabular-nums">{formatCurrency(row.actual_revenue)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Omkostninger</span>
          <span className="font-medium text-neutral-900 tabular-nums">{formatCurrency(row.actual_costs)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Resultat</span>
          <span
            className={`font-semibold tabular-nums ${row.actual_result >= 0 ? 'text-emerald-700' : 'text-red-600'}`}
          >
            {formatCurrency(row.actual_result)}
          </span>
        </div>
        <div className="font-medium text-neutral-800 border-b border-neutral-100 pb-2 mb-2 pt-2">Projekt-pipeline</div>
        <div className="flex justify-between gap-6">
          <span>Forv. omsætning</span>
          <span className="font-medium text-neutral-700 tabular-nums">{formatCurrency(row.pipeline_revenue)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Forv. omkostning</span>
          <span className="font-medium text-neutral-700 tabular-nums">{formatCurrency(row.pipeline_cost)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Forv. resultat</span>
          <span
            className={`font-semibold tabular-nums ${row.pipeline_expected_result >= 0 ? 'text-sky-700' : 'text-amber-700'}`}
          >
            {formatCurrency(row.pipeline_expected_result)}
          </span>
        </div>
        <div className="flex justify-between gap-6 pt-1">
          <span>Antal projekter</span>
          <span className="font-medium text-neutral-900">{row.project_count}</span>
        </div>
        {row.projects.length > 0 && (
          <div className="pt-2 border-t border-neutral-100">
            <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1.5">Projekter</p>
            <ul className="space-y-1">
              {row.projects.map((p, i) => (
                <li key={`${p.name}-${i}`} className="text-neutral-700">
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 hover:underline"
                    >
                      {p.name}
                    </a>
                  ) : (
                    <span>{p.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
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

  const tooltipContent = useCallback((props: { active?: boolean; payload?: unknown }) => {
    const payload = props.payload as Array<{ payload: MonthlyOverviewChartRow }> | undefined
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
            <p className="mt-1 text-sm text-neutral-500 max-w-xl">
              Faktiske bogførte tal for virksomheden og forventet projektøkonomi i pipelinen — adskilt visuelt.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1">
              <span className="h-2 w-2 rounded-sm bg-neutral-800" />
              Faktisk
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1">
              <span className="h-2 w-2 rounded-sm bg-neutral-300 ring-1 ring-neutral-400/40" />
              Pipeline
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
              className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${
                t.result >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {formatCurrency(t.result)}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200/60 bg-white p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Pipeline omsætning</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-800 tabular-nums">
              {formatCurrency(p.expected_revenue)}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200/60 bg-white p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              Pipeline forventet resultat
            </p>
            <p
              className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${
                p.expected_result >= 0 ? 'text-sky-700' : 'text-amber-700'
              }`}
            >
              {formatCurrency(p.expected_result)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/30 p-4 lg:p-6">
          <div className="h-[min(420px,55vh)] w-full min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartRows} margin={{ top: 16, right: 8, left: 0, bottom: 8 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 6" stroke="#e5e5e5" vertical={false} />
                <XAxis
                  dataKey="month_short"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e5e5' }}
                />
                <YAxis
                  yAxisId="revenue"
                  tickFormatter={formatAxisTick}
                  tick={{ fill: '#a3a3a3', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <YAxis
                  yAxisId="result"
                  orientation="right"
                  tickFormatter={formatAxisTick}
                  tick={{ fill: '#a3a3a3', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip content={tooltipContent} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend
                  wrapperStyle={{ paddingTop: 20 }}
                  formatter={(value) => <span className="text-xs text-neutral-600">{value}</span>}
                />
                <ReferenceLine yAxisId="result" y={0} stroke="#d4d4d4" strokeWidth={1} />
                <Bar
                  yAxisId="revenue"
                  dataKey="actual_revenue"
                  name="Faktisk omsætning"
                  fill="#262626"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  yAxisId="revenue"
                  dataKey="pipeline_revenue"
                  name="Pipeline omsætning"
                  fill="#d4d4d8"
                  fillOpacity={0.85}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                  stroke="#a3a3a8"
                  strokeWidth={0.5}
                  strokeDasharray="4 3"
                />
                <Line
                  yAxisId="result"
                  type="monotone"
                  dataKey="actual_result"
                  name="Faktisk resultat"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0d9488', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="result"
                  type="monotone"
                  dataKey="pipeline_expected_result"
                  name="Pipeline forventet resultat"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  dot={{ r: 2, fill: '#94a3b8', strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-neutral-500 max-w-3xl">
          Faktiske tal viser hele virksomhedens bogførte økonomi. Pipeline viser forventet projektøkonomi for kommende
          opgaver og inkluderer ikke fuld overhead som løn, husleje og øvrige faste omkostninger.
        </p>
      </div>
    </div>
  )
}
