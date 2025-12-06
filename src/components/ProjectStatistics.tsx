import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { fetchProjectStatistics, ProjectStatistics as ProjectStatisticsData } from '../services/api'

export default function ProjectStatistics() {
  const [statistics, setStatistics] = useState<ProjectStatisticsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchProjectStatistics()
        setStatistics(data)
      } catch (err) {
        console.error('Failed to fetch project statistics:', err)
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


  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Projektstatistikker</h3>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  // Empty state
  if (!statistics || statistics.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Projektstatistikker</h3>
        <p className="text-gray-600">Ingen projekter fundet</p>
      </div>
    )
  }

  const calculateGrossMargin = (turnover: number, costs: number): number => {
    if (turnover === 0) return 0
    return ((turnover - costs) / turnover) * 100
  }

  // Find max value for normalization - use the same scale for both turnover and costs
  const maxValue = Math.max(
    ...statistics.map(p => Math.max(p.expected_turnover, p.expected_costs + p.internal_cost)),
    1
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">Projektstatistikker</h3>
        <p className="mt-1 text-sm text-gray-600">
          Oversigt over hvor godt de enkelte projekter klarer sig
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statistics.map((project) => {
          const isPositive = project.expected_result >= 0
          const grossMargin = calculateGrossMargin(project.expected_turnover, project.expected_costs)
          const isGoodMargin = grossMargin >= 30
          
          // Calculate percentages for bars - use same max value for comparison
          const turnoverPercent = maxValue > 0 ? (project.expected_turnover / maxValue) * 100 : 0
          const totalCosts = project.expected_costs + project.internal_cost
          const totalCostsPercent = maxValue > 0 ? (totalCosts / maxValue) * 100 : 0
          const expectedCostsPercent = totalCosts > 0 ? (project.expected_costs / totalCosts) * totalCostsPercent : 0
          const internalCostPercent = totalCosts > 0 ? (project.internal_cost / totalCosts) * totalCostsPercent : 0

          return (
            <div
              key={project.project_id}
              className="border rounded-lg p-4 transition-all hover:shadow-lg bg-white border-gray-200"
            >
              {/* Header */}
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {project.project_name}
                </h4>
              </div>

              {/* Expected Result - Main metric */}
              <div className={`mb-3 pb-3 border-b border-gray-100`}>
                <span className="text-xs text-gray-500 block mb-1">Forventet Resultat</span>
                <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className={`text-base font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(project.expected_result)}
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="space-y-3">
                {/* Omsætning - Bar Chart */}
                <div className="group relative">
                  <div className="flex items-center space-x-2 mb-1">
                    <DollarSign className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-gray-600">Omsætning</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(turnoverPercent, 100)}%` }}
                    />
                  </div>
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
                    {formatCurrency(project.expected_turnover)}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* Omkostninger - Stacked Bar Chart */}
                <div className="group relative">
                  <div className="flex items-center space-x-2 mb-1">
                    <TrendingDown className="h-3 w-3 text-orange-500" />
                    <span className="text-xs text-gray-600">Omkostninger</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                    {project.expected_costs > 0 && (
                      <div
                        className="bg-orange-500 h-full transition-all"
                        style={{ width: `${Math.min(expectedCostsPercent, 100)}%` }}
                      />
                    )}
                    {project.internal_cost > 0 && (
                      <div
                        className="bg-purple-500 h-full transition-all"
                        style={{ width: `${Math.min(internalCostPercent, 100)}%` }}
                      />
                    )}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 bg-orange-500 rounded"></div>
                      <span>Forventede: {formatCurrency(project.expected_costs)}</span>
                    </div>
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 bg-purple-500 rounded"></div>
                      <span>Intern: {formatCurrency(project.internal_cost)}</span>
                    </div>
                    <div className="font-semibold pt-1 border-t border-gray-700">
                      Total: {formatCurrency(project.expected_costs + project.internal_cost)}
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* Dækningsgrad */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Dækning:</span>
                  <span className={`text-xs font-semibold ${isGoodMargin ? 'text-green-700' : 'text-gray-700'}`}>
                    {project.expected_turnover > 0
                      ? `${grossMargin.toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

