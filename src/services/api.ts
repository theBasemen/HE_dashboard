import { supabase } from '../lib/supabase'

/**
 * Monthly history data structure from finance_history_years.data
 */
export interface MonthlyHistory {
  month: string
  revenue: number
  variable_costs: number
  fixed_costs: number
  result: number
}

/**
 * TypeScript interface matching the finance_snapshots table schema exactly
 */
export interface FinanceSnapshot {
  id: string
  created_at: string
  
  // Liquidity components
  cash_on_hand: number
  receivables: number
  creditors: number
  vat_due: number
  short_term_debt: number
  
  // Balance sheet
  provisions: number
  equity: number
  net_liquidity: number
  
  // Performance metrics
  revenue_ltm: number
  ebitda_ltm: number
  
  // Margins
  gross_margin_pct: number
  profit_margin_pct: number
  
  // Valuation
  valuation_low: number
  valuation_high: number
  
  // Raw data JSONB column
  raw_data?: {
    history?: MonthlyHistory[]
    [key: string]: any
  }
  
  // Parsed history (for convenience)
  history?: MonthlyHistory[]
}

/**
 * Finance roadmap data structure from finance_roadmap_2026 table
 */
export interface FinanceRoadmap2026 {
  month_id: string
  month_name: string
  expected_turnover: number
  expected_costs: number
  expected_result: number
  budget_target: number
  break_even_point: number
  actual_turnover: number
  actual_costs: number
}

/**
 * Fetches finance roadmap data for 2026 from finance_roadmap_2026 table
 * Returns all rows ordered by month_id ascending
 */
export async function fetchFinanceRoadmap2026(): Promise<FinanceRoadmap2026[]> {
  if (!supabase) {
    console.error('Supabase client not configured')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('finance_roadmap_2026')
      .select('*')
      .order('month_id', { ascending: true })

    if (error) {
      console.error('Error fetching finance roadmap 2026:', error)
      return []
    }

    if (data && Array.isArray(data)) {
      return data as FinanceRoadmap2026[]
    }

    return []
  } catch (error) {
    console.error('Failed to fetch finance roadmap 2026:', error)
    return []
  }
}

/**
 * Fetches yearly history for a specific year from finance_history_years table
 */
async function fetchYearlyHistory(year: number): Promise<MonthlyHistory[]> {
  if (!supabase) {
    console.error('Supabase client not configured')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('finance_history_years')
      .select('data')
      .eq('year', year)
      .single()

    if (error) {
      console.warn(`No history data found for year ${year}:`, error.message)
      return []
    }

    if (data && data.data && Array.isArray(data.data)) {
      return data.data as MonthlyHistory[]
    }

    return []
  } catch (error) {
    console.error(`Error fetching history for year ${year}:`, error)
    return []
  }
}

/**
 * Fetches the latest finance snapshot from Supabase
 * Returns the single most recent row from finance_snapshots table
 * Also fetches historical data from finance_history_years table
 */
export async function fetchFinanceData(): Promise<FinanceSnapshot | null> {
  if (!supabase) {
    console.error('Supabase client not configured')
    return null
  }

  try {
    // Fetch the latest snapshot
    const { data, error } = await supabase
      .from('finance_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching finance snapshot:', error)
      return null
    }

    const snapshot = data as FinanceSnapshot

    // Fetch historical data from finance_history_years table
    // Get current year and previous year to get comprehensive history
    const currentYear = new Date().getFullYear()
    const previousYear = currentYear - 1

    // Fetch both years and combine
    const [currentYearHistory, previousYearHistory] = await Promise.all([
      fetchYearlyHistory(currentYear),
      fetchYearlyHistory(previousYear)
    ])

    // Combine histories (previous year first, then current year)
    const combinedHistory = [...previousYearHistory, ...currentYearHistory]

    if (combinedHistory.length > 0) {
      snapshot.history = combinedHistory
      console.log(`✅ Fetched ${combinedHistory.length} history entries (${previousYearHistory.length} from ${previousYear}, ${currentYearHistory.length} from ${currentYear})`)
    } else {
      snapshot.history = []
      console.warn('⚠️ No history data found in finance_history_years table')
    }

    return snapshot
  } catch (error) {
    console.error('Failed to fetch finance data:', error)
    return null
  }
}
