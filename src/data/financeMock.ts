export interface LiquidityDataPoint {
  month: string
  liquidity: number
}

export interface FinanceData {
  currentLiquidity: number
  owedVAT: number
  runwayMonths: number
  liquidityProjection: LiquidityDataPoint[]
  liquidityProjectionWithHiring: LiquidityDataPoint[]
}

// Mock data for 24 months forward
const generateMonths = (): string[] => {
  const months: string[] = []
  const today = new Date()
  for (let i = 0; i < 24; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1)
    months.push(date.toLocaleDateString('da-DK', { month: 'short', year: 'numeric' }))
  }
  return months
}

const months = generateMonths()

// Base projection: starts at 450k, gradually decreases with some volatility
const baseProjection: LiquidityDataPoint[] = months.map((month, index) => {
  const baseValue = 450000 - (index * 15000) + (Math.sin(index / 3) * 20000)
  return {
    month,
    liquidity: Math.round(baseValue)
  }
})

// Projection with 2x new hires: additional monthly cost of ~80k per person = 160k/month
const projectionWithHiring: LiquidityDataPoint[] = months.map((month, index) => {
  const baseValue = 450000 - (index * 15000) + (Math.sin(index / 3) * 20000)
  const hiringCost = index >= 3 ? 160000 * (index - 2) : 0 // Hiring starts month 3
  return {
    month,
    liquidity: Math.round(baseValue - hiringCost)
  }
})

export const financeMockData: FinanceData = {
  currentLiquidity: 450000,
  owedVAT: 125000,
  runwayMonths: 18,
  liquidityProjection: baseProjection,
  liquidityProjectionWithHiring: projectionWithHiring,
}




