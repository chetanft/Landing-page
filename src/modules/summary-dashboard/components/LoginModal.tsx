import React, { useState, useCallback } from 'react'
import {
  Modal,
  Typography,
  Input,
  Button,
  Spacer,
  Card,
  Row,
  Col,
  Alert
} from 'ft-design-system'
import { useAuth } from '../auth/AuthContext'
import type { LoginCredentials } from '../auth/AuthContext'

export interface LoginModalProps {
  open: boolean
  onSuccess?: () => void
  onCancel?: () => void
  title?: string
  subtitle?: string
}

export const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onSuccess,
  onCancel,
  title = 'Sign In',
  subtitle = 'Please sign in to access your FreightTiger dashboard'
}) => {
  const { login, isLoading, error, clearError } = useAuth()

  const [formData, setFormData] = useState<LoginCredentials>({
    username: '',
    password: ''
  })

  const [showPassword, setShowPassword] = useState(false)

  const [formErrors, setFormErrors] = useState<{
    username?: string
    password?: string
  }>({})


  const validateForm = useCallback((): boolean => {
    const errors: typeof formErrors = {}

    // Username/Email validation
    if (!formData.username || !formData.username.trim()) {
      errors.username = 'Username or email is required'
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData])

  const handleInputChange = useCallback((field: keyof LoginCredentials) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }

    // Clear global error when user makes changes
    if (error) {
      clearError()
    }
  }, [formErrors, error, clearError])

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await login(formData)

      // Clear form on successful login
      setFormData({ username: '', password: '' })
      setFormErrors({})

      // Call success callback
      onSuccess?.()
    } catch (err) {
      // Error is handled by the auth context
      console.error('Login failed:', err)
    }
  }, [formData, validateForm, login, onSuccess])

  const handleCancel = useCallback(() => {
    // Clear form and errors
    setFormData({ username: '', password: '' })
    setFormErrors({})
    clearError()

    onCancel?.()
  }, [onCancel, clearError])

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isLoading) {
      handleSubmit(event as any)
    }
  }, [handleSubmit, isLoading])

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={480}
      centered
      maskClosable={false}
    >
      <Card style={{ border: 'none', boxShadow: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-x6)' }}>
          <Typography variant="title-primary" style={{ marginBottom: 'var(--spacing-x2)' }}>
            {title}
          </Typography>
          <Typography variant="body-secondary-regular" style={{ color: 'var(--color-text-secondary)' }}>
            {subtitle}
          </Typography>
        </div>

        <form onSubmit={handleSubmit} onKeyPress={handleKeyPress}>
          <div style={{ marginBottom: 'var(--spacing-x5)' }}>
            <Typography variant="body-primary-medium" style={{ marginBottom: 'var(--spacing-x2)' }}>
              Username or Email
            </Typography>
            <Input
              type="text"
              placeholder="Enter your username or email"
              value={formData.username}
              onChange={handleInputChange('username')}
              error={!!formErrors.username}
              disabled={isLoading}
              autoFocus
            />
            {formErrors.username && (
              <Typography
                variant="body-small-regular"
                style={{ color: 'var(--color-status-error)', marginTop: 'var(--spacing-x1)' }}
              >
                {formErrors.username}
              </Typography>
            )}
          </div>

          <div style={{ marginBottom: 'var(--spacing-x5)' }}>
            <Typography variant="body-primary-medium" style={{ marginBottom: 'var(--spacing-x2)' }}>
              Password
            </Typography>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={!!formErrors.password}
              disabled={isLoading}
            />
            <div style={{ textAlign: 'right', marginTop: 'var(--spacing-x1)' }}>
              <Button
                type="link"
                style={{ padding: 0, height: 'auto' }}
                disabled={isLoading}
                onClick={() => setShowPassword(prev => !prev)}
              >
                <Typography variant="body-small-regular" style={{ color: 'var(--primary)' }}>
                  {showPassword ? 'Hide password' : 'Show password'}
                </Typography>
              </Button>
            </div>
            {formErrors.password && (
              <Typography
                variant="body-small-regular"
                style={{ color: 'var(--color-status-error)', marginTop: 'var(--spacing-x1)' }}
              >
                {formErrors.password}
              </Typography>
            )}
          </div>

          {error && (
            <div style={{ marginBottom: 'var(--spacing-x5)' }}>
              <Alert
                message="Login Failed"
                description={error}
                type="error"
                showIcon
                closable
                onClose={clearError}
              />
            </div>
          )}

          <div style={{ marginBottom: 'var(--spacing-x5)', textAlign: 'right' }}>
            <Button
              type="link"
              style={{ padding: 0, height: 'auto' }}
              disabled={isLoading}
              onClick={() => {
                // TODO: Implement forgot password functionality
                console.log('Forgot password clicked')
              }}
            >
              <Typography variant="body-small-regular" style={{ color: 'var(--primary)' }}>
                Forgot password?
              </Typography>
            </Button>
          </div>

          <Row gutter={12}>
            <Col span={12}>
              <Button
                block
                type="default"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </Col>
            <Col span={12}>
              <Button
                block
                type="primary"
                htmlType="submit"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Col>
          </Row>
        </form>

        <Spacer size="large" />

        <div style={{ textAlign: 'center' }}>
          <Typography variant="body-small-regular" style={{ color: 'var(--color-text-tertiary)' }}>
            By signing in, you agree to FreightTiger's Terms of Service and Privacy Policy
          </Typography>
        </div>
      </Card>
    </Modal>
  )
}

/**
 * Lightweight login form component for use in other contexts
 */
export interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void
  isLoading?: boolean
  error?: string
  onClearError?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  isLoading = false,
  error,
  onClearError
}) => {
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  })

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault()
    onSubmit(formData)
  }, [formData, onSubmit])

  const handleInputChange = useCallback((field: keyof LoginCredentials) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }))
    if (error && onClearError) {
      onClearError()
    }
  }, [error, onClearError])

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 'var(--spacing-x4)' }}>
        <Input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleInputChange('email')}
          disabled={isLoading}
          required
        />
      </div>

      <div style={{ marginBottom: 'var(--spacing-x4)' }}>
        <Input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleInputChange('password')}
          disabled={isLoading}
          required
        />
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--spacing-x4)' }}>
          <Alert
            message={error}
            type="error"
            showIcon
            closable={!!onClearError}
            onClose={onClearError}
          />
        </div>
      )}

      <Button
        type="primary"
        htmlType="submit"
        loading={isLoading}
        disabled={isLoading}
        block
      >
        {isLoading ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  )
}