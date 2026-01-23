import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
import { useAuth } from '../auth/AuthContext'
import type { LoginCredentials } from '../auth/AuthContext'

// Figma assets
const imgHeader = 'https://www.figma.com/api/mcp/asset/1721e91c-eba0-498d-a476-145b10b7b71a'
const imgGoogleIcon = 'https://www.figma.com/api/mcp/asset/13062fc2-c406-4ddd-8549-63779e808e07'
const imgMicrosoftLogo = 'https://www.figma.com/api/mcp/asset/04ddcc59-4e7d-4aa6-b48e-228144fdee86'
const imgImage5 = 'https://www.figma.com/api/mcp/asset/6ba08004-7545-4ac5-b376-0d7edaf671f7'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth()

  const [formData, setFormData] = useState<LoginCredentials>({
    username: '',
    password: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [userType, setUserType] = useState<string>('shipper')
  const [currentSlide, setCurrentSlide] = useState(0)

  const [formErrors, setFormErrors] = useState<{
    username?: string
    password?: string
  }>({})

  // Product slides data
  const slides = [
    {
      title: 'FT Cargo : Part Truck Load TMS',
      description: 'Effortlessly track your PTL and cargo shipments across multiple courier partners. Get real-time updates, manage dispatches, and streamline your logistics with ease.',
      image: imgImage5,
      cardGradient: 'linear-gradient(135deg, var(--bg-primary) 0%, #F3F8FF 100%)',
      textGradient: 'linear-gradient(90deg, var(--primary) 0%, #3B82F6 100%)'
    },
    {
      title: 'FT FTL : Full Truck Load TMS',
      description: 'Seamlessly monitor and manage your full truckload shipments. Gain complete visibility, optimize deliveries, and enhance operational efficiency with an integrated tracking system.',
      image: imgImage5,
      cardGradient: 'linear-gradient(135deg, #F0FFF4 0%, #DCFCE7 100%)',
      textGradient: 'linear-gradient(90deg, #059669 0%, #10B981 100%)'
    },
    {
      title: 'FT Analytics : Smart Insights',
      description: 'Leverage powerful analytics to gain actionable insights. Monitor performance metrics, identify bottlenecks, and make data-driven decisions for your logistics operations.',
      image: imgImage5,
      cardGradient: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
      textGradient: 'linear-gradient(90deg, #D97706 0%, #F59E0B 100%)'
    },
    {
      title: 'FT Visibility : Live Tracking',
      description: 'Track your shipments in real-time with our advanced GPS integration. Get instant alerts on delays, route deviations, and ETA changes to keep your customers informed.',
      image: imgImage5,
      cardGradient: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
      textGradient: 'linear-gradient(90deg, #4F46E5 0%, #6366F1 100%)'
    },
    {
      title: 'FT Control Tower : Centralized Management',
      description: 'Take control of your entire logistics network from a single dashboard. Manage carriers, monitor costs, and optimize performance across all your business units efficiently.',
      image: imgImage5,
      cardGradient: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
      textGradient: 'linear-gradient(90deg, #DB2777 0%, #EC4899 100%)'
    }
  ]

  // Auto-rotate slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [slides.length])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/v10/summarydashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const validateForm = useCallback((): boolean => {
    const errors: typeof formErrors = {}

    // Username/Email validation
    if (!formData.username || !formData.username.trim()) {
      errors.username = 'Email or phone number is required'
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

      // Redirect to the originally requested page or dashboard
      const from = (location.state as any)?.from?.pathname || '/v10/summarydashboard'
      navigate(from, { replace: true })
    } catch (err) {
      // Error is handled by the auth context
      console.error('Login failed:', err)
    }
  }, [formData, validateForm, login, navigate, location])

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isLoading) {
      handleSubmit(event as any)
    }
  }, [handleSubmit, isLoading])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: 'var(--bg-primary)',
      borderRadius: 'var(--radius-md)'
    }}>
      {/* Left Panel - Login Form */}
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
          <div style={{ height: '45px', width: '237px' }}>
            <img 
              src={imgHeader} 
              alt="Freight Tiger" 
              style={{ height: '100%', width: '100%', objectFit: 'contain' }}
            />
          </div>

          {/* Login Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Typography variant="display-primary" style={{ 
              color: 'var(--primary)',
              fontSize: '20px',
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
                  onClick={() => {
                    console.log('Forgot password clicked')
                  }}
                >
                  Forgot password?
                </Button>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert
                message="Login Failed"
                description={error}
                type="error"
                showIcon
                closable
                onClose={clearError}
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
                onClick={() => {
                  console.log('Sign In with OTP clicked')
                }}
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
                onClick={() => {
                  console.log('Google sign in clicked')
                }}
              >
                <img src={imgGoogleIcon} alt="Google" style={{ width: '20px', height: '20px' }} />
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
                onClick={() => {
                  console.log('Microsoft sign in clicked')
                }}
              >
                <img src={imgMicrosoftLogo} alt="Microsoft" style={{ width: '20px', height: '20px' }} />
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
            onClick={() => {
              console.log('Help clicked')
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
              color: 'var(--text-tertiary)',
              fontSize: '13px',
              fontWeight: 400
            }}>
              © Freight Tiger 2024
            </Typography>
          </div>
        </div>
      </div>

      {/* Right Panel - Product Showcase */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '16px 0 16px 0',
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '0 20px'
        }}>
          {/* What's New */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <div style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--text-secondary)'
            }} />
            <Typography variant="body-secondary-semibold" style={{ 
              color: 'var(--text-secondary)',
              fontSize: '14px'
            }}>
              What's New?
            </Typography>
          </div>

          {/* View Release Button */}
          <Button
            variant="secondary"
            icon="chevron-right"
            iconPosition="trailing"
            style={{
              height: '40px',
              width: '163px',
              borderRadius: '8px',
              border: '1px solid var(--border-primary)',
              fontSize: '16px',
              fontWeight: 500
            }}
            onClick={() => {
              console.log('View Release clicked')
            }}
          >
            View Release
          </Button>
        </div>

        {/* Content Carousel */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          padding: '0 20px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            gap: '32px',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: `translateX(-${currentSlide * (876 + 32)}px)`,
            width: 'max-content'
          }}>
            {slides.map((slide, index) => (
              <div 
                key={index}
                style={{
                  border: '1px solid var(--border-primary)',
                  borderRadius: '16px',
                  padding: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '32px',
                  background: slide.cardGradient,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  overflow: 'hidden',
                  width: '876px',
                  minWidth: '876px',
                  opacity: currentSlide === index ? 1 : 0.5,
                  transform: currentSlide === index ? 'scale(1)' : 'scale(0.98)',
                  transition: 'all 0.5s ease'
                }}
              >
                {/* Section Header */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Typography variant="title-primary" style={{
                    color: 'var(--primary)',
                    background: slide.textGradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '32px',
                    fontWeight: 600
                  }}>
                    {slide.title}
                  </Typography>
                  <Typography variant="body-primary-regular" style={{
                    color: 'var(--text-secondary)',
                    fontSize: '16px',
                    lineHeight: 1.4,
                    display: 'flex',
                    width: '100%'
                  }}>
                    {slide.description}
                  </Typography>
                </div>

                {/* Product Image */}
                <div style={{
                  flex: 1,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <img 
                    src={slide.image}
                    alt={slide.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'top left'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Dots */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '3px'
        }}>
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              style={{
                width: currentSlide === index ? '36px' : '8px',
                height: '8px',
                borderRadius: '100px',
                backgroundColor: currentSlide === index 
                  ? 'var(--primary)' 
                  : 'var(--border-primary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
