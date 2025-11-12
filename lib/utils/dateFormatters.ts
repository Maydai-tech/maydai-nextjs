export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Non définie'
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export const formatDateForInput = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  return new Date(dateString).toISOString().split('T')[0]
}
