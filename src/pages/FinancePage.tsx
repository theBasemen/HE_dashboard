import { useState, useEffect } from 'react'
import { Award, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import { fetchFinanceData, FinanceSnapshot, fetchDashboardLiquiditySummary, type DashboardLiquiditySummaryData } from '../services/api'
import FinanceRoadmap2026Component from '../components/FinanceRoadmap2026'
import LiquiditySummarySection from '../components/LiquiditySummarySection'
import ProjectStatistics from '../components/ProjectStatistics'

// FinancePage component - displays executive overview and yearly financial data
export default function FinancePage() {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null)
  const [liquiditySummary, setLiquiditySummary] = useState<DashboardLiquiditySummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [financeData, liquidityData] = await Promise.all([
        fetchFinanceData(),
        fetchDashboardLiquiditySummary(),
      ])
      if (!financeData) {
        setError('Ingen data tilgængelig')
      } else {
        setSnapshot(financeData)
      }
      setLiquiditySummary(liquidityData)
    } catch (err) {
      console.error('Failed to fetch finance data:', err)
      setError('Fejl ved indlæsning af data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpdateData = async () => {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_UPDATE_FINANCE
    
    if (!webhookUrl) {
      setError('Webhook URL er ikke konfigureret')
      return
    }

    try {
      setUpdating(true)
      setError(null)
      
      // Call n8n webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error(`Webhook fejlede: ${response.statusText}`)
      }

      // Wait a bit for n8n to process, then refresh data
      // You might want to adjust this delay based on your n8n workflow
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Refresh the data
      await loadData()
    } catch (err) {
      console.error('Failed to update finance data:', err)
      setError('Fejl ved opdatering af data. Prøv igen senere.')
    } finally {
      setUpdating(false)
    }
  }

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

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Ukendt'
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch {
      return 'Ukendt'
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-9 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded w-96 mt-2 animate-pulse"></div>
        </div>
        <div className="w-full bg-white rounded-xl border border-gray-200 p-8">
          <div className="h-40 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  // Error or empty state
  if (error || !snapshot) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Økonomi & Likviditet</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center space-x-3 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <p className="text-lg">{error || 'Ingen finansielle data tilgængelig'}</p>
          </div>
          <p className="mt-2 text-gray-600">
            Data opdateres dagligt kl. 06:00. Prøv igen senere.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Økonomi & Likviditet</h1>
        <p className="mt-2 text-gray-600">
          Ledelsesoversigt af virksomhedens økonomiske nøgletal
        </p>
        <div className="mt-1 flex items-center gap-3">
          <p className="text-sm text-gray-500">
            Data opdateret: {formatDate(snapshot.created_at)}
          </p>
          <div className="group relative">
            <button
              onClick={handleUpdateData}
              disabled={updating || loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Opdaterer...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Opdater tal</span>
                </>
              )}
            </button>
            {/* Tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap pointer-events-none">
              Træk de seneste tal fra Dinero og Trello
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Likviditet */}
      <LiquiditySummarySection data={liquiditySummary} />

      {/* Finance Roadmap 2026 */}
      <FinanceRoadmap2026Component overrideBreakEven={null} />

      {/* Project Statistics */}
      <ProjectStatistics />

      {/* Yearly Financial Overview removed per UI request */}

      {/* Zone A: Enterprise Value (Moved to bottom, less prominent) */}
      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow-sm border border-yellow-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-3">
              <Award className="h-5 w-5 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-900">Virksomhedsværdi</h2>
            </div>
            <p className="text-xs text-gray-700 mb-4">Estimeret virksomhedsværdi</p>
            
            {/* Main Valuation Range */}
            <div className="mb-4">
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(snapshot.valuation_low / 1000000)} mio. - {formatNumber(snapshot.valuation_high / 1000000)} mio. DKK
              </p>
            </div>

            {/* Method Badge */}
            <div className="flex items-center space-x-3 mb-4">
              <span className="px-3 py-1 bg-yellow-200 text-yellow-900 text-xs font-medium rounded-full">
                Metode: 3x-5x EBITDA
              </span>
            </div>

            {/* EBITDA Context */}
            <div className="bg-white/70 rounded-lg p-3 border border-yellow-200">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Driftsresultat (EBITDA LTM):</span>{' '}
                {formatCurrency(snapshot.ebitda_ltm)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Baseret på sidste 12 måneders driftsresultat. Standard værdiansættelse for sunde servicevirksomheder.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
