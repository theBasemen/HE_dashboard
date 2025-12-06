import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Users, Plus, Edit2, AlertCircle, Upload, Image as ImageIcon, X } from 'lucide-react'
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
  const [formSalary, setFormSalary] = useState<string>('')
  const [formAvatarFile, setFormAvatarFile] = useState<File | null>(null)
  const [formAvatarPreview, setFormAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        avatar_url: avatarUrl,
        salary: formSalary ? parseFloat(formSalary) : null
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
        avatar_url: avatarUrl,
        salary: formSalary ? parseFloat(formSalary) : null
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
    
    if (editingUser.is_active) {
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
    setFormSalary('')
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
    setFormSalary(user.salary?.toString() || '')
    setFormAvatarFile(null)
    setFormAvatarPreview(user.avatar_url || null)
    setShowAddForm(false)
  }

  const cancelEditing = () => {
    setEditingUser(null)
    resetForm()
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
        {!showAddForm && (
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

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tilføj ny medarbejder
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Løn (månedlig)
              </label>
              <input
                type="number"
                value={formSalary}
                onChange={(e) => setFormSalary(e.target.value)}
                placeholder="F.eks. 45000"
                min="0"
                step="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {editingUser && editingUser.hourly_rate !== null && editingUser.hourly_rate !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kostpris (pr. time) <span className="text-xs text-gray-500">(beregnes automatisk)</span>
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
                  {new Intl.NumberFormat('da-DK', {
                    style: 'currency',
                    currency: 'DKK',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(editingUser.hourly_rate)}/time
                </div>
              </div>
            )}
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

          <div className="mt-6 flex space-x-3">
            <button
              onClick={handleAddUser}
              disabled={saving || uploadingAvatar || !formName.trim() || !formInitials.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploadingAvatar ? 'Uploader...' : saving ? 'Gemmer...' : 'Opret medarbejder'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                resetForm()
              }}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelEditing()
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Rediger medarbejder</h2>
              <button
                onClick={cancelEditing}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Løn (månedlig)
                  </label>
                  <input
                    type="number"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    placeholder="F.eks. 45000"
                    min="0"
                    step="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                {editingUser.hourly_rate !== null && editingUser.hourly_rate !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kostpris (pr. time) <span className="text-xs text-gray-500">(beregnes automatisk)</span>
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
                      {new Intl.NumberFormat('da-DK', {
                        style: 'currency',
                        currency: 'DKK',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(editingUser.hourly_rate)}/time
                    </div>
                  </div>
                )}
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
                        id="avatar-upload-edit"
                      />
                      <label
                        htmlFor="avatar-upload-edit"
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

              {/* Deactivate/Activate button */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      Status: {editingUser.is_active ? 'Aktiv' : 'Inaktiv'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {editingUser.is_active 
                        ? 'Du kan deaktivere denne medarbejder' 
                        : 'Du kan aktivere denne medarbejder'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleActive}
                    disabled={saving}
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
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={cancelEditing}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuller
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={saving || uploadingAvatar || !formName.trim() || !formInitials.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploadingAvatar ? 'Uploader...' : saving ? 'Gemmer...' : 'Gem ændringer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
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
                className={`px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                  !user.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
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
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${user.color} ${user.avatar_url ? 'hidden' : ''}`}
                  >
                    {user.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-gray-900 truncate">{user.name}</span>
                      {!user.is_active && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded flex-shrink-0">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="text-gray-500">
                        <span className="text-gray-400">Initialer:</span> <span className="font-medium text-gray-700">{user.initials}</span>
                      </span>
                      {user.salary !== null && user.salary !== undefined && (
                        <span className="text-gray-500">
                          <span className="text-gray-400">Løn:</span> <span className="font-medium text-gray-700">
                            {new Intl.NumberFormat('da-DK', {
                              style: 'currency',
                              currency: 'DKK',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(user.salary)}
                          </span>
                        </span>
                      )}
                      {user.hourly_rate !== null && user.hourly_rate !== undefined && (
                        <span className="text-gray-500">
                          <span className="text-gray-400">Kostpris:</span> <span className="font-medium text-gray-700">
                            {new Intl.NumberFormat('da-DK', {
                              style: 'currency',
                              currency: 'DKK',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(user.hourly_rate)}/time
                          </span>
                        </span>
                      )}
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

