import { realApiService } from './realApiService'
import { TokenManager } from '../auth/tokenManager'

export interface CompanyInfo {
  fteid: string
  name: string
  company_code: string
  status: string
}

const decodeTokenPayload = (tokenValue: string) => {
  try {
    const payload = tokenValue.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized))
  } catch {
    return null
  }
}

const getCompanyFromToken = (): CompanyInfo | null => {
  const token = TokenManager.getAccessToken()
  if (!token) return null

  const decoded = decodeTokenPayload(token)
  if (!decoded) return null

  const ucv = decoded.ucv || {}
  const fteid = ucv.entity_guid
    || ucv.entity_fteid
    || decoded.company_fteid
    || decoded.companyFteid
    || decoded.orgFteid
    || decoded.desk_parent_fteid

  if (!fteid) return null

  return {
    fteid: String(fteid),
    name: String(ucv.company_name || decoded.company_name || ''),
    company_code: String(ucv.company_code || decoded.company_code || ''),
    status: String(ucv.company_status || decoded.company_status || 'active')
  }
}

/**
 * Get the current logged-in user's company details
 * This would typically be called on app initialization or page load
 */
export const getCurrentUserCompany = async (): Promise<CompanyInfo | null> => {
  const fromToken = getCompanyFromToken()
  if (fromToken) {
    try {
      const entityResponse = await realApiService.getCompanyDetailsEntityService(fromToken.fteid)
      const entityCompany = entityResponse?.data?.[0]
      if (entityCompany?.fteid) {
        return {
          fteid: String(entityCompany.fteid),
          name: String(entityCompany.name || fromToken.name || ''),
          company_code: String(entityCompany.company_code || fromToken.company_code || ''),
          status: String(entityCompany.status || (entityCompany.is_active ? 'active' : 'inactive') || fromToken.status)
        }
      }
    } catch {
      // Ignore and fallback to token or EQS.
    }

    try {
      const eqsResponse = await realApiService.getCompanyDetailsEqs(fromToken.fteid)
      const eqsCompany = eqsResponse?.data?.[0]
      if (eqsCompany?.fteid) {
        return {
          fteid: String(eqsCompany.fteid),
          name: String(eqsCompany.name || fromToken.name || ''),
          company_code: String(eqsCompany.company_code || fromToken.company_code || ''),
          status: String(eqsCompany.status || (eqsCompany.is_active ? 'active' : 'inactive') || fromToken.status)
        }
      }
    } catch {
      // Ignore and fallback to token.
    }

    return fromToken
  }

  const hierarchy = await realApiService.getCompanyHierarchy()
  const data = hierarchy?.data as any
  const company = data?.company || data?.parent_company || data?.companyInfo

  if (company?.fteid) {
    const resolved = {
      fteid: String(company.fteid),
      name: String(company.name || ''),
      company_code: String(company.company_code || company.companyCode || ''),
      status: String(company.status || 'active')
    }
    try {
      const entityResponse = await realApiService.getCompanyDetailsEntityService(resolved.fteid)
      const entityCompany = entityResponse?.data?.[0]
      if (entityCompany?.fteid) {
        return {
          fteid: String(entityCompany.fteid),
          name: String(entityCompany.name || resolved.name || ''),
          company_code: String(entityCompany.company_code || resolved.company_code || ''),
          status: String(entityCompany.status || (entityCompany.is_active ? 'active' : 'inactive') || resolved.status)
        }
      }
    } catch {
      // Ignore and fallback to resolved company.
    }
    return resolved
  }

  const branch = data?.total_branches?.[0]
  const branchCompanyFteid = branch?.company_fteid || branch?.companyFteid
  if (branchCompanyFteid) {
    const resolved = {
      fteid: String(branchCompanyFteid),
      name: String(branch?.company_name || branch?.companyName || ''),
      company_code: String(branch?.company_code || branch?.companyCode || ''),
      status: String(branch?.company_status || branch?.companyStatus || 'active')
    }
    try {
      const entityResponse = await realApiService.getCompanyDetailsEntityService(resolved.fteid)
      const entityCompany = entityResponse?.data?.[0]
      if (entityCompany?.fteid) {
        return {
          fteid: String(entityCompany.fteid),
          name: String(entityCompany.name || resolved.name || ''),
          company_code: String(entityCompany.company_code || resolved.company_code || ''),
          status: String(entityCompany.status || (entityCompany.is_active ? 'active' : 'inactive') || resolved.status)
        }
      }
    } catch {
      // Ignore and fallback to resolved company.
    }
    return resolved
  }

  throw new Error('Unable to resolve company info from company hierarchy')
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
