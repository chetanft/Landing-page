import React from 'react'
import { Card, Typography, Button, Row, Col, Spacer } from 'ft-design-system'
import { MODULE_CONFIGS, navigationUtils } from '../config/moduleNavigation'
import { usePermissions } from '../hooks/usePermissions'
import type { TabData, MetricData } from '../types/metrics'

export interface ModuleNavigationProps {
  tabData?: TabData | null
  onModuleClick?: (moduleId: string) => void
}

export const ModuleNavigation: React.FC<ModuleNavigationProps> = ({
  tabData,
  onModuleClick
}) => {
  const { canAccessModule } = usePermissions()

  const handleModuleClick = (moduleId: string, event: React.MouseEvent) => {
    event.preventDefault()

    if (onModuleClick) {
      onModuleClick(moduleId)
    } else {
      // Default navigation behavior
      navigationUtils.navigateToModule(moduleId)
    }
  }

  const handleModuleKeyPress = (moduleId: string, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (onModuleClick) {
        onModuleClick(moduleId)
      } else {
        navigationUtils.navigateToModule(moduleId)
      }
    }
  }

  const getModuleCount = (moduleId: string): number => {
    if (!tabData) return 0

    // Extract count from quick KPIs based on module
    switch (moduleId) {
      case 'journeys':
        return tabData.quickKPIs.find(kpi => kpi.metricId === 'active-journeys')?.count || 0
      case 'orders':
        return tabData.quickKPIs.find(kpi => kpi.metricId === 'total-orders')?.count || 0
      case 'indents':
        return tabData.quickKPIs.find(kpi => kpi.metricId === 'active-indents')?.count || 0
      case 'shipments':
        return tabData.quickKPIs.find(kpi => kpi.metricId === 'total-shipments')?.count || 0
      default:
        return 0
    }
  }

  const getModuleStatus = (moduleId: string): 'positive' | 'warning' | 'critical' | 'neutral' => {
    if (!tabData) return 'neutral'

    // Check for exceptions in the module data
    const hasExceptions = tabData.lifecycleStages.some(stage =>
      stage.exceptions && stage.exceptions.length > 0
    )

    return hasExceptions ? 'warning' : 'positive'
  }

  // Filter modules based on permissions
  const availableModules = Object.values(MODULE_CONFIGS).filter(module =>
    canAccessModule(module.id)
  )

  if (availableModules.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 'var(--spacing-x6)' }}>
        <Typography variant="body-primary-regular" style={{ color: 'var(--color-text-secondary)' }}>
          No modules available. Please contact your administrator for access.
        </Typography>
      </Card>
    )
  }

  return (
    <div>
      <Typography variant="title-secondary" style={{ marginBottom: 'var(--spacing-x4)' }}>
        Navigate to Modules
      </Typography>

      <Row gutter={16}>
        {availableModules.map((module) => {
          const count = getModuleCount(module.id)
          const status = getModuleStatus(module.id)

          return (
            <Col key={module.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                style={{
                  cursor: 'pointer',
                  height: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onClick={(e) => handleModuleClick(module.id, e)}
                onKeyPress={(e) => handleModuleKeyPress(module.id, e)}
                tabIndex={0}
                role="button"
                aria-label={`Navigate to ${module.label}`}
              >
                <div>
                  <Typography variant="title-tertiary" style={{ marginBottom: 'var(--spacing-x2)' }}>
                    {module.label}
                  </Typography>
                  <Typography
                    variant="body-small-regular"
                    style={{
                      color: 'var(--color-text-secondary)',
                      marginBottom: 'var(--spacing-x3)'
                    }}
                  >
                    {module.description}
                  </Typography>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {count > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x2)' }}>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor:
                            status === 'positive' ? 'var(--color-status-success)' :
                            status === 'warning' ? 'var(--color-status-warning)' :
                            status === 'critical' ? 'var(--color-status-error)' :
                            'var(--color-text-tertiary)'
                        }}
                      />
                      <Typography variant="body-small-medium">
                        {count.toLocaleString()}
                      </Typography>
                    </div>
                  )}

                  <Button
                    variant="link"
                    size="sm"
                    style={{
                      padding: 0,
                      color: 'var(--color-primary)'
                    }}
                  >
                    Open →
                  </Button>
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

/**
 * Quick action buttons for common tasks
 */
export interface QuickActionsProps {
  onActionClick?: (actionId: string) => void
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onActionClick
}) => {
  const { userPermissions } = usePermissions()

  const quickActions = [
    {
      id: 'create_journey',
      label: 'Create Journey',
      url: '/app/journeys/create',
      permission: 'create_journey'
    },
    {
      id: 'create_order',
      label: 'Create Order',
      url: '/app/orders/create',
      permission: 'create_order'
    },
    {
      id: 'create_indent',
      label: 'Create Indent',
      url: '/app/indents/create',
      permission: 'create_indent'
    },
    {
      id: 'view_reports',
      label: 'View Reports',
      url: '/app/reports',
      permission: 'view_reports'
    }
  ]

  const availableActions = quickActions.filter(action =>
    userPermissions.includes(action.permission)
  )

  const handleActionClick = (action: typeof quickActions[0], event: React.MouseEvent) => {
    event.preventDefault()

    if (onActionClick) {
      onActionClick(action.id)
    } else {
      window.location.href = action.url
    }
  }

  if (availableActions.length === 0) {
    return null
  }

  return (
    <div style={{ marginTop: 'var(--spacing-x6)' }}>
      <Typography variant="title-secondary" style={{ marginBottom: 'var(--spacing-x4)' }}>
        Quick Actions
      </Typography>

      <Row gutter={12}>
        {availableActions.map((action) => (
          <Col key={action.id} xs={24} sm={12} md={6}>
            <Button
              block
              variant="secondary"
              onClick={(e) => handleActionClick(action, e)}
              style={{ height: '48px' }}
            >
              {action.label}
            </Button>
          </Col>
        ))}
      </Row>
    </div>
  )
}
