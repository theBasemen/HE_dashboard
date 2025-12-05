import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  userRole: 'admin' | 'superadmin' | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'superadmin' | null>(null)
  
  const disableAuth = import.meta.env.VITE_DISABLE_AUTH === 'true'

  useEffect(() => {
    // If auth is disabled, set mock user immediately
    if (disableAuth) {
      const mockUser = {
        id: 'dev-user-123',
        email: 'dev@example.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { role: 'superadmin' },
        aud: 'authenticated',
        confirmation_sent_at: undefined,
        recovery_sent_at: undefined,
        email_confirmed_at: new Date().toISOString(),
        invited_at: undefined,
        action_link: undefined,
        phone: undefined,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      } as User
      
      setUser(mockUser)
      setUserRole('superadmin') // Give full access in dev mode
      setLoading(false)
      return
    }

    // Handle hash fragment from magic link redirect
    const handleHashFragment = async () => {
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          try {
            const { data, error } = await supabase?.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            }) || { data: { session: null }, error: null }
            
            if (!error && data?.session) {
              // Clear hash from URL
              window.history.replaceState(null, '', window.location.pathname)
            }
          } catch (err) {
            console.error('Error handling hash fragment:', err)
          }
        }
      }
    }

    // Handle hash fragment first
    handleHashFragment().then(() => {
      // Then get initial session
      supabase?.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchUserRole()
        }
        setLoading(false)
      })
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase?.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserRole()
      } else {
        setUserRole(null)
      }
      setLoading(false)
    }) || { data: { subscription: null } }

    return () => {
      subscription?.unsubscribe()
    }
  }, [disableAuth])

  const fetchUserRole = async () => {
    if (!supabase) return

    try {
      // Check user metadata first (set via Supabase dashboard or invite)
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.role) {
        const role = user.user_metadata.role as string
        if (role === 'admin' || role === 'superadmin') {
          setUserRole(role)
          return
        }
      }

      // Check app_metadata (set by Supabase admin)
      if (user?.app_metadata?.role) {
        const role = user.app_metadata.role as string
        if (role === 'admin' || role === 'superadmin') {
          setUserRole(role)
          return
        }
      }

      // Fallback: If user exists but no role set, default to 'admin'
      // This allows existing users to work, but new users should have role set via invite
      if (user) {
        setUserRole('admin')
      } else {
        setUserRole(null)
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
      setUserRole(null)
    }
  }

  const signOut = async () => {
    if (disableAuth) {
      // In dev mode, just clear the mock user
      setUser(null)
      setSession(null)
      setUserRole(null)
      return
    }
    await supabase?.auth.signOut()
    setUser(null)
    setSession(null)
    setUserRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, userRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

