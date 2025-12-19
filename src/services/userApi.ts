import { supabase } from '../lib/supabase'

export interface TimeUser {
  id: string
  created_at: string
  name: string
  initials: string
  color: string // CSS classes f.eks. 'bg-blue-100 text-blue-700'
  is_active: boolean
  avatar_url?: string | null // URL to avatar image in Supabase Storage
  salary?: number | null // Monthly salary
  hourly_rate?: number | null // Hourly rate / kostpris
}

/**
 * Fetch all active users from he_time_users table
 */
export async function fetchActiveUsers(): Promise<TimeUser[]> {
  if (!supabase) {
    console.warn('Supabase client not configured')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('he_time_users')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching active users:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error fetching active users:', err)
    return []
  }
}

/**
 * Fetch all users (both active and inactive) from he_time_users table
 */
export async function fetchAllUsers(): Promise<TimeUser[]> {
  if (!supabase) {
    console.warn('Supabase client not configured')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('he_time_users')
      .select('*')
      .order('is_active', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching all users:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error fetching all users:', err)
    return []
  }
}

/**
 * Recalculate hourly rates for all active employees
 * This should be called after changes to salary or is_active status
 */
async function recalculateHourlyRates(): Promise<void> {
  if (!supabase) {
    console.warn('Supabase client not configured')
    return
  }

  try {
    const { error } = await supabase.rpc('recalculate_hourly_rates')
    if (error) {
      console.error('Error recalculating hourly rates:', error)
      // Don't throw - this is a background operation
    }
  } catch (err) {
    console.error('Error recalculating hourly rates:', err)
    // Don't throw - this is a background operation
  }
}

/**
 * Upload avatar image to Supabase Storage
 */
export async function uploadAvatar(file: File, userId: string): Promise<string | null> {
  if (!supabase) {
    console.warn('Supabase client not configured')
    return null
  }

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = fileName

    const { error: uploadError } = await supabase.storage
      .from('he_avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      throw uploadError
    }

    // Get public URL
    const { data } = supabase.storage
      .from('he_avatars')
      .getPublicUrl(filePath)

    return data.publicUrl
  } catch (err) {
    console.error('Error uploading avatar:', err)
    throw err
  }
}

/**
 * Delete avatar from Supabase Storage
 */
export async function deleteAvatar(avatarUrl: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not configured')
    return false
  }

  try {
    // Extract file path from URL
    const urlParts = avatarUrl.split('/he_avatars/')
    if (urlParts.length < 2) {
      console.warn('Invalid avatar URL:', avatarUrl)
      return false
    }
    const filePath = urlParts[1].split('?')[0] // Remove query params

    const { error } = await supabase.storage
      .from('he_avatars')
      .remove([filePath])

    if (error) {
      console.error('Error deleting avatar:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Error deleting avatar:', err)
    return false
  }
}

/**
 * Create a new user
 */
export async function createUser(user: {
  name: string
  initials: string
  color: string
  avatar_url?: string | null
  salary?: number | null
}): Promise<TimeUser | null> {
  if (!supabase) {
    console.warn('Supabase client not configured')
    return null
  }

  try {
    const insertData: any = {
      name: user.name.trim(),
      initials: user.initials.trim().toUpperCase(),
      color: user.color,
      is_active: true
    }
    
    if (user.avatar_url) {
      insertData.avatar_url = user.avatar_url
    }
    
    if (user.salary !== undefined && user.salary !== null) {
      insertData.salary = user.salary
    }

    const { data, error } = await supabase
      .from('he_time_users')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      throw error
    }

    // Recalculate hourly rates if salary was set
    if (user.salary !== undefined && user.salary !== null) {
      await recalculateHourlyRates()
    }

    return data
  } catch (err) {
    console.error('Error creating user:', err)
    throw err
  }
}

/**
 * Update a user
 */
export async function updateUser(
  userId: string,
  updates: {
    name?: string
    initials?: string
    color?: string
    is_active?: boolean
    avatar_url?: string | null
    salary?: number | null
  }
): Promise<TimeUser | null> {
  if (!supabase) {
    console.warn('Supabase client not configured')
    return null
  }

  try {
    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name.trim()
    if (updates.initials !== undefined) updateData.initials = updates.initials.trim().toUpperCase()
    if (updates.color !== undefined) updateData.color = updates.color
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active
    if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url
    if (updates.salary !== undefined) updateData.salary = updates.salary

    const { data, error } = await supabase
      .from('he_time_users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      throw error
    }

    // Recalculate hourly rates if salary or is_active changed
    if (updates.salary !== undefined || updates.is_active !== undefined) {
      await recalculateHourlyRates()
    }

    return data
  } catch (err) {
    console.error('Error updating user:', err)
    throw err
  }
}

/**
 * Soft delete a user (set is_active to false)
 */
export async function deactivateUser(userId: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not configured')
    return false
  }

  try {
    const { error } = await supabase
      .from('he_time_users')
      .update({ is_active: false })
      .eq('id', userId)

    if (error) {
      console.error('Error deactivating user:', error)
      throw error
    }

    // Recalculate hourly rates for remaining active employees
    await recalculateHourlyRates()

    return true
  } catch (err) {
    console.error('Error deactivating user:', err)
    throw err
  }
}

/**
 * Reactivate a user (set is_active to true)
 */
export async function activateUser(userId: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not configured')
    return false
  }

  try {
    const { error } = await supabase
      .from('he_time_users')
      .update({ is_active: true })
      .eq('id', userId)

    if (error) {
      console.error('Error activating user:', error)
      throw error
    }

    // Recalculate hourly rates now that employee is active again
    await recalculateHourlyRates()

    return true
  } catch (err) {
    console.error('Error activating user:', err)
    throw err
  }
}

