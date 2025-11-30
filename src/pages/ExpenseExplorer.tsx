import { useState, useMemo } from 'react'
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { getTransactions } from '../data/transactions'

type SortField = 'date' | 'amount' | 'text' | 'account' | 'category'
type SortDirection = 'asc' | 'desc'

export default function ExpenseExplorer() {
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'Revenue' | 'Variable' | 'Fixed' | 'Salary' | 'Admin' | 'All'>('Variable')
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Get filtered transactions
  const filteredTransactions = useMemo(() => {
    const filters = {
      searchText: searchText || undefined,
      category: categoryFilter,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    }
    return getTransactions(filters)
  }, [searchText, categoryFilter, minAmount, maxAmount])

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'text':
          aValue = a.text.toLowerCase()
          bValue = b.text.toLowerCase()
          break
        case 'account':
          aValue = a.account
          bValue = b.account
          break
        case 'category':
          aValue = a.category
          bValue = b.category
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [filteredTransactions, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'Revenue':
        return 'bg-green-100 text-green-800'
      case 'Variable':
        return 'bg-orange-100 text-orange-800'
      case 'Fixed':
        return 'bg-blue-100 text-blue-800'
      case 'Salary':
        return 'bg-purple-100 text-purple-800'
      case 'Admin':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'Revenue':
        return 'Omsætning'
      case 'Variable':
        return 'Variable'
      case 'Fixed':
        return 'Faste'
      case 'Salary':
        return 'Løn'
      case 'Admin':
        return 'Admin'
      default:
        return category
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 text-primary-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-primary-600" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bilagsanalyse</h1>
        <p className="mt-2 text-gray-600">
          Viser {sortedTransactions.length} transaktioner
        </p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Søg
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Søg i tekst, bilag nr. eller konto..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="All">Alle</option>
              <option value="Variable">Variable (Konto 2000-2999)</option>
              <option value="Fixed">Faste</option>
              <option value="Salary">Løn</option>
              <option value="Admin">Admin</option>
              <option value="Revenue">Omsætning</option>
            </select>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min beløb
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="Min"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max beløb
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Max"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center space-x-2">
                    <span>Dato</span>
                    <SortIcon field="date" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('text')}
                >
                  <div className="flex items-center space-x-2">
                    <span>Tekst</span>
                    <SortIcon field="text" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bilag nr.
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('account')}
                >
                  <div className="flex items-center space-x-2">
                    <span>Konto</span>
                    <SortIcon field="account" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center space-x-2">
                    <span>Kategori</span>
                    <SortIcon field="category" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Beløb</span>
                    <SortIcon field="amount" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Ingen transaktioner fundet
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((transaction, index) => (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.text}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.voucher_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.account}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(
                          transaction.category
                        )}`}
                      >
                        {getCategoryLabel(transaction.category)}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}




