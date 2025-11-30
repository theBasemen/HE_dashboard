import { useState, useMemo, useEffect } from 'react'
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, Legend } from 'recharts'
import { DollarSign, Receipt, Calendar, TrendingUp, Award } from 'lucide-react'
import { fetchFinanceData, LiquidityDataPoint, FinanceData } from '../services/api'

// Constants for hiring scenario
const MONTHLY_HIRE_COST = 21000 * 1.45 // 1x Deltid a 21k + 45% omkostninger = 30,450 kr/måned
const HIRING_START_DATE = new Date(2025, 11, 1) // 1. december 2025 (month is 0-indexed, so 11 = December)

export default function FinancePage() {
  const [includeHiring, setIncludeHiring] = useState(false)
  const [financeData, setFinanceData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const data = await fetchFinanceData()
        setFinanceData(data)
      } catch (error) {
        console.error('Failed to fetch finance data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Calculate scenario with hiring costs (cumulative)
  const calculateScenarioWithHiring = useMemo(() => {
    if (!financeData) return []

    const projection = [...financeData.liquidityProjection]
    const result: LiquidityDataPoint[] = []
    let monthsSinceStart = 0

    projection.forEach((point) => {
      // Check if this month is on or after the hiring start date
      const pointDate = point.date
      const isAfterHiringStart = pointDate >= HIRING_START_DATE

      let calculatedLiquidity: number

      if (isAfterHiringStart) {
        // Count months since start (cumulative)
        monthsSinceStart++
        // Subtract cumulative cost: monthsSinceStart * MONTHLY_HIRE_COST from base projection
        calculatedLiquidity = point.liquidity - (monthsSinceStart * MONTHLY_HIRE_COST)
      } else {
        // Before hiring starts, use original projection
        calculatedLiquidity = point.liquidity
      }

      result.push({
        ...point,
        liquidity: Math.round(calculatedLiquidity)
      })
    })

    return result
  }, [financeData])

  // Select chart data based on toggle state
  const chartData = useMemo(() => {
    if (!financeData) return []
    return includeHiring ? calculateScenarioWithHiring : financeData.liquidityProjection
  }, [financeData, includeHiring, calculateScenarioWithHiring])

  // Transform data to separate positive and negative values for chart visualization
  const transformedData = useMemo(() => {
    return chartData.map((point) => ({
      ...point,
      positive: point.liquidity >= 0 ? point.liquidity : null,
      negative: point.liquidity < 0 ? point.liquidity : null,
    }))
  }, [chartData])

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].payload.liquidity
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{payload[0].payload.month}</p>
          <p className={`text-lg font-bold ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(value)}
          </p>
          {includeHiring && payload[0].payload.date >= HIRING_START_DATE && (
            <p className="text-xs text-gray-500 mt-1">
              Inkl. deltidsansættelse (akkumulerende)
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Indlæser data...</div>
      </div>
    )
  }

  if (!financeData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-600">Fejl ved indlæsning af data</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Økonomi & Likviditet</h1>
        <p className="mt-2 text-gray-600">Oversigt over virksomhedens økonomiske nøgletal og likviditetsprognose</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Likviditet Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Likviditet (Bank)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {formatCurrency(financeData.currentLiquidity)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Skyldig Moms Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Skyldig Moms</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {formatCurrency(financeData.owedVAT)}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Receipt className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Runway Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Runway (Måneder)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {financeData.runwayMonths}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Likviditetsudvikling</h2>
            <p className="mt-1 text-sm text-gray-600">24 måneders prognose</p>
          </div>
          
          {/* Scenario Toggle */}
          <div className="mt-4 sm:mt-0">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={includeHiring}
                onChange={(e) => setIncludeHiring(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                Scenarie: 1x Deltid (Start 1. Dec 2025)
              </span>
            </label>
            {includeHiring && (
              <p className="text-xs text-gray-500 mt-1 ml-14">
                {formatCurrency(MONTHLY_HIRE_COST)}/måned (akkumulerende)
              </p>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={transformedData}
              margin={{ top: 10, right: 30, left: 0, bottom: 80 }}
            >
              <defs>
                <linearGradient id="colorLiquidityPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLiquidityNegative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
              <Area
                type="monotone"
                dataKey="positive"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorLiquidityPositive)"
                dot={false}
                activeDot={{ r: 6, fill: '#10b981' }}
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="negative"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#colorLiquidityNegative)"
                dot={false}
                activeDot={{ r: 6, fill: '#ef4444' }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend/Info */}
        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Positiv likviditet</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Negativ likviditet</span>
          </div>
        </div>
      </div>

      {/* Valuation & Performance Section */}
      <div className="space-y-6">
        {/* Valuation Card (Hero Card) */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow-sm border-2 border-yellow-200 p-6 lg:p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <Award className="h-6 w-6 text-yellow-600" />
                <h2 className="text-2xl font-bold text-gray-900">Valuation & Performance</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">Estimeret virksomhedsværdi (Enterprise Value)</p>
              <div className="mb-4">
                <p className="text-4xl font-bold text-gray-900">
                  {financeData.kpis.valuation_low / 1000000} mio. - {financeData.kpis.valuation_high / 1000000} mio. DKK
                </p>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                  Metode: {financeData.kpis.valuation_method}
                </span>
              </div>
              <p className="text-sm text-gray-700">
                Baseret på sidste 12 måneders driftsresultat (EBITDA) på {formatCurrency(financeData.kpis.ebitda_ltm)}. 
                Dette er en standard værdiansættelse for sunde servicevirksomheder.
              </p>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Omsætning (LTM) Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Omsætning (LTM)</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {(financeData.kpis.revenue_ltm / 1000000).toFixed(1)} mio. kr.
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* EBITDA (LTM) Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">EBITDA (LTM)</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {(financeData.kpis.ebitda_ltm / 1000).toFixed(0)} t.kr.
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Overskudsgrad Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overskudsgrad</p>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {financeData.kpis.profit_margin_pct.toFixed(1)}%
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Insight Graphs - 2 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart A: Profitability Overview (Stacked Bar Chart) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">Profitability Overview</h3>
              <p className="mt-1 text-sm text-gray-600">Revenue vs. Costs per måned</p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeData.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'revenue' ? 'Omsætning' : name === 'variable_costs' ? 'Variable omkostninger' : 'Faste omkostninger'
                    ]}
                  />
                  <Legend 
                    formatter={(value) => 
                      value === 'revenue' ? 'Omsætning' : 
                      value === 'variable_costs' ? 'Variable omkostninger' : 
                      'Faste omkostninger'
                    }
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="variable_costs" stackId="costs" fill="#f97316" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="fixed_costs" stackId="costs" fill="#ef4444" radius={[0, 0, 8, 8]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart B: Monthly Result (Bar Chart) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">Månedligt Resultat</h3>
              <p className="mt-1 text-sm text-gray-600">Net resultat (EBITDA) per måned</p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeData.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Resultat']}
                  />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
                  <Bar dataKey="result" radius={[8, 8, 0, 0]}>
                    {financeData.history.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.result >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
