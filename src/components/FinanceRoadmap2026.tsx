import { useState, useEffect } from 'react'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, Wallet, PiggyBank } from 'lucide-react'
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value)
  }

  // Format month name to short form (e.g., "January 2026" -> "Jan")
  const formatMonthName = (monthName: string): string => {
    const monthMap: { [key: string]: string } = {
      'January': 'Jan',
      'February': 'Feb',
      'March': 'Mar',
      'April': 'Apr',
      'May': 'Maj',
      'June': 'Jun',
      'July': 'Jul',
      'August': 'Aug',
      'September': 'Sep',
      'October': 'Okt',
      'November': 'Nov',
      'December': 'Dec',
    }
    
    const parts = monthName.split(' ')
    const month = parts[0]
    return monthMap[month] || month.substring(0, 3)
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
      }
    },
    { totalTurnover: 0, totalCosts: 0, totalResult: 0 }
  )

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

  // Prepare chart data with calculated area between budget and break-even
  const chartData = completeData.map(item => ({
    ...item,
    // Calculate the area between budget_target and break_even_point
    // We'll use the minimum as base and difference as height
    budget_zone_base: Math.min(item.budget_target || 0, item.break_even_point || 0),
    budget_zone_height: Math.abs((item.budget_target || 0) - (item.break_even_point || 0)),
  }))

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
      {/* Section Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Finansiel Roadmap 2026</h2>
        <p className="mt-1 text-sm text-gray-600">Forventet omsætning, udgifter og resultat for hele året</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Forventet Omsætning */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Forventet Omsætning</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {formatNumber(totals.totalTurnover / 1000000)} mio. kr.
              </p>
              <p className="mt-1 text-xs text-gray-500">2026</p>
            </div>
            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Forventede Variable Udgifter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Forventede Variable Udgifter</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {formatNumber(totals.totalCosts / 1000000)} mio. kr.
              </p>
              <p className="mt-1 text-xs text-gray-500">2026</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Wallet className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Forventet Resultat */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Forventet Resultat</p>
              <p className={`mt-2 text-3xl font-bold ${
                totals.totalResult >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatNumber(totals.totalResult / 1000000)} mio. kr.
              </p>
              <p className="mt-1 text-xs text-gray-500">2026</p>
            </div>
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
              totals.totalResult >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <PiggyBank className={`h-6 w-6 ${
                totals.totalResult >= 0 ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900">Månedlig Oversigt</h3>
          <p className="mt-1 text-sm text-gray-600">Forventet resultat, budgetmål og break-even punkt</p>
        </div>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
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
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => {
                  if (value === 'expected_result') return 'Forventet Resultat'
                  if (value === 'budget_target') return 'Budget'
                  if (value === 'break_even_point') return 'Break Even'
                  return value
                }}
              />
              <defs>
                <linearGradient id="colorExpectedResult" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d1d5db" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#d1d5db" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
              
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
              
              {/* Area with gradient fill for expected result */}
              <Area
                type="monotone"
                dataKey="expected_result"
                stroke="#d1d5db"
                strokeWidth={3}
                fill="url(#colorExpectedResult)"
                dot={{ fill: '#d1d5db', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

