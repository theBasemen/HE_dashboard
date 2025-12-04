import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { MonthlyHistory } from '../services/api'

interface YearlyOverviewProps {
  history: MonthlyHistory[]
}

export default function YearlyOverview({ history }: YearlyOverviewProps) {
  const [isTableExpanded, setIsTableExpanded] = useState(false)
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

  // Calculate coverage ratio (Dækningsgrad): (Revenue - Variable Costs) / Revenue * 100
  const calculateCoverageRatio = (revenue: number, variableCosts: number): number => {
    if (revenue === 0) return 0
    return ((revenue - variableCosts) / revenue) * 100
  }


  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{payload[0].payload.month}</p>
          <p className={`text-sm font-bold ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span className="font-medium">Resultat:</span> {formatCurrency(value)}
          </p>
        </div>
      )
    }
    return null
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Årlig Økonomisk Oversigt</h2>
        <p className="text-gray-600">Ingen historiske data tilgængelig</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900">Årsoverblik for 2025</h3>
          <p className="mt-1 text-sm text-gray-600">Driftsresultat per måned</p>
        </div>
        <div className="h-[375px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={history}
              margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
              barCategoryGap="15%"
            >
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
              
              {/* Single bar series with custom cell rendering for colors and rounded corners */}
              <Bar 
                dataKey="result"
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props
                  const value = payload?.result || 0
                  
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
                  
                  const fill = isPositive ? "url(#colorPositive)" : "url(#colorNegative)"
                  return <path d={path} fill={fill} />
                }}
              >
                {history.map((entry, index) => {
                  const value = entry.result || 0
                  const fill = value >= 0 ? "url(#colorPositive)" : "url(#colorNegative)"
                  return <Cell key={`cell-${index}`} fill={fill} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Table */}
        <div className="mt-8">
          <button
            onClick={() => setIsTableExpanded(!isTableExpanded)}
            className="flex items-center justify-between w-full text-left mb-4 hover:opacity-80 transition-opacity"
          >
            <h3 className="text-xl font-bold text-gray-900">Månedlig Detaljeret Oversigt</h3>
            {isTableExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
          
          {/* Bilagsanalyse Link */}
          <Link
            to="/expenses"
            className="flex items-center space-x-2 px-4 py-3 mb-4 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>Bilagsanalyse</span>
          </Link>
          
          {isTableExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Måned</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Omsætning</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Var. Omk.</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Faste Omk.</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Dækningsgrad</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Resultat</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, index) => {
                    const coverageRatio = calculateCoverageRatio(entry.revenue, entry.variable_costs)
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{entry.month}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">{formatCurrency(entry.revenue)}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-700">{formatCurrency(entry.variable_costs)}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-700">{formatCurrency(entry.fixed_costs)}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-700">{formatNumber(coverageRatio)}%</td>
                        <td className={`py-3 px-4 text-sm text-right font-semibold ${
                          entry.result >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(entry.result)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

