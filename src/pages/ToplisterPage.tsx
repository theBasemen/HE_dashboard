import { useState, useEffect } from 'react'
import { Trophy, AlertCircle, Calendar, ChevronDown, ChevronUp, Mail, Phone, MapPin } from 'lucide-react'
import { 
  fetchAllTopLists, 
  TopJob, 
  TopCustomerRevenue, 
  TopCustomerRecurring 
} from '../services/toplisterApi'

export default function ToplisterPage() {
  const [topJobs, setTopJobs] = useState<TopJob[]>([])
  const [topCustomersByRevenue, setTopCustomersByRevenue] = useState<TopCustomerRevenue[]>([])
  const [topCustomersByRecurring, setTopCustomersByRecurring] = useState<TopCustomerRecurring[]>([])
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set())
  const [expandedRevenueCustomers, setExpandedRevenueCustomers] = useState<Set<number>>(new Set())
  const [expandedRecurringCustomers, setExpandedRecurringCustomers] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchAllTopLists()
      setTopJobs(data.topJobs)
      setTopCustomersByRevenue(data.topCustomersByRevenue)
      setTopCustomersByRecurring(data.topCustomersByRecurring)
      setSnapshotDate(data.snapshotDate)
    } catch (err) {
      console.error('Failed to fetch top lists:', err)
      setError('Fejl ved indlæsning af data')
    } finally {
      setLoading(false)
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

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Ukendt'
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date)
    } catch {
      return 'Ukendt'
    }
  }

  const toggleJobExpanded = (index: number) => {
    const newExpanded = new Set(expandedJobs)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedJobs(newExpanded)
  }

  const toggleRevenueCustomerExpanded = (index: number) => {
    const newExpanded = new Set(expandedRevenueCustomers)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRevenueCustomers(newExpanded)
  }

  const toggleRecurringCustomerExpanded = (index: number) => {
    const newExpanded = new Set(expandedRecurringCustomers)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRecurringCustomers(newExpanded)
  }

  const formatAddress = (street: string | null, zipCode: string | null, city: string | null): string => {
    const parts = [street, zipCode && city ? `${zipCode} ${city}` : city].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : 'Ingen adresse'
  }

  const ContactDetailsSection = ({ 
    street, 
    zipCode, 
    city, 
    email, 
    phone, 
    vatNumber 
  }: { 
    street: string | null
    zipCode: string | null
    city: string | null
    email: string | null
    phone: string | null
    vatNumber: string | null
  }) => {
    const address = formatAddress(street, zipCode, city)
    const hasContactInfo = address !== 'Ingen adresse' || email || phone || vatNumber
    
    if (!hasContactInfo) return null

    return (
      <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
        {address !== 'Ingen adresse' && (
          <div className="flex items-start space-x-2 text-xs text-gray-600">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-400" />
            <span>{address}</span>
          </div>
        )}
        {email && (
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <Mail className="h-3 w-3 flex-shrink-0 text-gray-400" />
            <a href={`mailto:${email}`} className="text-blue-600 hover:text-blue-800 hover:underline">
              {email}
            </a>
          </div>
        )}
        {phone && (
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <Phone className="h-3 w-3 flex-shrink-0 text-gray-400" />
            <a href={`tel:${phone}`} className="text-blue-600 hover:text-blue-800 hover:underline">
              {phone}
            </a>
          </div>
        )}
        {vatNumber && (
          <div className="text-xs text-gray-500 mt-2">
            CVR: {vatNumber}
          </div>
        )}
      </div>
    )
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-9 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded w-96 mt-2 animate-pulse"></div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-12 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Toplister</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <div>
              <p className="font-medium">{error}</p>
              <p className="text-sm text-red-500 mt-1">
                Prøv at opdatere siden eller kontakt support hvis problemet fortsætter.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasData = topJobs.length > 0 || topCustomersByRevenue.length > 0 || topCustomersByRecurring.length > 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <Trophy className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Toplister</h1>
        </div>
        <p className="text-gray-600 mt-1">
          Et hurtigt overblik over de største jobs og vigtigste kunder baseret på seneste finans-snapshot.
        </p>
        {snapshotDate && (
          <div className="flex items-center space-x-2 mt-3 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Seneste snapshot: {formatDate(snapshotDate)}</span>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!hasData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <Trophy className="h-12 w-12 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Ingen data tilgængelig endnu</h3>
          <p className="text-blue-700 text-sm">
            Kør finansflowet i n8n først for at generere top list data.
          </p>
        </div>
      )}

      {/* Three Column Grid Layout */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Jobs Section */}
          {topJobs.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900">Største jobs</h2>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[600px]">
                <div className="divide-y divide-gray-200">
                  {topJobs.map((job, index) => {
                    const isExpanded = expandedJobs.has(index)
                    return (
                      <div key={job.invoice_id || index} className="hover:bg-gray-50 transition-colors">
                        <button
                          onClick={() => toggleJobExpanded(index)}
                          className="w-full px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:bg-gray-50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {job.customer || 'Ukendt'}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              {formatCurrency(job.amount)}
                            </div>
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 pt-0 space-y-2 bg-gray-50">
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Dato:</span> {formatDate(job.date)}
                            </div>
                            {job.description && (
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">Beskrivelse:</span> {job.description}
                              </div>
                            )}
                            {job.invoice_id && (
                              <div className="text-xs text-gray-500">
                                Faktura ID: {job.invoice_id}
                              </div>
                            )}
                            <ContactDetailsSection
                              street={job.street || null}
                              zipCode={job.zip_code || null}
                              city={job.city || null}
                              email={job.email || null}
                              phone={job.phone || null}
                              vatNumber={job.vat_number || null}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Top Customers by Revenue Section */}
          {topCustomersByRevenue.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900">Topkunder efter omsætning</h2>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[600px]">
                <div className="divide-y divide-gray-200">
                  {topCustomersByRevenue.map((customer, index) => {
                    const isExpanded = expandedRevenueCustomers.has(index)
                    return (
                      <div key={customer.customer || index} className="hover:bg-gray-50 transition-colors">
                        <button
                          onClick={() => toggleRevenueCustomerExpanded(index)}
                          className="w-full px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:bg-gray-50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {customer.customer || 'Ukendt'}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              {formatCurrency(customer.total_revenue)}
                            </div>
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 pt-0 space-y-2 bg-gray-50">
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Antal fakturaer:</span> {customer.invoice_count}
                            </div>
                            <div className="text-xs text-gray-500">
                              Gns. pr. faktura: {formatCurrency(customer.total_revenue / customer.invoice_count)}
                            </div>
                            <ContactDetailsSection
                              street={customer.street || null}
                              zipCode={customer.zip_code || null}
                              city={customer.city || null}
                              email={customer.email || null}
                              phone={customer.phone || null}
                              vatNumber={customer.vat_number || null}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Top Customers by Recurring Section */}
          {topCustomersByRecurring.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900">Topkunder efter gentagelser</h2>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[600px]">
                <div className="divide-y divide-gray-200">
                  {topCustomersByRecurring.map((customer, index) => {
                    const isExpanded = expandedRecurringCustomers.has(index)
                    return (
                      <div key={customer.customer || index} className="hover:bg-gray-50 transition-colors">
                        <button
                          onClick={() => toggleRecurringCustomerExpanded(index)}
                          className="w-full px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:bg-gray-50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {customer.customer || 'Ukendt'}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              {customer.invoice_count} faktura{customer.invoice_count !== 1 ? 'er' : ''}
                            </div>
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 pt-0 space-y-2 bg-gray-50">
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Samlet omsætning:</span> {formatCurrency(customer.total_revenue)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Gns. pr. faktura: {formatCurrency(customer.total_revenue / customer.invoice_count)}
                            </div>
                            <ContactDetailsSection
                              street={customer.street || null}
                              zipCode={customer.zip_code || null}
                              city={customer.city || null}
                              email={customer.email || null}
                              phone={customer.phone || null}
                              vatNumber={customer.vat_number || null}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
