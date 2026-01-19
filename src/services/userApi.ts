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
  hourly_rate?: number | null // Hourly rate / kostpris (calculated for A-indkomst)
  type?: 'freelance' | 'a-indkomst' | null // Employee type
  hourly_rate_manual?: number | null // Manual hourly rate for freelancers
}

export interface FreelancerTimeStats {
  byProject: Array<{
    projectName: string
    hours: number
    cost: number
    projectType: 'Kunde' | 'Internt' | 'customer' | 'internal' | null
  }>
  byMonth: Array<{
    month: string // Format: "2025-01" (YYYY-MM)
    monthLabel: string // Format: "januar 2025"
    customerHours: number
    customerCost: number
    internalHours: number
    internalCost: number
    totalHours: number
    totalCost: number
    projects: Array<{
      projectName: string
      hours: number
      cost: number
      projectType: 'Kunde' | 'Internt' | 'customer' | 'internal' | null
    }>
  }>
  customerTotal: {
    hours: number
    cost: number
  }
  internalTotal: {
    hours: number
    cost: number
  }
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
 * Fetch freelancer time statistics grouped by project
 */
export async function fetchFreelancerTimeStats(userId: string): Promise<FreelancerTimeStats | null> {
  if (!supabase) {
    console.warn('Supabase client not configured')
    return null
  }

  try {
    // Fetch all time logs for this user with timestamp
    const { data: timeLogs, error: logsError } = await supabase
      .from('he_time_logs')
      .select('project_id, hours, timestamp, created_at')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })

    if (logsError) {
      console.error('Error fetching time logs:', logsError)
      return null
    }

    if (!timeLogs || timeLogs.length === 0) {
      return {
        byProject: [],
        byMonth: [],
        customerTotal: { hours: 0, cost: 0 },
        internalTotal: { hours: 0, cost: 0 }
      }
    }

    // Fetch user to get hourly_rate_manual
    const { data: user, error: userError } = await supabase
      .from('he_time_users')
      .select('hourly_rate_manual')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('Error fetching user:', userError)
      return null
    }

    const hourlyRate = user.hourly_rate_manual || 0

    // Fetch all projects
    const projectIds = [...new Set(timeLogs.map(log => log.project_id).filter(Boolean))]
    const { data: projects, error: projectsError } = await supabase
      .from('he_time_projects')
      .select('id, name, type')
      .in('id', projectIds)

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return null
    }

    // Create project map
    const projectMap = new Map<string, { name: string; type: 'Kunde' | 'Internt' | 'customer' | 'internal' | null }>()
    if (projects) {
      projects.forEach((p: any) => {
        let normalizedType: 'Kunde' | 'Internt' | 'customer' | 'internal' | null = null
        if (p.type === 'customer' || p.type === 'Kunde') {
          normalizedType = 'Kunde'
        } else if (p.type === 'internal' || p.type === 'Internt') {
          normalizedType = 'Internt'
        }
        projectMap.set(p.id, { 
          name: p.name, 
          type: normalizedType
        })
      })
    }

    // Group by project and by month
    const byProjectMap = new Map<string, { hours: number; cost: number; projectType: 'Kunde' | 'Internt' | 'customer' | 'internal' | null }>()
    const byMonthMap = new Map<string, { 
      customerHours: number
      customerCost: number
      internalHours: number
      internalCost: number
      projects: Map<string, { hours: number; cost: number; projectType: 'Kunde' | 'Internt' | 'customer' | 'internal' | null }>
    }>()
    let customerHours = 0
    let customerCost = 0
    let internalHours = 0
    let internalCost = 0

    timeLogs.forEach((log: any) => {
      const project = log.project_id ? projectMap.get(log.project_id) : null
      const projectName = project?.name || 'Ingen projekt'
      const projectType: 'Kunde' | 'Internt' | 'customer' | 'internal' | null = project?.type || null
      const hours = log.hours || 0
      const cost = hours * hourlyRate

      // Check if it's a customer project
      const isCustomer = projectType === 'Kunde' || projectType === 'customer'

      // Get month from timestamp or created_at
      const dateStr = log.timestamp || log.created_at
      const date = dateStr ? new Date(dateStr) : new Date()
      const month = date.getMonth() + 1
      const monthKey = `${date.getFullYear()}-${month < 10 ? '0' : ''}${month}`
      
      // Initialize month if not exists
      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, { 
          customerHours: 0, 
          customerCost: 0, 
          internalHours: 0, 
          internalCost: 0,
          projects: new Map()
        })
      }
      const monthData = byMonthMap.get(monthKey)!

      if (isCustomer) {
        customerHours += hours
        customerCost += cost
        monthData.customerHours += hours
        monthData.customerCost += cost
      } else {
        internalHours += hours
        internalCost += cost
        monthData.internalHours += hours
        monthData.internalCost += cost
      }

      // Add to project map (overall)
      const existing = byProjectMap.get(projectName) || { hours: 0, cost: 0, projectType }
      byProjectMap.set(projectName, {
        hours: existing.hours + hours,
        cost: existing.cost + cost,
        projectType: existing.projectType || projectType
      })

      // Add to month's project map
      const monthProjectExisting = monthData.projects.get(projectName) || { hours: 0, cost: 0, projectType }
      monthData.projects.set(projectName, {
        hours: monthProjectExisting.hours + hours,
        cost: monthProjectExisting.cost + cost,
        projectType: monthProjectExisting.projectType || projectType
      })
    })

    const byProject = Array.from(byProjectMap.entries()).map(([projectName, data]) => ({
      projectName,
      hours: data.hours,
      cost: data.cost,
      projectType: data.projectType
    }))

    // Format byMonth array with labels
    const byMonth = Array.from(byMonthMap.entries())
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-')
        const monthNames = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']
        const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`
        
        // Convert projects map to array
        const projects = Array.from(data.projects.entries()).map(([projectName, projectData]) => ({
          projectName,
          hours: projectData.hours,
          cost: projectData.cost,
          projectType: projectData.projectType
        }))
        
        return {
          month: monthKey,
          monthLabel,
          customerHours: data.customerHours,
          customerCost: data.customerCost,
          internalHours: data.internalHours,
          internalCost: data.internalCost,
          totalHours: data.customerHours + data.internalHours,
          totalCost: data.customerCost + data.internalCost,
          projects
        }
      })
      .sort((a, b) => b.month.localeCompare(a.month)) // Sort newest first

    return {
      byProject,
      byMonth,
      customerTotal: { hours: customerHours, cost: customerCost },
      internalTotal: { hours: internalHours, cost: internalCost }
    }
  } catch (err) {
    console.error('Error fetching freelancer time stats:', err)
    return null
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
  type?: 'freelance' | 'a-indkomst' | null
  hourly_rate_manual?: number | null
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
    
    if (user.type !== undefined) {
      insertData.type = user.type || 'a-indkomst'
    }
    
    if (user.salary !== undefined && user.salary !== null) {
      insertData.salary = user.salary
    }
    
    if (user.hourly_rate_manual !== undefined && user.hourly_rate_manual !== null) {
      insertData.hourly_rate_manual = user.hourly_rate_manual
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

    // Recalculate hourly rates if salary was set and user is A-indkomst
    if (user.salary !== undefined && user.salary !== null && (user.type === 'a-indkomst' || !user.type)) {
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
    type?: 'freelance' | 'a-indkomst' | null
    hourly_rate_manual?: number | null
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
    if (updates.type !== undefined) {
      updateData.type = updates.type || 'a-indkomst'
      // If changing to freelance, clear salary and hourly_rate
      if (updates.type === 'freelance') {
        updateData.salary = null
        updateData.hourly_rate = null
      }
      // If changing to a-indkomst, clear hourly_rate_manual
      if (updates.type === 'a-indkomst') {
        updateData.hourly_rate_manual = null
      }
    }
    if (updates.salary !== undefined) updateData.salary = updates.salary
    if (updates.hourly_rate_manual !== undefined) updateData.hourly_rate_manual = updates.hourly_rate_manual

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

    // Recalculate hourly rates if salary or is_active changed, but only for A-indkomst employees
    // Fetch current user type to check
    const { data: currentUser } = await supabase
      .from('he_time_users')
      .select('type')
      .eq('id', userId)
      .single()
    
    const userType = updates.type !== undefined ? updates.type : currentUser?.type || 'a-indkomst'
    
    if ((updates.salary !== undefined || updates.is_active !== undefined) && (userType === 'a-indkomst' || !userType)) {
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

