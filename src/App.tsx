import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader } from 'ft-design-system'
import SummaryDashboardPage from './modules/summary-dashboard/pages/SummaryDashboardPage'
import LoginPage from './modules/summary-dashboard/pages/LoginPage'
import TestComponent from './TestComponent'
import { useAuth } from './modules/summary-dashboard/auth/AuthContext'

// Protected route wrapper component
function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const [showLoader, setShowLoader] = useState(isLoading)
  const [loaderStartTime, setLoaderStartTime] = useState<number | null>(isLoading ? Date.now() : null)
  const loaderKey = loaderStartTime ?? 'idle'

  useEffect(() => {
    if (isLoading) {
      // Start showing loader and record start time once
      if (loaderStartTime === null) {
        setLoaderStartTime(Date.now())
      }
      setShowLoader(true)
    } else if (loaderStartTime !== null) {
      // Ensure loader shows for at least 3 seconds total
      const elapsed = Date.now() - loaderStartTime
      const remaining = Math.max(0, 3000 - elapsed)
      
      if (remaining > 0) {
        const timer = setTimeout(() => {
          setShowLoader(false)
          setLoaderStartTime(null)
        }, remaining)
        return () => clearTimeout(timer)
      } else {
        // Already been 3+ seconds, hide immediately
        setShowLoader(false)
        setLoaderStartTime(null)
      }
    }
  }, [isLoading, loaderStartTime])

  if (isLoading || showLoader) {
    return (
      <div 
        className="ft-loader-container"
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 'var(--spacing-x4)'
        }}
      >
        <div className="ft-auth-loader" key={loaderKey}>
          <div className="ft-auth-loader__icon">
            <Loader className="ft-auth-loader__graphic" logoSize={120} />
          </div>
          <div className="ft-auth-progress" aria-hidden="true">
            <div className="ft-auth-progress__bar" />
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login page, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function App() {
  useEffect(() => {
    const ensurePositionNode = () => {
      let node = document.querySelector('[data-select-position-global="true"]')
      if (!node) {
        node = document.createElement('div')
        node.setAttribute('data-select-position', JSON.stringify({ top: 0, left: 0, width: 0 }))
        node.setAttribute('data-select-position-global', 'true')
        node.style.display = 'none'
        document.body.prepend(node)
      }
      return node as HTMLDivElement
    }

    const updatePositionForTrigger = (trigger: HTMLElement) => {
      const rect = trigger.getBoundingClientRect()
      const position = { top: rect.bottom + 4, left: rect.left, width: rect.width }
      const node = ensurePositionNode()
      node.setAttribute('data-select-position', JSON.stringify(position))
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const trigger = target?.closest('button[role="combobox"]') as HTMLElement | null
      if (trigger) {
        updatePositionForTrigger(trigger)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/test" element={<TestComponent />} />
      <Route
        path="/v10/summarydashboard"
        element={
          <ProtectedRoute>
            <SummaryDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
