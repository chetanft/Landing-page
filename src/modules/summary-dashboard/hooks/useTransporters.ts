import { useState, useEffect } from 'react'
import { fetchTransporters, type TransporterOption } from '../data/transporterApiService'
import { useAuth } from '../auth/AuthContext'

export const useTransporters = (ptlOnly = false) => {
  const { user, isAuthenticated } = useAuth()
  const [transporters, setTransporters] = useState<TransporterOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTransporters = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const transporterData = await fetchTransporters(ptlOnly)
        setTransporters(transporterData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transporters')
        console.error('Error loading transporters:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (!isAuthenticated) {
      setTransporters([])
      setIsLoading(false)
      setError(null)
      return
    }
    loadTransporters()
  }, [ptlOnly, isAuthenticated, user?.orgId])

  return {
    transporters,
    isLoading,
    error,
    refetch: () => {
      const loadTransporters = async () => {
        try {
          setIsLoading(true)
          setError(null)
          const transporterData = await fetchTransporters(ptlOnly)
          setTransporters(transporterData)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load transporters')
          console.error('Error loading transporters:', err)
        } finally {
          setIsLoading(false)
        }
      }
      loadTransporters()
    }
  }
}
