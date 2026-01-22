import { Button, Alert, Row, Col, Typography, Icon, Spacer } from 'ft-design-system'

export type ErrorType = 'network' | 'auth' | 'server' | 'forbidden' | 'unknown'

interface ErrorBannerProps {
  message?: string
  error?: Error | null
  onRetry: () => void
  variant?: 'full' | 'inline'
}

/**
 * Detect error type from error message or error object
 */
function detectErrorType(error: Error | null | undefined, message?: string): ErrorType {
  const errorMessage = error?.message || message || ''
  const lowerMessage = errorMessage.toLowerCase()

  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return 'network'
  }
  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
    return 'auth'
  }
  if (lowerMessage.includes('403') || lowerMessage.includes('forbidden') || lowerMessage.includes('access')) {
    return 'forbidden'
  }
  if (lowerMessage.includes('500') || lowerMessage.includes('internal server')) {
    return 'server'
  }

  return 'unknown'
}

/**
 * Get contextual error message based on error type
 */
function getErrorMessage(errorType: ErrorType, customMessage?: string): { title: string; description: string } {
  if (customMessage) {
    return {
      title: 'Something went wrong',
      description: customMessage,
    }
  }

  switch (errorType) {
    case 'network':
      return {
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection and try again.',
      }
    case 'auth':
      return {
        title: 'Authentication Required',
        description: 'Your session has expired. Please log in again.',
      }
    case 'forbidden':
      return {
        title: 'Access Denied',
        description: "You don't have permission to access this data.",
      }
    case 'server':
      return {
        title: 'Server Error',
        description: 'Something went wrong on our end. Please try again in a moment.',
      }
    default:
      return {
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Please try again.',
      }
  }
}

export default function ErrorBanner({
  message,
  error,
  onRetry,
  variant = 'full',
}: ErrorBannerProps) {
  const errorType = detectErrorType(error, message)
  const { title, description } = getErrorMessage(errorType, message)

  if (variant === 'inline') {
    return (
      <Alert
        type="warning"
        message={description}
        action={
          <Button variant="text" size="sm" onClick={onRetry}>
            Retry
          </Button>
        }
        showIcon
      />
    )
  }

  return (
    <div className="error-banner-wrapper">
      <Row justify="center" align="middle" style={{ minHeight: 'calc(var(--spacing-x24) * 3)' }}>
        <Col span={12} style={{ textAlign: 'center' }}>
          <Icon name="warning" size={48} />
          <Spacer size="medium" />
          <Typography variant="title-secondary">{title}</Typography>
          <Spacer size="small" />
          <Typography variant="body-primary-regular">{description}</Typography>
          <Spacer size="large" />
          <Button variant="primary" size="md" onClick={onRetry}>
            Try Again
          </Button>
        </Col>
      </Row>
    </div>
  )
}
