import { useState, useEffect } from 'react'
import { ComposedChart, Line, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { fetchFinanceRoadmap2026, FinanceRoadmap2026 as FinanceRoadmap2026Data } from '../services/api'

export default function FinanceRoadmap2026() {
  const [data, setData] = useState<FinanceRoadmap2026Data[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const roadmapData = await fetchFinanceRoadmap2026()
        setData(roadmapData)
      } catch (err) {
        console.error('Failed to fetch finance roadmap:', err)
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Generate all 12 months for 2026, filling in missing months with empty data
  const allMonths = [
    { month_id: '2026-01', month_name: 'January 2026', month_short: 'Jan' },
    { month_id: '2026-02', month_name: 'February 2026', month_short: 'Feb' },
    { month_id: '2026-03', month_name: 'March 2026', month_short: 'Mar' },
    { month_id: '2026-04', month_name: 'April 2026', month_short: 'Apr' },
    { month_id: '2026-05', month_name: 'May 2026', month_short: 'Maj' },
    { month_id: '2026-06', month_name: 'June 2026', month_short: 'Jun' },
    { month_id: '2026-07', month_name: 'July 2026', month_short: 'Jul' },
    { month_id: '2026-08', month_name: 'August 2026', month_short: 'Aug' },
    { month_id: '2026-09', month_name: 'September 2026', month_short: 'Sep' },
    { month_id: '2026-10', month_name: 'October 2026', month_short: 'Okt' },
    { month_id: '2026-11', month_name: 'November 2026', month_short: 'Nov' },
    { month_id: '2026-12', month_name: 'December 2026', month_short: 'Dec' },
  ]

  // Create a map of existing data by month_id
  const dataMap = new Map(data.map(item => [item.month_id, item]))

  // Merge all months with existing data, filling missing months with zeros
  const completeData = allMonths.map(month => {
    const existingData = dataMap.get(month.month_id)
    if (existingData) {
      return {
        ...existingData,
        month_short: month.month_short,
      }
    }
    // Return empty data for missing months
    return {
      month_id: month.month_id,
      month_name: month.month_name,
      month_short: month.month_short,
      expected_turnover: 0,
      expected_costs: 0,
      expected_result: 0,
      budget_target: 0,
      break_even_point: 0,
      actual_turnover: 0,
      actual_costs: 0,
    }
  })

  // Calculate totals for summary cards (only from months with data)
  // For total result, we need to subtract break_even_point from monthly costs
  const totals = data.reduce(
    (acc, item) => {
      // Calculate monthly result accounting for break-even point
      const monthlyResult = (item.expected_turnover || 0) - (item.expected_costs || 0) - (item.break_even_point || 0)
      
      return {
        totalTurnover: acc.totalTurnover + (item.expected_turnover || 0),
        totalCosts: acc.totalCosts + (item.expected_costs || 0),
        totalResult: acc.totalResult + monthlyResult,
        totalBurnRate: acc.totalBurnRate + (item.expected_costs || 0) + (item.break_even_point || 0), // Total costs including break-even
      }
    },
    { totalTurnover: 0, totalCosts: 0, totalResult: 0, totalBurnRate: 0 }
  )

  // Get break-even point (should be the same for all months, use first available)
  const breakEvenPoint = data.length > 0 ? (data[0].break_even_point || 0) : 0

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const expectedResult = (data.expected_result || 0) - (data.break_even_point || 0)
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {data.month_name}
          </p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'expected_result') {
              return (
                <p key={index} className="text-sm font-semibold text-gray-700">
                  <span className="font-medium">Forventet Dækningsbidrag:</span> {formatCurrency(entry.value)}
                </p>
              )
            } else if (entry.dataKey === 'budget_target') {
              return (
                <p key={index} className="text-sm" style={{ color: '#3b82f6' }}>
                  <span className="font-medium">Budget:</span> {formatCurrency(entry.value)}
                </p>
              )
            } else if (entry.dataKey === 'break_even_point') {
              return (
                <p key={index} className="text-sm" style={{ color: '#ef4444' }}>
                  <span className="font-medium">Break Even:</span> {formatCurrency(entry.value)}
                </p>
              )
            }
            return null
          })}
          {/* Add calculated expected result line */}
          <p className="text-sm font-semibold mt-2 pt-2 border-t border-gray-200">
            <span className="font-medium">Forventet Resultat:</span>{' '}
            <span className={expectedResult >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(expectedResult)}
            </span>
          </p>
        </div>
      )
    }
    return null
  }

  // Prepare chart data
  const chartData = completeData

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  // Error state
  if (error || !data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Finansiel Roadmap 2026</h2>
        <p className="text-gray-600 mb-4">
          {error || 'Ingen roadmap data tilgængelig'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900">Årsoverblik for 2026</h3>
          <p className="mt-1 text-sm text-gray-600">Forventet resultat, budgetmål og break-even punkt</p>
        </div>
        <div className="h-[375px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
              barCategoryGap="15%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month_short" 
                stroke="#6b7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
              
              {/* Bar chart for expected result */}
              <Bar 
                dataKey="expected_result"
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props
                  const value = payload?.expected_result || 0
                  const breakEven = payload?.break_even_point || 0
                  
                  // Color based on break-even comparison, not just positive/negative
                  const isAboveBreakEven = value >= breakEven
                  
                  // For positive bars: y is at the top, height goes down
                  // For negative bars: y is at zero line, height is negative (goes up)
                  const isPositive = value >= 0
                  const barHeight = Math.abs(height)
                  const barY = isPositive ? y : y - barHeight
                  
                  // Radius: [topLeft, topRight, bottomRight, bottomLeft]
                  const radius = isPositive ? [6, 6, 0, 0] : [0, 0, 6, 6]
                  const [topLeft, topRight, bottomRight, bottomLeft] = radius
                  
                  // Create rounded rectangle path
                  const path = `
                    M ${x + topLeft},${barY}
                    L ${x + width - topRight},${barY}
                    Q ${x + width},${barY} ${x + width},${barY + topRight}
                    L ${x + width},${barY + barHeight - bottomRight}
                    Q ${x + width},${barY + barHeight} ${x + width - bottomRight},${barY + barHeight}
                    L ${x + bottomLeft},${barY + barHeight}
                    Q ${x},${barY + barHeight} ${x},${barY + barHeight - bottomLeft}
                    L ${x},${barY + topLeft}
                    Q ${x},${barY} ${x + topLeft},${barY}
                    Z
                  `
                  
                  const fill = isAboveBreakEven ? "url(#colorPositive)" : "url(#colorNegative)"
                  return <path d={path} fill={fill} />
                }}
              >
                {chartData.map((entry, index) => {
                  const value = entry.expected_result || 0
                  const breakEven = entry.break_even_point || 0
                  const isAboveBreakEven = value >= breakEven
                  const fill = isAboveBreakEven ? "url(#colorPositive)" : "url(#colorNegative)"
                  return <Cell key={`cell-${index}`} fill={fill} />
                })}
              </Bar>
              
              {/* Lines for budget and break-even */}
              <Line 
                type="monotone" 
                dataKey="budget_target" 
                stroke="#22c55e" 
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 5, fill: '#22c55e' }}
              />
              <Line 
                type="monotone" 
                dataKey="break_even_point" 
                stroke="#ef4444" 
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 5, fill: '#ef4444' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Cards */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Forventede foreløbige tal for 2026</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Forventet Omsætning */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-xs font-medium text-gray-600 mb-2">Omsætning</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(totals.totalTurnover / 1000000)}
            </p>
            <p className="text-xs text-gray-500 mt-1">mio. kr.</p>
          </div>

          {/* Forventede Variable Udgifter */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-xs font-medium text-gray-600 mb-2">Projekt udgifter</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(totals.totalCosts / 1000000)}
            </p>
            <p className="text-xs text-gray-500 mt-1">mio. kr.</p>
          </div>

          {/* Forventet burn-rate */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-xs font-medium text-gray-600 mb-2">Faste omkostninger</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(breakEvenPoint / 1000000)}
            </p>
            <p className="text-xs text-gray-500 mt-1">mio. kr. / mdr.</p>
          </div>

          {/* Forventet Resultat */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-xs font-medium text-gray-600 mb-2">Forventet Resultat</p>
            <p className={`text-2xl font-bold ${
              totals.totalResult >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatNumber(totals.totalResult / 1000000)}
            </p>
            <p className="text-xs text-gray-500 mt-1">mio. kr.</p>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

