import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import SummaryDashboardPage from './modules/summary-dashboard/pages/SummaryDashboardPage'
import LoginPage from './modules/summary-dashboard/pages/LoginPage'
import TestComponent from './TestComponent'
import { useAuth } from './modules/summary-dashboard/auth/AuthContext'

// Protected route wrapper component
function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div>Loading...</div>
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
