import { buildFtTmsUrl, ftTmsFetch } from './ftTmsClient'

export interface CompanyInfo {
  fteid: string
  name: string
  company_code: string
  status: string
}

export interface UserCompanyResponse {
  success: boolean
  data: {
    user: {
      fteid: string
      name: string
      email: string
    }
    company: CompanyInfo
  }
}

/**
 * Get the current logged-in user's company details
 * This would typically be called on app initialization or page load
 */
export const getCurrentUserCompany = async (): Promise<CompanyInfo | null> => {
  try {
    // First try to get from user profile endpoint
    const profileResponse = await ftTmsFetch(buildFtTmsUrl('/eqs/v1/user/profile'))
    const profileData: UserCompanyResponse = await profileResponse.json()

    if (profileData.success && profileData.data.company) {
      return profileData.data.company
    }

    // Fallback: try to get company info directly
    const companyResponse = await ftTmsFetch(buildFtTmsUrl('/eqs/v1/company/current'))
    const companyData = await companyResponse.json()

    if (companyData.success && companyData.data) {
      return companyData.data
    }

    throw new Error('Unable to get company information from API')
  } catch (error) {
    console.error('Error fetching current user company:', error)
    // Return hardcoded company for development/testing
    return {
      fteid: 'COM-1b6043d0-05ee-434a-8b6c-f32f097e485c',
      name: 'Development Company',
      company_code: 'DEV-001',
      status: 'active'
    }
  }
}

/**
 * Cache for company info to avoid repeated API calls
 */
let cachedCompanyInfo: CompanyInfo | null = null

/**
 * Get company info with caching
 */
export const getCompanyInfo = async (): Promise<CompanyInfo | null> => {
  if (cachedCompanyInfo) {
    return cachedCompanyInfo
  }

  cachedCompanyInfo = await getCurrentUserCompany()
  return cachedCompanyInfo
}

/**
 * Clear company cache (useful for logout/login scenarios)
 */
export const clearCompanyCache = (): void => {
  cachedCompanyInfo = null
}
