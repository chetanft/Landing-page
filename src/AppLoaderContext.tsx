import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface AppLoaderContextValue {
  isAppLoading: boolean
  setAppLoading: (value: boolean) => void
}

const AppLoaderContext = createContext<AppLoaderContextValue | undefined>(undefined)

export const AppLoaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAppLoading, setIsAppLoading] = useState(false)

  const setAppLoading = useCallback((value: boolean) => {
    setIsAppLoading(value)
  }, [])

  const value = useMemo(() => ({ isAppLoading, setAppLoading }), [isAppLoading, setAppLoading])

  return <AppLoaderContext.Provider value={value}>{children}</AppLoaderContext.Provider>
}

export const useAppLoader = (): AppLoaderContextValue => {
  const context = useContext(AppLoaderContext)
  if (!context) {
    throw new Error('useAppLoader must be used within AppLoaderProvider')
  }
  return context
}
