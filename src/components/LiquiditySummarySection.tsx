import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { DashboardLiquiditySummaryData, LiquidityInvoiceRow } from '../lib/dashboardLiquiditySummaryTransform'

function formatCurrencyDk(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0 kr.'
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDueDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat('da-DK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return iso
  }
}

function formatUpdatedAtShort(iso: string | undefined): string {
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

/** Single liquidity KPI — generous spacing, scan-friendly numbers */
function LiquidityMetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'cash' | 'receivables' | 'obligations' | 'buffer_positive' | 'buffer_negative' | 'buffer_neutral'
}) {
  const formatted = formatCurrencyDk(value)

  const shell =
    tone === 'cash'
      ? 'border-neutral-200/70 bg-neutral-50/50'
      : tone === 'receivables'
        ? 'border-emerald-200/40 bg-emerald-50/25'
        : tone === 'obligations'
          ? 'border-rose-200/50 bg-rose-50/35'
          : tone === 'buffer_positive'
            ? 'border-emerald-200/45 bg-emerald-50/20'
            : tone === 'buffer_negative'
              ? 'border-red-200/50 bg-red-50/30'
              : 'border-neutral-200/70 bg-neutral-50/40'

  const valueColor =
    tone === 'cash'
      ? 'text-neutral-900'
      : tone === 'receivables'
        ? 'text-neutral-800'
        : tone === 'obligations'
          ? 'text-rose-900'
          : tone === 'buffer_positive'
            ? 'text-emerald-700'
            : tone === 'buffer_negative'
              ? 'text-red-700'
              : 'text-neutral-900'

  return (
    <div
      className={`flex min-h-[120px] flex-col justify-between rounded-2xl border px-5 py-5 sm:min-h-[128px] ${shell}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-neutral-500 leading-snug pr-1">
        {label}
      </p>
      <p
        className={`mt-4 text-2xl font-semibold tabular-nums tracking-tight leading-none sm:text-[1.65rem] ${valueColor}`}
      >
        {formatted}
      </p>
    </div>
  )
}

function buildSummaryLine(invoiceCount: number, payrollDue: number): string {
  const parts: string[] = []
  if (invoiceCount === 0) {
    parts.push('Ingen udestående fakturaer')
  } else if (invoiceCount === 1) {
    parts.push('1 udestående faktura')
  } else {
    parts.push(`${invoiceCount} udestående fakturaer`)
  }

  parts.push('momsforpligtelse inkluderet')

  if (payrollDue > 0) {
    parts.push('lønforpligtelser medregnet')
  }

  return parts.join(' • ')
}

function InvoiceRow({ inv }: { inv: LiquidityInvoiceRow }) {
  return (
    <li className="flex flex-col gap-1 border-b border-neutral-100 py-3 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="min-w-0 flex-1 text-sm font-medium text-neutral-800">{inv.name}</span>
      <div className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-0.5 text-sm tabular-nums text-neutral-600 sm:justify-end">
        <span className="font-medium text-neutral-900">{formatCurrencyDk(inv.amount)}</span>
        <span className="text-xs text-neutral-500">Forfald {formatDueDate(inv.due_at)}</span>
      </div>
    </li>
  )
}

interface LiquiditySummarySectionProps {
  data: DashboardLiquiditySummaryData | null
  loading?: boolean
}

export default function LiquiditySummarySection({ data, loading = false }: LiquiditySummarySectionProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-2xl border border-neutral-200/80 bg-white p-7 shadow-sm sm:p-8">
        <div className="mb-8 space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-md bg-neutral-100" />
          <div className="h-3 w-56 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="min-h-[120px] animate-pulse rounded-2xl bg-neutral-100 sm:min-h-[128px]" />
          ))}
        </div>
        <div className="mt-8 h-4 w-full max-w-md animate-pulse rounded bg-neutral-100" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-full flex-col justify-center rounded-2xl border border-neutral-200/80 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Likviditet</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
          Data ikke tilgængelig. Tjek cachen for{' '}
          <span className="whitespace-nowrap">main_dashboard</span> / {new Date().getFullYear()} /{' '}
          <span className="whitespace-nowrap">dashboard_liquidity_summary</span>.
        </p>
      </div>
    )
  }

  const { liquidity, details } = data
  const bufferTone =
    liquidity.buffer > 0
      ? 'buffer_positive'
      : liquidity.buffer < 0
        ? 'buffer_negative'
        : 'buffer_neutral'

  const summaryText = buildSummaryLine(details.invoice_count, details.obligations_components.payroll_due)

  const hasExpandableContent =
    details.invoices.length > 0 ||
    details.obligations_components.vat_due !== 0 ||
    details.obligations_components.payroll_due !== 0

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-neutral-200/80 bg-white p-7 shadow-sm sm:p-8">
      <header className="mb-8 shrink-0">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">Likviditet</h2>
        {data.updated_at ? (
          <p className="mt-1 text-[11px] font-normal text-neutral-400">Opdateret {formatUpdatedAtShort(data.updated_at)}</p>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-4">
        <LiquidityMetricCard label="Likvider" value={liquidity.cash_now} tone="cash" />
        <LiquidityMetricCard label="Tilgodehavender" value={liquidity.receivables} tone="receivables" />
        <LiquidityMetricCard
          label="Kortfristede forpligtelser"
          value={liquidity.short_term_obligations}
          tone="obligations"
        />
        <LiquidityMetricCard label="Buffer" value={liquidity.buffer} tone={bufferTone} />
      </div>

      <div className="mt-8 shrink-0">
        <p className="text-xs leading-relaxed text-neutral-500 sm:text-[13px]">{summaryText}</p>

        {hasExpandableContent ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              className="group inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-600"
              aria-expanded={detailsOpen}
            >
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${detailsOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
              {detailsOpen ? 'Skjul detaljer' : 'Vis detaljer'}
            </button>

            {detailsOpen ? (
              <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50/40 px-4 py-4 sm:px-5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  {details.invoice_count} {details.invoice_count === 1 ? 'faktura' : 'fakturaer'}
                </p>

                {details.invoices.length > 0 ? (
                  <ul className="mt-2 border-t border-neutral-100/80 pt-1">
                    {details.invoices.map((inv, i) => (
                      <InvoiceRow key={`${inv.name}-${i}`} inv={inv} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-neutral-500">Ingen fakturaer i listen.</p>
                )}

                <div className="mt-5 space-y-2 border-t border-neutral-100 pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-neutral-500">Moms skyldig</span>
                    <span className="tabular-nums font-medium text-neutral-800">
                      {formatCurrencyDk(details.obligations_components.vat_due)}
                    </span>
                  </div>
                  {details.obligations_components.payroll_due > 0 ? (
                    <div className="flex justify-between gap-4">
                      <span className="text-neutral-500">Løn / afholdt</span>
                      <span className="tabular-nums font-medium text-neutral-800">
                        {formatCurrencyDk(details.obligations_components.payroll_due)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
