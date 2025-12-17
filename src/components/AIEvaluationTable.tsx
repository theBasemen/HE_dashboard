import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface LLMEvaluation {
  id: number
  created_at: string
  question: string
  llm_model: string
  score: number
  judge_reason?: string | null
  reason?: string | null
  answer?: string | null
}

export default function AIEvaluationTable() {
  const [evaluations, setEvaluations] = useState<LLMEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!supabase) {
        setError('Supabase client not configured')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('HE_LLM_evaluation')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)

        if (fetchError) throw fetchError

        setEvaluations(data || [])
      } catch (err: any) {
        console.error('Error fetching LLM evaluations:', err)
        setError(err.message || 'Failed to fetch evaluation data')
      } finally {
        setLoading(false)
      }
    }

    fetchEvaluations()
  }, [])

  const getScoreColor = (score: number): string => {
    if (score < 4) return 'text-red-600 bg-red-50'
    if (score < 7) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const getScoreIcon = (score: number) => {
    if (score < 4) return <AlertTriangle className="h-4 w-4" />
    if (score < 7) return <TrendingUp className="h-4 w-4" />
    return <CheckCircle2 className="h-4 w-4" />
  }

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const getJudgeReason = (evaluation: LLMEvaluation): string | null => {
    return evaluation.reason || evaluation.judge_reason || null
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    )
  }

  if (evaluations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500 text-center py-4">Ingen evalueringsdata tilgængelig</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900">Se detaljeret data</span>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Spørgsmål
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {evaluations.map((evaluation) => {
                  const isRowExpanded = expandedRows.has(evaluation.id)
                  const judgeReason = getJudgeReason(evaluation)
                  
                  return (
                    <>
                      <tr 
                        key={evaluation.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleRow(evaluation.id)}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="truncate max-w-md" title={evaluation.question}>
                            {evaluation.question}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {evaluation.llm_model === 'openai' ? 'OpenAI' : evaluation.llm_model === 'perplexity' ? 'Perplexity' : evaluation.llm_model}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold border ${getScoreColor(evaluation.score)}`}>
                            {getScoreIcon(evaluation.score)}
                            <span>{evaluation.score.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            {isRowExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Row Content */}
                      {isRowExpanded && (
                        <tr key={`${evaluation.id}-expanded`} className="transition-all duration-200">
                          <td colSpan={4} className="px-4 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {/* Full Question */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                                  Spørgsmål
                                </h4>
                                <p className="text-sm text-gray-900 leading-relaxed">
                                  {evaluation.question}
                                </p>
                              </div>

                              {/* LLM Answer */}
                              {evaluation.answer && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                                    LLM Svar
                                  </h4>
                                  <div className="bg-white border-l-4 border-primary-500 pl-4 py-3 rounded-r">
                                    <p className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none">
                                      {evaluation.answer}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Judge's Reason */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                                  Dommerens Begrundelse
                                </h4>
                                {judgeReason ? (
                                  <div className="bg-white border-l-4 border-purple-500 pl-4 py-3 rounded-r">
                                    <p className="text-sm text-gray-900 leading-relaxed font-medium">
                                      {judgeReason}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">
                                    Ingen begrundelse
                                  </p>
                                )}
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
        </div>
      )}
    </div>
  )
}

