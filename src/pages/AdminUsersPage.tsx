import { useState, useEffect, useRef } from 'react'
import { Users, Plus, Edit2, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { 
  fetchAllUsers, 
  createUser, 
  updateUser, 
  deactivateUser, 
  activateUser,
  uploadAvatar,
  deleteAvatar,
  TimeUser 
} from '../services/userApi'

// Predefined color options
const colorOptions = [
  { value: 'bg-blue-100 text-blue-700', label: 'Blå', preview: 'bg-blue-500' },
  { value: 'bg-green-100 text-green-700', label: 'Grøn', preview: 'bg-green-500' },
  { value: 'bg-purple-100 text-purple-700', label: 'Lilla', preview: 'bg-purple-500' },
  { value: 'bg-pink-100 text-pink-700', label: 'Pink', preview: 'bg-pink-500' },
  { value: 'bg-yellow-100 text-yellow-700', label: 'Gul', preview: 'bg-yellow-500' },
  { value: 'bg-red-100 text-red-700', label: 'Rød', preview: 'bg-red-500' },
  { value: 'bg-indigo-100 text-indigo-700', label: 'Indigo', preview: 'bg-indigo-500' },
  { value: 'bg-orange-100 text-orange-700', label: 'Orange', preview: 'bg-orange-500' },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<TimeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<TimeUser | null>(null)
  
  // Form state
  const [formName, setFormName] = useState('')
  const [formInitials, setFormInitials] = useState('')
  const [formColor, setFormColor] = useState(colorOptions[0].value)
  const [formAvatarFile, setFormAvatarFile] = useState<File | null>(null)
  const [formAvatarPreview, setFormAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkingTimeEntries, setCheckingTimeEntries] = useState(false)
  const [hasTimeEntries, setHasTimeEntries] = useState<boolean | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if user has time entries
  const checkUserHasTimeEntries = async (userId: string): Promise<boolean> => {
    if (!supabase) return false
    
    try {
      const { data, error } = await supabase
        .from('he_time_logs')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
      
      if (error) {
        console.error('Error checking time entries:', error)
        return false
      }
      
      return (data?.length || 0) > 0
    } catch (err) {
      console.error('Error checking time entries:', err)
      return false
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchAllUsers()
      setUsers(data)
    } catch (err: any) {
      setError(err.message || 'Fejl ved indlæsning af medarbejdere')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!formName.trim() || !formInitials.trim()) {
      alert('Navn og initialer er påkrævet')
      return
    }

    try {
      setSaving(true)
      let avatarUrl: string | null = null

      // Upload avatar if selected
      if (formAvatarFile) {
        setUploadingAvatar(true)
        try {
          // Generate a temporary ID for upload (will be replaced with actual user ID)
          const tempId = `temp-${Date.now()}`
          avatarUrl = await uploadAvatar(formAvatarFile, tempId)
          if (!avatarUrl) {
            throw new Error('Kunne ikke uploade avatar')
          }
        } catch (err: any) {
          alert('Fejl ved upload af avatar: ' + err.message)
          setUploadingAvatar(false)
          setSaving(false)
          return
        }
        setUploadingAvatar(false)
      }

      const newUser = await createUser({
        name: formName,
        initials: formInitials,
        color: formColor,
        avatar_url: avatarUrl
      })

      // If avatar was uploaded with temp ID, re-upload with actual user ID
      if (newUser && formAvatarFile && avatarUrl) {
        try {
          // Delete old temp file
          await deleteAvatar(avatarUrl)
          // Upload with correct user ID
          const newAvatarUrl = await uploadAvatar(formAvatarFile, newUser.id)
          if (newAvatarUrl) {
            await updateUser(newUser.id, { avatar_url: newAvatarUrl })
          }
        } catch (err) {
          console.error('Error re-uploading avatar with user ID:', err)
        }
      }

      await loadUsers()
      resetForm()
      setShowAddForm(false)
    } catch (err: any) {
      alert('Fejl ved oprettelse af medarbejder: ' + err.message)
    } finally {
      setSaving(false)
      setUploadingAvatar(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser || !formName.trim() || !formInitials.trim()) {
      alert('Navn og initialer er påkrævet')
      return
    }

    try {
      setSaving(true)
      let avatarUrl: string | null = editingUser.avatar_url || null

      // Upload new avatar if selected
      if (formAvatarFile) {
        setUploadingAvatar(true)
        try {
          // Delete old avatar if exists
          if (editingUser.avatar_url) {
            await deleteAvatar(editingUser.avatar_url)
          }
          // Upload new avatar
          avatarUrl = await uploadAvatar(formAvatarFile, editingUser.id)
          if (!avatarUrl) {
            throw new Error('Kunne ikke uploade avatar')
          }
        } catch (err: any) {
          alert('Fejl ved upload af avatar: ' + err.message)
          setUploadingAvatar(false)
          setSaving(false)
          return
        }
        setUploadingAvatar(false)
      }

      await updateUser(editingUser.id, {
        name: formName,
        initials: formInitials,
        color: formColor,
        avatar_url: avatarUrl
      })
      await loadUsers()
      resetForm()
      setEditingUser(null)
    } catch (err: any) {
      alert('Fejl ved opdatering af medarbejder: ' + err.message)
    } finally {
      setSaving(false)
      setUploadingAvatar(false)
    }
  }

  const handleToggleActive = async () => {
    if (!editingUser) return
    
    // Check if user has time entries before deactivating
    if (editingUser.is_active) {
      if (hasTimeEntries === null) {
        setCheckingTimeEntries(true)
        const hasEntries = await checkUserHasTimeEntries(editingUser.id)
        setHasTimeEntries(hasEntries)
        setCheckingTimeEntries(false)
        
        if (hasEntries) {
          alert('Kan ikke deaktivere medarbejder: Der er registreret timer for denne medarbejder.')
          return
        }
      } else if (hasTimeEntries) {
        alert('Kan ikke deaktivere medarbejder: Der er registreret timer for denne medarbejder.')
        return
      }
      
      if (!confirm(`Er du sikker på, at du vil deaktivere ${editingUser.name}?`)) {
        return
      }
    }

    try {
      setSaving(true)
      if (editingUser.is_active) {
        await deactivateUser(editingUser.id)
      } else {
        await activateUser(editingUser.id)
      }
      await loadUsers()
      setEditingUser(null)
      resetForm()
    } catch (err: any) {
      alert('Fejl ved opdatering af medarbejder: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormInitials('')
    setFormColor(colorOptions[0].value)
    setFormAvatarFile(null)
    setFormAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vælg venligst et billede')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Billedet er for stort. Maksimal størrelse er 5MB')
        return
      }
      setFormAvatarFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const startEditing = async (user: TimeUser) => {
    setEditingUser(user)
    setFormName(user.name)
    setFormInitials(user.initials)
    setFormColor(user.color)
    setFormAvatarFile(null)
    setFormAvatarPreview(user.avatar_url || null)
    setShowAddForm(false)
    setHasTimeEntries(null)
    
    // Check if user has time entries
    setCheckingTimeEntries(true)
    const hasEntries = await checkUserHasTimeEntries(user.id)
    setHasTimeEntries(hasEntries)
    setCheckingTimeEntries(false)
  }

  const cancelEditing = () => {
    setEditingUser(null)
    resetForm()
    setHasTimeEntries(null)
    setCheckingTimeEntries(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medarbejdere</h1>
            <p className="text-gray-600 mt-1">Administrer medarbejdere</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medarbejdere</h1>
            <p className="text-gray-600 mt-1">Administrer medarbejdere</p>
          </div>
        </div>
        {!showAddForm && !editingUser && (
          <button
            onClick={() => {
              resetForm()
              setShowAddForm(true)
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Tilføj medarbejder</span>
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingUser) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingUser ? 'Rediger medarbejder' : 'Tilføj ny medarbejder'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Navn *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="F.eks. Jeppe Himmelstrup"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initialer *
              </label>
              <input
                type="text"
                value={formInitials}
                onChange={(e) => setFormInitials(e.target.value.toUpperCase())}
                placeholder="F.eks. JH"
                maxLength={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profilbillede
              </label>
              <div className="flex items-center space-x-4">
                {/* Avatar Preview */}
                <div className="flex-shrink-0">
                  {formAvatarPreview ? (
                    <img
                      src={formAvatarPreview}
                      alt="Avatar preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                {/* Upload Button */}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Upload className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      {formAvatarFile ? 'Skift billede' : 'Vælg billede'}
                    </span>
                  </label>
                  {formAvatarFile && (
                    <p className="text-xs text-gray-500 mt-1">{formAvatarFile.name}</p>
                  )}
                  {uploadingAvatar && (
                    <p className="text-xs text-primary-600 mt-1">Uploader...</p>
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Farve
              </label>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setFormColor(color.value)}
                    className={`
                      flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
                      ${formColor === color.value 
                        ? 'border-gray-900 scale-105' 
                        : 'border-gray-300 hover:border-gray-400'
                      }
                    `}
                  >
                    <div className={`w-8 h-8 rounded-full ${color.preview} mb-1`} />
                    <span className="text-xs text-gray-600">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Deactivate/Activate button - only show when editing */}
          {editingUser && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Status: {editingUser.is_active ? 'Aktiv' : 'Inaktiv'}
                  </h3>
                  {checkingTimeEntries ? (
                    <p className="text-xs text-gray-500">Tjekker for registrerede timer...</p>
                  ) : hasTimeEntries ? (
                    <p className="text-xs text-yellow-600 font-medium">
                      ⚠️ Der er registreret timer for denne medarbejder. Deaktivering er ikke mulig.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {editingUser.is_active 
                        ? 'Du kan deaktivere denne medarbejder' 
                        : 'Du kan aktivere denne medarbejder'}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleToggleActive}
                  disabled={saving || checkingTimeEntries || (editingUser.is_active && hasTimeEntries === true)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    ${editingUser.is_active
                      ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300'
                      : 'bg-green-600 text-white hover:bg-green-700'
                    }
                  `}
                >
                  {saving ? 'Gemmer...' : editingUser.is_active ? 'Deaktiver' : 'Aktiver'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex space-x-3">
            <button
              onClick={editingUser ? handleUpdateUser : handleAddUser}
              disabled={saving || uploadingAvatar || !formName.trim() || !formInitials.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploadingAvatar ? 'Uploader...' : saving ? 'Gemmer...' : editingUser ? 'Gem ændringer' : 'Opret medarbejder'}
            </button>
            <button
              onClick={() => {
                if (editingUser) {
                  cancelEditing()
                } else {
                  setShowAddForm(false)
                  resetForm()
                }
              }}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Lønnede medarbejdere ({users.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {users.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Ingen medarbejdere endnu</p>
              <p className="text-sm mt-1">Klik på "Tilføj medarbejder" for at oprette en ny</p>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                  !user.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const fallback = target.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${user.color} ${user.avatar_url ? 'hidden' : ''}`}
                  >
                    {user.initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{user.name}</span>
                      {!user.is_active && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Initialer: {user.initials}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startEditing(user)}
                    className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Rediger"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

