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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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

  // We'll normalize per project so the largest value fills 100% of the height

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">Projektstatistikker</h3>
        <p className="mt-1 text-sm text-gray-600">
          Oversigt over hvor godt de enkelte projekter klarer sig
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statistics.map((project) => {
          const isPositive = project.expected_result >= 0
          const grossMargin = calculateGrossMargin(project.expected_turnover, project.expected_costs)
          const isGoodMargin = grossMargin >= 30
          
          // Calculate local max value for this project (the largest between turnover and total costs)
          const totalCosts = project.expected_costs + project.internal_cost
          const localMaxValue = Math.max(project.expected_turnover, totalCosts, 1)
          
          // Calculate percentages - the largest value will fill 100% of the height
          const turnoverPercent = localMaxValue > 0 ? (project.expected_turnover / localMaxValue) * 100 : 0
          const expectedCostsPercent = localMaxValue > 0 ? (project.expected_costs / localMaxValue) * 100 : 0
          const internalCostPercent = localMaxValue > 0 ? (project.internal_cost / localMaxValue) * 100 : 0

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
              <div className="space-y-4">
                {/* Combined Chart - Omsætning and Omkostninger in same coordinate system */}
                <div className="relative overflow-visible">
                  {/* Icons row */}
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <div className="flex-1 flex justify-center">
                      <DollarSign className="h-4 w-4" style={{ color: '#10b981' }} />
                    </div>
                    {project.expected_costs > 0 && (
                      <div className="flex-1 flex justify-center">
                        <TrendingDown className="h-4 w-4" style={{ color: '#ef4444' }} />
                      </div>
                    )}
                    {project.internal_cost > 0 && (
                      <div className="flex-1 flex justify-center">
                        <TrendingDown className="h-4 w-4 text-yellow-500" />
                      </div>
                    )}
                  </div>
                  {/* Bars row with tooltips */}
                  <div className="relative overflow-visible pb-8">
                    <div className="flex items-end justify-center gap-1 h-20 bg-gray-100 rounded-t">
                      {/* Omsætning søjle */}
                      <div className="flex-1 h-full flex items-end relative group/bar1 overflow-visible">
                        <div className="w-full h-full flex items-end overflow-hidden rounded-t">
                          <div
                            className="w-full rounded-t transition-all"
                            style={{ 
                              height: `${Math.min(turnoverPercent, 100)}%`,
                              background: 'linear-gradient(to bottom, rgba(16, 185, 129, 0.8) 5%, rgba(16, 185, 129, 0.6) 95%)'
                            }}
                          />
                        </div>
                        {/* Tooltip for turnover */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/bar1:block z-20 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none" style={{ bottom: 'calc(100% + 0.5rem)' }}>
                          {formatCurrency(project.expected_turnover)}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                      {/* Forventede omkostninger søjle */}
                      {project.expected_costs > 0 && (
                        <div className="flex-1 h-full flex items-end relative group/bar2 overflow-visible">
                          <div className="w-full h-full flex items-end overflow-hidden rounded-t">
                            <div
                              className="w-full rounded-t transition-all"
                              style={{ 
                                height: `${Math.min(expectedCostsPercent, 100)}%`,
                                background: 'linear-gradient(to bottom, rgba(239, 68, 68, 0.8) 5%, rgba(239, 68, 68, 0.6) 95%)'
                              }}
                            />
                          </div>
                          {/* Tooltip for expected costs */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/bar2:block z-20 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none" style={{ bottom: 'calc(100% + 0.5rem)' }}>
                            {formatCurrency(project.expected_costs)}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                      {/* Interne omkostninger søjle */}
                      {project.internal_cost > 0 && (
                        <div className="flex-1 h-full flex items-end relative group/bar3 overflow-visible">
                          <div className="w-full h-full flex items-end overflow-hidden rounded-t">
                            <div
                              className="bg-yellow-500 w-full rounded-t transition-all"
                              style={{ height: `${Math.min(internalCostPercent, 100)}%` }}
                            />
                          </div>
                          {/* Tooltip for internal costs */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/bar3:block z-20 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none" style={{ bottom: 'calc(100% + 0.5rem)' }}>
                            {formatCurrency(project.internal_cost)}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                    </div>
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

