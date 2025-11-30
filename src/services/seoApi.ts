import { supabase } from '../lib/supabase'

export interface GSCDataPoint {
  date: string
  query: string
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface SeoKPIs {
  totalClicks: number
  totalImpressions: number
  avgCTR: number
  avgPosition: number
}

export interface TimeSeriesData {
  date: string
  clicks: number
  impressions: number
}

export interface TopQuery {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface TopPage {
  page: string
  clicks: number
  impressions: number
}

export interface SeoData {
  kpis: SeoKPIs
  timeSeries: TimeSeriesData[]
  topQueries: TopQuery[]
  topPages: TopPage[]
  rawData?: GSCDataPoint[] // Store raw data for frontend filtering
}

// Generate mock data matching GSC structure
function generateMockData(): GSCDataPoint[] {
  const queries = [
    'himmelstrup events',
    'eventbureau københavn',
    'himmelstrup',
    'corporate events danmark',
    'eventplanlægning',
    'bedste eventbureau',
    'himmelstrup events københavn',
    'firmafest københavn',
    'teambuilding danmark',
    'konference arrangør',
  ]

  const pages = [
    'https://himmelstrup.dk/',
    'https://himmelstrup.dk/om-os',
    'https://himmelstrup.dk/services',
    'https://himmelstrup.dk/kontakt',
    'https://himmelstrup.dk/cases',
  ]

  const data: GSCDataPoint[] = []
  const today = new Date()
  
  // Generate data for last 28 days
  for (let i = 27; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    // Generate 5-10 data points per day
    const pointsPerDay = Math.floor(Math.random() * 6) + 5
    
    for (let j = 0; j < pointsPerDay; j++) {
      const query = queries[Math.floor(Math.random() * queries.length)]
      const page = pages[Math.floor(Math.random() * pages.length)]
      const impressions = Math.floor(Math.random() * 500) + 10
      const ctr = Math.random() * 0.1 + 0.01 // 1-11% CTR
      const clicks = Math.floor(impressions * ctr)
      const position = Math.random() * 20 + 1 // Position 1-21

      data.push({
        date: dateStr,
        query,
        page,
        clicks,
        impressions,
        ctr: ctr * 100, // Convert to percentage
        position,
      })
    }
  }

  return data
}

// Calculate KPIs from raw data
// IMPORTANT: CTR must be calculated as (Total Clicks / Total Impressions) * 100
// NOT as an average of daily CTR percentages (that gives wrong math)
function calculateKPIs(data: GSCDataPoint[]): SeoKPIs {
  const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0)
  const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0)
  
  // Correct CTR calculation: (Total Clicks / Total Impressions) * 100
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  
  // Weighted average position (weighted by impressions)
  const totalWeightedPosition = data.reduce((sum, d) => sum + (d.position * d.impressions), 0)
  const avgPosition = totalImpressions > 0 ? totalWeightedPosition / totalImpressions : 0

  return {
    totalClicks,
    totalImpressions,
    avgCTR,
    avgPosition,
  }
}

// Group data by date for time series
function groupByDate(data: GSCDataPoint[]): TimeSeriesData[] {
  const grouped = new Map<string, { clicks: number; impressions: number }>()

  data.forEach((d) => {
    const existing = grouped.get(d.date) || { clicks: 0, impressions: 0 }
    grouped.set(d.date, {
      clicks: existing.clicks + d.clicks,
      impressions: existing.impressions + d.impressions,
    })
  })

  return Array.from(grouped.entries())
    .map(([date, values]) => ({
      date,
      clicks: values.clicks,
      impressions: values.impressions,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Get top queries with proper aggregation
function getTopQueries(data: GSCDataPoint[]): TopQuery[] {
  const grouped = new Map<
    string,
    { clicks: number; impressions: number; weightedPosition: number }
  >()

  data.forEach((d) => {
    const existing = grouped.get(d.query) || {
      clicks: 0,
      impressions: 0,
      weightedPosition: 0,
    }
    grouped.set(d.query, {
      clicks: existing.clicks + d.clicks,
      impressions: existing.impressions + d.impressions,
      weightedPosition: existing.weightedPosition + (d.position * d.impressions),
    })
  })

  return Array.from(grouped.entries())
    .map(([query, values]) => {
      // Calculate CTR correctly: (clicks / impressions) * 100
      const ctr = values.impressions > 0 ? (values.clicks / values.impressions) * 100 : 0
      // Calculate weighted average position
      const avgPosition = values.impressions > 0 ? values.weightedPosition / values.impressions : 0
      
      return {
        query,
        clicks: values.clicks,
        impressions: values.impressions,
        ctr,
        position: avgPosition,
      }
    })
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20) // Top 20
}

// Get top pages
function getTopPages(data: GSCDataPoint[]): TopPage[] {
  const grouped = new Map<string, { clicks: number; impressions: number }>()

  data.forEach((d) => {
    const existing = grouped.get(d.page) || { clicks: 0, impressions: 0 }
    grouped.set(d.page, {
      clicks: existing.clicks + d.clicks,
      impressions: existing.impressions + d.impressions,
    })
  })

  return Array.from(grouped.entries())
    .map(([page, values]) => ({
      page,
      clicks: values.clicks,
      impressions: values.impressions,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20) // Top 20
}

/**
 * Helper function to generate mock data (used as fallback)
 */
function getMockData(
  startDate?: string,
  endDate?: string,
  brandOnly?: 'all' | 'brand' | 'non-brand'
): SeoData {
  let mockData = generateMockData()

  // Apply date filter if provided
  if (startDate || endDate) {
    mockData = mockData.filter((d) => {
      if (startDate && d.date < startDate) return false
      if (endDate && d.date > endDate) return false
      return true
    })
  }

  // Apply brand filter if provided
  if (brandOnly === 'brand') {
    mockData = mockData.filter((d) =>
      d.query.toLowerCase().includes('himmelstrup')
    )
  } else if (brandOnly === 'non-brand') {
    mockData = mockData.filter((d) =>
      !d.query.toLowerCase().includes('himmelstrup')
    )
  }

  return {
    kpis: calculateKPIs(mockData),
    timeSeries: groupByDate(mockData),
    topQueries: getTopQueries(mockData),
    topPages: getTopPages(mockData),
    rawData: mockData,
  }
}

/**
 * Fetches SEO data from Supabase (or returns mock data if not configured)
 * Based on Python script structure and Supabase schema:
 * - seo_snapshots table: created_at, gsc_clicks, gsc_impressions, gsc_ctr, gsc_avg_position
 *   Each row is an aggregated snapshot for a specific date
 * - page_performance table: created_at, page_name, clicks, impressions, ctr, position
 *   Contains page-level detailed data (used for Top Pages table)
 */
export async function fetchSeoData(
  startDate?: string,
  endDate?: string,
  brandOnly?: 'all' | 'brand' | 'non-brand'
): Promise<SeoData> {
  // Check if Supabase is configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

  // If Supabase is not configured, return mock data
  if (!supabaseUrl || !supabaseKey || !supabase) {
    console.log('Supabase not configured, using mock data')
    await new Promise((resolve) => setTimeout(resolve, 300)) // Simulate API delay
    return getMockData(startDate, endDate, brandOnly)
  }

  // Real Supabase query
  try {
    console.log('Fetching SEO data from Supabase...', { startDate, endDate, brandOnly })
    
    // Query seo_snapshots table (as per Python script line 38)
    // This table contains aggregated snapshots: created_at, gsc_clicks, gsc_impressions, gsc_ctr, gsc_avg_position
    // Each row is a snapshot with aggregated metrics for that date
    const tableName = 'seo_snapshots'
    let data: any[] | null = null
    let error: any = null

    try {
      console.log(`Fetching from table: ${tableName}`)
      
      // Build query with date filtering on created_at column
      let query = supabase.from(tableName).select('*')
      
      // Apply date filtering (Python script uses created_at)
      // If startDate is not provided, fetch all historical data
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        // For end date, we need to include the full day, so add time component
        const endDateTime = `${endDate}T23:59:59`
        query = query.lte('created_at', endDateTime)
      }
      
      // Order by created_at ascending to get chronological order for the chart
      // We'll reverse it if needed, but for the chart we want oldest first
      query = query.order('created_at', { ascending: true }).limit(5000)

      const result = await query
      
      if (result.error) {
        console.error(`Error with table ${tableName}:`, result.error.message)
        error = result.error
        throw error
      }
      
      if (result.data && result.data.length > 0) {
        data = result.data
        console.log(`✅ Successfully fetched ${data.length} records from table: ${tableName}`)
        // Log first record to see column structure
        if (data.length > 0) {
          console.log('Sample record columns:', Object.keys(data[0]))
          console.log('Sample record:', JSON.stringify(data[0], null, 2))
        }
      } else {
        console.log(`Table ${tableName} exists but has no data in date range`)
      }
    } catch (e) {
      console.error(`Exception querying table ${tableName}:`, e)
      throw e
    }

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.warn('No data returned from Supabase. Check table name and data availability.')
      return getMockData(startDate, endDate, brandOnly)
    }

    // Map seo_snapshots data to our expected structure
    // Column mapping based on Supabase screenshot:
    // - created_at -> date (extract date part)
    // - gsc_clicks -> clicks
    // - gsc_impressions -> impressions
    // - gsc_ctr -> ctr (already a percentage)
    // - gsc_avg_position -> position
    // Note: seo_snapshots contains aggregated snapshots (one row per date)
    // Each snapshot represents aggregated metrics for that date
    // For query/page data, we'll need to use page_performance table separately
    let filteredData: GSCDataPoint[] = data.map((row: any) => {
      // Extract date from created_at timestamp
      let dateValue = ''
      if (row.created_at) {
        dateValue = row.created_at.split('T')[0] // Extract YYYY-MM-DD
      }
      
      // seo_snapshots doesn't have page/query data, so we'll use placeholder
      // The main chart will show aggregated metrics per date
      const pageValue = row.page_name || row.page || row.url || 'aggregated'
      const queryValue = row.query || row.Query || row.keyword || 'aggregated'
      
      return {
        date: dateValue,
        query: queryValue,
        page: pageValue,
        clicks: Number(row.gsc_clicks || row.clicks || 0),
        impressions: Number(row.gsc_impressions || row.impressions || 0),
        ctr: Number(row.gsc_ctr || row.ctr || 0), // Already a percentage in the database
        position: Number(row.gsc_avg_position || row.position || row.avg_position || 0),
      }
    }).filter((d: GSCDataPoint) => d.date) // Filter out invalid rows (only need date, page/query are placeholders)

    console.log(`Processed ${filteredData.length} valid records from Supabase`)
    
    // Log date range of fetched data
    if (filteredData.length > 0) {
      const dates = filteredData.map(d => d.date).sort()
      const minDate = dates[0]
      const maxDate = dates[dates.length - 1]
      console.log(`Date range in data: ${minDate} to ${maxDate} (${dates.length} unique dates)`)
    }

    // Note: seo_snapshots contains aggregated data, so brand filtering doesn't apply here
    // Brand filtering would need to be done at the query/page level using page_performance table
    // For now, we'll use all snapshots for the main chart

    if (filteredData.length === 0) {
      console.warn('No valid data after processing, using mock data')
      return getMockData(startDate, endDate, brandOnly)
    }

    return {
      kpis: calculateKPIs(filteredData),
      timeSeries: groupByDate(filteredData),
      topQueries: getTopQueries(filteredData),
      topPages: getTopPages(filteredData),
      rawData: filteredData, // Store raw data for frontend filtering
    }
  } catch (error) {
    console.error('Error fetching SEO data from Supabase:', error)
    // Fallback to mock data on error
    return getMockData(startDate, endDate, brandOnly)
  }
}

