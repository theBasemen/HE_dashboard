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
 * Project statistics data structure
 */
export interface ProjectStatistics {
  project_id: string
  project_name: string
  project_color: string | null
  project_type: string | null
  expected_turnover: number
  expected_costs: number
  internal_cost: number // Intern kostpris = sum(hours * hourly_rate)
  expected_result: number
}

/**
 * Fetches project statistics from he_time_projects and he_time_logs
 * Returns statistics for all projects including expected turnover, expected costs,
 * registered hours, and expected result
 */
export async function fetchProjectStatistics(): Promise<ProjectStatistics[]> {
  if (!supabase) {
    console.error('Supabase client not configured')
    return []
  }

  try {
    // Fetch all projects - use * to get all columns in case expected_turnover/expected_costs don't exist yet
    const { data: projects, error: projectsError } = await supabase
      .from('he_time_projects')
      .select('*')
      .eq('is_hidden', false)
      .order('name', { ascending: true })

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return []
    }

    if (!projects || projects.length === 0) {
      return []
    }

    // Fetch all time logs with user_id
    const { data: timeLogs, error: logsError } = await supabase
      .from('he_time_logs')
      .select('project_id, hours, user_id')

    if (logsError) {
      console.error('Error fetching time logs:', logsError)
      // Continue even if logs fail, just use 0 cost
    }

    // Fetch all users with hourly_rate
    const { data: users, error: usersError } = await supabase
      .from('he_time_users')
      .select('id, hourly_rate')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      // Continue even if users fail, just use 0 cost
    }

    // Create a map of user_id -> hourly_rate
    const userRateMap = new Map<string, number>()
    if (users) {
      users.forEach((user: any) => {
        if (user.id && user.hourly_rate !== null && user.hourly_rate !== undefined) {
          userRateMap.set(user.id, user.hourly_rate)
        }
      })
    }

    // Calculate internal cost per project (sum of hours * hourly_rate for each log)
    const internalCostByProject: Record<string, number> = {}
    if (timeLogs) {
      timeLogs.forEach(log => {
        if (log.project_id && log.user_id && log.hours) {
          const hourlyRate = userRateMap.get(log.user_id) || 0
          const cost = log.hours * hourlyRate
          internalCostByProject[log.project_id] = (internalCostByProject[log.project_id] || 0) + cost
        }
      })
    }

    // Build statistics for each project, filtering out internal projects
    const statistics: ProjectStatistics[] = projects
      .filter((project: any) => {
        // Filter out internal projects - only show customer projects
        const projectType = project.type
        return projectType !== 'internal' && projectType !== 'Internt'
      })
      .map((project: any) => {
        // Handle both expected_cost and expected_costs column names
        const expectedTurnover = (project.expected_turnover ?? 0) as number
        const expectedCosts = (project.expected_cost ?? project.expected_costs ?? 0) as number
        const internalCost = internalCostByProject[project.id] || 0
        const expectedResult = expectedTurnover - expectedCosts - internalCost

        return {
          project_id: project.id,
          project_name: project.name,
          project_color: project.color || null,
          project_type: project.type || null,
          expected_turnover: expectedTurnover,
          expected_costs: expectedCosts,
          internal_cost: internalCost,
          expected_result: expectedResult,
        }
      })

    return statistics
  } catch (error) {
    console.error('Failed to fetch project statistics:', error)
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
