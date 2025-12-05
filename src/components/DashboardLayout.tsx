import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { 
  LayoutDashboard, 
  TrendingUp, 
  Menu, 
  X,
  Clock,
  Calendar,
  Building2,
  Users,
  LogOut,
  User as UserIcon
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// DashboardLayout no longer needs children prop - uses Outlet instead

const navigation = [
  { name: 'Medarbejdere', href: '/admin/users', icon: Users },
  { name: 'Tidsregistrering', href: '/time-tracking', icon: Clock },
  { name: 'Økonomi & Likviditet', href: '/', icon: LayoutDashboard },
  { name: 'SEO & AI synlighed', href: '/seo', icon: TrendingUp },
  { name: 'Årshjul', href: '/year-wheel', icon: Calendar },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [mobileLogoError, setMobileLogoError] = useState(false)
  const location = useLocation()
  const { user, signOut, userRole } = useAuth()

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name
    if (user?.user_metadata?.name) return user.user_metadata.name
    if (user?.email) return user.email.split('@')[0]
    return 'Bruger'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-[104px] px-6 border-b border-gray-200">
            <div className="flex items-center">
              {!logoError ? (
                <img 
                  src="/he_logo.png?v=1" 
                  alt="Himmelstrup Events" 
                  className="h-[60px] w-[60px] object-contain my-[15px]"
                  onError={(e) => {
                    console.error('Failed to load logo:', e)
                    setLogoError(true)
                  }}
                  onLoad={() => console.log('Logo loaded successfully')}
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <Building2 className="h-6 w-6 text-primary-600" />
                  <span className="text-xl font-bold text-gray-900">Himmelstrup</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Info Footer */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <UserIcon className="h-4 w-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {getUserDisplayName()}
                </p>
                {userRole && (
                  <p className="text-xs text-gray-500 capitalize">
                    {userRole === 'superadmin' ? 'Super Admin' : 'Admin'}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Log ud</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-gray-200 h-16 flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center ml-4">
            <img 
              src="/he_logo.png?v=1" 
              alt="Himmelstrup Events" 
              className="h-[60px] w-[60px] object-contain my-[15px]"
              onError={() => {
                console.error('Failed to load mobile logo, showing fallback')
                setMobileLogoError(true)
              }}
              style={{ display: mobileLogoError ? 'none' : 'block' }}
            />
            {mobileLogoError && (
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-primary-600" />
                <span className="text-lg font-bold text-gray-900">Himmelstrup</span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

