import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchOrderDetails,
  fetchOrderComments,
  addOrderComment,
} from '../data/ordersApiService'
import type {
  OrderDetailsResponse,
  OrderTimelineResponse,
  OrderComment,
  CommentTemplate,
} from '../types/orders'

type DrawerTab = 'details' | 'timeline' | 'comments'

interface UseOrderDrawerDataParams {
  orderId: string | null
  activeTab: DrawerTab
}

interface UseOrderDrawerDataResult {
  // Details tab data
  details: OrderDetailsResponse['data'] | null
  detailsLoading: boolean
  detailsError: Error | null

  // Timeline tab data
  timeline: OrderTimelineResponse['data'] | null
  timelineLoading: boolean
  timelineError: Error | null

  // Comments tab data
  comments: OrderComment[]
  commentsLoading: boolean
  commentsError: Error | null

  // Comment templates
  templates: CommentTemplate[]
  templatesLoading: boolean

  // Actions
  refetchDetails: () => void
  refetchTimeline: () => void
  refetchComments: () => void
  addComment: (type: 'template' | 'custom', templateId?: string, message?: string) => Promise<void>
}

/**
 * Hook to fetch order drawer data (details, timeline, comments) with caching
 */
export function useOrderDrawerData({
  orderId,
  activeTab,
}: UseOrderDrawerDataParams): UseOrderDrawerDataResult {
  // Details state
  const [details, setDetails] = useState<OrderDetailsResponse['data'] | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<Error | null>(null)

  // Timeline state
  const [timeline, setTimeline] = useState<OrderTimelineResponse['data'] | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState<Error | null>(null)

  // Comments state
  const [comments, setComments] = useState<OrderComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState<Error | null>(null)

  // Templates state
  const [templates, setTemplates] = useState<CommentTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  // Cache to avoid refetching when switching tabs
  const detailsCache = useMemo(() => new Map<string, OrderDetailsResponse['data']>(), [])
  const commentsCache = useMemo(() => new Map<string, OrderComment[]>(), [])

  // Load details
  const loadDetails = useCallback(async () => {
    if (!orderId) {
      setDetails(null)
      return
    }

    // Check cache first
    if (detailsCache.has(orderId)) {
      setDetails(detailsCache.get(orderId)!)
      return
    }

    setDetailsLoading(true)
    setDetailsError(null)

    try {
      const data = await fetchOrderDetails(orderId)
      detailsCache.set(orderId, data)
      setDetails(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch order details')
      setDetailsError(error)
      console.error('Error loading order details:', error)
    } finally {
      setDetailsLoading(false)
    }
  }, [orderId, detailsCache])

  // Load timeline
  const loadTimeline = useCallback(async () => {
    setTimeline(null)
    setTimelineLoading(false)
    setTimelineError(new Error('Order timeline API has been removed'))
  }, [])

  // Load comments
  const loadComments = useCallback(async () => {
    if (!orderId) {
      setComments([])
      return
    }

    // Check cache first
    if (commentsCache.has(orderId)) {
      setComments(commentsCache.get(orderId)!)
      return
    }

    setCommentsLoading(true)
    setCommentsError(null)

    try {
      const data = await fetchOrderComments(orderId)
      commentsCache.set(orderId, data)
      setComments(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch order comments')
      setCommentsError(error)
      console.error('Error loading order comments:', error)
    } finally {
      setCommentsLoading(false)
    }
  }, [orderId, commentsCache])

  useEffect(() => {
    setTemplates([])
    setTemplatesLoading(false)
  }, [])

  // Load data based on active tab and orderId
  useEffect(() => {
    if (!orderId) {
      setDetails(null)
      setTimeline(null)
      setComments([])
      return
    }

    // Always load details when orderId changes
    loadDetails()

    // Load tab-specific data when tab changes
    if (activeTab === 'timeline') {
      loadTimeline()
    } else if (activeTab === 'comments') {
      loadComments()
    }
  }, [orderId, activeTab, loadDetails, loadTimeline, loadComments])

  // Add comment handler
  const handleAddComment = useCallback(
    async (type: 'template' | 'custom', templateId?: string, message?: string) => {
      if (!orderId) return

      try {
        const newComment = await addOrderComment(orderId, { type, templateId, message })
        // Optimistically update comments
        const updatedComments = [...comments, newComment]
        setComments(updatedComments)
        commentsCache.set(orderId, updatedComments)
      } catch (err) {
        console.error('Error adding comment:', err)
        // Refetch to ensure consistency
        await loadComments()
        throw err
      }
    },
    [orderId, comments, commentsCache, loadComments]
  )

  return {
    details,
    detailsLoading,
    detailsError,
    timeline,
    timelineLoading,
    timelineError,
    comments,
    commentsLoading,
    commentsError,
    templates,
    templatesLoading,
    refetchDetails: loadDetails,
    refetchTimeline: loadTimeline,
    refetchComments: loadComments,
    addComment: handleAddComment,
  }
}

// Re-export types
import type { CommentTemplate } from '../types/orders'
export type { DrawerTab, CommentTemplate }
