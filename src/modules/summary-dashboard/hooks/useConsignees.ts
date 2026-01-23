import { useState, useEffect } from 'react'
import { fetchConsignees, type ConsigneeOption } from '../data/consigneeApiService'
import { useAuth } from '../auth/AuthContext'

interface UseConsigneesReturn {
  consignees: ConsigneeOption[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useConsignees(): UseConsigneesReturn {
  const { user, isAuthenticated } = useAuth()
  const [consignees, setConsignees] = useState<ConsigneeOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConsignees = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchConsignees()
      setConsignees(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch consignees')
      console.error('Error in useConsignees:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setConsignees([])
      setIsLoading(false)
      setError(null)
      return
    }
    loadConsignees()
  }, [isAuthenticated, user?.orgId])

  return {
    consignees,
    isLoading,
    error,
    refetch: loadConsignees
  }
}
