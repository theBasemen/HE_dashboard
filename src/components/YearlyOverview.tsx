import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { MonthlyHistory } from '../services/api'

interface YearlyOverviewProps {
  history: MonthlyHistory[]
}

export default function YearlyOverview({ history }: YearlyOverviewProps) {
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
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{payload[0].payload.month}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'revenue') {
              return (
                <p key={index} className="text-sm" style={{ color: '#10B981' }}>
                  <span className="font-medium">Omsætning:</span> {formatCurrency(entry.value)}
                </p>
              )
            } else if (entry.dataKey === 'variable_costs') {
              return (
                <p key={index} className="text-sm" style={{ color: '#F59E0B' }}>
                  <span className="font-medium">Variable omk.:</span> {formatCurrency(entry.value)}
                </p>
              )
            } else if (entry.dataKey === 'fixed_costs') {
              return (
                <p key={index} className="text-sm" style={{ color: '#F43F5E' }}>
                  <span className="font-medium">Faste omk.:</span> {formatCurrency(entry.value)}
                </p>
              )
            } else if (entry.dataKey === 'result') {
              return (
                <p key={index} className={`text-sm font-bold ${entry.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="font-medium">Resultat:</span> {formatCurrency(entry.value)}
                </p>
              )
            }
            return null
          })}
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
      {/* Section Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Årlig Økonomisk Oversigt</h2>
        <p className="mt-1 text-sm text-gray-600">Månedlig oversigt over omsætning, omkostninger og resultat</p>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900">Månedlig Performance</h3>
          <p className="mt-1 text-sm text-gray-600">Omsætning, omkostninger og driftsresultat</p>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={history}
              margin={{ top: 10, right: 30, left: 0, bottom: 80 }}
            >
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
              <Legend 
                formatter={(value) => {
                  if (value === 'revenue') return 'Omsætning'
                  if (value === 'variable_costs') return 'Variable omk.'
                  if (value === 'fixed_costs') return 'Faste omk.'
                  if (value === 'result') return 'Resultat'
                  return value
                }}
              />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
              
              {/* Stacked bars for costs */}
              <Bar dataKey="variable_costs" stackId="costs" fill="#F59E0B" radius={[0, 0, 0, 0]} />
              <Bar dataKey="fixed_costs" stackId="costs" fill="#F43F5E" radius={[8, 8, 0, 0]} />
              
              {/* Separate bar for revenue */}
              <Bar dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} />
              
              {/* Line for result */}
              <Line 
                type="monotone" 
                dataKey="result" 
                stroke="#1e293b" 
                strokeWidth={3}
                dot={{ fill: '#1e293b', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Månedlig Detaljeret Oversigt</h3>
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
      </div>
    </div>
  )
}

