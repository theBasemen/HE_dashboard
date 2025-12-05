import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Building2, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Check if user is already logged in
    supabase?.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/')
      }
    })

    // Handle OAuth callback or magic link
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase?.auth.getSession() || { data: { session: null }, error: null }
        
        if (error) {
          setError('Fejl ved login: ' + error.message)
          return
        }

        if (data?.session) {
          navigate('/')
        }
      } catch (err: any) {
        setError('Fejl ved login: ' + (err.message || 'Ukendt fejl'))
      }
    }

    // Check for hash fragment (OAuth callback) or query params (magic link)
    if (window.location.hash || searchParams.get('token')) {
      handleAuthCallback()
    }
  }, [navigate, searchParams])

  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    if (!email) {
      setError('Indtast venligst din email')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase?.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      }) || { error: null }

      if (error) {
        setError('Fejl ved send af magic link: ' + error.message)
      } else {
        setError(null)
        alert('Tjek din email for login-link!')
      }
    } catch (err: any) {
      setError('Fejl: ' + (err.message || 'Ukendt fejl'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/he_logo.png?v=1" 
              alt="Himmelstrup Events" 
              className="h-20 w-20 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const fallback = target.nextElementSibling as HTMLElement
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            <div className="hidden items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary-600" />
              <span className="text-2xl font-bold text-gray-900">Himmelstrup</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Log ind</h1>
            <p className="text-sm text-gray-600">
              Du skal have modtaget en invitation fra Himmelstrup Events for at kunne logge ind
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="din@email.dk"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sender...</span>
                </>
              ) : (
                <span>Send magic link</span>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Bemærk:</strong> Du skal være inviteret fra Himmelstrup Events for at kunne logge ind. 
              Kontakt en administrator hvis du ikke har modtaget en invitation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

