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

  useEffect(() => {
    // Get initial session
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserRole()
      }
      setLoading(false)
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
  }, [])

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

