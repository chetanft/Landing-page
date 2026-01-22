import { useState, useEffect } from 'react'
import { fetchTransporters, type TransporterOption } from '../data/transporterApiService'

export const useTransporters = () => {
  const [transporters, setTransporters] = useState<TransporterOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTransporters = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const transporterData = await fetchTransporters()
        setTransporters(transporterData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transporters')
        console.error('Error loading transporters:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTransporters()
  }, [])

  return {
    transporters,
    isLoading,
    error,
    refetch: () => {
      const loadTransporters = async () => {
        try {
          setIsLoading(true)
          setError(null)
          const transporterData = await fetchTransporters()
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