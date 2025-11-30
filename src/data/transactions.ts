export interface Transaction {
  id: number
  date: string
  text: string
  category: 'Revenue' | 'Variable' | 'Fixed' | 'Salary' | 'Admin'
  amount: number // Negative for expenses
  account: number
  voucher_id?: string
}

export const transactions: Transaction[] = [
  // Sample data from 2025
  { id: 1, date: '2025-01-03', text: '3 - DJ med anlæg', category: 'Revenue', amount: 19500, account: 1000, voucher_id: '71' },
  { id: 2, date: '2025-01-09', text: '16 - Playground', category: 'Revenue', amount: 205000, account: 1000, voucher_id: '72' },
  { id: 3, date: '2025-01-15', text: 'Varekøb: Drikkevarer', category: 'Variable', amount: -4500, account: 2000, voucher_id: 'B-102' },
  { id: 4, date: '2025-01-20', text: 'Leje af lydudstyr', category: 'Variable', amount: -12500, account: 2200, voucher_id: 'B-105' },
  { id: 5, date: '2025-02-01', text: 'Lokaleleje Q1', category: 'Fixed', amount: -15000, account: 5000, voucher_id: 'B-110' },
  { id: 6, date: '2025-02-02', text: 'Software licenser', category: 'Admin', amount: -1200, account: 6200, voucher_id: 'B-112' },
  { id: 7, date: '2025-02-15', text: 'Freelance timer - Event X', category: 'Variable', amount: -8500, account: 2800, voucher_id: 'B-120' },
  { id: 8, date: '2025-03-01', text: 'Lønudbetaling', category: 'Salary', amount: -35000, account: 3000, voucher_id: 'L-03' },
  { id: 9, date: '2025-03-10', text: 'Catering: Firmafest', category: 'Variable', amount: -22000, account: 2100, voucher_id: 'B-135' },
  { id: 10, date: '2025-01-22', text: 'Varekøb: Dekorationer', category: 'Variable', amount: -3200, account: 2000, voucher_id: 'B-106' },
  { id: 11, date: '2025-02-05', text: 'Transport: Levering af udstyr', category: 'Variable', amount: -1800, account: 2300, voucher_id: 'B-113' },
  { id: 12, date: '2025-02-10', text: 'Varekøb: Snacks og drikkevarer', category: 'Variable', amount: -5600, account: 2000, voucher_id: 'B-115' },
  { id: 13, date: '2025-02-18', text: 'Leje af projektor', category: 'Variable', amount: -2400, account: 2200, voucher_id: 'B-121' },
  { id: 14, date: '2025-03-05', text: 'Varekøb: Servietter og bestik', category: 'Variable', amount: -1200, account: 2000, voucher_id: 'B-130' },
  { id: 15, date: '2025-03-12', text: 'Freelance timer - Event Y', category: 'Variable', amount: -4200, account: 2800, voucher_id: 'B-136' },
  { id: 16, date: '2025-03-20', text: 'Varekøb: Bånd og emballage', category: 'Variable', amount: -800, account: 2000, voucher_id: 'B-140' },
  { id: 17, date: '2025-04-01', text: 'Leje af telt', category: 'Variable', amount: -15000, account: 2200, voucher_id: 'B-145' },
  { id: 18, date: '2025-04-08', text: 'Varekøb: Drikkevarer til event', category: 'Variable', amount: -6800, account: 2000, voucher_id: 'B-148' },
  { id: 19, date: '2025-04-15', text: 'Transport: Flytning af udstyr', category: 'Variable', amount: -2500, account: 2300, voucher_id: 'B-150' },
  { id: 20, date: '2025-04-22', text: 'Freelance timer - Event Z', category: 'Variable', amount: -6200, account: 2800, voucher_id: 'B-155' },
  { id: 21, date: '2025-05-01', text: 'Varekøb: Catering materialer', category: 'Variable', amount: -3800, account: 2000, voucher_id: 'B-160' },
  { id: 22, date: '2025-05-10', text: 'Leje af lydanlæg', category: 'Variable', amount: -11000, account: 2200, voucher_id: 'B-165' },
  { id: 23, date: '2025-05-18', text: 'Varekøb: Snacks', category: 'Variable', amount: -2100, account: 2000, voucher_id: 'B-170' },
  { id: 24, date: '2025-06-01', text: 'Freelance timer - Event A', category: 'Variable', amount: -5100, account: 2800, voucher_id: 'B-175' },
  { id: 25, date: '2025-06-12', text: 'Varekøb: Drikkevarer', category: 'Variable', amount: -4900, account: 2000, voucher_id: 'B-180' },
]

/**
 * Get transactions with optional filtering
 */
export function getTransactions(filters?: {
  searchText?: string
  category?: 'Revenue' | 'Variable' | 'Fixed' | 'Salary' | 'Admin' | 'All'
  minAmount?: number
  maxAmount?: number
}): Transaction[] {
  let filtered = [...transactions]

  // Filter by search text
  if (filters?.searchText) {
    const searchLower = filters.searchText.toLowerCase()
    filtered = filtered.filter(t => 
      t.text.toLowerCase().includes(searchLower) ||
      t.voucher_id?.toLowerCase().includes(searchLower) ||
      t.account.toString().includes(searchLower)
    )
  }

  // Filter by category
  if (filters?.category && filters.category !== 'All') {
    filtered = filtered.filter(t => t.category === filters.category)
  }

  // Filter by amount range
  if (filters?.minAmount !== undefined) {
    filtered = filtered.filter(t => t.amount >= filters.minAmount!)
  }
  if (filters?.maxAmount !== undefined) {
    filtered = filtered.filter(t => t.amount <= filters.maxAmount!)
  }

  return filtered
}




