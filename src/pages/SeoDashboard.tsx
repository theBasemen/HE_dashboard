import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Gauge,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Target,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '../lib/supabase'

// TypeScript interfaces matching Supabase tables
interface SeoSnapshot {
  id: number
  created_at: string
  gsc_clicks: number
  gsc_impressions: number
  gsc_ctr: number
  psi_mobile_score: number
  psi_lcp: number
  overall_score: number
  semantisk_analyse: string | null
}

interface SeoTask {
  id: number
  task_name: string
  task_type: string
  priority: string
  status: string
  description_why: string | null
  description_how: string | null
}

interface CompetitorAnalysis {
  id: number
  keyword: string
  analysis_text: string
  top_competitor_1: string | null
}

// Custom hook to fetch SEO data
function useSeoData() {
  const [snapshots, setSnapshots] = useState<SeoSnapshot[]>([])
  const [tasks, setTasks] = useState<SeoTask[]>([])
  const [competitors, setCompetitors] = useState<CompetitorAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!supabase) {
      setError('Supabase client not configured')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch latest 30 rows from seo_snapshots (ordered by created_at ascending for charts)
      const { data: snapshotsData, error: snapshotsError } = await supabase
        .from('seo_snapshots')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(30)

      if (snapshotsError) throw snapshotsError

      // Fetch all 'pending' seo_tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('seo_tasks')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })

      if (tasksError) throw tasksError

      // Fetch latest 5 competitor_analysis rows
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('competitor_analysis')
        .select('*')
        .order('id', { ascending: false })
        .limit(5)

      if (competitorsError) throw competitorsError

      setSnapshots(snapshotsData || [])
      setTasks(tasksData || [])
      setCompetitors(competitorsData || [])
    } catch (err: any) {
      console.error('Error fetching SEO data:', err)
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { snapshots, tasks, competitors, loading, error, refetch: fetchData }
}

// Format date to DD/MM
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Calculate trend (compare latest vs previous)
function calculateTrend(current: number, previous: number): {
  value: number
  isPositive: boolean
  percentage: number
} {
  if (previous === 0) {
    return { value: current, isPositive: true, percentage: 0 }
  }
  const percentage = ((current - previous) / previous) * 100
  return {
    value: current,
    isPositive: percentage >= 0,
    percentage: Math.abs(percentage),
  }
}

export default function SeoDashboard() {
  const { snapshots, tasks, competitors, loading, error, refetch } = useSeoData()
  const [refreshing, setRefreshing] = useState(false)
  const [expandedCompetitors, setExpandedCompetitors] = useState<Set<number>>(new Set())

  // Get latest and previous snapshots for KPI calculations
  const latestSnapshot = snapshots[snapshots.length - 1]
  const previousSnapshot = snapshots[snapshots.length - 2]

  // Calculate KPIs with trends
  const kpis = latestSnapshot
    ? {
        overallScore: calculateTrend(
          latestSnapshot.overall_score,
          previousSnapshot?.overall_score || latestSnapshot.overall_score
        ),
        traffic30d: calculateTrend(
          latestSnapshot.gsc_clicks,
          previousSnapshot?.gsc_clicks || latestSnapshot.gsc_clicks
        ),
        mobileSpeed: calculateTrend(
          latestSnapshot.psi_mobile_score,
          previousSnapshot?.psi_mobile_score || latestSnapshot.psi_mobile_score
        ),
        lcp: calculateTrend(
          latestSnapshot.psi_lcp,
          previousSnapshot?.psi_lcp || latestSnapshot.psi_lcp
        ),
      }
    : null

  // Prepare chart data
  const chartData = snapshots.map((snapshot) => ({
    date: formatDate(snapshot.created_at),
    clicks: snapshot.gsc_clicks,
    mobileScore: snapshot.psi_mobile_score,
  }))

  // Mark task as done
  const markTaskAsDone = async (taskId: number) => {
    if (!supabase) return

    try {
      setRefreshing(true)
      const { error } = await supabase
        .from('seo_tasks')
        .update({ status: 'done' })
        .eq('id', taskId)

      if (error) throw error

      // Refresh tasks data
      await refetch()
    } catch (err: any) {
      console.error('Error updating task:', err)
      alert('Failed to update task: ' + err.message)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 h-32" />
            ))}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 h-96" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 h-64" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 font-medium">Error loading data</p>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SEO & Trafik</h1>
        <p className="text-gray-600 mt-1">Overblik over SEO performance og trafikudvikling</p>
      </div>

      {/* KPI Section */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Score */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Gauge className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-600">Overall Score</span>
              </div>
              {kpis.overallScore.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-gray-900">{kpis.overallScore.value}</span>
              <span
                className={`text-sm font-medium ${
                  kpis.overallScore.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {kpis.overallScore.isPositive ? '+' : '-'}
                {kpis.overallScore.percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Traffic (30d) */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-600">Traffic (30d)</span>
              </div>
              {kpis.traffic30d.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-gray-900">
                {kpis.traffic30d.value.toLocaleString()}
              </span>
              <span
                className={`text-sm font-medium ${
                  kpis.traffic30d.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {kpis.traffic30d.isPositive ? '+' : '-'}
                {kpis.traffic30d.percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Mobile Speed */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Gauge className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-600">Mobile Speed</span>
              </div>
              {kpis.mobileSpeed.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-gray-900">{kpis.mobileSpeed.value}</span>
              <span
                className={`text-sm font-medium ${
                  kpis.mobileSpeed.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {kpis.mobileSpeed.isPositive ? '+' : '-'}
                {kpis.mobileSpeed.percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* LCP */}
          <div
            className={`rounded-lg border p-6 ${
              latestSnapshot.psi_lcp > 2.5
                ? 'bg-red-50 border-red-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-600">LCP</span>
              </div>
              {kpis.lcp.isPositive ? (
                <TrendingDown className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingUp className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span
                className={`text-3xl font-bold ${
                  latestSnapshot.psi_lcp > 2.5 ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {kpis.lcp.value.toFixed(2)}s
              </span>
              <span
                className={`text-sm font-medium ${
                  kpis.lcp.isPositive ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {kpis.lcp.isPositive ? '+' : '-'}
                {kpis.lcp.percentage.toFixed(1)}%
              </span>
            </div>
            {latestSnapshot.psi_lcp > 2.5 && (
              <p className="text-xs text-red-600 mt-2">Over 2.5s - bør optimeres</p>
            )}
          </div>
        </div>
      )}

      {/* Charts Section */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Trafik & Mobile Performance Over Tid
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#3b82f6"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#3b82f6' }}
                label={{ value: 'Clicks', angle: -90, position: 'insideLeft', fill: '#3b82f6' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#8b5cf6"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#8b5cf6' }}
                label={{ value: 'Mobile Score', angle: 90, position: 'insideRight', fill: '#8b5cf6' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorClicks)"
                name="Clicks"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="mobileScore"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 3 }}
                name="Mobile Score"
              />
              <ReferenceLine yAxisId="right" y={90} stroke="#10b981" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Insights & Tasks Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insight Card */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">AI Insight</h2>
          </div>
          {latestSnapshot?.semantisk_analyse ? (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed">{latestSnapshot.semantisk_analyse}</p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Ingen semantisk analyse tilgængelig endnu.</p>
          )}
        </div>

        {/* Action Plan */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Action Plan</h2>
          </div>
          {tasks.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm">{task.task_name}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        task.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  {task.description_why && (
                    <p className="text-xs text-gray-600 mb-2">{task.description_why}</p>
                  )}
                  {task.description_how && (
                    <p className="text-xs text-gray-500 italic">{task.description_how}</p>
                  )}
                  <button
                    onClick={() => markTaskAsDone(task.id)}
                    disabled={refreshing}
                    className="mt-3 w-full text-xs bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {refreshing ? 'Opdaterer...' : 'Markér som færdig'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
              <p className="text-sm">Alle opgaver er færdige!</p>
            </div>
          )}
        </div>

        {/* Competitor Insights */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Competitor Insights</h2>
          </div>
          {competitors.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {competitors.map((competitor) => {
                const isExpanded = expandedCompetitors.has(competitor.id)
                const toggleExpanded = () => {
                  const newExpanded = new Set(expandedCompetitors)
                  if (isExpanded) {
                    newExpanded.delete(competitor.id)
                  } else {
                    newExpanded.add(competitor.id)
                  }
                  setExpandedCompetitors(newExpanded)
                }

                // Capitalize keyword
                const keywordDisplay =
                  competitor.keyword.charAt(0).toUpperCase() + competitor.keyword.slice(1)

                return (
                  <div
                    key={competitor.id}
                    className="border border-gray-200 rounded-lg hover:border-primary-300 transition-colors overflow-hidden"
                  >
                    {/* Header - Always visible */}
                    <button
                      onClick={toggleExpanded}
                      className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{keywordDisplay}</h3>
                        {competitor.top_competitor_1 && (
                          <p className="text-xs text-primary-600 font-medium truncate">
                            🏆 {competitor.top_competitor_1}
                          </p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                      )}
                    </button>

                    {/* Collapsible Body */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="pt-3 prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-headings:mt-4 prose-headings:mb-2 prose-p:text-gray-700 prose-p:text-sm prose-p:leading-relaxed prose-ul:my-2 prose-li:text-gray-700 prose-li:text-sm prose-strong:text-gray-900 prose-strong:font-semibold">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {competitor.analysis_text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Ingen konkurrentanalyser tilgængelig endnu.</p>
          )}
        </div>
      </div>
    </div>
  )
}
