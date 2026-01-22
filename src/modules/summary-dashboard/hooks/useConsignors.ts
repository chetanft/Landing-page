import { useState, useEffect } from 'react'
import { fetchConsignors, type ConsignorOption } from '../data/consignorApiService'

interface UseConsignorsReturn {
  consignors: ConsignorOption[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useConsignors(): UseConsignorsReturn {
  const [consignors, setConsignors] = useState<ConsignorOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConsignors = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchConsignors()
      setConsignors(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch consignors')
      console.error('Error in useConsignors:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadConsignors()
  }, [])

  return {
    consignors,
    isLoading,
    error,
    refetch: loadConsignors
  }
}