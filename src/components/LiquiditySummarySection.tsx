/**
 * Likviditet — compact card fed from `dashboard_liquidity_summary` cache.
 * Header + 2×2 metrics + one summary line only (no detail panels).
 */

import type { DashboardLiquiditySummaryData } from '../lib/dashboardLiquiditySummaryTransform'

function formatKr(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0 kr.'
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatUpdatedAt(iso: string | undefined): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('da-DK', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function summaryFromDetails(invoiceCount: number, payrollDue: number): string {
  const a =
    invoiceCount === 0
      ? 'Ingen udestående fakturaer'
      : invoiceCount === 1
        ? '1 udestående faktura'
        : `${invoiceCount} udestående fakturaer`
  const b = 'momsforpligtelse inkluderet'
  const c = payrollDue > 0 ? 'lønforpligtelser medregnet' : null
  return [a, b, c].filter(Boolean).join(' • ')
}

type MetricTone = 'neutral' | 'positive_hint' | 'obligation' | 'buffer_good' | 'buffer_bad' | 'buffer_zero'

function MetricBlock({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: MetricTone
}) {
  const borderBg =
    tone === 'neutral'
      ? 'border-neutral-200/80 bg-white'
      : tone === 'positive_hint'
        ? 'border-emerald-200/50 bg-emerald-50/20'
        : tone === 'obligation'
          ? 'border-rose-200/55 bg-rose-50/25'
          : tone === 'buffer_good'
            ? 'border-emerald-200/50 bg-emerald-50/15'
            : tone === 'buffer_bad'
              ? 'border-red-200/55 bg-red-50/20'
              : 'border-neutral-200/80 bg-neutral-50/30'

  const valueClass =
    tone === 'neutral'
      ? 'text-neutral-900'
      : tone === 'positive_hint'
        ? 'text-neutral-900'
        : tone === 'obligation'
          ? 'text-rose-900'
          : tone === 'buffer_good'
            ? 'text-emerald-700'
            : tone === 'buffer_bad'
              ? 'text-red-700'
              : 'text-neutral-900'

  return (
    <div className={`flex min-h-0 flex-col rounded-xl border p-4 sm:p-5 ${borderBg}`}>
      <p className="text-[11px] font-medium leading-snug text-neutral-500 sm:text-[12px]">{label}</p>
      <p
        className={`mt-3 min-w-0 text-lg font-semibold tabular-nums leading-tight tracking-tight sm:text-xl lg:text-2xl ${valueClass}`}
      >
        {formatKr(value)}
      </p>
    </div>
  )
}

export interface LiquiditySummarySectionProps {
  data: DashboardLiquiditySummaryData | null
  loading?: boolean
}

export default function LiquiditySummarySection({ data, loading = false }: LiquiditySummarySectionProps) {
  if (loading) {
    return (
      <section className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm sm:p-7">
        <div className="mb-6 space-y-2">
          <div className="h-6 w-32 animate-pulse rounded-md bg-neutral-100" />
          <div className="h-3 w-44 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-xl bg-neutral-100 sm:h-[96px]" />
          ))}
        </div>
        <div className="mt-6 h-3.5 w-full max-w-lg animate-pulse rounded bg-neutral-100" />
      </section>
    )
  }

  if (!data) {
    return (
      <section className="flex h-full w-full min-w-0 flex-col justify-center rounded-2xl border border-neutral-200/80 bg-white p-7 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Likviditet</h2>
        <p className="mt-2 max-w-xs text-sm text-neutral-500">
          Ingen data. Cachen <span className="font-mono text-[13px]">dashboard_liquidity_summary</span> for dette år
          mangler eller er tom.
        </p>
      </section>
    )
  }

  const { liquidity, details } = data
  const bufferTone: MetricTone =
    liquidity.buffer > 0 ? 'buffer_good' : liquidity.buffer < 0 ? 'buffer_bad' : 'buffer_zero'

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm sm:p-7">
      <header className="mb-6 shrink-0 sm:mb-7">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">Likviditet</h2>
        {data.updated_at ? (
          <p className="mt-1 text-[11px] text-neutral-400">Opdateret {formatUpdatedAt(data.updated_at)}</p>
        ) : null}
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <MetricBlock label="Likvider" value={liquidity.cash_now} tone="neutral" />
        <MetricBlock label="Tilgodehavender" value={liquidity.receivables} tone="positive_hint" />
        <MetricBlock
          label="Kortfristede forpligtelser"
          value={liquidity.short_term_obligations}
          tone="obligation"
        />
        <MetricBlock label="Buffer" value={liquidity.buffer} tone={bufferTone} />
      </div>

      <p className="mt-6 text-xs leading-relaxed text-neutral-500 sm:mt-7 sm:text-[13px]">
        {summaryFromDetails(details.invoice_count, details.obligations_components.payroll_due)}
      </p>
    </section>
  )
}
