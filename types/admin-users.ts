export interface FullUserProfile {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  role: 'user' | 'admin' | 'super_admin'
  company?: {
    id: string
    name: string
  } | null
  created_at: string
  last_sign_in_at?: string | null
  updated_at?: string
}

export interface UsersListResponse {
  users: FullUserProfile[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface UserFilters {
  search?: string
  role?: 'user' | 'admin' | 'super_admin'
  company?: string
  page?: number
  limit?: number
}

export interface UpdateUserRequest {
  role?: 'user' | 'admin' | 'super_admin'
  company_id?: string | null
}

export interface UpdateUserResponse {
  success: boolean
  user: FullUserProfile
}