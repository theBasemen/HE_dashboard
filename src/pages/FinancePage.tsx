import { useState, useEffect } from 'react'
import { Award, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Calculator, X } from 'lucide-react'
import { fetchFinanceData, FinanceSnapshot, fetchFinanceRoadmap2026, FinanceRoadmap2026 } from '../services/api'
import YearlyOverview from '../components/YearlyOverview'
import FinanceRoadmap2026Component from '../components/FinanceRoadmap2026'
import ProjectStatistics from '../components/ProjectStatistics'

// FinancePage component - displays executive overview and yearly financial data
export default function FinancePage() {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null)
  const [roadmap2026, setRoadmap2026] = useState<FinanceRoadmap2026[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Scenario override values
  const [overrideExpectedRevenue2026, setOverrideExpectedRevenue2026] = useState<string>('')
  const [overrideBreakEven, setOverrideBreakEven] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [financeData, roadmapData] = await Promise.all([
          fetchFinanceData(),
          fetchFinanceRoadmap2026()
        ])
        if (!financeData) {
          setError('Ingen data tilgængelig')
        } else {
          setSnapshot(financeData)
        }
        setRoadmap2026(roadmapData)
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
  // Based on net liquidity, expected 2026 turnover, and average monthly burn rate from first 11 months of 2025
  // Can use override values for scenario planning
  const calculateRunway = (): { actual: number | null, scenario: number | null } => {
    if (!snapshot || !snapshot.history || snapshot.history.length === 0) return { actual: null, scenario: null }
    
    const netLiquidity = snapshot.net_liquidity || 0
    if (netLiquidity <= 0) return { actual: 0, scenario: 0 } // Already out of cash
    
    // Get the last 11 months (assuming they are from 2025)
    // History is ordered chronologically, so last 11 should be most recent
    const last11Months = snapshot.history.slice(-11)
    
    if (last11Months.length === 0) return { actual: null, scenario: null }
    
    // Sum all fixed costs from last 11 months
    const totalFixedCosts = last11Months.reduce((sum, item) => 
      sum + (item.fixed_costs || 0), 0)
    
    // Sum all variable costs from last 11 months
    const totalVariableCosts = last11Months.reduce((sum, item) => 
      sum + (item.variable_costs || 0), 0)
    
    // Sum all revenue from last 11 months
    const totalRevenue = last11Months.reduce((sum, item) => 
      sum + (item.revenue || 0), 0)
    
    // Get actual break-even point from roadmap (if available)
    const actualBreakEven = roadmap2026.length > 0 ? (roadmap2026[0].break_even_point || 0) : 0
    
    // Calculate average monthly costs (regardless of revenue)
    // This represents what the company spends per month
    const avgMonthlyCosts = (totalFixedCosts + totalVariableCosts) / last11Months.length
    
    // Calculate average monthly revenue
    const avgMonthlyRevenue = totalRevenue / last11Months.length
    
    // Calculate net burn rate (costs - revenue)
    // Negative = making money, Positive = burning cash
    const netBurnRate = avgMonthlyCosts - avgMonthlyRevenue
    
    // Calculate total expected turnover for 2026
    const totalExpectedTurnover2026 = roadmap2026.reduce((sum, item) => 
      sum + (item.expected_turnover || 0), 0)
    
    // Total available cash = current net liquidity + expected 2026 turnover
    const totalAvailableCash = netLiquidity + totalExpectedTurnover2026
    
    // Calculate actual runway
    let actualRunway: number | null = null
    if (netBurnRate <= 0) {
      // Company is profitable, but calculate runway if revenue stopped
      actualRunway = Math.floor(totalAvailableCash / avgMonthlyCosts)
    } else {
      // Company is burning cash, use net burn rate
      actualRunway = Math.floor(totalAvailableCash / netBurnRate)
    }
    
    // Calculate scenario runway if override values are set
    let scenarioRunway: number | null = null
    const overrideRevenue2026 = overrideExpectedRevenue2026 ? parseFloat(overrideExpectedRevenue2026) : null
    const overrideBreakEvenValue = overrideBreakEven ? parseFloat(overrideBreakEven) : null
    
    if (overrideRevenue2026 !== null || overrideBreakEvenValue !== null) {
      // If break-even override is set, adjust monthly costs
      // Break-even is monthly fixed costs, so we need to adjust avgMonthlyCosts
      let scenarioAvgMonthlyCosts = avgMonthlyCosts
      if (overrideBreakEvenValue !== null && actualBreakEven > 0) {
        // Adjust monthly costs by the difference in break-even
        const breakEvenDifference = overrideBreakEvenValue - actualBreakEven
        scenarioAvgMonthlyCosts = avgMonthlyCosts + breakEvenDifference
      }
      
      // Calculate scenario burn rate based on break-even change
      let scenarioBurnRate = netBurnRate
      if (overrideBreakEvenValue !== null) {
        // Adjust burn rate based on break-even change
        scenarioBurnRate = scenarioAvgMonthlyCosts - avgMonthlyRevenue
      }
      
      const scenarioRevenue2026 = overrideRevenue2026 !== null ? overrideRevenue2026 : totalExpectedTurnover2026
      const scenarioAvailableCash = netLiquidity + scenarioRevenue2026
      
      if (scenarioBurnRate <= 0) {
        scenarioRunway = Math.floor(scenarioAvailableCash / scenarioAvgMonthlyCosts)
      } else {
        scenarioRunway = Math.floor(scenarioAvailableCash / scenarioBurnRate)
      }
    }
    
    return { actual: actualRunway, scenario: scenarioRunway }
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
  const runwayData = calculateRunway()
  const runway = runwayData.actual
  const scenarioRunway = runwayData.scenario

  // Calculate 2026 metrics from roadmap
  // Apply override values if set
  const overrideBreakEvenValue = overrideBreakEven && overrideBreakEven.trim() !== '' 
    ? parseFloat(overrideBreakEven) 
    : null
  const overrideRevenue2026Value = overrideExpectedRevenue2026 && overrideExpectedRevenue2026.trim() !== ''
    ? parseFloat(overrideExpectedRevenue2026)
    : null
  
  // Calculate actual totals from roadmap
  const actualTotalRevenue2026 = roadmap2026.reduce((sum, item) => sum + (item.expected_turnover || 0), 0)
  const totalVariableCosts2026 = roadmap2026.reduce((sum, item) => sum + (item.expected_costs || 0), 0)
  
  // Use override revenue if set, otherwise use actual
  const totalRevenue2026 = overrideRevenue2026Value !== null 
    ? overrideRevenue2026Value
    : actualTotalRevenue2026
  
  // Calculate revenue scaling factor if override is set
  const revenueScaleFactor = overrideRevenue2026Value !== null && actualTotalRevenue2026 > 0
    ? overrideRevenue2026Value / actualTotalRevenue2026
    : 1
  
  // Calculate total result with overrides applied
  const totalResult2026 = roadmap2026.reduce((sum, item) => {
    const breakEvenToUse = overrideBreakEvenValue !== null 
      ? overrideBreakEvenValue 
      : (item.break_even_point || 0)
    // Scale revenue if override is set
    const revenueToUse = (item.expected_turnover || 0) * revenueScaleFactor
    return sum + (revenueToUse - (item.expected_costs || 0) - breakEvenToUse)
  }, 0)
  
  // Calculate 2026 gross margin (coverage ratio)
  const grossMargin2026 = totalRevenue2026 > 0 
    ? ((totalRevenue2026 - totalVariableCosts2026) / totalRevenue2026) * 100 
    : 0
  
  // Calculate 2026 profit margin
  const profitMargin2026 = totalRevenue2026 > 0 
    ? (totalResult2026 / totalRevenue2026) * 100 
    : 0

  // Check if any override values are set that affect these metrics
  const hasRevenueOverride = overrideExpectedRevenue2026 && overrideExpectedRevenue2026.trim() !== ''
  const hasBreakEvenOverride = overrideBreakEven && overrideBreakEven.trim() !== ''
  const hasScenarioOverrides = hasRevenueOverride || hasBreakEvenOverride

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Zone B: Liquidity Engine (Net Liquidity) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full overflow-visible">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Likviditetsberedskab</h2>
            <p className="text-xs text-gray-600">Kritisk overlevelsesmetrik</p>
          </div>

          {/* Calculation Layout */}
          <div className="space-y-3 mb-4 flex-1 relative overflow-visible pb-8">
            {/* Likviditet (Bank) */}
            <div className="group relative flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 min-h-[52px]">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-xs text-gray-700 font-medium">Likviditet</span>
              </div>
              <span className="text-xl font-bold text-green-700">
                {formatCurrency(snapshot.cash_on_hand)}
              </span>
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap pointer-events-none">
                <div className="font-semibold mb-1">Likviditet</div>
                <div className="text-gray-300">Kontant: {formatCurrency(snapshot.cash_on_hand)}</div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>

            {/* Debitorer */}
            <div className="group relative flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 min-h-[52px]">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-xs text-gray-700 font-medium">Debitorer</span>
              </div>
              <span className="text-xl font-bold text-green-700">
                + {formatCurrency(snapshot.receivables)}
              </span>
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap pointer-events-none">
                <div className="font-semibold mb-1">Debitorer</div>
                <div className="text-gray-300">Udestående: {formatCurrency(snapshot.receivables)}</div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>

            {/* Kortfristet Gæld & Moms */}
            <div className="group relative flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200 min-h-[52px]">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span className="text-xs text-gray-700 font-medium">Gæld & Moms</span>
              </div>
              <span className="text-xl font-bold text-red-700">
                - {formatCurrency((snapshot.short_term_debt || 0) + (snapshot.vat_due || 0))}
              </span>
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded px-3 py-2 pointer-events-none min-w-[200px]">
                <div className="font-semibold mb-2">Gæld & Moms</div>
                <div className="space-y-1 text-gray-300">
                  <div className="flex justify-between">
                    <span>Kortfristet gæld:</span>
                    <span className="ml-2">{formatCurrency(snapshot.short_term_debt || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Moms skyldig:</span>
                    <span className="ml-2">{formatCurrency(snapshot.vat_due || 0)}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-1 mt-1 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="ml-2">{formatCurrency((snapshot.short_term_debt || 0) + (snapshot.vat_due || 0))}</span>
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full overflow-visible">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Driftsmæssig Sundhed</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 flex-1 relative overflow-visible pb-8">
            {/* Omsætning (2026) */}
            <div className={`group relative rounded-lg border p-3 flex items-center justify-between min-h-[52px] ${
              hasRevenueOverride
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <p className="text-xs font-medium text-gray-600">
                Omsætning (2026) {hasRevenueOverride && <span className="text-blue-600">(scenarie)</span>}
              </p>
              <p className={`text-xl font-bold ${
                hasRevenueOverride ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {formatNumber(totalRevenue2026 / 1000000)} mio. kr.
              </p>
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded px-3 py-2 pointer-events-none min-w-[200px]">
                <div className="font-semibold mb-2">Omsætning (2026)</div>
                <div className="text-gray-300 space-y-1">
                  <div>Forventet omsætning for hele 2026</div>
                  <div className="border-t border-gray-700 pt-1 mt-1">
                    <div className="flex justify-between">
                      <span>Total omsætning:</span>
                      <span className="ml-2 font-semibold">{formatCurrency(totalRevenue2026)}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">Baseret på roadmap 2026</div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>

            {/* Dækningsgrad (2026) */}
            <div className={`group relative rounded-lg border p-3 flex items-center justify-between min-h-[52px] ${
              hasRevenueOverride
                ? 'bg-blue-50 border-blue-200'
                : grossMargin2026 > 50
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2">
                <p className="text-xs font-medium text-gray-600">
                  Dækningsgrad (2026) {hasRevenueOverride && <span className="text-blue-600">(scenarie)</span>}
                </p>
                {hasRevenueOverride ? (
                  <CheckCircle2 className="h-3 w-3 text-blue-600" />
                ) : grossMargin2026 > 50 && (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                )}
              </div>
              <p className={`text-xl font-bold ${
                hasRevenueOverride ? 'text-blue-700' : grossMargin2026 > 50 ? 'text-green-700' : 'text-gray-900'
              }`}>
                {formatNumber(grossMargin2026)}%
              </p>
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded px-3 py-2 pointer-events-none min-w-[220px]">
                <div className="font-semibold mb-2">Dækningsgrad (2026)</div>
                <div className="text-gray-300 space-y-1">
                  <div>Beregning:</div>
                  <div className="text-[10px]">(Omsætning - Variable omkostninger) / Omsætning × 100</div>
                  <div className="border-t border-gray-700 pt-1 mt-1">
                    <div className="flex justify-between">
                      <span>Total omsætning:</span>
                      <span className="ml-2">{formatCurrency(totalRevenue2026)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Variable omkostninger:</span>
                      <span className="ml-2">{formatCurrency(totalVariableCosts2026)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Dækningsgrad:</span>
                      <span className="ml-2">{formatNumber(grossMargin2026)}%</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {grossMargin2026 > 50 ? '✅ God dækningsgrad' : '⚠️ Lav dækningsgrad'}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">Baseret på roadmap 2026</div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>

            {/* Overskudsgrad (2026) */}
            <div className={`group relative rounded-lg border p-3 flex items-center justify-between min-h-[52px] ${
              hasScenarioOverrides
                ? 'bg-blue-50 border-blue-200'
                : profitMargin2026 > 10
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2">
                <p className="text-xs font-medium text-gray-600">
                  Overskudsgrad (2026) {hasScenarioOverrides && <span className="text-blue-600">(scenarie)</span>}
                </p>
                {hasScenarioOverrides ? (
                  <CheckCircle2 className="h-3 w-3 text-blue-600" />
                ) : profitMargin2026 > 10 && (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                )}
              </div>
              <p className={`text-xl font-bold ${
                hasScenarioOverrides ? 'text-blue-700' : profitMargin2026 > 10 ? 'text-green-700' : 'text-gray-900'
              }`}>
                {formatNumber(profitMargin2026)}%
              </p>
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded px-3 py-2 pointer-events-none min-w-[220px]">
                <div className="font-semibold mb-2">Overskudsgrad (2026)</div>
                <div className="text-gray-300 space-y-1">
                  <div>Beregning:</div>
                  <div className="text-[10px]">Resultat / Omsætning × 100</div>
                  <div className="border-t border-gray-700 pt-1 mt-1">
                    <div className="flex justify-between">
                      <span>Total omsætning:</span>
                      <span className="ml-2">{formatCurrency(totalRevenue2026)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total resultat:</span>
                      <span className="ml-2">{formatCurrency(totalResult2026)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Overskudsgrad:</span>
                      <span className="ml-2">{formatNumber(profitMargin2026)}%</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {profitMargin2026 > 10 ? '✅ God overskudsgrad' : '⚠️ Lav overskudsgrad'}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">Baseret på roadmap 2026</div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>

            {/* Soliditet */}
            <div className="group relative bg-gray-50 rounded-lg border border-gray-200 p-3 flex items-center justify-between min-h-[52px]">
              <div>
                <p className="text-xs font-medium text-gray-600">Soliditet</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Egenkapital / (Egenkapital + Gæld)
                </p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {solidity !== null ? `${formatNumber(solidity)}%` : 'N/A'}
              </p>
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded px-3 py-2 pointer-events-none min-w-[240px]">
                <div className="font-semibold mb-2">Soliditet</div>
                <div className="text-gray-300 space-y-1">
                  <div className="text-[10px] mb-2">Egenkapital / (Egenkapital + Kortfristet gæld + Forpligtelser) × 100</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Egenkapital:</span>
                      <span className="ml-2">{formatCurrency(snapshot.equity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kortfristet gæld:</span>
                      <span className="ml-2">{formatCurrency(snapshot.short_term_debt || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Forpligtelser:</span>
                      <span className="ml-2">{formatCurrency(snapshot.provisions || 0)}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 pt-1 mt-1">
                    <div className="flex justify-between font-semibold">
                      <span>Soliditet:</span>
                      <span className="ml-2">{solidity !== null ? `${formatNumber(solidity)}%` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>

            {/* Runway - Months until cash runs out */}
            <div className={`group relative rounded-lg border p-3 flex items-center justify-between min-h-[52px] ${
              (scenarioRunway !== null ? scenarioRunway : runway) !== null && (scenarioRunway !== null ? scenarioRunway : runway)! < 6
                ? 'bg-red-50 border-red-200'
                : (scenarioRunway !== null ? scenarioRunway : runway) !== null && (scenarioRunway !== null ? scenarioRunway : runway)! < 12
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Runway {scenarioRunway !== null && <span className="text-blue-600">(scenarie)</span>}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  2025 burn-rate
                </p>
              </div>
              <div className="text-right">
                {scenarioRunway !== null && (
                  <p className={`text-lg font-bold ${
                    scenarioRunway < 6
                      ? 'text-red-700'
                      : scenarioRunway < 12
                      ? 'text-yellow-700'
                      : 'text-blue-700'
                  }`}>
                    {scenarioRunway} mdr.
                  </p>
                )}
                <p className={`text-xl font-bold ${scenarioRunway !== null ? 'text-xs text-gray-500 line-through' : ''} ${
                  runway !== null && runway < 6
                    ? 'text-red-700'
                    : runway !== null && runway < 12
                    ? 'text-yellow-700'
                    : 'text-blue-700'
                }`}>
                  {runway !== null ? `${runway} mdr.` : 'N/A'}
                </p>
              </div>
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded px-3 py-2 pointer-events-none min-w-[260px]">
                <div className="font-semibold mb-2">
                  Runway {scenarioRunway !== null && <span className="text-blue-400">(scenarie)</span>}
                </div>
                <div className="text-gray-300 space-y-1">
                  <div className="text-[10px] mb-2">Måneder indtil kontanter løber tør</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Netto likviditet:</span>
                      <span className="ml-2">{formatCurrency(netLiquidity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Forventet omsætning 2026:</span>
                      <span className="ml-2">
                        {overrideExpectedRevenue2026 
                          ? <><span className="text-blue-400">{formatCurrency(parseFloat(overrideExpectedRevenue2026))}</span> <span className="text-gray-500 line-through text-[10px]">({formatCurrency(roadmap2026.reduce((sum, item) => sum + (item.expected_turnover || 0), 0))})</span></>
                          : formatCurrency(roadmap2026.reduce((sum, item) => sum + (item.expected_turnover || 0), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gns. månedlig netto cash flow:</span>
                      <span className="ml-2">
                        {(() => {
                          const actualNetBurnRate = snapshot.history && snapshot.history.length >= 11
                            ? (snapshot.history.slice(-11).reduce((sum, item) => sum + (item.fixed_costs || 0) + (item.variable_costs || 0), 0) -
                               snapshot.history.slice(-11).reduce((sum, item) => sum + (item.revenue || 0), 0)) / 11
                            : null
                          
                          if (actualNetBurnRate !== null) {
                            return actualNetBurnRate < 0
                              ? `Tjener ${formatCurrency(Math.abs(actualNetBurnRate))}`
                              : actualNetBurnRate > 0
                              ? `Brænder ${formatCurrency(actualNetBurnRate)}`
                              : 'Break-even'
                          } else {
                            return 'N/A'
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 pt-1 mt-1">
                    {scenarioRunway !== null && (
                      <div className="flex justify-between font-semibold text-blue-400 mb-1">
                        <span>Scenarie runway:</span>
                        <span className="ml-2">{scenarioRunway} mdr.</span>
                      </div>
                    )}
                    <div className={`flex justify-between font-semibold ${scenarioRunway !== null ? 'text-gray-500 line-through text-[10px]' : ''}`}>
                      <span>Runway:</span>
                      <span className="ml-2">{runway !== null ? `${runway} mdr.` : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {scenarioRunway !== null 
                      ? 'Baseret på override-værdier'
                      : 'Baseret på sidste 11 måneders gennemsnitlige burn-rate'}
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Scenario Override Panel */}
        <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-6 flex flex-col h-full">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Scenarieberegning</h2>
              </div>
              {(overrideExpectedRevenue2026 || overrideBreakEven) && (
                <button
                  onClick={() => {
                    setOverrideExpectedRevenue2026('')
                    setOverrideBreakEven('')
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-blue-100 rounded transition-colors"
                  title="Nulstil alle værdier"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-600">Override-værdier for scenarieberegning</p>
          </div>

          <div className="space-y-4 flex-1">
            {/* Expected Revenue 2026 Override */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Forventet omsætning 2026
              </label>
              <input
                type="number"
                value={overrideExpectedRevenue2026}
                onChange={(e) => setOverrideExpectedRevenue2026(e.target.value)}
                placeholder={Math.round(roadmap2026.reduce((sum, item) => sum + (item.expected_turnover || 0), 0)).toString()}
                className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Faktisk: {formatCurrency(roadmap2026.reduce((sum, item) => sum + (item.expected_turnover || 0), 0))}
              </p>
            </div>

            {/* Break-even Level Override */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Break-even niveau (månedlig)
              </label>
              <input
                type="number"
                value={overrideBreakEven}
                onChange={(e) => setOverrideBreakEven(e.target.value)}
                placeholder={roadmap2026.length > 0 && roadmap2026[0].break_even_point 
                  ? Math.round(roadmap2026[0].break_even_point).toString()
                  : '0'}
                className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Faktisk: {roadmap2026.length > 0 && roadmap2026[0].break_even_point 
                  ? formatCurrency(roadmap2026[0].break_even_point)
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Info box */}
          <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-700">
              <strong>Tip:</strong> Indtast override-værdier for at se hvordan fremtiden ser ud med alternative scenarier.
            </p>
          </div>
        </div>
      </div>

      {/* Finance Roadmap 2026 */}
      <FinanceRoadmap2026Component overrideBreakEven={overrideBreakEven ? parseFloat(overrideBreakEven) : null} />

      {/* Project Statistics */}
      <ProjectStatistics />

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
