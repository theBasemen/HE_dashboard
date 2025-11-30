import { useState, useEffect, useRef } from 'react'
import { Clock, Calendar, AlertCircle, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface TimeLog {
  id: number
  created_at: string
  timestamp: string // Date/time of the time entry
  project_id: number | null
  project_name: string | null
  project_color: string | null
  hours: number
  user_data: any // JSON or string containing user/employee info
}

interface EmployeeHours {
  [date: string]: number // date -> total hours for that day
}

interface EmployeeEntries {
  [date: string]: TimeLog[] // date -> array of time entries for that day
}

interface EmployeeData {
  name: string
  hoursByDate: EmployeeHours
  entriesByDate: EmployeeEntries // Detailed entries for tooltip
}

// Get days in month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// Get first day of month (0 = Sunday, 1 = Monday, etc.)
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

// Format date to YYYY-MM-DD
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Tooltip component for showing detailed entries
function DayTooltip({ entries, date, cellElement }: { entries: TimeLog[]; date: string; cellElement: HTMLDivElement | null }) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ placement: 'top' | 'bottom'; align: 'left' | 'center' | 'right' }>({ placement: 'top', align: 'center' })

  useEffect(() => {
    if (!cellElement || !tooltipRef.current) return

    const cellRect = cellElement.getBoundingClientRect()
    const tooltipWidth = 256 // w-64 = 16rem = 256px
    const tooltipHeight = tooltipRef.current.offsetHeight || 200
    const spacing = 8 // mb-2 = 0.5rem = 8px

    const spaceAbove = cellRect.top

    // Determine vertical placement
    const placement: 'top' | 'bottom' = spaceAbove >= tooltipHeight + spacing ? 'top' : 'bottom'

    // Determine horizontal alignment
    let align: 'left' | 'center' | 'right' = 'center'
    const centerX = cellRect.left + cellRect.width / 2
    
    if (centerX - tooltipWidth / 2 < 16) {
      // Too close to left edge
      align = 'left'
    } else if (centerX + tooltipWidth / 2 > window.innerWidth - 16) {
      // Too close to right edge
      align = 'right'
    }

    setPosition({ placement, align })
  }, [entries, cellElement])

  if (!entries || entries.length === 0) return null

  const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0)

  // Calculate positioning classes
  const placementClasses = position.placement === 'top' 
    ? 'bottom-full mb-2' 
    : 'top-full mt-2'
  
  const alignClasses = {
    left: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    right: 'right-0'
  }[position.align]

  const arrowClasses = position.placement === 'top'
    ? 'top-full left-1/2 transform -translate-x-1/2 -mt-1'
    : 'bottom-full left-1/2 transform -translate-x-1/2 -mb-1'

  const arrowRotation = position.placement === 'top' ? 'rotate-45' : '-rotate-45'

  return (
    <div 
      ref={tooltipRef}
      className={`absolute z-50 w-64 p-3 bg-gray-900 text-white rounded-lg shadow-xl pointer-events-none ${placementClasses} ${alignClasses}`}
    >
      <div className="text-xs font-semibold mb-2 border-b border-gray-700 pb-1">
        {new Date(date + 'T12:00:00').toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start justify-between text-xs">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                {entry.project_color && (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.project_color }}
                  />
                )}
                <span className="font-medium truncate">
                  {entry.project_name || 'Ingen projekt'}
                </span>
              </div>
              {entry.timestamp && (
                <div className="text-gray-400 text-[10px] mt-0.5">
                  {new Date(entry.timestamp).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            <div className="ml-2 font-semibold text-white flex-shrink-0">
              {entry.hours.toFixed(1)}h
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-700 flex items-center justify-between text-xs font-semibold">
        <span>Total:</span>
        <span>{totalHours.toFixed(1)} timer</span>
      </div>
      {/* Arrow */}
      <div className={`absolute ${arrowClasses}`}>
        <div className={`w-2 h-2 bg-gray-900 transform ${arrowRotation}`}></div>
      </div>
    </div>
  )
}

// Month calendar component
function MonthCalendar({ employee, year, month }: { employee: EmployeeData; year: number; month: number }) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const monthNames = [
    'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'December'
  ]
  const dayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør']

  // Create array of days with their hours
  const days: Array<{ day: number; hours: number; date: string }> = []
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: 0, hours: 0, date: '' })
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = formatDate(year, month, day)
    const hours = employee.hoursByDate[date] || 0
    days.push({ day, hours, date })
  }

  const setCellRef = (date: string, element: HTMLDivElement | null) => {
    if (element) {
      cellRefs.current.set(date, element)
    } else {
      cellRefs.current.delete(date)
    }
  }

  // Calculate total hours for the month
  const totalHours = Object.entries(employee.hoursByDate).reduce((sum, [date, hours]) => {
    const [entryYear, entryMonth] = date.split('-').map(Number)
    if (entryYear === year && entryMonth === month + 1) {
      return sum + hours
    }
    return sum
  }, 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      {/* Header */}
      <div className="mb-2 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1.5">
            <User className="h-4 w-4 text-primary-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">{employee.name}</h3>
          </div>
          <span className="text-xs font-medium text-gray-600 flex-shrink-0 ml-2">
            {monthNames[month].substring(0, 3)} {year}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Clock className="h-3 w-3 text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-600">
            Total: <span className="font-semibold text-gray-900">{totalHours.toFixed(1)}h</span>
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Day names header */}
        {dayNames.map((dayName) => (
          <div
            key={dayName}
            className="text-center text-[10px] font-medium text-gray-500 py-0.5"
          >
            {dayName}
          </div>
        ))}

        {/* Calendar days */}
        {days.map(({ day, hours, date }, index) => {
          if (day === 0) {
            return <div key={`empty-${index}`} className="h-8" />
          }

          const hasHours = hours > 0
          const isFullDay = hours >= 7.5
          const isPartialDay = hours > 0 && hours < 7.5
          const dayEntries = employee.entriesByDate[date] || []
          const showTooltip = hoveredDate === date && dayEntries.length > 0

          return (
            <div
              key={date}
              className="relative"
              onMouseEnter={() => setHoveredDate(date)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <div
                ref={(el) => setCellRef(date, el)}
                className={`
                  h-8 border border-gray-200 rounded text-center flex flex-col items-center justify-center cursor-pointer
                  ${hasHours ? 'bg-primary-50 border-primary-300' : 'bg-gray-50'}
                  ${isFullDay ? 'bg-green-50 border-green-300' : ''}
                  ${isPartialDay ? 'bg-yellow-50 border-yellow-300' : ''}
                  transition-colors hover:border-primary-400
                `}
              >
                <span
                  className={`
                    text-[10px] font-medium leading-tight
                    ${hasHours ? 'text-gray-900' : 'text-gray-400'}
                  `}
                >
                  {day}
                </span>
                {hasHours && (
                  <span
                    className={`
                      text-[9px] font-semibold leading-tight
                      ${isFullDay ? 'text-green-700' : isPartialDay ? 'text-yellow-700' : 'text-primary-700'}
                    `}
                  >
                    {hours.toFixed(1)}h
                  </span>
                )}
              </div>
              {showTooltip && <DayTooltip entries={dayEntries} date={date} cellElement={cellRefs.current.get(date) || null} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TimeTrackingPage() {
  const [timeEntries, setTimeEntries] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get current month/year
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  useEffect(() => {
    const fetchTimeEntries = async () => {
      if (!supabase) {
        setError('Supabase client not configured')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch from he_time_logs table
        // project_name and project_color are already in he_time_logs, so no join needed
        const { data: logsData, error: logsError } = await supabase
          .from('he_time_logs')
          .select('*')
          .order('timestamp', { ascending: false })

        if (logsError) throw logsError

        setTimeEntries(logsData || [])
      } catch (err: any) {
        console.error('Error fetching time entries:', err)
        setError(err.message || 'Failed to fetch time tracking data')
        setTimeEntries([])
      } finally {
        setLoading(false)
      }
    }

    fetchTimeEntries()
  }, [])

  // Group time entries by employee
  const employeesData: EmployeeData[] = (() => {
    const employeesMap = new Map<string, { hoursByDate: EmployeeHours; entriesByDate: EmployeeEntries }>()

    timeEntries.forEach((entry) => {
      // Extract employee name from user_data
      // user_data might be JSON string or already parsed object
      let employeeName = 'Ukendt'
      
      if (entry.user_data) {
        try {
          // Try to parse if it's a JSON string
          let userData: any
          if (typeof entry.user_data === 'string') {
            try {
              userData = JSON.parse(entry.user_data)
            } catch {
              // If it's not valid JSON, treat as plain string
              employeeName = entry.user_data.trim() || 'Ukendt'
              userData = null
            }
          } else {
            userData = entry.user_data
          }
          
          if (userData) {
            // Try common field names for user/employee name (check nested objects too)
            const getName = (obj: any): string | null => {
              if (!obj || typeof obj !== 'object') return null
              
              // Direct properties
              if (obj.name) return String(obj.name).trim()
              if (obj.user_name) return String(obj.user_name).trim()
              if (obj.employee_name) return String(obj.employee_name).trim()
              if (obj.full_name) return String(obj.full_name).trim()
              if (obj.display_name) return String(obj.display_name).trim()
              if (obj.first_name && obj.last_name) return `${obj.first_name} ${obj.last_name}`.trim()
              if (obj.firstName && obj.lastName) return `${obj.firstName} ${obj.lastName}`.trim()
              
              // Check nested user object
              if (obj.user && typeof obj.user === 'object') {
                const nestedName = getName(obj.user)
                if (nestedName) return nestedName
              }
              
              // Check email as fallback (extract name part)
              if (obj.email) {
                const emailName = String(obj.email).split('@')[0]
                if (emailName) return emailName.trim()
              }
              
              return null
            }
            
            employeeName = getName(userData) || 'Ukendt'
          }
        } catch (err) {
          // If parsing fails, try to use user_data directly as string
          console.warn('Failed to parse user_data:', entry.user_data, err)
          employeeName = String(entry.user_data).trim() || 'Ukendt'
        }
      }
      
      // Log if we still have "Ukendt" to help debug
      if (employeeName === 'Ukendt' && entry.user_data) {
        console.log('Could not extract employee name from user_data:', entry.user_data)
      }
      
      if (!employeesMap.has(employeeName)) {
        employeesMap.set(employeeName, { hoursByDate: {}, entriesByDate: {} })
      }
      const employeeData = employeesMap.get(employeeName)!
      
      // Extract date from timestamp field
      if (entry.timestamp) {
        // Extract just the date part (YYYY-MM-DD)
        const date = entry.timestamp.split('T')[0]
        // Ensure YYYY-MM-DD format
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const hours = Number(entry.hours) || 0
          employeeData.hoursByDate[date] = (employeeData.hoursByDate[date] || 0) + hours
          
          // Store detailed entry
          if (!employeeData.entriesByDate[date]) {
            employeeData.entriesByDate[date] = []
          }
          employeeData.entriesByDate[date].push(entry)
        }
      }
    })

    // Convert to array and calculate total hours for sorting
    const employees = Array.from(employeesMap.entries()).map(([name, { hoursByDate, entriesByDate }]) => {
      const totalHours = Object.values(hoursByDate).reduce((sum, hours) => sum + hours, 0)
      return {
        name,
        hoursByDate,
        entriesByDate,
        totalHours,
      }
    })

    // Sort by total hours (descending) - employees with most hours first
    employees.sort((a, b) => b.totalHours - a.totalHours)

    // Filter out "Ukendt" entries that have no hours (they're just placeholders)
    const employeesWithHours = employees.filter(emp => emp.totalHours > 0 || emp.name !== 'Ukendt')

    // Log found employees for debugging
    console.log('Found employees:', employeesWithHours.map(e => ({ name: e.name, hours: e.totalHours })))

    // Ensure we have exactly 3 employees (pad with empty if needed)
    const result: EmployeeData[] = []
    for (let i = 0; i < 3; i++) {
      if (i < employeesWithHours.length) {
        const { totalHours, ...employeeData } = employeesWithHours[i]
        result.push(employeeData)
      } else {
        // Add placeholder only if we don't have enough real employees
        const placeholderNames = ['Medarbejder 1', 'Medarbejder 2', 'Medarbejder 3']
        result.push({
          name: placeholderNames[i],
          hoursByDate: {},
          entriesByDate: {},
        })
      }
    }

    return result
  })()

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToCurrentMonth = () => {
    setCurrentDate(new Date())
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Clock className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tidsregistrering</h1>
            <p className="text-gray-600 mt-1">Registrer og følg tid på projekter</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 h-96" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tidsregistrering</h1>
            <p className="text-gray-600 text-sm">Oversigt over registrerede timer pr. dag</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={goToPreviousMonth}
            className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={goToCurrentMonth}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={goToNextMonth}
            className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-red-800 font-medium text-sm">Fejl ved indlæsning af data</p>
          </div>
          <p className="text-red-600 text-xs mt-1">{error}</p>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-lg border border-gray-200 p-2.5">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-medium text-gray-700">Forklaring:</span>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 bg-green-50 border border-green-300 rounded" />
            <span className="text-gray-600">Fuld dag (≥7.5h)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 bg-yellow-50 border border-yellow-300 rounded" />
            <span className="text-gray-600">Delvis dag (&lt;7.5h)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded" />
            <span className="text-gray-600">Ingen timer</span>
          </div>
        </div>
      </div>

      {/* Three Month Calendars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employeesData.map((employee) => (
          <MonthCalendar
            key={employee.name}
            employee={employee}
            year={currentYear}
            month={currentMonth}
          />
        ))}
      </div>

      {/* Info if no data */}
      {timeEntries.length === 0 && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Calendar className="h-12 w-12 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Ingen tidsregistreringer endnu</h3>
          <p className="text-blue-700 text-sm">
            Når medarbejdere begynder at registrere tid, vil det blive vist her.
          </p>
          <p className="text-blue-600 text-xs mt-2">
            Tabeller: <code className="bg-blue-100 px-2 py-1 rounded">he_time_logs</code> og <code className="bg-blue-100 px-2 py-1 rounded">he_time_projects</code>
          </p>
        </div>
      )}
    </div>
  )
}
