import { useState, useEffect } from 'react'
import { Briefcase, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react'
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

  const formatHours = (hours: number): string => {
    return new Intl.NumberFormat('da-DK', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(hours)
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">Projektstatistikker</h3>
        <p className="mt-1 text-sm text-gray-600">
          Oversigt over hvor godt de enkelte projekter klarer sig
        </p>
      </div>

      <div className="space-y-4">
        {statistics.map((project) => {
          const isPositive = project.expected_result >= 0
          const hasData = project.expected_turnover > 0 || project.expected_costs > 0 || project.registered_hours > 0

          return (
            <div
              key={project.project_id}
              className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                hasData ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1">
                  {project.project_color && (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.project_color }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-gray-900 truncate">
                      {project.project_name}
                    </h4>
                    {project.project_type && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {project.project_type === 'customer' || project.project_type === 'Kunde'
                          ? 'Kundeprojekt'
                          : project.project_type === 'internal' || project.project_type === 'Internt'
                          ? 'Internt projekt'
                          : project.project_type}
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-1 ${
                    isPositive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{formatCurrency(project.expected_result)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Forventet Omsætning */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-medium text-blue-700">Forventet Omsætning</p>
                  </div>
                  <p className="text-xl font-bold text-blue-900">
                    {formatCurrency(project.expected_turnover)}
                  </p>
                </div>

                {/* Forventede Omkostninger */}
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                    <p className="text-xs font-medium text-orange-700">Forventede Omkostninger</p>
                  </div>
                  <p className="text-xl font-bold text-orange-900">
                    {formatCurrency(project.expected_costs)}
                  </p>
                </div>

                {/* Registrerede Timer */}
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <p className="text-xs font-medium text-purple-700">Registrerede Timer</p>
                  </div>
                  <p className="text-xl font-bold text-purple-900">
                    {formatHours(project.registered_hours)} timer
                  </p>
                </div>

                {/* Dækningsgrad */}
                <div className={`rounded-lg p-4 border ${
                  project.expected_turnover > 0 && (project.expected_turnover - project.expected_costs) / project.expected_turnover >= 0.3
                    ? 'bg-green-50 border-green-100'
                    : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Briefcase className={`h-4 w-4 ${
                      project.expected_turnover > 0 && (project.expected_turnover - project.expected_costs) / project.expected_turnover >= 0.3
                        ? 'text-green-600'
                        : 'text-gray-600'
                    }`} />
                    <p className={`text-xs font-medium ${
                      project.expected_turnover > 0 && (project.expected_turnover - project.expected_costs) / project.expected_turnover >= 0.3
                        ? 'text-green-700'
                        : 'text-gray-600'
                    }`}>Dækningsgrad</p>
                  </div>
                  <p className={`text-xl font-bold ${
                    project.expected_turnover > 0 && (project.expected_turnover - project.expected_costs) / project.expected_turnover >= 0.3
                      ? 'text-green-900'
                      : 'text-gray-900'
                  }`}>
                    {project.expected_turnover > 0
                      ? `${((project.expected_turnover - project.expected_costs) / project.expected_turnover * 100).toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

