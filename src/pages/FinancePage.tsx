import { useState, useEffect } from 'react'
import { Award, DollarSign, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { fetchFinanceData, FinanceSnapshot } from '../services/api'
import YearlyOverview from '../components/YearlyOverview'
import FinanceRoadmap2026 from '../components/FinanceRoadmap2026'

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

  // Calculate runway (months until cash runs out)
  // Based on net liquidity and average monthly burn rate from first 11 months of 2025
  const calculateRunway = (): number | null => {
    if (!snapshot || !snapshot.history || snapshot.history.length === 0) return null
    
    const netLiquidity = snapshot.net_liquidity || 0
    if (netLiquidity <= 0) return 0 // Already out of cash
    
    // Get the last 11 months (assuming they are from 2025)
    // History is ordered chronologically, so last 11 should be most recent
    const last11Months = snapshot.history.slice(-11)
    
    if (last11Months.length === 0) return null
    
    // Sum all fixed costs from last 11 months
    const totalFixedCosts = last11Months.reduce((sum, item) => 
      sum + (item.fixed_costs || 0), 0)
    
    // Sum all variable costs from last 11 months
    const totalVariableCosts = last11Months.reduce((sum, item) => 
      sum + (item.variable_costs || 0), 0)
    
    // Sum all revenue from last 11 months
    const totalRevenue = last11Months.reduce((sum, item) => 
      sum + (item.revenue || 0), 0)
    
    // Calculate average monthly costs (regardless of revenue)
    // This represents what the company spends per month
    const avgMonthlyCosts = (totalFixedCosts + totalVariableCosts) / last11Months.length
    
    // Calculate average monthly revenue
    const avgMonthlyRevenue = totalRevenue / last11Months.length
    
    // Calculate net burn rate (costs - revenue)
    // Negative = making money, Positive = burning cash
    const netBurnRate = avgMonthlyCosts - avgMonthlyRevenue
    
    // Debug logging
    console.log('Runway Calculation:', {
      monthsUsed: last11Months.length,
      months: last11Months.map(m => m.month),
      totalFixedCosts,
      totalVariableCosts,
      totalRevenue,
      avgMonthlyCosts,
      avgMonthlyRevenue,
      netBurnRate,
      netLiquidity,
      runway: netBurnRate > 0 ? Math.floor(netLiquidity / netBurnRate) : null
    })
    
    // If net burn rate is negative or zero, company is making money
    // Calculate runway based on costs alone (worst case: revenue stops)
    if (netBurnRate <= 0) {
      // Company is profitable, but calculate runway if revenue stopped
      return Math.floor(netLiquidity / avgMonthlyCosts)
    }
    
    // Company is burning cash, use net burn rate
    return Math.floor(netLiquidity / netBurnRate)
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
  const runway = calculateRunway()

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

      {/* Zone B & C: Liquidity Engine and Operational Health Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Zone B: Liquidity Engine (Net Liquidity) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Likviditetsberedskab</h2>
            <p className="text-xs text-gray-600">Kritisk overlevelsesmetrik</p>
          </div>

          {/* Calculation Layout */}
          <div className="space-y-3 mb-4 flex-1">
            {/* Likviditet (Bank) */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 min-h-[52px]">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-xs text-gray-700 font-medium">Likviditet</span>
              </div>
              <span className="text-xl font-bold text-green-700">
                {formatCurrency(snapshot.cash_on_hand)}
              </span>
            </div>

            {/* Debitorer */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 min-h-[52px]">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-xs text-gray-700 font-medium">Debitorer</span>
              </div>
              <span className="text-xl font-bold text-green-700">
                + {formatCurrency(snapshot.receivables)}
              </span>
            </div>

            {/* Kortfristet Gæld & Moms */}
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200 min-h-[52px]">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span className="text-xs text-gray-700 font-medium">Gæld & Moms</span>
              </div>
              <span className="text-xl font-bold text-red-700">
                - {formatCurrency((snapshot.short_term_debt || 0) + (snapshot.vat_due || 0))}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-1"></div>

            {/* Net Liquidity Result */}
            <div className={`flex items-center justify-between p-3 rounded-lg border-2 min-h-[52px] ${
              netLiquidity >= 0 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <span className="text-xs font-medium text-gray-700">Netto</span>
              <span className={`text-xl font-bold ${
                netLiquidity >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {formatCurrency(netLiquidity)}
              </span>
            </div>
          </div>

          {/* Visual: Progress Bar */}
          <div className="mt-3">
            <div className="h-5 bg-gray-200 rounded-full overflow-hidden flex">
              <div 
                className="bg-green-500 h-full flex items-center justify-end pr-1.5"
                style={{ 
                  width: `${Math.min(100, Math.max(0, ((snapshot.cash_on_hand + (snapshot.receivables || 0)) / Math.max(1, (snapshot.cash_on_hand + (snapshot.receivables || 0) + Math.abs(netLiquidity)))) * 100))}%` 
                }}
              >
                {netLiquidity >= 0 && (
                  <span className="text-[10px] font-semibold text-white">Buffer</span>
                )}
              </div>
              {netLiquidity < 0 && (
                <div 
                  className="bg-red-500 h-full flex items-center pl-1.5"
                  style={{ 
                    width: `${Math.min(100, Math.abs(netLiquidity) / Math.max(1, snapshot.cash_on_hand + (snapshot.receivables || 0)) * 100)}%` 
                  }}
                >
                  <span className="text-[10px] font-semibold text-white">Underskud</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zone C: Operational Health (KPI Grid) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Driftsmæssig Sundhed</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 flex-1">
            {/* Omsætning (LTM) */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex items-center justify-between min-h-[52px]">
              <p className="text-xs font-medium text-gray-600">Omsætning (LTM)</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(snapshot.revenue_ltm / 1000000)} mio. kr.
              </p>
            </div>

            {/* Dækningsgrad */}
            <div className={`rounded-lg border p-3 flex items-center justify-between min-h-[52px] ${
              (snapshot.gross_margin_pct || 0) > 50
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2">
                <p className="text-xs font-medium text-gray-600">Dækningsgrad</p>
                {(snapshot.gross_margin_pct || 0) > 50 && (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                )}
              </div>
              <p className={`text-xl font-bold ${
                (snapshot.gross_margin_pct || 0) > 50 ? 'text-green-700' : 'text-gray-900'
              }`}>
                {formatNumber(snapshot.gross_margin_pct)}%
              </p>
            </div>

            {/* Overskudsgrad */}
            <div className={`rounded-lg border p-3 flex items-center justify-between min-h-[52px] ${
              (snapshot.profit_margin_pct || 0) > 10
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2">
                <p className="text-xs font-medium text-gray-600">Overskudsgrad</p>
                {(snapshot.profit_margin_pct || 0) > 10 && (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                )}
              </div>
              <p className={`text-xl font-bold ${
                (snapshot.profit_margin_pct || 0) > 10 ? 'text-green-700' : 'text-gray-900'
              }`}>
                {formatNumber(snapshot.profit_margin_pct)}%
              </p>
            </div>

            {/* Soliditet */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex items-center justify-between min-h-[52px]">
              <div>
                <p className="text-xs font-medium text-gray-600">Soliditet</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Egenkapital / (Egenkapital + Gæld)
                </p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {solidity !== null ? `${formatNumber(solidity)}%` : 'N/A'}
              </p>
            </div>

            {/* Runway - Months until cash runs out */}
            <div className={`rounded-lg border p-3 flex items-center justify-between min-h-[52px] ${
              runway !== null && runway < 6
                ? 'bg-red-50 border-red-200'
                : runway !== null && runway < 12
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div>
                <p className="text-xs font-medium text-gray-600">Runway</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Baseret på gennemsnitlig burnrate i 2025
                </p>
              </div>
              <p className={`text-xl font-bold ${
                runway !== null && runway < 6
                  ? 'text-red-700'
                  : runway !== null && runway < 12
                  ? 'text-yellow-700'
                  : 'text-blue-700'
              }`}>
                {runway !== null ? `${runway} mdr.` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Finance Roadmap 2026 */}
      <FinanceRoadmap2026 />

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
