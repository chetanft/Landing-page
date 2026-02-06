import { useState, useCallback } from 'react'
import {
  Typography,
  Input,
  InputLabel,
  InputField,
  InputError,
  Button,
  Switch,
  SwitchInput,
  SwitchLabel,
  SegmentedTabs,
  SegmentedTabItem,
  Divider,
  Alert,
  Icon
} from 'ft-design-system'
import type { LoginCredentials } from '../../auth/AuthContext'

// Asset paths
const imgFreightTigerLogo = '/assets/freight-tiger-logo.svg'
const imgGoogleIcon = '/assets/google-icon.png'
const imgMicrosoftLogo = '/assets/microsoft-logo.png'

interface LoginFormPanelProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>
  isLoading: boolean
  error: string | null
  onClearError: () => void
}

/**
 * Login form panel component (left side of login page)
 */
export default function LoginFormPanel({
  onSubmit,
  isLoading,
  error,
  onClearError
}: LoginFormPanelProps) {
  const [formData, setFormData] = useState<LoginCredentials>({
    username: '',
    password: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [userType, setUserType] = useState<string>('shipper')

  const [formErrors, setFormErrors] = useState<{
    username?: string
    password?: string
  }>({})

  const validateForm = useCallback((): boolean => {
    const errors: typeof formErrors = {}

    if (!formData.username || !formData.username.trim()) {
      errors.username = 'Email or phone number is required'
    }

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

    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }

    if (error) {
      onClearError()
    }
  }, [formErrors, error, onClearError])

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
      setFormData({ username: '', password: '' })
      setFormErrors({})
    } catch {
      // Error handled by parent
    }
  }, [formData, validateForm, onSubmit])

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isLoading) {
      handleSubmit(event as any)
    }
  }, [handleSubmit, isLoading])

  return (
    <div style={{
      width: '456px',
      minWidth: '456px',
      height: '100vh',
      backgroundColor: 'var(--bg-primary)',
      boxShadow: '12px 0px 24px 0px #efefef',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '48px 48px 24px 48px',
      overflow: 'auto'
    }}>
      {/* Top Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Logo */}
        <div style={{ height: '45px', width: '237px', display: 'flex', alignItems: 'center' }}>
          <img
            src={imgFreightTigerLogo}
            alt="Freight Tiger"
            style={{ height: '100%', width: '100%', objectFit: 'contain' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        </div>

        {/* Login Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Typography variant="display-primary" style={{
            color: 'var(--primary)',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: 1.4
          }}>
            Log In to your Account As
          </Typography>

          {/* User Type Toggle */}
          <SegmentedTabs
            value={userType}
            onChange={setUserType}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              padding: '8px 9px',
              height: '48px'
            }}
          >
            <SegmentedTabItem value="shipper" label="Shipper" />
            <SegmentedTabItem value="lsp" label="LSP" />
          </SegmentedTabs>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} onKeyPress={handleKeyPress} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          width: '360px'
        }}>
          {/* Input Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Email Input */}
              <Input size="lg" variant="default">
                <InputLabel style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: 500
                }}>
                  Email or Phone Number
                </InputLabel>
                <InputField
                  type="text"
                  placeholder="eg. someone@email.com"
                  value={formData.username}
                  onChange={handleInputChange('username')}
                  disabled={isLoading}
                  autoFocus
                  style={{ minHeight: '52px' }}
                />
                {formErrors.username && <InputError>{formErrors.username}</InputError>}
              </Input>

              {/* Password Input */}
              <Input size="lg" variant="default">
                <InputLabel style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: 500
                }}>
                  Password
                </InputLabel>
                <InputField
                  type={showPassword ? 'text' : 'password'}
                  placeholder="**************"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  disabled={isLoading}
                  trailingIconClassName="pointer-events-auto"
                  trailingIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Icon name={showPassword ? 'eye-invisible' : 'preview'} size={16} />
                    </button>
                  }
                  style={{ minHeight: '52px' }}
                />
                {formErrors.password && <InputError>{formErrors.password}</InputError>}
              </Input>
            </div>

            {/* Options Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px'
            }}>
              {/* Remember Me Switch */}
              <Switch size="md">
                <SwitchInput
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <SwitchLabel style={{
                  fontSize: '12px',
                  color: 'var(--primary)',
                  letterSpacing: '0.3px'
                }}>
                  Remember me
                </SwitchLabel>
              </Switch>

              {/* Forgot Password Link */}
              <Button
                variant="link"
                style={{
                  padding: 0,
                  height: 'auto',
                  color: 'var(--color-neutral)',
                  fontSize: '14px',
                  fontWeight: 500
                }}
                disabled={isLoading}
              >
                Forgot password?
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message={error}
              {...({
                message: error,
                type: "warning",
                showIcon: true,
                closable: true,
                onClose: onClearError
              } as any)}
              showIcon
              closable
              onClose={onClearError}
            />
          )}

          {/* Sign In Button */}
          <Button
            variant="primary"
            type="submit"
            loading={isLoading}
            disabled={isLoading}
            style={{
              width: '100%',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              fontSize: '16px',
              fontWeight: 500
            }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          {/* Divider */}
          <Divider style={{ backgroundColor: 'unset', background: 'unset', height: '0.5px' }} />

          {/* Alternative Sign In Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Sign In with OTP */}
            <Button
              variant="text"
              style={{
                width: '100%',
                height: '40px',
                color: 'var(--primary)',
                fontSize: '16px',
                fontWeight: 500
              }}
              disabled={isLoading}
            >
              Sign In with OTP
            </Button>

            {/* Google Sign In */}
            <Button
              variant="secondary"
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '6px',
                backgroundColor: 'var(--border-secondary)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              disabled={isLoading}
            >
              <img
                src={imgGoogleIcon}
                alt="Google"
                style={{ width: '20px', height: '20px' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
              <span style={{
                color: 'var(--primary)',
                fontSize: '16px',
                fontWeight: 500
              }}>
                Sign in with Google
              </span>
            </Button>

            {/* Microsoft Sign In */}
            <Button
              variant="secondary"
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '6px',
                backgroundColor: 'var(--border-secondary)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              disabled={isLoading}
            >
              <img
                src={imgMicrosoftLogo}
                alt="Microsoft"
                style={{ width: '20px', height: '20px' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
              <span style={{
                color: 'var(--primary)',
                fontSize: '16px',
                fontWeight: 500
              }}>
                Sign in with Microsoft
              </span>
            </Button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
        {/* Help Link */}
        <Button
          variant="link"
          style={{
            width: '100%',
            height: '17px',
            padding: '12px 24px',
            color: 'var(--color-neutral)',
            fontSize: '14px',
            fontWeight: 400,
            justifyContent: 'center'
          }}
        >
          Need help with account?
        </Button>

        {/* Copyright */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '24px'
        }}>
          <Typography variant="body-secondary-regular" style={{
            color: 'var(--color-tertiary)',
            fontSize: '13px',
            fontWeight: 400
          }}>
            © Freight Tiger 2024
          </Typography>
        </div>
      </div>
    </div>
  )
}
