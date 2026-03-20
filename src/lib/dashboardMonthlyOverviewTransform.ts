/**
 * Pure transforms for `he_dashboard_finance_cache` → dashboard chart + KPIs.
 * Keeps presentation components free of parsing/normalization logic.
 */

export interface DashboardPipelineProject {
  name: string
  due_at?: string
  expected_cost: number
  expected_revenue: number
  expected_result: number
  url?: string
}

export interface DashboardMonthlyMonth {
  month: string
  month_index: number
  company_actuals: {
    revenue: number
    costs: number
    result: number
  }
  project_pipeline: {
    expected_revenue: number
    expected_cost: number
    expected_result: number
    project_count: number
    projects?: DashboardPipelineProject[]
  }
}

export interface DashboardMonthlyOverviewData {
  totals: {
    company_actuals: {
      revenue: number
      costs: number
      result: number
    }
    project_pipeline: {
      expected_revenue: number
      expected_cost: number
      expected_result: number
      project_count: number
    }
  }
  monthly_breakdown: DashboardMonthlyMonth[]
}

/** Row from `he_dashboard_finance_cache` (subset used by the app) */
export interface DashboardFinanceCacheRow {
  id?: string
  cache_key: string
  year: number
  cache_type: string
  data: unknown
  updated_at?: string
  created_at?: string
}

const MONTH_SHORT: Record<number, string> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'Maj',
  6: 'Jun',
  7: 'Jul',
  8: 'Aug',
  9: 'Sep',
  10: 'Okt',
  11: 'Nov',
  12: 'Dec',
}

export function coerceNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

function normalizePipelineProject(raw: unknown): DashboardPipelineProject | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const name = typeof o.name === 'string' ? o.name : ''
  if (!name) return null
  return {
    name,
    due_at: typeof o.due_at === 'string' ? o.due_at : undefined,
    url: typeof o.url === 'string' ? o.url : undefined,
    expected_cost: coerceNumber(o.expected_cost),
    expected_revenue: coerceNumber(o.expected_revenue),
    expected_result: coerceNumber(o.expected_result),
  }
}

export function normalizeMonthlyMonth(raw: unknown): DashboardMonthlyMonth | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const monthIndex = Math.round(coerceNumber(o.month_index, NaN))
  if (!Number.isFinite(monthIndex) || monthIndex < 1 || monthIndex > 12) return null

  const ca = (o.company_actuals && typeof o.company_actuals === 'object'
    ? (o.company_actuals as Record<string, unknown>)
    : {}) as Record<string, unknown>
  const pp = (o.project_pipeline && typeof o.project_pipeline === 'object'
    ? (o.project_pipeline as Record<string, unknown>)
    : {}) as Record<string, unknown>

  const projectsRaw = pp.projects
  const projects: DashboardPipelineProject[] = Array.isArray(projectsRaw)
    ? projectsRaw.map(normalizePipelineProject).filter((p): p is DashboardPipelineProject => p !== null)
    : []

  return {
    month: typeof o.month === 'string' ? o.month : MONTH_SHORT[monthIndex] ?? `M${monthIndex}`,
    month_index: monthIndex,
    company_actuals: {
      revenue: coerceNumber(ca.revenue),
      costs: coerceNumber(ca.costs),
      result: coerceNumber(ca.result),
    },
    project_pipeline: {
      expected_revenue: coerceNumber(pp.expected_revenue),
      expected_cost: coerceNumber(pp.expected_cost),
      expected_result: coerceNumber(pp.expected_result),
      project_count: Math.round(coerceNumber(pp.project_count)),
      projects,
    },
  }
}

export function parseDashboardMonthlyOverviewData(raw: unknown): DashboardMonthlyOverviewData | null {
  if (raw === null || raw === undefined) return null
  let obj: unknown = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!obj || typeof obj !== 'object') return null
  const root = obj as Record<string, unknown>

  const totalsRaw = root.totals
  if (!totalsRaw || typeof totalsRaw !== 'object') return null
  const t = totalsRaw as Record<string, unknown>
  const caT = (t.company_actuals && typeof t.company_actuals === 'object'
    ? t.company_actuals
    : {}) as Record<string, unknown>
  const ppT = (t.project_pipeline && typeof t.project_pipeline === 'object'
    ? t.project_pipeline
    : {}) as Record<string, unknown>

  const breakdownRaw = root.monthly_breakdown
  const breakdownIn = Array.isArray(breakdownRaw) ? breakdownRaw : []
  const monthly_breakdown: DashboardMonthlyMonth[] = []
  for (const item of breakdownIn) {
    const m = normalizeMonthlyMonth(item)
    if (m) monthly_breakdown.push(m)
  }

  return {
    totals: {
      company_actuals: {
        revenue: coerceNumber(caT.revenue),
        costs: coerceNumber(caT.costs),
        result: coerceNumber(caT.result),
      },
      project_pipeline: {
        expected_revenue: coerceNumber(ppT.expected_revenue),
        expected_cost: coerceNumber(ppT.expected_cost),
        expected_result: coerceNumber(ppT.expected_result),
        project_count: Math.round(coerceNumber(ppT.project_count)),
      },
    },
    monthly_breakdown,
  }
}

/** One row per calendar month (1–12) for Recharts + tooltips */
export interface MonthlyOverviewChartRow {
  month_short: string
  month_index: number
  actual_revenue: number
  actual_costs: number
  actual_result: number
  pipeline_revenue: number
  pipeline_cost: number
  pipeline_expected_result: number
  project_count: number
  projects: DashboardPipelineProject[]
  /** Full month label for tooltip */
  month_label: string
}

export function buildMonthlyOverviewChartRows(data: DashboardMonthlyOverviewData): MonthlyOverviewChartRow[] {
  const byIndex = new Map<number, DashboardMonthlyMonth>()
  for (const m of data.monthly_breakdown) {
    byIndex.set(m.month_index, m)
  }

  const rows: MonthlyOverviewChartRow[] = []
  for (let i = 1; i <= 12; i++) {
    const existing = byIndex.get(i)
    const month_short = MONTH_SHORT[i] ?? `M${i}`
    if (existing) {
      rows.push({
        month_short,
        month_index: i,
        month_label: `${month_short} 2026`,
        actual_revenue: existing.company_actuals.revenue,
        actual_costs: existing.company_actuals.costs,
        actual_result: existing.company_actuals.result,
        pipeline_revenue: existing.project_pipeline.expected_revenue,
        pipeline_cost: existing.project_pipeline.expected_cost,
        pipeline_expected_result: existing.project_pipeline.expected_result,
        project_count: existing.project_pipeline.project_count,
        projects: existing.project_pipeline.projects ?? [],
      })
    } else {
      rows.push({
        month_short,
        month_index: i,
        month_label: `${month_short} 2026`,
        actual_revenue: 0,
        actual_costs: 0,
        actual_result: 0,
        pipeline_revenue: 0,
        pipeline_cost: 0,
        pipeline_expected_result: 0,
        project_count: 0,
        projects: [],
      })
    }
  }
  return rows
}
