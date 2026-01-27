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
  const { data: hierarchyData, error: hierarchyError, isLoading: hierarchyLoading } = useCompanyHierarchy()

  // Diagnostic logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AppHeader] Diagnostic Info:', {
        isAuthenticated,
        userBranchId: user?.branchId,
        branchIdType: typeof user?.branchId,
        branchIdLength: user?.branchId?.length,
        isBranchFteid: user?.branchId?.startsWith('BRH-') || user?.branchId?.startsWith('BRN-'),
        hierarchyLoading,
        hierarchyError: hierarchyError?.message,
        hasHierarchyData: !!hierarchyData,
        branchCount: hierarchyData?.data?.total_branches?.length,
        allBranchFteids: hierarchyData?.data?.total_branches?.map(b => b.fteid)
      })
    }
  }, [isAuthenticated, user?.branchId, hierarchyData, hierarchyError, hierarchyLoading])

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
    if (import.meta.env.DEV) {
      console.log('[AppHeader] Branch Matching:', {
        hasHierarchyData: !!hierarchyData?.data?.total_branches,
        branchCount: hierarchyData?.data?.total_branches?.length,
        userBranchId: user?.branchId,
        allBranchFteids: hierarchyData?.data?.total_branches?.map(b => b.fteid),
        hierarchyError: hierarchyError?.message
      })
    }

    // Check for error state first
    if (hierarchyError) {
      if (import.meta.env.DEV) {
        console.warn('[AppHeader] Hierarchy API error:', hierarchyError)
      }
      return null
    }

    if (!hierarchyData?.data?.total_branches || !user?.branchId) {
      return null
    }

    const branch = hierarchyData.data.total_branches.find(
      (b) => b.fteid === user.branchId
    )

    if (import.meta.env.DEV) {
      console.log('[AppHeader] Matched Branch:', {
        found: !!branch,
        branchName: branch?.name,
        branchFteid: branch?.fteid,
        searchedBranchId: user.branchId
      })
    }

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

  const userCompany = companyLogoName
    ? { name: companyLogoName as LogoName, displayName: companyDisplayName || undefined }
    : undefined

  // Prepare user object with multiple prop name attempts
  const userObject = isAuthenticated && user
    ? {
        name: userName,
        role: userRole,
        // Try multiple prop names to see which one works
        location: branchName || undefined,
        branch: branchName || undefined,
        branchName: branchName || undefined,
        userLocation: branchName || undefined,
      }
    : undefined

  // Diagnostic logging for props
  useEffect(() => {
    if (import.meta.env.DEV && isAuthenticated) {
      console.log('[AppHeader] FTAppHeader Props:', {
        userName,
        userRole,
        branchName,
        userObject,
        userCompany
      })
    }
  }, [isAuthenticated, userName, userRole, branchName, userObject, userCompany])

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
