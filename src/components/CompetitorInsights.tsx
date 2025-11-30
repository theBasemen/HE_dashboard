import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check, Users, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface CompetitorAnalysis {
  id: number
  keyword: string
  analysis_text: string
  top_competitor_1: string | null
  created_at: string
}

export default function CompetitorInsights() {
  const [competitors, setCompetitors] = useState<CompetitorAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) {
        setError('Supabase client not configured')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('competitor_analysis')
          .select('*')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        setCompetitors(data || [])
      } catch (err: any) {
        console.error('Error fetching competitor analysis:', err)
        setError(err.message || 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Extract keywords from markdown text (look for bold text or list items)
  const extractKeywords = (text: string): string => {
    // Try to extract keywords from markdown
    // Look for patterns like **keyword** or - keyword or • keyword
    const boldMatches = text.match(/\*\*([^*]+)\*\*/g)
    const listMatches = text.match(/[-•]\s+([^\n]+)/g)
    
    const keywords: string[] = []
    
    if (boldMatches) {
      boldMatches.forEach(match => {
        const keyword = match.replace(/\*\*/g, '').trim()
        if (keyword && !keywords.includes(keyword)) {
          keywords.push(keyword)
        }
      })
    }
    
    if (listMatches) {
      listMatches.forEach(match => {
        const keyword = match.replace(/[-•]\s+/, '').trim()
        if (keyword && !keywords.includes(keyword)) {
          keywords.push(keyword)
        }
      })
    }
    
    // If we found keywords, return them, otherwise return the full text
    return keywords.length > 0 ? keywords.join(', ') : text
  }

  const copyToClipboard = async (id: number, text: string) => {
    try {
      const keywords = extractKeywords(text)
      await navigator.clipboard.writeText(keywords)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback: try to copy full text
      try {
        await navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
    }
  }

  // Custom components for react-markdown styling
  const markdownComponents = {
    h3: ({ node, ...props }: any) => (
      <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 mt-4 mb-2 first:mt-0" {...props} />
    ),
    ul: ({ node, ...props }: any) => (
      <ul className="list-disc pl-5 space-y-1 text-gray-700 my-2" {...props} />
    ),
    ol: ({ node, ...props }: any) => (
      <ol className="list-decimal pl-5 space-y-1 text-gray-700 my-2" {...props} />
    ),
    li: ({ node, ...props }: any) => (
      <li className="text-sm leading-relaxed" {...props} />
    ),
    p: ({ node, ...props }: any) => (
      <p className="text-sm text-gray-600 leading-relaxed my-2" {...props} />
    ),
    strong: ({ node, ...props }: any) => (
      <strong className="font-bold text-gray-900 bg-gray-50 px-1 rounded" {...props} />
    ),
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-64" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 font-medium">Error loading competitor insights</p>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (competitors.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Ingen konkurrentanalyser tilgængelig endnu.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">War Room</h2>
        <p className="text-gray-600 mt-1">Strategiske nøgleord til specifikke emner</p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitors.map((competitor) => (
          <div
            key={competitor.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col"
          >
            {/* Card Header */}
            <div className="mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900 flex-1">
                  {competitor.keyword.charAt(0).toUpperCase() + competitor.keyword.slice(1)}
                </h3>
                <button
                  onClick={() => copyToClipboard(competitor.id, competitor.analysis_text)}
                  className="flex-shrink-0 ml-2 p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Kopier nøgleord"
                >
                  {copiedId === competitor.id ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              {competitor.top_competitor_1 && (
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Battling against:</span>{' '}
                  <span className="text-gray-700">{competitor.top_competitor_1}</span>
                </p>
              )}
            </div>

            {/* Card Body - Markdown Content */}
            <div className="flex-1 overflow-y-auto prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {competitor.analysis_text}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


