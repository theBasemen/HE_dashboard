import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Brain, 
  Bot, 
  Globe,
  Target,
  ArrowRight,
  CheckCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface LLMReport {
  id: number
  created_at: string
  total_score: number
  openai_score: number
  perplexity_score: number
  summary_text: string
  winning_areas: string[]
  losing_areas: string[]
  action_plan: string
}

export default function AIReportCard() {
  const [report, setReport] = useState<LLMReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLatestReport = async () => {
      if (!supabase) {
        setError('Supabase client not configured')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('HE_LLM_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (fetchError) throw fetchError

        setReport(data)
      } catch (err: any) {
        console.error('Error fetching LLM report:', err)
        setError(err.message || 'Failed to fetch AI report')
      } finally {
        setLoading(false)
      }
    }

    fetchLatestReport()
  }, [])

  const getScoreColor = (score: number): string => {
    if (score < 4) return 'text-red-600 bg-red-50 border-red-200'
    if (score < 7) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getScoreIcon = (score: number) => {
    if (score < 4) return <AlertTriangle className="h-4 w-4" />
    if (score < 7) return <TrendingUp className="h-4 w-4" />
    return <CheckCircle2 className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-red-800 font-medium">Fejl ved indlæsning af AI rapport</p>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8 text-gray-500">
          <Brain className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">Ingen AI rapport tilgængelig endnu</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatActionPlan = (plan: string | null): string[] => {
    if (!plan) return []
    
    try {
      const parsed = JSON.parse(plan)
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item))
      }
      return [String(plan)]
    } catch (e) {
      // If parsing fails, treat as plain text
      // Check if it looks like a JSON array string
      if (plan.trim().startsWith('[') && plan.trim().endsWith(']')) {
        try {
          // Try to parse again with trimmed string
          const parsed = JSON.parse(plan.trim())
          if (Array.isArray(parsed)) {
            return parsed.map(item => String(item))
          }
        } catch (e2) {
          // Still failed, return as single item
        }
      }
      return [plan]
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-6 w-6" />
              <h2 className="text-xl font-bold">AI Synligheds-Rapport</h2>
            </div>
            <p className="text-purple-100 text-sm">
              Opdateret: {formatDate(report.created_at)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{report.total_score.toFixed(1)}</div>
            <div className="text-purple-100 text-sm">Total Score</div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Sammenfatning</h3>
        <p className="text-gray-700 leading-relaxed">{report.summary_text}</p>
      </div>

      {/* Score Cards */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Model Scores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OpenAI Score */}
          <div className={`flex items-center space-x-3 p-4 rounded-lg border ${getScoreColor(report.openai_score)}`}>
            <div className="flex-shrink-0">
              <Bot className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium mb-1">ChatGPT (OpenAI)</div>
              <div className="flex items-center space-x-2">
                {getScoreIcon(report.openai_score)}
                <span className="text-lg font-bold">{report.openai_score.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Perplexity Score */}
          <div className={`flex items-center space-x-3 p-4 rounded-lg border ${getScoreColor(report.perplexity_score)}`}>
            <div className="flex-shrink-0">
              <Globe className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium mb-1">Perplexity</div>
              <div className="flex items-center space-x-2">
                {getScoreIcon(report.perplexity_score)}
                <span className="text-lg font-bold">{report.perplexity_score.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Grid */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Winning Areas */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-900">Hvor vinder vi?</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.winning_areas && report.winning_areas.length > 0 ? (
                report.winning_areas.map((area, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
                  >
                    {area}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">Ingen vinderområder identificeret</span>
              )}
            </div>
          </div>

          {/* Losing Areas */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-sm font-semibold text-gray-900">Hvor taber vi?</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.losing_areas && report.losing_areas.length > 0 ? (
                report.losing_areas.map((area, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"
                  >
                    {area}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">Ingen taberområder identificeret</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Plan */}
      <div className="p-6 bg-gray-50">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="h-5 w-5 text-primary-600" />
          <h3 className="text-sm font-semibold text-gray-900">Handlingsplan</h3>
        </div>
        {(() => {
          const actionItems = formatActionPlan(report.action_plan)
          
          if (actionItems.length === 0) {
            return (
              <p className="text-gray-500 text-sm">Ingen handlingsplan tilgængelig</p>
            )
          }

          if (actionItems.length === 1) {
            // Single paragraph
            return (
              <p className="text-gray-700 leading-relaxed">{actionItems[0]}</p>
            )
          }

          // Multiple items - render as cards
          return (
            <div className="space-y-3">
              {actionItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                      <ArrowRight className="h-3.5 w-3.5 text-primary-600" />
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed flex-1">{item}</p>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

