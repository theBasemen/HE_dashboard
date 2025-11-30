export interface LiquidityDataPoint {
  month: string
  liquidity: number
  date: Date // Add date for easier date comparisons
}

export interface MonthlyHistory {
  month: string
  revenue: number
  variable_costs: number
  fixed_costs: number
  result: number
}

export interface FinancialKPIs {
  revenue_ltm: number
  ebitda_ltm: number
  gross_margin_pct: number
  profit_margin_pct: number
  valuation_low: number
  valuation_high: number
  valuation_method: string
}

export interface FinanceData {
  currentLiquidity: number
  owedVAT: number
  runwayMonths: number
  liquidityProjection: LiquidityDataPoint[]
  kpis: FinancialKPIs
  history: MonthlyHistory[]
}

// Helper function to parse month string to Date
const parseMonthToDate = (monthStr: string): Date => {
  // Format: "Dec 2025", "Jan 2026", etc.
  const [monthName, year] = monthStr.split(' ')
  const monthMap: { [key: string]: number } = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Maj': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Dec': 11
  }
  const month = monthMap[monthName] ?? 0
  const yearNum = parseInt(year)
  return new Date(yearNum, month, 1)
}

/**
 * Fetches finance data from the API
 * Returns comprehensive financial insights including valuation and profitability data
 */
export async function fetchFinanceData(): Promise<FinanceData> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Financial insights data
  const financialInsights = {
    // LTM = Last Twelve Months (Real data)
    kpis: {
      revenue_ltm: 2590216,   // Omsætning
      ebitda_ltm: 880640,     // Driftsresultat
      gross_margin_pct: 70.0, // Dækningsgrad (Estimeret)
      profit_margin_pct: 34.0, // Overskudsgrad
      valuation_low: 2600000,
      valuation_high: 4400000,
      valuation_method: "3x - 5x EBITDA"
    },
    // Monthly history for 2025 (Derived from actual posting data)
    history: [
      { month: 'Jan 2025', revenue: 836100, variable_costs: 84762, fixed_costs: 86585, result: 664753 },
      { month: 'Feb 2025', revenue: 239296, variable_costs: 192517, fixed_costs: 100296, result: -53517 },
      { month: 'Mar 2025', revenue: 267158, variable_costs: 114248, fixed_costs: 96006, result: 56904 },
      { month: 'Apr 2025', revenue: 114500, variable_costs: 17125, fixed_costs: 70492, result: 26883 },
      { month: 'Maj 2025', revenue: 256300, variable_costs: 62655, fixed_costs: 89003, result: 104642 },
      { month: 'Jun 2025', revenue: 125000, variable_costs: 65250, fixed_costs: 79926, result: -20176 },
      { month: 'Jul 2025', revenue: 12942, variable_costs: 2080, fixed_costs: 90606, result: -79744 },
      { month: 'Aug 2025', revenue: 60150, variable_costs: 66223, fixed_costs: 92282, result: -98355 },
      { month: 'Sep 2025', revenue: 557270, variable_costs: 157336, fixed_costs: 102771, result: 297163 },
      { month: 'Okt 2025', revenue: 85000, variable_costs: 12139, fixed_costs: 101359, result: -28498 },
      { month: 'Nov 2025', revenue: 36500, variable_costs: 3700, fixed_costs: 22207, result: 10593 }
    ]
  }

  // Existing liquidity projection data
  const rawData = {
    current_status: {
      cash_on_hand: 783408,
      vat_due_total: 45625,
      runway_months: 24
    },
    scenario_active: false,
    projection: [
      { month: 'Dec 2025', revenue_projected: 0, expenses_total: 0, vat_payment: 0, cash_on_hand_end: 783408, is_danger_zone: false },
      { month: 'Jan 2026', revenue_projected: 836100, expenses_total: 302372, vat_payment: 0, cash_on_hand_end: 1317136, is_danger_zone: false },
      { month: 'Feb 2026', revenue_projected: 239296, expenses_total: 301509, vat_payment: 0, cash_on_hand_end: 1254923, is_danger_zone: false },
      { month: 'Mar 2026', revenue_projected: 267158, expenses_total: 248584, vat_payment: 133464, cash_on_hand_end: 1140033, is_danger_zone: false },
      { month: 'Apr 2026', revenue_projected: 114500, expenses_total: 115254, vat_payment: 0, cash_on_hand_end: 1139279, is_danger_zone: false },
      { month: 'Maj 2026', revenue_projected: 256300, expenses_total: 162548, vat_payment: 0, cash_on_hand_end: 1233031, is_danger_zone: false },
      { month: 'Jun 2026', revenue_projected: 125000, expenses_total: 158616, vat_payment: 23438, cash_on_hand_end: 1175977, is_danger_zone: false },
      { month: 'Jul 2026', revenue_projected: 12942, expenses_total: 108337, vat_payment: 0, cash_on_hand_end: 1080582, is_danger_zone: false },
      { month: 'Aug 2026', revenue_projected: 60150, expenses_total: 191469, vat_payment: 0, cash_on_hand_end: 949263, is_danger_zone: false },
      { month: 'Sep 2026', revenue_projected: 557270, expenses_total: 278000, vat_payment: 0, cash_on_hand_end: 1228533, is_danger_zone: false },
      { month: 'Okt 2026', revenue_projected: 85000, expenses_total: 121461, vat_payment: 69818, cash_on_hand_end: 1122254, is_danger_zone: false },
      { month: 'Nov 2026', revenue_projected: 36500, expenses_total: 35357, vat_payment: 0, cash_on_hand_end: 1123397, is_danger_zone: false },
      { month: 'Dec 2026', revenue_projected: 0, expenses_total: 0, vat_payment: -8829, cash_on_hand_end: 1132226, is_danger_zone: false },
      { month: 'Jan 2027', revenue_projected: 836100, expenses_total: 302372, vat_payment: 0, cash_on_hand_end: 1665954, is_danger_zone: false },
    ]
  }

  // Transform projection data to LiquidityDataPoint format
  const liquidityProjection: LiquidityDataPoint[] = rawData.projection.map(item => ({
    month: item.month,
    liquidity: item.cash_on_hand_end,
    date: parseMonthToDate(item.month)
  }))

  // Return comprehensive finance data
  return {
    currentLiquidity: rawData.current_status.cash_on_hand,
    owedVAT: rawData.current_status.vat_due_total,
    runwayMonths: rawData.current_status.runway_months,
    liquidityProjection,
    kpis: financialInsights.kpis,
    history: financialInsights.history
  }
}
