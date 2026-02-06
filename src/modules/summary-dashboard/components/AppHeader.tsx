import { useState, useEffect, useMemo } from 'react'
import { AppHeader as FTAppHeader, type LogoName } from 'ft-design-system'
import { useAuth } from '../auth/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getCompanyInfo } from '../data/companyApiService'
import { useCompanyHierarchy } from '../hooks/useRealApiData'

type CompanyLogoName = LogoName

const resolveCompanyLogo = (companyName: string): CompanyLogoName | null => {
  const normalized = companyName.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('tata motors') || normalized.includes('tatamotors')) {
    return 'tata-motors'
  }
  if (normalized.includes('shadow')) return 'shadowfax'
  if (normalized.includes('jsw')) return 'jsw-one'
  return null
}

export default function AppHeader() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [companyLogoName, setCompanyLogoName] = useState<CompanyLogoName | null>(null)
  const [companyDisplayName, setCompanyDisplayName] = useState('')
  const { data: hierarchyData, error: hierarchyError } = useCompanyHierarchy()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleMenuItemClick = (item: string) => {
    if (item === 'logout') {
      handleLogout()
      return
    }

    // no-op for other items for now
  }

  const userName = user?.name?.trim() || ''
  const userRole = user?.userRole?.trim() || ''

  // Get branch name from hierarchy data by matching user's branchId
  const branchName = useMemo(() => {
    if (hierarchyError || !hierarchyData?.data?.total_branches || !user?.branchId) {
      return null
    }
    const branch = hierarchyData.data.total_branches.find(
      (b) => b.fteid === user.branchId
    )
    return branch?.name || null
  }, [hierarchyData, user?.branchId, hierarchyError])

  useEffect(() => {
    let isMounted = true
    if (!isAuthenticated) {
      setCompanyLogoName(null)
      setCompanyDisplayName('')
      return undefined
    }

    const loadCompanyLogo = async () => {
      try {
        const companyInfo = await getCompanyInfo()
        const companyName = companyInfo?.name || ''
        const logoName = resolveCompanyLogo(companyName)
        if (isMounted) {
          setCompanyLogoName(logoName)
          setCompanyDisplayName(companyName)
        }
      } catch {
        if (isMounted) {
          setCompanyLogoName(null)
          setCompanyDisplayName('')
        }
      }
    }

    loadCompanyLogo()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  const userCompany = useMemo(() => {
    if (!companyLogoName) return undefined
    return { name: companyLogoName as LogoName, displayName: companyDisplayName || undefined }
  }, [companyLogoName, companyDisplayName])

  const userObject = useMemo(() => {
    if (!isAuthenticated || !user) return undefined
    return {
      name: userName,
      role: userRole,
      location: branchName || undefined,
      branch: branchName || undefined,
      branchName: branchName || undefined,
      userLocation: branchName || undefined,
    }
  }, [isAuthenticated, user, userName, userRole, branchName])

  return (
    <FTAppHeader
      size="lg"
      device="Desktop"
      user={userObject}
      userCompany={userCompany}
      onUserMenuItemClick={handleMenuItemClick}
      onNotificationClick={() => {}}
    />
  )
}
