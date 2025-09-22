// Types pour les registres (remplace les types Company)

export interface Registry {
  id: string
  name: string
  industry?: string | null
  street_address?: string | null
  city?: string | null
  postal_code?: string | null
  country?: string | null
  created_at: string
  updated_at: string
}

export interface UserRegistry {
  id: string
  name: string
  role?: string
}