import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Clock, Calendar, AlertCircle, User, Plus, Building2, Briefcase, Trash2, X, Edit2, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fetchActiveUsers, TimeUser } from '../services/userApi'

interface TimeLog {
  id: number
  created_at: string
  timestamp: string // Date/time of the time entry
  project_id: string | null
  project_name: string | null
  project_color: string | null
  hours: number
  user_id: string | null // UUID from he_time_users table
  user_data: any // JSON or string containing user/employee info (legacy, kept for backward compatibility)
}

interface EmployeeHours {
  [date: string]: number // date -> total hours for that day
}

interface EmployeeEntries {
  [date: string]: TimeLog[] // date -> array of time entries for that day
}

interface EmployeeData {
  id?: string // UUID from he_time_users
  name: string
  initials?: string
  color?: string
  avatar_url?: string | null
  hoursByDate: EmployeeHours
  entriesByDate: EmployeeEntries // Detailed entries for tooltip
}

interface Project {
  id: string
  name: string
  color: string | null
  type: 'Internt' | 'Kunde' | 'internal' | 'customer' | null // Support both old and new values
  created_at: string
  is_hidden?: boolean
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

// Day Modal component for managing time entries
function DayModal({ 
  date,
  employee,
  entries,
  projects,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onClose
}: { 
  date: string
  employee: EmployeeData
  entries: TimeLog[]
  projects: Project[]
  onAddEntry?: (entry: { userId: string; projectId: string; date: string; hours: number }) => Promise<void>
  onUpdateEntry?: (entryId: number, updates: { projectId: string; hours: number }) => Promise<void>
  onDeleteEntry?: (entryId: number) => void
  onClose?: () => void
}) {
  const [newProjectId, setNewProjectId] = useState<string>('')
  const [newHours, setNewHours] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null)
  const [editProjectId, setEditProjectId] = useState<string>('')
  const [editHours, setEditHours] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState(false)
  
  // Safely format date
  let dateFormatted = date
  try {
    const dateObj = new Date(date + 'T12:00:00')
    if (!isNaN(dateObj.getTime())) {
      dateFormatted = dateObj.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }
  } catch (err) {
    console.error('Error formatting date:', err)
  }

  const handleAddEntry = async () => {
    if (!onAddEntry || !newProjectId || !newHours) {
      alert('Vælg projekt og indtast timer')
      return
    }

    const hours = parseFloat(newHours)
    if (isNaN(hours) || hours <= 0) {
      alert('Indtast et gyldigt antal timer')
      return
    }

    if (!employee?.id) {
      alert('Ingen medarbejder valgt')
      return
    }

    try {
      setSaving(true)
      await onAddEntry({
        userId: employee.id,
        projectId: newProjectId,
        date: date || '',
        hours
      })
      setNewProjectId('')
      setNewHours('')
    } catch (err: any) {
      console.error('Error adding entry:', err)
      alert('Fejl ved tilføjelse: ' + (err.message || 'Ukendt fejl'))
    } finally {
      setSaving(false)
    }
  }

  const startEditing = (entry: TimeLog) => {
    setEditingEntryId(entry.id)
    setEditProjectId(entry.project_id || '')
    setEditHours(entry.hours.toString())
  }

  const cancelEditing = () => {
    setEditingEntryId(null)
    setEditProjectId('')
    setEditHours('')
  }

  const handleUpdateEntry = async () => {
    if (!onUpdateEntry || !editingEntryId || !editProjectId || !editHours) {
      alert('Udfyld alle felter')
      return
    }

    const hours = parseFloat(editHours)
    if (isNaN(hours) || hours <= 0) {
      alert('Indtast et gyldigt antal timer')
      return
    }

    try {
      setSavingEdit(true)
      await onUpdateEntry(editingEntryId, {
        projectId: editProjectId,
        hours
      })
      cancelEditing()
    } catch (err: any) {
      alert('Fejl ved opdatering: ' + err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleQuickAdjust = async (entry: TimeLog, adjustment: number) => {
    if (!onUpdateEntry || !entry.id || !entry.project_id) {
      return
    }

    const newHours = Math.max(0, entry.hours + adjustment)
    
    try {
      await onUpdateEntry(entry.id, {
        projectId: entry.project_id,
        hours: newHours
      })
    } catch (err: any) {
      console.error('Error adjusting hours:', err)
      alert('Fejl ved justering: ' + (err.message || 'Ukendt fejl'))
    }
  }

  // Prevent rendering if required props are missing
  if (!date || !employee) {
    console.warn('DayModal: Missing required props', { date, employee })
    return null
  }

  // Ensure arrays are valid
  const safeEntries = Array.isArray(entries) ? entries : []
  const safeProjects = Array.isArray(projects) ? projects : []
  const totalHours = safeEntries.reduce((sum, entry) => sum + (entry?.hours || 0), 0)

  // Use React Portal to render modal outside the normal DOM hierarchy
  // Wrap in try-catch to prevent crashes
  try {
    const modalContent = (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget && onClose) {
          try {
            onClose()
          } catch (err) {
            console.error('Error closing modal:', err)
          }
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{dateFormatted}</h2>
            <p className="text-sm text-gray-600 mt-1">{employee?.name || 'Ukendt medarbejder'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Existing Entries */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Registrerede timer</h3>
            {safeEntries.length === 0 ? (
              <div className="text-sm text-gray-500 py-4 text-center border border-gray-200 rounded-lg bg-gray-50">
                Ingen tidsregistreringer for denne dag
              </div>
            ) : (
              <div className="space-y-2">
                {safeEntries.map((entry) => {
                  if (!entry || !entry.id) {
                    console.warn('Invalid entry:', entry)
                    return null
                  }
                  return (
                  <div key={entry.id}>
                    {editingEntryId === entry.id ? (
                      // Edit form
                      <div className="p-4 border border-primary-300 rounded-lg bg-primary-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Projekt *
                            </label>
                            <select
                              value={editProjectId}
                              onChange={(e) => setEditProjectId(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Vælg projekt</option>
                              {safeProjects.filter(p => !p?.is_hidden).map((project) => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Timer *
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={editHours}
                              onChange={(e) => setEditHours(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleUpdateEntry}
                            disabled={savingEdit || !editProjectId || !editHours}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {savingEdit ? 'Gemmer...' : 'Gem ændringer'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Annuller
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Display entry
                      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3 flex-1">
                          {entry.project_color && (
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: entry.project_color }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">
                              {entry.project_name || 'Ingen projekt'}
                            </div>
                            {entry.timestamp && (
                              <div className="text-xs text-gray-500">
                                {new Date(entry.timestamp).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {onUpdateEntry && (
                            <div className="flex flex-col">
                              <button
                                onClick={() => handleQuickAdjust(entry, 0.5)}
                                className="p-0.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                title="Øg med 0.5 timer"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleQuickAdjust(entry, -0.5)}
                                className="p-0.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                title="Mindsk med 0.5 timer"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <span className="font-semibold text-gray-900 min-w-[3rem] text-right">
                            {entry.hours.toFixed(1)}t
                          </span>
                          {onUpdateEntry && (
                            <button
                              onClick={() => startEditing(entry)}
                              className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                              title="Rediger tidsregistrering"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {onDeleteEntry && (
                            <button
                              onClick={() => {
                                if (confirm(`Er du sikker på, at du vil slette denne tidsregistrering (${entry.hours.toFixed(1)}t)?`)) {
                                  onDeleteEntry(entry.id)
                                }
                              }}
                              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Slet tidsregistrering"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            )}
            {entries.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-sm font-semibold">
                <span className="text-gray-700">Total:</span>
                <span className="text-gray-900">{totalHours.toFixed(1)}t</span>
              </div>
            )}
          </div>

          {/* Add New Entry Form */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Tilføj tidsregistrering</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projekt *
                </label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                              <option value="">Vælg projekt</option>
                              {safeProjects.filter(p => !p?.is_hidden).map((project) => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timer *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newHours}
                  onChange={(e) => setNewHours(e.target.value)}
                  placeholder="F.eks. 7.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleAddEntry}
                disabled={saving || !newProjectId || !newHours}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{saving ? 'Gemmer...' : 'Tilføj tidsregistrering'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    )

    // Render modal using React Portal to avoid z-index and overflow issues
    if (typeof document !== 'undefined') {
      return createPortal(modalContent, document.body)
    }
    
    return null
  } catch (error) {
    console.error('Error rendering DayModal:', error)
    // Return a simple error message instead of crashing
    if (typeof document !== 'undefined') {
      return createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Fejl</h2>
            <p className="text-gray-700 mb-4">Der opstod en fejl ved visning af modalen.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Luk
            </button>
          </div>
        </div>,
        document.body
      )
    }
    return null
  }
}

// Month calendar component
function MonthCalendar({ 
  employee, 
  year, 
  month,
  projects,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry 
}: { 
  employee: EmployeeData
  year: number
  month: number
  projects: Project[]
  onAddEntry?: (entry: { userId: string; projectId: string; date: string; hours: number }) => Promise<void>
  onUpdateEntry?: (entryId: number, updates: { projectId: string; hours: number }) => Promise<void>
  onDeleteEntry?: (entryId: number) => void
}) {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  
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
          <div className="flex items-center space-x-2">
            {employee.avatar_url ? (
              <img
                src={employee.avatar_url}
                alt={employee.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
            ) : null}
            {employee.initials && employee.color ? (
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${employee.color} ${employee.avatar_url ? 'hidden' : ''}`}
              >
                {employee.initials}
              </div>
            ) : (
              <User className="h-5 w-5 text-primary-600 flex-shrink-0" />
            )}
            <h3 
              className="text-sm font-semibold text-gray-900 truncate cursor-pointer hover:text-primary-600 transition-colors"
              onClick={() => {
                if (employee.id) {
                  navigate(`/admin/users?edit=${employee.id}`)
                }
              }}
              title="Klik for at redigere medarbejder"
            >
              {employee.name}
            </h3>
          </div>
          <span className="text-xs font-medium text-gray-600 flex-shrink-0 ml-2">
            {monthNames[month].substring(0, 3)} {year}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Clock className="h-3 w-3 text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-600">
            Total: <span className="font-semibold text-gray-900">{totalHours.toFixed(1)}t</span>
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
          const isSelected = selectedDate === date

          return (
            <div
              key={date}
              className="relative"
            >
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  try {
                    setSelectedDate(date)
                  } catch (err) {
                    console.error('Error setting selected date:', err)
                  }
                }}
                className={`
                  h-8 border border-gray-200 rounded text-center flex flex-col items-center justify-center cursor-pointer
                  ${hasHours ? 'bg-primary-50 border-primary-300' : 'bg-gray-50'}
                  ${isFullDay ? 'bg-green-50 border-green-300' : ''}
                  ${isPartialDay ? 'bg-yellow-50 border-yellow-300' : ''}
                  ${isSelected ? 'border-primary-500 ring-2 ring-primary-200' : ''}
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
                    {hours.toFixed(1)}t
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Day Modal */}
      {selectedDate && employee && Array.isArray(projects) && (
        <DayModal
          date={selectedDate}
          employee={employee}
          entries={Array.isArray(employee.entriesByDate[selectedDate]) ? employee.entriesByDate[selectedDate] : []}
          projects={projects}
          onAddEntry={onAddEntry}
          onUpdateEntry={onUpdateEntry}
          onDeleteEntry={onDeleteEntry}
          onClose={() => {
            try {
              setSelectedDate(null)
            } catch (err) {
              console.error('Error closing modal:', err)
            }
          }}
        />
      )}
    </div>
  )
}

export default function TimeTrackingPage() {
  const [timeEntries, setTimeEntries] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [users, setUsers] = useState<TimeUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectType, setNewProjectType] = useState<'Internt' | 'Kunde'>('Internt')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editProjectName, setEditProjectName] = useState('')
  const [editProjectType, setEditProjectType] = useState<'Internt' | 'Kunde'>('Kunde')
  
  // Helper function to get color based on project type
  const getProjectColor = (type: 'Internt' | 'Kunde' | 'internal' | 'customer' | null): string => {
    if (type === 'Internt' || type === 'internal') {
      return '#33283a'
    }
    return '#d0335a' // Default for 'Kunde' or null
  }
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Get current month/year
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Fetch users from he_time_users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true)
        const data = await fetchActiveUsers()
        setUsers(data)
      } catch (err: any) {
        console.error('Error fetching users:', err)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [])

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
        // Note: user_id column may not exist yet in the database
        // We'll use * to get all columns and handle missing user_id gracefully
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

  // Refresh time entries
  const refreshTimeEntries = async () => {
    if (!supabase) return

    try {
      const { data: logsData, error: logsError } = await supabase
        .from('he_time_logs')
        .select('*')
        .order('timestamp', { ascending: false })

      if (!logsError && logsData) {
        setTimeEntries(logsData)
      }
    } catch (err: any) {
      console.error('Error refreshing time entries:', err)
    }
  }

  // Add new time entry (called from DayModal)
  const handleAddTimeEntry = async (entry: { userId: string; projectId: string; date: string; hours: number }) => {
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }

    // Find selected user and project
    const selectedUser = users.find(u => u.id === entry.userId)
    const selectedProject = projects.find(p => p.id === entry.projectId)

    if (!selectedUser || !selectedProject) {
      throw new Error('Medarbejder eller projekt ikke fundet')
    }

    // Create timestamp from date (set to noon to avoid timezone issues)
    const timestamp = new Date(entry.date + 'T12:00:00').toISOString()

    // Prepare entry data (explicitly exclude id - let database auto-generate it)
    // Only include fields that should be set manually
    const entryData = {
      timestamp,
      project_id: selectedProject.id,
      project_name: selectedProject.name,
      project_color: selectedProject.color,
      hours: entry.hours,
      user_id: selectedUser.id,
      // Also store user_data for backward compatibility
      user_data: JSON.stringify({
        user_id: selectedUser.id,
        name: selectedUser.name,
        initials: selectedUser.initials
      })
      // Note: id and created_at are NOT included - database should auto-generate them
    }

    // Insert the new time entry
    const { error: insertError } = await supabase
      .from('he_time_logs')
      .insert([entryData])

    if (insertError) {
      console.error('Insert error details:', insertError)
      console.error('Entry data attempted:', entryData)
      
      // More helpful error message
      if (insertError.message?.includes('null value in column "id"')) {
        throw new Error('Databasen kræver at id-kolonnen er auto-genereret. Kontakt administrator for at opdatere tabellen til at bruge SERIAL eller GENERATED BY DEFAULT AS IDENTITY.')
      }
      
      throw insertError
    }

    // Refresh time entries
    await refreshTimeEntries()
  }

  // Update time entry handler
  const handleUpdateEntry = async (entryId: number, updates: { projectId: string; hours: number }) => {
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }

    if (!entryId || !updates?.projectId || !updates?.hours) {
      throw new Error('Manglende data til opdatering')
    }

    // Find selected project
    const selectedProject = projects.find(p => p.id === updates.projectId)

    if (!selectedProject) {
      throw new Error('Projekt ikke fundet')
    }

    try {
      const updateData: any = {
        project_id: selectedProject.id,
        project_name: selectedProject.name,
        project_color: selectedProject.color,
        hours: updates.hours
      }

      const { error: updateError } = await supabase
        .from('he_time_logs')
        .update(updateData)
        .eq('id', entryId)

      if (updateError) {
        console.error('Update error details:', updateError)
        throw updateError
      }

      // Refresh time entries
      await refreshTimeEntries()
    } catch (err: any) {
      console.error('Error updating time entry:', err)
      throw err
    }
  }

  // Delete time entry handler
  const handleDeleteEntry = async (entryId: number) => {
    if (!supabase) return

    try {
      const { error: deleteError } = await supabase
        .from('he_time_logs')
        .delete()
        .eq('id', entryId)

      if (deleteError) throw deleteError

      // Refresh time entries
      await refreshTimeEntries()
    } catch (err: any) {
      console.error('Error deleting time entry:', err)
      alert('Fejl ved sletning af tidsregistrering: ' + err.message)
    }
  }

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!supabase) {
        setLoadingProjects(false)
        return
      }

      try {
        setLoadingProjects(true)
        const { data, error: projectsError } = await supabase
          .from('he_time_projects')
          .select('id, name, color, type, created_at, is_hidden')
          .order('created_at', { ascending: false })

        if (projectsError) throw projectsError

        // Normalize type values: convert old 'internal'/'customer' to new 'Internt'/'Kunde'
        // Also ensure colors match the correct values for each type
        const normalizedProjects = (data || []).map(project => {
          const normalizedType = project.type === 'internal' ? 'Internt' : 
                                project.type === 'customer' ? 'Kunde' : 
                                project.type // Keep 'Internt'/'Kunde' or null as is
          const correctColor = getProjectColor(normalizedType)
          return {
            ...project,
            type: normalizedType,
            color: correctColor // Always use the correct color for the type
          }
        })

        console.log('Fetched projects:', normalizedProjects)
        setProjects(normalizedProjects)
      } catch (err: any) {
        console.error('Error fetching projects:', err)
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchProjects()
  }, [])

  // Add new project
  const handleAddProject = async () => {
    if (!newProjectName.trim() || !supabase) return

    try {
      // Generate a unique text ID (e.g., timestamp-based or UUID-like)
      // If you want to use a specific id (e.g., Trello card id), you can replace this
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const projectData: { 
        id: string
        name: string
        type: 'Internt' | 'Kunde'
        color: string
      } = {
        id: projectId,
        name: newProjectName.trim(),
        type: newProjectType,
        color: getProjectColor(newProjectType),
      }

      const { data, error: insertError } = await supabase
        .from('he_time_projects')
        .insert([projectData])
        .select('id, name, color, type, created_at, is_hidden')
        .single()

      if (insertError) {
        console.error('Insert error details:', insertError)
        console.error('Error code:', insertError.code)
        console.error('Error message:', insertError.message)
        console.error('Error details:', insertError.details)
        throw insertError
      }

      if (!data) {
        throw new Error('Ingen data returneret fra database')
      }

      setProjects([data, ...projects])
      setNewProjectName('')
      setNewProjectType('Internt')
      setShowAddProject(false)
    } catch (err: any) {
      console.error('Error adding project:', err)
      const errorMessage = err.message || err.details || err.hint || 'Ukendt fejl'
      alert('Fejl ved tilføjelse af projekt: ' + errorMessage)
    }
  }

  // Start editing a project
  const startEditing = (project: Project) => {
    setEditingProject(project)
    setEditProjectName(project.name)
    // Normalize type: convert old values to new ones
    const normalizedType = project.type === 'internal' ? 'Internt' : 
                          project.type === 'customer' ? 'Kunde' : 
                          project.type || 'Kunde'
    setEditProjectType(normalizedType)
    setShowAddProject(false) // Close add form if open
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingProject(null)
    setEditProjectName('')
    setEditProjectType('Kunde')
    setShowDeleteConfirm(false)
  }

  // Update project
  const handleUpdateProject = async () => {
    if (!editingProject || !editProjectName.trim() || !supabase) return

    try {
      const { data, error: updateError } = await supabase
        .from('he_time_projects')
        .update({
          name: editProjectName.trim(),
          type: editProjectType,
          color: getProjectColor(editProjectType),
        })
        .eq('id', editingProject.id)
        .select()
        .single()

      if (updateError) throw updateError

      setProjects(projects.map(p => p.id === editingProject.id ? data : p))
      cancelEditing()
    } catch (err: any) {
      console.error('Error updating project:', err)
      alert('Fejl ved opdatering af projekt: ' + err.message)
    }
  }

  // Delete project
  const handleDeleteProject = async () => {
    if (!editingProject || !supabase) return

    try {
      // First, remove project references from time logs
      // Set project_id to NULL for all time logs referencing this project
      const { error: updateLogsError } = await supabase
        .from('he_time_logs')
        .update({ project_id: null })
        .eq('project_id', editingProject.id)

      if (updateLogsError) {
        console.warn('Warning updating time logs:', updateLogsError)
        // Continue anyway - might be that project_id column doesn't exist or is nullable
      }

      // Also try to clear project_name if it matches
      if (editingProject.name) {
        const { error: updateNameError } = await supabase
          .from('he_time_logs')
          .update({ project_name: null })
          .eq('project_name', editingProject.name)

        if (updateNameError) {
          console.warn('Warning updating project_name:', updateNameError)
        }
      }

      // Now delete the project
      const { error: deleteError } = await supabase
        .from('he_time_projects')
        .delete()
        .eq('id', editingProject.id)

      if (deleteError) throw deleteError

      setProjects(projects.filter(p => p.id !== editingProject.id))
      setShowDeleteConfirm(false)
      cancelEditing()
    } catch (err: any) {
      console.error('Error deleting project:', err)
      alert('Fejl ved sletning af projekt: ' + err.message)
    }
  }

  // Check if project has hours
  const projectHasHours = (projectId: string | null, projectName: string | null): boolean => {
    return getProjectHours(projectId, projectName) > 0
  }

  // Calculate total hours for each project
  const getProjectHours = (projectId: string | null, projectName: string | null): number => {
    if (!projectId && !projectName) return 0
    
    return timeEntries.reduce((total, entry) => {
      const matchesId = entry.project_id && entry.project_id === projectId
      const matchesName = projectName && entry.project_name && entry.project_name.toLowerCase() === projectName.toLowerCase()
      
      if (matchesId || matchesName) {
        return total + (entry.hours || 0)
      }
      return total
    }, 0)
  }

  // Group time entries by employee
  // Start with all active users from he_time_users, then add time entries to them
  const employeesData: EmployeeData[] = (() => {
    // Create a map of user_id -> user for quick lookup
    const usersMap = new Map<string, TimeUser>()
    users.forEach(user => {
      usersMap.set(user.id, user)
    })

    // Start with all active users - create an entry for each
    const employeesMap = new Map<string, { 
      id?: string
      name: string
      initials?: string
      color?: string
      avatar_url?: string | null
      hoursByDate: EmployeeHours
      entriesByDate: EmployeeEntries 
    }>()

    // Initialize map with all active users
    users.forEach(user => {
      employeesMap.set(user.id, {
        id: user.id,
        name: user.name,
        initials: user.initials,
        color: user.color,
        avatar_url: user.avatar_url || null,
        hoursByDate: {},
        entriesByDate: {}
      })
    })

    // Now add time entries to the appropriate users
    timeEntries.forEach((entry) => {
      let employeeId: string | undefined
      let employeeName = 'Ukendt'
      let employeeInitials: string | undefined
      let employeeColor: string | undefined

      // First, try to get user from user_id (new structure)
      if (entry.user_id && usersMap.has(entry.user_id)) {
        const user = usersMap.get(entry.user_id)!
        employeeId = user.id
        employeeName = user.name
        employeeInitials = user.initials
        employeeColor = user.color
        // Update avatar_url in the map if user has one
        if (employeesMap.has(user.id)) {
          const empData = employeesMap.get(user.id)!
          empData.avatar_url = user.avatar_url || null
        }
      } else if (entry.user_data) {
        // Fallback to legacy user_data extraction
        try {
          let userData: any
          if (typeof entry.user_data === 'string') {
            try {
              userData = JSON.parse(entry.user_data)
            } catch {
              employeeName = entry.user_data.trim() || 'Ukendt'
              userData = null
            }
          } else {
            userData = entry.user_data
          }
          
          if (userData) {
            // Try to find user_id in user_data
            if (userData.user_id && usersMap.has(userData.user_id)) {
              const user = usersMap.get(userData.user_id)!
              employeeId = user.id
              employeeName = user.name
              employeeInitials = user.initials
              employeeColor = user.color
              // Update avatar_url in the map if user has one
              if (employeesMap.has(user.id)) {
                const empData = employeesMap.get(user.id)!
                empData.avatar_url = user.avatar_url || null
              }
            } else {
              // Extract name from user_data (legacy)
              const getName = (obj: any): string | null => {
                if (!obj || typeof obj !== 'object') return null
                if (obj.name) return String(obj.name).trim()
                if (obj.user_name) return String(obj.user_name).trim()
                if (obj.employee_name) return String(obj.employee_name).trim()
                if (obj.full_name) return String(obj.full_name).trim()
                if (obj.display_name) return String(obj.display_name).trim()
                if (obj.first_name && obj.last_name) return `${obj.first_name} ${obj.last_name}`.trim()
                if (obj.firstName && obj.lastName) return `${obj.firstName} ${obj.lastName}`.trim()
                if (obj.user && typeof obj.user === 'object') {
                  const nestedName = getName(obj.user)
                  if (nestedName) return nestedName
                }
                if (obj.email) {
                  const emailName = String(obj.email).split('@')[0]
                  if (emailName) return emailName.trim()
                }
                return null
              }
              employeeName = getName(userData) || 'Ukendt'
              
              // Try to match by name if we couldn't find user_id
              const matchedUser = Array.from(usersMap.values()).find(u => 
                u.name.toLowerCase() === employeeName.toLowerCase()
              )
              if (matchedUser) {
                employeeId = matchedUser.id
                employeeName = matchedUser.name
                employeeInitials = matchedUser.initials
                employeeColor = matchedUser.color
              }
            }
          }
        } catch (err) {
          console.warn('Failed to parse user_data:', entry.user_data, err)
          employeeName = String(entry.user_data).trim() || 'Ukendt'
        }
      }
      
      // Use employeeId as key if available, otherwise use name
      const key = employeeId || employeeName
      
      // If this employee doesn't exist in the map yet (legacy entry), create it
      if (!employeesMap.has(key)) {
        // Try to get avatar_url from usersMap if we have employeeId
        let avatarUrl: string | null = null
        if (employeeId && usersMap.has(employeeId)) {
          avatarUrl = usersMap.get(employeeId)!.avatar_url || null
        }
        employeesMap.set(key, {
          id: employeeId,
          name: employeeName,
          initials: employeeInitials,
          color: employeeColor,
          avatar_url: avatarUrl,
          hoursByDate: {},
          entriesByDate: {}
        })
      }
      const employeeData = employeesMap.get(key)!
      
      // Extract date from timestamp field
      if (entry.timestamp) {
        const date = entry.timestamp.split('T')[0]
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const hours = Number(entry.hours) || 0
          employeeData.hoursByDate[date] = (employeeData.hoursByDate[date] || 0) + hours
          
          if (!employeeData.entriesByDate[date]) {
            employeeData.entriesByDate[date] = []
          }
          employeeData.entriesByDate[date].push(entry)
        }
      }
    })

    // Convert to array and calculate total hours for sorting
    const employees = Array.from(employeesMap.values()).map((emp) => {
      const totalHours = Object.values(emp.hoursByDate).reduce((sum, hours) => sum + hours, 0)
      return {
        ...emp,
        totalHours,
      }
    })

    // Sort by name (alphabetically) for consistent display
    employees.sort((a, b) => a.name.localeCompare(b.name))

    // Return all employees (including those with 0 hours)
    const result: EmployeeData[] = employees.map(({ totalHours, ...employeeData }) => employeeData)

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
            <span className="text-gray-600">Fuld dag (≥7.5t)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 bg-yellow-50 border border-yellow-300 rounded" />
            <span className="text-gray-600">Delvis dag (&lt;7.5t)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded" />
            <span className="text-gray-600">Ingen timer</span>
          </div>
          <div className="flex items-center space-x-1.5 ml-4">
            <span className="text-gray-500">Klik på en dato for at tilføje eller redigere timer</span>
          </div>
        </div>
      </div>

      {/* Month Calendars - Show all active employees from he_time_users */}
      {loadingUsers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 h-96 animate-pulse" />
          ))}
        </div>
      ) : employeesData.length > 0 ? (
        <div className={`grid grid-cols-1 ${employeesData.length >= 2 ? 'md:grid-cols-2' : ''} ${employeesData.length >= 3 ? 'lg:grid-cols-3' : ''} gap-4`}>
          {employeesData.map((employee) => (
            <MonthCalendar
              key={employee.id || employee.name}
              employee={employee}
              year={currentYear}
              month={currentMonth}
              projects={projects}
              onAddEntry={handleAddTimeEntry}
              onUpdateEntry={handleUpdateEntry}
              onDeleteEntry={handleDeleteEntry}
            />
          ))}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Calendar className="h-12 w-12 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Ingen medarbejdere</h3>
          <p className="text-blue-700 text-sm">
            Tilføj medarbejdere i <a href="/admin/users" className="underline font-medium">Medarbejdere</a> sektionen.
          </p>
        </div>
      )}

      {/* Projects Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Projekter</h2>
        </div>

        {/* Add Project Modal */}
        {showAddProject && typeof document !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddProject(false)
                setNewProjectName('')
                setNewProjectType('Internt')
              }
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Tilføj internt projekt</h2>
                <button
                  onClick={() => {
                    setShowAddProject(false)
                    setNewProjectName('')
                    setNewProjectType('Internt')
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Kundeprojekter skal oprettes i Trello. Her kan du kun oprette interne projekter.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Projektnavn *
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Indtast projektnavn"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddProject()
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <div className="px-3 py-2 bg-primary-50 border border-primary-500 text-primary-700 font-medium rounded-lg flex items-center">
                      <Building2 className="h-4 w-4 inline mr-2" />
                      Internt (kun mulighed)
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddProject(false)
                    setNewProjectName('')
                    setNewProjectType('Internt')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuller
                </button>
                <button
                  onClick={handleAddProject}
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Tilføj projekt
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Projects Table */}
        {loadingProjects ? (
          <div className="text-center py-8 text-gray-500">Indlæser projekter...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interne Projekter */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Building2 className="h-5 w-5 text-primary-600" />
                <h3 className="text-base font-semibold text-gray-900">Interne projekter</h3>
              </div>
              <div className="space-y-2">
                {projects.filter(p => p.type === 'Internt' || p.type === 'internal' || !p.type).length === 0 ? (
                  <div className="text-sm text-gray-500 py-4 text-center border border-gray-200 rounded-lg bg-gray-50">
                    Ingen interne projekter
                  </div>
                ) : (
                  projects
                    .filter(p => p.type === 'Internt' || p.type === 'internal' || !p.type)
                    .map((project) => (
                      <div key={project.id}>
                        {editingProject?.id === project.id ? (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Projektnavn
                                </label>
                                <input
                                  type="text"
                                  value={editProjectName}
                                  onChange={(e) => setEditProjectName(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateProject()
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Type
                                </label>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => setEditProjectType('Internt')}
                                    className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                                      editProjectType === 'Internt'
                                        ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <Building2 className="h-4 w-4 inline mr-1" />
                                    Internt
                                  </button>
                                  <button
                                    onClick={() => setEditProjectType('Kunde')}
                                    className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                                      editProjectType === 'Kunde'
                                        ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <Briefcase className="h-4 w-4 inline mr-1" />
                                    Kunde
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                              <button
                                onClick={() => {
                                  if (editingProject && projectHasHours(editingProject.id, editingProject.name)) {
                                    setShowDeleteConfirm(true)
                                  } else {
                                    handleDeleteProject()
                                  }
                                }}
                                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Slet projekt</span>
                              </button>
                              <div className="flex space-x-2">
                                <button
                                  onClick={handleUpdateProject}
                                  disabled={!editProjectName.trim()}
                                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  Gem ændringer
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  Annuller
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => startEditing(project)}
                            className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: project.color || getProjectColor(project.type) }}
                              />
                              <span className="text-sm text-gray-900 truncate">{project.name}</span>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-sm font-medium text-gray-600">
                                {getProjectHours(project.id, project.name).toFixed(1)}t
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
              {/* Add Internal Project Button */}
              <div className="mt-4">
                <button
                  onClick={() => setShowAddProject(!showAddProject)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors w-full justify-center"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tilføj internt projekt</span>
                </button>
              </div>
            </div>

            {/* Kundeprojekter */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Briefcase className="h-5 w-5 text-primary-600" />
                <h3 className="text-base font-semibold text-gray-900">Kundeprojekter</h3>
              </div>
              <div className="space-y-2">
                {projects.filter(p => p.type === 'Kunde' || p.type === 'customer').length === 0 ? (
                  <div className="text-sm text-gray-500 py-4 text-center border border-gray-200 rounded-lg bg-gray-50">
                    Ingen kundeprojekter
                  </div>
                ) : (
                  projects
                    .filter(p => p.type === 'Kunde' || p.type === 'customer')
                    .map((project) => (
                      <div key={project.id}>
                        {editingProject?.id === project.id ? (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Projektnavn
                                </label>
                                <input
                                  type="text"
                                  value={editProjectName}
                                  onChange={(e) => setEditProjectName(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateProject()
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Type
                                </label>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => setEditProjectType('Internt')}
                                    className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                                      editProjectType === 'Internt'
                                        ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <Building2 className="h-4 w-4 inline mr-1" />
                                    Internt
                                  </button>
                                  <button
                                    onClick={() => setEditProjectType('Kunde')}
                                    className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                                      editProjectType === 'Kunde'
                                        ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <Briefcase className="h-4 w-4 inline mr-1" />
                                    Kunde
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                              <button
                                onClick={() => {
                                  if (editingProject && projectHasHours(editingProject.id, editingProject.name)) {
                                    setShowDeleteConfirm(true)
                                  } else {
                                    handleDeleteProject()
                                  }
                                }}
                                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Slet projekt</span>
                              </button>
                              <div className="flex space-x-2">
                                <button
                                  onClick={handleUpdateProject}
                                  disabled={!editProjectName.trim()}
                                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  Gem ændringer
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  Annuller
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => startEditing(project)}
                            className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: project.color || getProjectColor(project.type) }}
                              />
                              <span className="text-sm text-gray-900 truncate">{project.name}</span>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-sm font-medium text-gray-600">
                                {getProjectHours(project.id, project.name).toFixed(1)}t
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && editingProject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Bekræft sletning</h3>
                <p className="text-sm text-gray-600">Dette projekt har registrerede timer</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-700">
                Er du sikker på, at du vil slette projektet <span className="font-semibold">"{editingProject.name}"</span>?
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Dette projekt har <span className="font-semibold text-gray-900">{getProjectHours(editingProject.id, editingProject.name).toFixed(1)}t</span> registreret. 
                Sletningen kan ikke fortrydes.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuller
              </button>
              <button
                onClick={handleDeleteProject}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Slet projekt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
