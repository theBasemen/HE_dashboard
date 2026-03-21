/**
 * Parse `he_dashboard_finance_cache.data` for cache_type `dashboard_liquidity_summary`.
 */

import { coerceNumber } from './dashboardMonthlyOverviewTransform'

export interface LiquidityInvoiceRow {
  name: string
  amount: number
  due_at?: string
}

export interface CashAccountRow {
  name: string
  balance: number
}

export interface DashboardLiquiditySummaryData {
  liquidity: {
    cash_now: number
    receivables: number
    short_term_obligations: number
    buffer: number
  }
  details: {
    invoice_count: number
    invoices: LiquidityInvoiceRow[]
    cash_accounts: CashAccountRow[]
    obligations_components: {
      vat_due: number
      payroll_due: number
    }
  }
  updated_at: string
}

function strField(o: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.trim()) return v
  }
  return undefined
}

function normalizeInvoice(raw: unknown): LiquidityInvoiceRow | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const name =
    strField(o, 'name', 'description', 'title', 'customer_name') ?? 'Uden navn'
  const amount = coerceNumber(o.amount ?? o.total ?? o.sum ?? 0)
  const due_at = strField(o, 'due_at', 'due_date', 'dueDate', 'expires_at')
  return { name, amount, due_at }
}

function normalizeCashAccount(raw: unknown): CashAccountRow | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const name = strField(o, 'name', 'label', 'account_name', 'description') ?? 'Konto'
  const balance = coerceNumber(o.balance ?? o.amount ?? o.value ?? 0)
  return { name, balance }
}

export function parseDashboardLiquiditySummaryData(raw: unknown): DashboardLiquiditySummaryData | null {
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

  const liqRaw = root.liquidity && typeof root.liquidity === 'object' ? (root.liquidity as Record<string, unknown>) : null
  if (!liqRaw) return null

  const detRaw = root.details && typeof root.details === 'object' ? (root.details as Record<string, unknown>) : {}
  const invRaw = detRaw.invoices
  const invoices: LiquidityInvoiceRow[] = Array.isArray(invRaw)
    ? invRaw.map(normalizeInvoice).filter((x): x is LiquidityInvoiceRow => x !== null)
    : []

  const cashRaw = detRaw.cash_accounts
  const cash_accounts: CashAccountRow[] = Array.isArray(cashRaw)
    ? cashRaw.map(normalizeCashAccount).filter((x): x is CashAccountRow => x !== null)
    : []

  const ocRaw =
    detRaw.obligations_components && typeof detRaw.obligations_components === 'object'
      ? (detRaw.obligations_components as Record<string, unknown>)
      : {}

  const updated_at =
    typeof root.updated_at === 'string'
      ? root.updated_at
      : typeof detRaw.updated_at === 'string'
        ? detRaw.updated_at
        : new Date().toISOString()

  return {
    liquidity: {
      cash_now: coerceNumber(liqRaw.cash_now),
      receivables: coerceNumber(liqRaw.receivables),
      short_term_obligations: coerceNumber(liqRaw.short_term_obligations),
      buffer: coerceNumber(liqRaw.buffer),
    },
    details: {
      invoice_count:
        detRaw.invoice_count !== undefined && detRaw.invoice_count !== null
          ? Math.round(coerceNumber(detRaw.invoice_count))
          : invoices.length,
      invoices,
      cash_accounts,
      obligations_components: {
        vat_due: coerceNumber(ocRaw.vat_due),
        payroll_due: coerceNumber(ocRaw.payroll_due),
      },
    },
    updated_at,
  }
}
