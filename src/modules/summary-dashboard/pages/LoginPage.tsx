import { useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { LoginCredentials } from '../auth/AuthContext'
import { LoginFormPanel, ProductShowcase } from './login'

/**
 * Login page with form and product showcase
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/v10/summarydashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const handleSubmit = useCallback(async (credentials: LoginCredentials) => {
    await login(credentials)
    const from = (location.state as any)?.from?.pathname || '/v10/summarydashboard'
    navigate(from, { replace: true })
  }, [login, navigate, location])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: 'var(--bg-primary)',
      borderRadius: 'var(--radius-md)'
    }}>
      {/* Left Panel - Login Form */}
      <LoginFormPanel
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        onClearError={clearError}
      />

      {/* Right Panel - Product Showcase */}
      <ProductShowcase />
    </div>
  )
}
