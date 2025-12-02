import { useState, useEffect, useRef } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
  Droplet,
  Heart,
  Download,
  Search,
  AlertTriangle,
  Check,
  FileSearch,
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

interface PagePerformance {
  id: number
  created_at: string
  url: string
  page_name?: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  title_text?: string | null
  meta_description?: string | null
}

interface PageHealthStatus {
  status: 'critical' | 'warning' | 'healthy'
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
  tooltip: string
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

// Calculate health status for a page
function getHealthStatus(page: PagePerformance): PageHealthStatus {
  if (page.impressions > 300 && page.ctr < 1.5) {
    return {
      status: 'critical',
      icon: <Droplet className="h-4 w-4 text-red-600" />,
      label: 'CRITICAL',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      tooltip: `Høj synlighed (${page.impressions.toLocaleString('da-DK')} visninger) men lav CTR (${page.ctr.toFixed(2)}%). Siden får mange visninger men få klik, hvilket indikerer at titel/beskrivelse ikke matcher søgeintentionen.`,
    }
  } else if (page.impressions > 100 && page.ctr < 2.5) {
    return {
      status: 'warning',
      icon: <AlertCircle className="h-4 w-4 text-yellow-600" />,
      label: 'WARNING',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      tooltip: `Moderat synlighed (${page.impressions.toLocaleString('da-DK')} visninger) men lav CTR (${page.ctr.toFixed(2)}%). Siden kunne forbedres for at konvertere flere visninger til klik.`,
    }
  } else {
    return {
      status: 'healthy',
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      label: 'HEALTHY',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      tooltip: `God performance med ${page.impressions.toLocaleString('da-DK')} visninger og ${page.ctr.toFixed(2)}% CTR. Siden konverterer godt fra visninger til klik.`,
    }
  }
}

// Tooltip component for status badges
function StatusTooltip({ 
  tooltip, 
  children, 
  badgeRef 
}: { 
  tooltip: string
  children: React.ReactNode
  badgeRef: React.RefObject<HTMLDivElement>
}) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ placement: 'top' | 'bottom'; align: 'left' | 'center' | 'right' }>({ 
    placement: 'top', 
    align: 'center' 
  })
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (!showTooltip || !badgeRef.current || !tooltipRef.current) return

    const badgeRect = badgeRef.current.getBoundingClientRect()
    const tooltipWidth = 256 // w-64 = 16rem = 256px
    const tooltipHeight = tooltipRef.current.offsetHeight || 150
    const spacing = 8 // mb-2 = 0.5rem = 8px

    const spaceAbove = badgeRect.top

    // Determine vertical placement
    const placement: 'top' | 'bottom' = spaceAbove >= tooltipHeight + spacing ? 'top' : 'bottom'

    // Determine horizontal alignment
    let align: 'left' | 'center' | 'right' = 'center'
    const centerX = badgeRect.left + badgeRect.width / 2
    
    if (centerX - tooltipWidth / 2 < 16) {
      // Too close to left edge
      align = 'left'
    } else if (centerX + tooltipWidth / 2 > window.innerWidth - 16) {
      // Too close to right edge
      align = 'right'
    }

    setPosition({ placement, align })
  }, [showTooltip, badgeRef, tooltip])

  const placementClasses = position.placement === 'top' 
    ? 'bottom-full mb-2' 
    : 'top-full mt-2'
  
  const alignClasses = {
    left: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    right: 'right-0'
  }[position.align]

  const arrowClasses = position.placement === 'top'
    ? 'top-full left-1/2 transform -translate-x-1/2 -mt-1'
    : 'bottom-full left-1/2 transform -translate-x-1/2 -mb-1'

  const arrowRotation = position.placement === 'top' ? 'rotate-45' : '-rotate-45'

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none whitespace-normal ${placementClasses} ${alignClasses}`}
        >
          <div>{tooltip}</div>
          {/* Arrow */}
          <div className={`absolute ${arrowClasses}`}>
            <div className={`w-2 h-2 bg-gray-900 transform ${arrowRotation}`}></div>
          </div>
        </div>
      )}
    </div>
  )
}

// Content health badge component
function ContentHealthBadge({ 
  label, 
  value, 
  min, 
  max, 
  isMissing 
}: { 
  label: string
  value: number | null
  min: number
  max: number
  isMissing: boolean
}) {
  if (isMissing || value === null) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <div>
          <div className="text-xs font-medium text-red-900">{label}</div>
          <div className="text-xs text-red-600">Mangler indhold</div>
        </div>
      </div>
    )
  }

  const isOptimal = value >= min && value <= max
  const isTooShort = value < min
  const isTooLong = value > max

  let bgColor = 'bg-green-50'
  let borderColor = 'border-green-200'
  let iconColor = 'text-green-600'
  let statusText = 'Optimal'

  if (isTooShort) {
    bgColor = 'bg-yellow-50'
    borderColor = 'border-yellow-200'
    iconColor = 'text-yellow-600'
    statusText = 'For kort'
  } else if (isTooLong) {
    bgColor = 'bg-red-50'
    borderColor = 'border-red-200'
    iconColor = 'text-red-600'
    statusText = 'For lang'
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-1.5 ${bgColor} border ${borderColor} rounded-lg`}>
      {isOptimal ? (
        <Check className={`h-4 w-4 ${iconColor}`} />
      ) : (
        <AlertTriangle className={`h-4 w-4 ${iconColor}`} />
      )}
      <div>
        <div className="text-xs font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-600">
          {value} tegn • {statusText}
        </div>
      </div>
    </div>
  )
}

// Google SERP Preview component
function SerpPreview({ page }: { page: PagePerformance }) {
  const displayUrl = page.url || page.page_name || 'Ukendt side'
  const title = page.title_text || ''
  const description = page.meta_description || ''

  // Extract domain from URL
  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return 'himmelstrupevents.dk'
    }
  }

  const domain = getDomain(displayUrl)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start space-x-3">
        {/* Favicon placeholder */}
        <div className="w-4 h-4 bg-gray-300 rounded mt-1 flex-shrink-0"></div>
        <div className="flex-1 min-w-0">
          {/* Site name and URL */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs text-gray-600">Himmelstrup Events</span>
            <span className="text-gray-400">•</span>
            <span className="text-xs text-green-700 truncate">{domain}</span>
          </div>
          
          {/* Title */}
          <h3 className={`text-xl text-blue-700 hover:underline cursor-pointer mb-1 ${!title ? 'text-gray-400 italic' : ''}`}>
            {title || '(Ingen titel)'}
          </h3>
          
          {/* Description */}
          <p className={`text-sm text-gray-600 leading-relaxed ${!description ? 'text-gray-400 italic' : ''}`}>
            {description || '(Ingen beskrivelse)'}
          </p>
        </div>
      </div>
    </div>
  )
}

// PageHealthTable component
function PageHealthTable() {
  const [pages, setPages] = useState<PagePerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'status' | 'impressions'>('status')
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null)
  const [historicalData, setHistoricalData] = useState<Map<number, PagePerformance[]>>(new Map())
  const [loadingHistorical, setLoadingHistorical] = useState<Set<number>>(new Set())
  const badgeRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    const fetchPagePerformance = async () => {
      if (!supabase) {
        setError('Supabase client not configured')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch last 1000 records ordered by created_at desc
        // Include title_text and meta_description for content audit
        const { data, error: fetchError } = await supabase
          .from('page_performance')
          .select('id, created_at, url, page_name, clicks, impressions, ctr, position, title_text, meta_description')
          .order('created_at', { ascending: false })
          .limit(1000)

        if (fetchError) throw fetchError

        // Filter to keep only the most recent entry for each unique URL
        const urlMap = new Map<string, PagePerformance>()
        data?.forEach((row: any) => {
          const url = row.url || row.page_name || row.page_url || ''
          if (url && !urlMap.has(url)) {
            urlMap.set(url, {
              id: row.id,
              created_at: row.created_at,
              url: url,
              page_name: row.page_name || row.page_name || null,
              clicks: Number(row.clicks || 0),
              impressions: Number(row.impressions || 0),
              ctr: Number(row.ctr || 0),
              position: Number(row.position || row.avg_position || 0),
              title_text: row.title_text || null,
              meta_description: row.meta_description || null,
            })
          }
        })

        const uniquePages = Array.from(urlMap.values())
        setPages(uniquePages)
      } catch (err: any) {
        console.error('Error fetching page performance:', err)
        setError(err.message || 'Failed to fetch page performance data')
      } finally {
        setLoading(false)
      }
    }

    fetchPagePerformance()
  }, [])

  // Sort pages
  const sortedPages = [...pages].sort((a, b) => {
    const statusA = getHealthStatus(a)
    const statusB = getHealthStatus(b)

    if (sortBy === 'status') {
      // Critical first, then warning, then healthy
      const statusOrder = { critical: 0, warning: 1, healthy: 2 }
      const orderDiff = statusOrder[statusA.status] - statusOrder[statusB.status]
      if (orderDiff !== 0) return orderDiff
      // If same status, sort by impressions desc
      return b.impressions - a.impressions
    } else {
      // Sort by impressions desc
      return b.impressions - a.impressions
    }
  })

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800 font-medium">Fejl ved indlæsning af data</p>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  // Export to CSV function
  const exportToCSV = () => {
    // Create CSV headers
    const headers = ['Status', 'Side', 'Visninger', 'Klik', 'CTR (%)', 'Ranking']
    
    // Create CSV rows
    const rows = sortedPages.map((page) => {
      const health = getHealthStatus(page)
      const displayName = page.page_name || page.url || 'Ukendt side'
      
      return [
        health.label,
        displayName,
        page.impressions.toLocaleString('da-DK'),
        page.clicks.toLocaleString('da-DK'),
        page.ctr.toFixed(2),
        page.position > 0 ? page.position.toFixed(1) : '-',
      ]
    })
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel compatibility
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `side-diagnose-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Side-Diagnose</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSortBy('status')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sortBy === 'status'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sorter efter status
          </button>
          <button
            onClick={() => setSortBy('impressions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sortBy === 'impressions'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sorter efter trafik
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Eksporter CSV</span>
          </button>
        </div>
      </div>

      {sortedPages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Ingen side-performance data tilgængelig.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Side
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Trafik
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  CTR
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Ranking
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedPages.map((page) => {
                const health = getHealthStatus(page)
                const displayName = page.page_name || page.url || 'Ukendt side'
                const isExpanded = expandedRowId === page.id

                const setBadgeRef = (element: HTMLDivElement | null) => {
                  if (element) {
                    badgeRefs.current.set(page.id, element)
                  } else {
                    badgeRefs.current.delete(page.id)
                  }
                }

                const getBadgeRef = () => {
                  return { current: badgeRefs.current.get(page.id) || null }
                }

                const toggleExpand = async () => {
                  if (!isExpanded) {
                    // Fetch historical data when expanding
                    const pageUrl = page.url || page.page_name || ''
                    if (pageUrl && !historicalData.has(page.id)) {
                      setLoadingHistorical(prev => new Set(prev).add(page.id))
                      try {
                        if (supabase) {
                          // Fetch historical data matching this page's URL or page_name
                          // Use a filter that matches either field
                          const { data, error: fetchError } = await supabase
                            .from('page_performance')
                            .select('id, created_at, url, page_name, clicks, impressions, ctr, position')
                            .or(`url.eq."${pageUrl}",page_name.eq."${pageUrl}"`)
                            .order('created_at', { ascending: true })
                            .limit(30)

                          if (!fetchError && data && data.length > 0) {
                            const historical = data.map((row: any) => ({
                              id: row.id,
                              created_at: row.created_at,
                              url: row.url || row.page_name || '',
                              page_name: row.page_name || null,
                              clicks: Number(row.clicks || 0),
                              impressions: Number(row.impressions || 0),
                              ctr: Number(row.ctr || 0),
                              position: Number(row.position || 0),
                            }))
                            setHistoricalData(prev => new Map(prev).set(page.id, historical))
                          } else {
                            // If no data found, set empty array to prevent retrying
                            setHistoricalData(prev => new Map(prev).set(page.id, []))
                          }
                        }
                      } catch (err) {
                        console.error('Error fetching historical data:', err)
                        setHistoricalData(prev => new Map(prev).set(page.id, []))
                      } finally {
                        setLoadingHistorical(prev => {
                          const newSet = new Set(prev)
                          newSet.delete(page.id)
                          return newSet
                        })
                      }
                    }
                    setExpandedRowId(page.id)
                  } else {
                    setExpandedRowId(null)
                  }
                }

                // Calculate content health
                const titleLength = page.title_text?.length || 0
                const metaLength = page.meta_description?.length || 0
                const titleMissing = !page.title_text || page.title_text.trim() === ''
                const metaMissing = !page.meta_description || page.meta_description.trim() === ''

                return (
                  <>
                    <tr 
                      key={page.id} 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                      onClick={toggleExpand}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <StatusTooltip 
                            tooltip={health.tooltip} 
                            badgeRef={getBadgeRef()}
                          >
                            <div
                              ref={setBadgeRef}
                              className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded ${health.bgColor} cursor-help`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {health.icon}
                              <span className={`text-xs font-medium ${health.color}`}>{health.label}</span>
                            </div>
                          </StatusTooltip>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={displayName}>
                          {displayName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{page.impressions.toLocaleString('da-DK')}</div>
                          <div className="text-xs text-gray-500">{page.clicks.toLocaleString('da-DK')} klik</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-24">
                            <div
                              className={`h-2 rounded-full ${
                                health.status === 'critical'
                                  ? 'bg-red-500'
                                  : health.status === 'warning'
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min((page.ctr / 5) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 min-w-[3rem]">
                            {page.ctr.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {page.position > 0 ? page.position.toFixed(1) : '-'}
                        </span>
                      </td>
                    </tr>
                    {/* Expanded Content Audit Row */}
                    {isExpanded && (
                      <tr key={`${page.id}-expanded`} className="bg-gray-50">
                        <td colSpan={5} className="px-4 py-6">
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center space-x-2 mb-4">
                              <Search className="h-5 w-5 text-primary-600" />
                              <h3 className="text-lg font-semibold text-gray-900">Content Audit</h3>
                            </div>
                            
                            <div className="flex flex-col lg:flex-row gap-6">
                              {/* Left Column: SERP Preview + Content Health (60%) */}
                              <div className="flex-1 lg:w-[60%] space-y-6">
                                {/* Google SERP Preview */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-3">Google SERP Preview</h4>
                                  <SerpPreview page={page} />
                                </div>
                                
                                {/* Health Badges */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-3">Content Health</h4>
                                  <div className="space-y-3">
                                    <ContentHealthBadge
                                      label="Titel Længde"
                                      value={titleMissing ? null : titleLength}
                                      min={30}
                                      max={60}
                                      isMissing={titleMissing}
                                    />
                                    <ContentHealthBadge
                                      label="Meta Beskrivelse"
                                      value={metaMissing ? null : metaLength}
                                      min={120}
                                      max={160}
                                      isMissing={metaMissing}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Right Column: Traffic Chart (40%) */}
                              <div className="flex-1 lg:w-[40%]">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Trafik Over Tid</h4>
                                {loadingHistorical.has(page.id) ? (
                                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="animate-pulse text-gray-500 text-sm">Indlæser...</div>
                                  </div>
                                ) : historicalData.has(page.id) && historicalData.get(page.id)!.length > 0 ? (
                                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                                    <ResponsiveContainer width="100%" height={240}>
                                      <AreaChart
                                        data={historicalData.get(page.id)!.map((row) => ({
                                          date: formatDate(row.created_at),
                                          impressions: row.impressions,
                                          clicks: row.clicks,
                                        }))}
                                      >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                          dataKey="date"
                                          stroke="#6b7280"
                                          style={{ fontSize: '10px' }}
                                          tick={{ fill: '#6b7280' }}
                                        />
                                        <YAxis
                                          yAxisId="left"
                                          stroke="#3b82f6"
                                          style={{ fontSize: '10px' }}
                                          tick={{ fill: '#3b82f6' }}
                                        />
                                        <YAxis
                                          yAxisId="right"
                                          orientation="right"
                                          stroke="#10b981"
                                          style={{ fontSize: '10px' }}
                                          tick={{ fill: '#10b981' }}
                                        />
                                        <Tooltip
                                          contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                          }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Area
                                          yAxisId="left"
                                          type="monotone"
                                          dataKey="impressions"
                                          stroke="#3b82f6"
                                          fill="#3b82f6"
                                          fillOpacity={0.2}
                                          name="Visninger"
                                        />
                                        <Area
                                          yAxisId="right"
                                          type="monotone"
                                          dataKey="clicks"
                                          stroke="#10b981"
                                          fill="#10b981"
                                          fillOpacity={0.2}
                                          name="Klik"
                                        />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </div>
                                ) : (
                                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="text-gray-500 text-sm text-center">
                                      Ingen historiske data tilgængelig
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
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

// Reusable traffic chart component
function TrafficChart({ 
  data, 
  title, 
  height = 300 
}: { 
  data: Array<{ date: string; impressions: number; clicks: number }>
  title: string
  height?: number
}) {
  // Create a sanitized ID from title (remove spaces and special chars)
  const chartId = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
          Ingen data tilgængelig
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`colorImpressions-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`colorClicks-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#6b7280' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#3b82f6"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#3b82f6' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#10b981"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#10b981' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="impressions"
            stroke="#3b82f6"
            fillOpacity={1}
            fill={`url(#colorImpressions-${chartId})`}
            name="Visninger"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="clicks"
            stroke="#10b981"
            fillOpacity={1}
            fill={`url(#colorClicks-${chartId})`}
            name="Klik"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function SeoDashboard() {
  const { snapshots, tasks, competitors, loading, error, refetch } = useSeoData()
  const [refreshing, setRefreshing] = useState(false)
  const [expandedCompetitors, setExpandedCompetitors] = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab] = useState<'overview' | 'page-health'>('overview')
  const [trafficData, setTrafficData] = useState<Array<{ date: string; impressions: number; clicks: number }>>([])
  const [loadingTraffic, setLoadingTraffic] = useState(true)
  const [eventPageData, setEventPageData] = useState<Map<string, Array<{ date: string; impressions: number; clicks: number }>>>(new Map())
  const [loadingEventPages, setLoadingEventPages] = useState(true)

  // Fetch aggregated traffic data (impressions and clicks by date)
  useEffect(() => {
    const fetchTrafficData = async () => {
      if (!supabase) {
        setLoadingTraffic(false)
        return
      }

      try {
        setLoadingTraffic(true)
        // Fetch all page_performance records from the last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const { data, error: fetchError } = await supabase
          .from('page_performance')
          .select('created_at, impressions, clicks')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true })

        if (fetchError) throw fetchError

        // Group by date and sum impressions and clicks
        const dateMap = new Map<string, { impressions: number; clicks: number }>()
        
        data?.forEach((row: any) => {
          const date = new Date(row.created_at).toISOString().split('T')[0] // YYYY-MM-DD
          const existing = dateMap.get(date) || { impressions: 0, clicks: 0 }
          dateMap.set(date, {
            impressions: existing.impressions + Number(row.impressions || 0),
            clicks: existing.clicks + Number(row.clicks || 0),
          })
        })

        // Convert to array and format dates, then sort by date
        const trafficArray = Array.from(dateMap.entries())
          .map(([dateStr, values]) => ({
            dateStr, // Keep original date string for sorting
            date: formatDate(dateStr),
            impressions: values.impressions,
            clicks: values.clicks,
          }))
          .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
          .map(({ dateStr, ...rest }) => rest) // Remove dateStr after sorting

        setTrafficData(trafficArray)
      } catch (err: any) {
        console.error('Error fetching traffic data:', err)
      } finally {
        setLoadingTraffic(false)
      }
    }

    fetchTrafficData()
  }, [])

  // Fetch traffic data for specific event pages
  useEffect(() => {
    const fetchEventPageData = async () => {
      if (!supabase) {
        setLoadingEventPages(false)
        return
      }

      // Map of display names to search patterns (URL slugs and variations)
      const eventPages: Map<string, string[]> = new Map([
        ['filmteambuilding', ['film-teambuilding', 'filmteambuilding', 'film_teambuilding']],
        ['aiTeambuilding', ['ai-teambuilding', 'aiteambuilding', 'ai_teambuilding']],
        ['playground', ['playground']],
        ['firmaetPaaKlingen', ['firmaet-paa-klingen', 'firmaetpaaklingen', 'firmaet_paa_klingen']],
      ])
      
      try {
        setLoadingEventPages(true)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const pageDataMap = new Map<string, Array<{ date: string; impressions: number; clicks: number }>>()

        // Fetch all page_performance data from the last 30 days
        const { data: allData, error: fetchError } = await supabase
          .from('page_performance')
          .select('created_at, impressions, clicks, url, page_name')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true })

        if (fetchError) {
          console.error('Error fetching event page data:', fetchError)
          setLoadingEventPages(false)
          return
        }

        // Process data for each event page
        for (const [displayName, searchPatterns] of eventPages.entries()) {
          // Filter rows that match any of the search patterns
          const matchingRows = (allData || []).filter((row: any) => {
            const url = (row.url || '').toLowerCase()
            const pageName = (row.page_name || '').toLowerCase()
            
            return searchPatterns.some(pattern => {
              const patternLower = pattern.toLowerCase()
              return url.includes(patternLower) || pageName.includes(patternLower)
            })
          })

          if (matchingRows.length > 0) {
            // Group by date and sum impressions and clicks
            const dateMap = new Map<string, { impressions: number; clicks: number }>()
            
            matchingRows.forEach((row: any) => {
              const date = new Date(row.created_at).toISOString().split('T')[0]
              const existing = dateMap.get(date) || { impressions: 0, clicks: 0 }
              dateMap.set(date, {
                impressions: existing.impressions + Number(row.impressions || 0),
                clicks: existing.clicks + Number(row.clicks || 0),
              })
            })

            // Convert to array and format dates
            const trafficArray = Array.from(dateMap.entries())
              .map(([dateStr, values]) => ({
                dateStr,
                date: formatDate(dateStr),
                impressions: values.impressions,
                clicks: values.clicks,
              }))
              .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
              .map(({ dateStr, ...rest }) => rest)

            pageDataMap.set(displayName, trafficArray)
          } else {
            // Set empty array if no data found
            pageDataMap.set(displayName, [])
          }
        }

        setEventPageData(pageDataMap)
      } catch (err: any) {
        console.error('Error fetching event page data:', err)
      } finally {
        setLoadingEventPages(false)
      }
    }

    fetchEventPageData()
  }, [])

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

  // Prepare chart data - use traffic data (impressions and clicks)
  const chartData = trafficData

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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Oversigt
          </button>
          <button
            onClick={() => setActiveTab('page-health')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'page-health'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileSearch className="h-4 w-4" />
            <span>Side-Diagnose</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'page-health' ? (
        <PageHealthTable />
      ) : (
        <>

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
      {!loadingTraffic && chartData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Trafik & Mobile Performance Over Tid
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#10b981' }}
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
                dataKey="impressions"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorImpressions)"
                name="Visninger"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="clicks"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorClicks)"
                name="Klik"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Event Page Traffic Charts */}
      {!loadingEventPages && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TrafficChart 
            data={eventPageData.get('filmteambuilding') || []} 
            title="Film Teambuilding"
            height={300}
          />
          <TrafficChart 
            data={eventPageData.get('aiTeambuilding') || []} 
            title="AI Teambuilding"
            height={300}
          />
          <TrafficChart 
            data={eventPageData.get('playground') || []} 
            title="Playground"
            height={300}
          />
          <TrafficChart 
            data={eventPageData.get('firmaetPaaKlingen') || []} 
            title="Firmaet på Klingen"
            height={300}
          />
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
        </>
      )}
    </div>
  )
}
