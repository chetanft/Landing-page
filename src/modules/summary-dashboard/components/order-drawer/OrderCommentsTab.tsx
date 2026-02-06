import { useState } from 'react'
import {
  Button,
  Typography,
  Card,
} from 'ft-design-system'
import type { useOrderDrawerData } from '../../hooks/useOrderDrawerData'
import { formatDateTime } from '../../utils/ordersFormat'
import ErrorBanner from '../ErrorBanner'
import DrawerSkeleton from '../DrawerSkeleton'

interface OrderCommentsTabProps {
  comments: ReturnType<typeof useOrderDrawerData>['comments']
  loading: boolean
  error: Error | null
  templates: ReturnType<typeof useOrderDrawerData>['templates']
  templatesLoading: boolean
  onRetry: () => void
  onAddComment: (type: 'template' | 'custom', templateId?: string, message?: string) => Promise<void>
}

export default function OrderCommentsTab({
  comments,
  loading,
  error,
  templates,
  templatesLoading,
  onRetry,
  onAddComment,
}: OrderCommentsTabProps) {
  const [commentType, setCommentType] = useState<'template' | 'custom'>('template')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [customMessage, setCustomMessage] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (commentType === 'template' && !selectedTemplateId) return
    if (commentType === 'custom' && !customMessage.trim()) return

    setIsSubmitting(true)
    try {
      await onAddComment(
        commentType,
        commentType === 'template' ? selectedTemplateId : undefined,
        commentType === 'custom' ? customMessage : undefined
      )
      setSelectedTemplateId('')
      setCustomMessage('')
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <DrawerSkeleton variant="comments" />
  }

  if (error) {
    return <ErrorBanner message={error.message} onRetry={onRetry} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x5)', height: '100%' }}>
      {/* Comments List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-x6)' }}>
            <Typography variant="body-primary-regular">No comments yet</Typography>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} style={{ display: 'flex', gap: 'var(--spacing-x3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography
                  variant="body-primary-semibold"
                  style={{ color: 'var(--bg-primary)', fontSize: 'var(--font-size-sm)' }}
                >
                  {comment.authorInitials}
                </Typography>
              </div>
              <div style={{ flex: 1 }}>
                <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-sm)' }}>
                  {comment.authorName}
                </Typography>
                <Typography variant="body-secondary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                  {formatDateTime(comment.createdAt)}
                </Typography>
                <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-x1)' }}>
                  {comment.message}
                </Typography>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <Card style={{ padding: 'var(--spacing-x5)', flexShrink: 0 }}>
        <Typography
          variant="body-primary-semibold"
          style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--spacing-x4)' }}
        >
          Add Comment
        </Typography>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
          {/* Radio buttons */}
          <div style={{ display: 'flex', gap: 'var(--spacing-x4)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={commentType === 'template'}
                onChange={() => setCommentType('template')}
                style={{ cursor: 'pointer' }}
              />
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                Select comment
              </Typography>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={commentType === 'custom'}
                onChange={() => setCommentType('custom')}
                style={{ cursor: 'pointer' }}
              />
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                Write comment
              </Typography>
            </label>
          </div>

          {/* Input */}
          {commentType === 'template' ? (
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={templatesLoading}
              style={{
                padding: 'var(--spacing-x2)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                width: '100%',
              }}
            >
              <option value="">Select comment</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Write your comment..."
              style={{
                padding: 'var(--spacing-x2)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                width: '100%',
                minHeight: '80px',
                resize: 'vertical',
              }}
            />
          )}

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || (commentType === 'template' && !selectedTemplateId) || (commentType === 'custom' && !customMessage.trim())}
            >
              Add
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
