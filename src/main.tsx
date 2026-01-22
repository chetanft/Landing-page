import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FTProvider, cssVariables } from 'ft-design-system'
import 'ft-design-system/styles.css'
import App from './App'
import './index.css'
import { AuthProvider } from './modules/summary-dashboard/auth/AuthContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
})

const tokenStyleId = 'ft-design-system-tokens'
if (!document.getElementById(tokenStyleId)) {
  const style = document.createElement('style')
  style.id = tokenStyleId
  style.textContent = cssVariables
  document.head.appendChild(style)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FTProvider theme="light" injectCSS={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </FTProvider>
  </React.StrictMode>,
)
