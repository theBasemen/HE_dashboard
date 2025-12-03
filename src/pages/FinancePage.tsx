import { useState, useEffect } from 'react'
import { Award, DollarSign, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { fetchFinanceData, FinanceSnapshot } from '../services/api'
import YearlyOverview from '../components/YearlyOverview'

// FinancePage component - displays executive overview and yearly financial data
export default function FinancePage() {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchFinanceData()
        if (!data) {
          setError('Ingen data tilgængelig')
        } else {
          setSnapshot(data)
        }
      } catch (err) {
        console.error('Failed to fetch finance data:', err)
        setError('Fejl ved indlæsning af data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0 kr.'
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0'
    return new Intl.NumberFormat('da-DK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value)
  }

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Ukendt'
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch {
      return 'Ukendt'
    }
  }

  // Calculate solidity (equity / (equity + short_term_debt + provisions)) * 100
  const calculateSolidity = (): number | null => {
    if (!snapshot) return null
    const { equity, short_term_debt, provisions } = snapshot
    const totalAssets = equity + short_term_debt + provisions
    if (totalAssets === 0) return null
    return (equity / totalAssets) * 100
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-9 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded w-96 mt-2 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error or empty state
  if (error || !snapshot) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Økonomi & Likviditet</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center space-x-3 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <p className="text-lg">{error || 'Ingen finansielle data tilgængelig'}</p>
          </div>
          <p className="mt-2 text-gray-600">
            Data opdateres dagligt kl. 06:00. Prøv igen senere.
          </p>
        </div>
      </div>
    )
  }

  const solidity = calculateSolidity()
  const netLiquidity = snapshot.net_liquidity || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Økonomi & Likviditet</h1>
        <p className="mt-2 text-gray-600">
          Ledelsesoversigt af virksomhedens økonomiske nøgletal
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Data opdateret: {formatDate(snapshot.created_at)}
        </p>
      </div>

      {/* Zone B: Liquidity Engine (Net Liquidity) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Likviditetsberedskab</h2>
          <p className="text-sm text-gray-600">Kritisk overlevelsesmetrik</p>
        </div>

        {/* Calculation Layout */}
        <div className="space-y-4 mb-6">
          {/* Likviditet (Bank) */}
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-gray-700 font-medium">Likviditet (Bank)</span>
            </div>
            <span className="text-xl font-bold text-green-700">
              {formatCurrency(snapshot.cash_on_hand)}
            </span>
          </div>

          {/* Debitorer */}
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-gray-700 font-medium">Debitorer (Udestående)</span>
            </div>
            <span className="text-xl font-bold text-green-700">
              + {formatCurrency(snapshot.receivables)}
            </span>
          </div>

          {/* Kortfristet Gæld & Moms */}
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-gray-700 font-medium">Kortfristet Gæld & Moms</span>
            </div>
            <span className="text-xl font-bold text-red-700">
              - {formatCurrency((snapshot.short_term_debt || 0) + (snapshot.vat_due || 0))}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-300 my-4"></div>

          {/* Net Liquidity Result */}
          <div className={`flex items-center justify-between p-6 rounded-lg border-2 ${
            netLiquidity >= 0 
              ? 'bg-green-50 border-green-300' 
              : 'bg-red-50 border-red-300'
          }`}>
            <span className="text-2xl font-bold text-gray-900">Likviditetsberedskab</span>
            <span className={`text-4xl font-bold ${
              netLiquidity >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {formatCurrency(netLiquidity)}
            </span>
          </div>
        </div>

        {/* Visual: Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Aktiver</span>
            <span>Passiver</span>
          </div>
          <div className="h-8 bg-gray-200 rounded-full overflow-hidden flex">
            <div 
              className="bg-green-500 h-full flex items-center justify-end pr-2"
              style={{ 
                width: `${Math.min(100, Math.max(0, ((snapshot.cash_on_hand + (snapshot.receivables || 0)) / Math.max(1, (snapshot.cash_on_hand + (snapshot.receivables || 0) + Math.abs(netLiquidity)))) * 100))}%` 
              }}
            >
              {netLiquidity >= 0 && (
                <span className="text-xs font-semibold text-white">Buffer</span>
              )}
            </div>
            {netLiquidity < 0 && (
              <div 
                className="bg-red-500 h-full flex items-center pl-2"
                style={{ 
                  width: `${Math.min(100, Math.abs(netLiquidity) / Math.max(1, snapshot.cash_on_hand + (snapshot.receivables || 0)) * 100)}%` 
                }}
              >
                <span className="text-xs font-semibold text-white">Underskud</span>
              </div>
            )}
          </div>
          <div className="mt-3 text-sm text-gray-600 space-y-1">
            <p>
              Denne visualisering viser forholdet mellem aktiver (likviditet + debitorer) og passiver (kortfristet gæld + moms).
            </p>
            <p>
              Den grønne del repræsenterer din likviditetsbuffer - det beløb du har til rådighed efter alle kortsigtede forpligtelser er betalt. 
              Jo større buffer, jo bedre er din finansielle fleksibilitet.
            </p>
            {netLiquidity < 0 && (
              <p className="text-red-600 font-medium">
                Den røde del viser et underskud, hvilket betyder at dine kortsigtede forpligtelser overstiger dine tilgængelige aktiver.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Zone C: Operational Health (KPI Grid) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Driftsmæssig Sundhed</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Omsætning (LTM) */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Omsætning (LTM)</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatNumber(snapshot.revenue_ltm / 1000000)} mio. kr.
            </p>
          </div>

          {/* Dækningsgrad */}
          <div className={`rounded-lg border p-6 ${
            (snapshot.gross_margin_pct || 0) > 50
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Dækningsgrad</p>
              {(snapshot.gross_margin_pct || 0) > 50 && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
            </div>
            <p className={`text-3xl font-bold ${
              (snapshot.gross_margin_pct || 0) > 50 ? 'text-green-700' : 'text-gray-900'
            }`}>
              {formatNumber(snapshot.gross_margin_pct)}%
            </p>
          </div>

          {/* Overskudsgrad */}
          <div className={`rounded-lg border p-6 ${
            (snapshot.profit_margin_pct || 0) > 10
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Overskudsgrad</p>
              {(snapshot.profit_margin_pct || 0) > 10 && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
            </div>
            <p className={`text-3xl font-bold ${
              (snapshot.profit_margin_pct || 0) > 10 ? 'text-green-700' : 'text-gray-900'
            }`}>
              {formatNumber(snapshot.profit_margin_pct)}%
            </p>
          </div>

          {/* Soliditet */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Soliditet</p>
            <p className="text-3xl font-bold text-gray-900">
              {solidity !== null ? `${formatNumber(solidity)}%` : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Egenkapital / (Egenkapital + Gæld)
            </p>
          </div>
        </div>
      </div>

      {/* Yearly Financial Overview */}
      <YearlyOverview history={snapshot.history || []} />

      {/* Zone A: Enterprise Value (Moved to bottom, less prominent) */}
      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow-sm border border-yellow-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-3">
              <Award className="h-5 w-5 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-900">Virksomhedsværdi</h2>
            </div>
            <p className="text-xs text-gray-700 mb-4">Estimeret virksomhedsværdi</p>
            
            {/* Main Valuation Range */}
            <div className="mb-4">
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(snapshot.valuation_low / 1000000)} mio. - {formatNumber(snapshot.valuation_high / 1000000)} mio. DKK
              </p>
            </div>

            {/* Method Badge */}
            <div className="flex items-center space-x-3 mb-4">
              <span className="px-3 py-1 bg-yellow-200 text-yellow-900 text-xs font-medium rounded-full">
                Metode: 3x-5x EBITDA
              </span>
            </div>

            {/* EBITDA Context */}
            <div className="bg-white/70 rounded-lg p-3 border border-yellow-200">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Driftsresultat (EBITDA LTM):</span>{' '}
                {formatCurrency(snapshot.ebitda_ltm)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Baseret på sidste 12 måneders driftsresultat. Standard værdiansættelse for sunde servicevirksomheder.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
