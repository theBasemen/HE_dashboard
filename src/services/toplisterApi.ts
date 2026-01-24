import { supabase } from '../lib/supabase'

/**
 * Top job by revenue (single invoice/job)
 */
export interface TopJob {
  snapshot_date: string
  invoice_id: number
  date: string
  customer: string
  amount: number
  description: string | null
}

/**
 * Top customer by revenue
 */
export interface TopCustomerRevenue {
  snapshot_date: string
  customer: string
  invoice_count: number
  total_revenue: number
}

/**
 * Top customer by recurrence (number of invoices)
 */
export interface TopCustomerRecurring {
  snapshot_date: string
  customer: string
  invoice_count: number
  total_revenue: number
}

/**
 * Fetch top jobs by revenue from he_finance_top_jobs_latest view
 */
export async function fetchTopJobs(): Promise<TopJob[]> {
  if (!supabase) {
    console.error('Supabase client not configured')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('he_finance_top_jobs_latest')
      .select('*')
      .order('amount', { ascending: false })

    if (error) {
      console.error('Error fetching top jobs:', error)
      return []
    }

    return (data || []) as TopJob[]
  } catch (err) {
    console.error('Failed to fetch top jobs:', err)
    return []
  }
}

/**
 * Fetch top customers by revenue from he_finance_top_customers_revenue_latest view
 */
export async function fetchTopCustomersByRevenue(): Promise<TopCustomerRevenue[]> {
  if (!supabase) {
    console.error('Supabase client not configured')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('he_finance_top_customers_revenue_latest')
      .select('*')
      .order('total_revenue', { ascending: false })

    if (error) {
      console.error('Error fetching top customers by revenue:', error)
      return []
    }

    return (data || []) as TopCustomerRevenue[]
  } catch (err) {
    console.error('Failed to fetch top customers by revenue:', err)
    return []
  }
}

/**
 * Fetch top customers by recurrence from he_finance_top_customers_recurring_latest view
 */
export async function fetchTopCustomersByRecurring(): Promise<TopCustomerRecurring[]> {
  if (!supabase) {
    console.error('Supabase client not configured')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('he_finance_top_customers_recurring_latest')
      .select('*')
      .order('invoice_count', { ascending: false })
      .order('total_revenue', { ascending: false })

    if (error) {
      console.error('Error fetching top customers by recurring:', error)
      return []
    }

    return (data || []) as TopCustomerRecurring[]
  } catch (err) {
    console.error('Failed to fetch top customers by recurring:', err)
    return []
  }
}

/**
 * Fetch all top list data from the snapshot table
 * The data is stored in JSON columns that need to be parsed
 */
export async function fetchAllTopLists(): Promise<{
  topJobs: TopJob[]
  topCustomersByRevenue: TopCustomerRevenue[]
  topCustomersByRecurring: TopCustomerRecurring[]
  snapshotDate: string | null
}> {
  if (!supabase) {
    console.error('Supabase client not configured')
    return {
      topJobs: [],
      topCustomersByRevenue: [],
      topCustomersByRecurring: [],
      snapshotDate: null
    }
  }

  try {
    // First try to fetch from views (for backwards compatibility)
    const [topJobsFromView, topCustomersByRevenueFromView, topCustomersByRecurringFromView] = await Promise.all([
      fetchTopJobs(),
      fetchTopCustomersByRevenue(),
      fetchTopCustomersByRecurring()
    ])

    // If views have data, use them
    if (topJobsFromView.length > 0 || topCustomersByRevenueFromView.length > 0 || topCustomersByRecurringFromView.length > 0) {
      const snapshotDate = topJobsFromView[0]?.snapshot_date || 
                          topCustomersByRevenueFromView[0]?.snapshot_date || 
                          topCustomersByRecurringFromView[0]?.snapshot_date || 
                          null

      return {
        topJobs: topJobsFromView,
        topCustomersByRevenue: topCustomersByRevenueFromView,
        topCustomersByRecurring: topCustomersByRecurringFromView,
        snapshotDate
      }
    }

    // Otherwise, try to fetch from the snapshot table with JSON columns
    // Try common table names
    const possibleTableNames = [
      'he_finance_customer_stats', // Primary table name
      'he_finance_top_lists',
      'he_finance_top_lists_snapshot',
      'finance_top_lists',
      'top_lists_snapshot',
      'he_top_lists',
      'top_lists',
      'he_finance_top_list_snapshot',
      'finance_top_list_snapshot'
    ]

    let snapshotData: any = null

    for (const table of possibleTableNames) {
      try {
        // Try with maybeSingle first (handles 0 or 1 row)
        const { data, error } = await supabase
          .from(table)
          .select('snapshot_date, generated_at, top_jobs, top_customers_by_revenue, top_customers_by_recurring')
          .order('snapshot_date', { ascending: false })
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          snapshotData = data
          break
        } else if (error && error.code !== 'PGRST116') {
          // PGRST116 means no rows found, which is fine - try next table
          // If maybeSingle fails, try without it (might return array)
          const { data: arrayData, error: arrayError } = await supabase
            .from(table)
            .select('snapshot_date, generated_at, top_jobs, top_customers_by_revenue, top_customers_by_recurring')
            .order('snapshot_date', { ascending: false })
            .order('generated_at', { ascending: false })
            .limit(1)
          
          if (!arrayError && arrayData && arrayData.length > 0) {
            snapshotData = arrayData[0]
            break
          }
        }
      } catch (err: any) {
        // Table doesn't exist or other error, try next
        continue
      }
    }

    if (!snapshotData) {
      console.warn('No top lists data found in views or snapshot table')
      return {
        topJobs: [],
        topCustomersByRevenue: [],
        topCustomersByRecurring: [],
        snapshotDate: null
      }
    }

    // Parse JSON columns
    let topJobs: TopJob[] = []
    let topCustomersByRevenue: TopCustomerRevenue[] = []
    let topCustomersByRecurring: TopCustomerRecurring[] = []

    try {
      if (snapshotData.top_jobs) {
        const parsed = typeof snapshotData.top_jobs === 'string' 
          ? JSON.parse(snapshotData.top_jobs) 
          : snapshotData.top_jobs
        if (Array.isArray(parsed)) {
          topJobs = parsed.map((job: any) => ({
            snapshot_date: snapshotData.snapshot_date,
            invoice_id: job.invoice_id,
            date: job.date,
            customer: job.customer,
            amount: job.amount,
            description: job.description || null
          }))
        }
      }
    } catch (err) {
      console.error('Error parsing top_jobs JSON:', err)
    }

    try {
      if (snapshotData.top_customers_by_revenue) {
        const parsed = typeof snapshotData.top_customers_by_revenue === 'string'
          ? JSON.parse(snapshotData.top_customers_by_revenue)
          : snapshotData.top_customers_by_revenue
        if (Array.isArray(parsed)) {
          topCustomersByRevenue = parsed.map((customer: any) => ({
            snapshot_date: snapshotData.snapshot_date,
            customer: customer.customer,
            invoice_count: customer.invoice_count,
            total_revenue: customer.total_revenue
          }))
        }
      }
    } catch (err) {
      console.error('Error parsing top_customers_by_revenue JSON:', err)
    }

    try {
      if (snapshotData.top_customers_by_recurring) {
        const parsed = typeof snapshotData.top_customers_by_recurring === 'string'
          ? JSON.parse(snapshotData.top_customers_by_recurring)
          : snapshotData.top_customers_by_recurring
        if (Array.isArray(parsed)) {
          topCustomersByRecurring = parsed.map((customer: any) => ({
            snapshot_date: snapshotData.snapshot_date,
            customer: customer.customer,
            invoice_count: customer.invoice_count,
            total_revenue: customer.total_revenue
          }))
        }
      }
    } catch (err) {
      console.error('Error parsing top_customers_by_recurring JSON:', err)
    }

    return {
      topJobs,
      topCustomersByRevenue,
      topCustomersByRecurring,
      snapshotDate: snapshotData.snapshot_date || snapshotData.generated_at || null
    }
  } catch (err) {
    console.error('Failed to fetch top lists:', err)
    return {
      topJobs: [],
      topCustomersByRevenue: [],
      topCustomersByRecurring: [],
      snapshotDate: null
    }
  }
}
