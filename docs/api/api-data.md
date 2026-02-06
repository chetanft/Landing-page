⏺ API Integration Report for FreightTiger TMS Dashboard

  Based on the analysis of your API endpoints and existing project structure, here's a detailed report on how these APIs can be integrated to display data points in your current
  TMS Summary Dashboard project.

  Executive Summary

  Your current React/TypeScript project is well-structured for integrating the FreightTiger APIs. The existing dashboard components can be enhanced to display real-time data from
   the seven identified API endpoints, providing comprehensive visibility into orders, batches, user settings, and organizational hierarchy.

  API Endpoint Analysis & Integration Mapping

  1. User Settings API (/configurations/user-settings)

  Current Data Structure:
  {
    "branchMandatory": false,
    "lastSelectedBranch": "BRH-edaadb15-a128-4c48-91d2-48f8bc6d7683",
    "lastSelectedGroup": null
  }

  Integration Points:
  - LocationSelector Component (src/modules/summary-dashboard/components/LocationSelector.tsx): Use lastSelectedBranch to auto-select default branch
  - FilterPane Component (src/modules/summary-dashboard/components/FilterPane.tsx): Implement branchMandatory validation logic
  - AppHeader Component: Display current user context and branch information

  2. Order Custom Data Template API (/custom-data-template/order)

  Data Points Available: 28+ configurable order fields including route, business unit, pricing mode, seller/buyer details, delivery instructions, etc.

  Integration Points:
  - OrderDetailsDrawer Component (src/modules/summary-dashboard/components/OrderDetailsDrawer.tsx): Dynamically render form fields based on template configuration
  - OrdersTableView Component (src/modules/summary-dashboard/components/OrdersTableView.tsx): Configure table columns based on available fields
  - FilterPane Component: Generate dynamic filters from template fields marked as isFilter: true

  3. Order Status Counts API (/orders/status-counts)

  Current Data: 42,949 total orders across 9 statuses
  UNPLANNED: 30,830 | IN_PROGRESS: 4,906 | PLANNED: 7,005
  PARTIALLY_PLANNED: 11 | DISPATCHED: 51 | DELIVERED: 0
  PARTIALLY_DELIVERED: 0 | FAILED: 0 | DELETED: 146

  Integration Points:
  - LifecycleBoard Component (src/modules/summary-dashboard/components/LifecycleBoard.tsx): Display status counts as cards or columns
  - MetricCard Component (src/modules/summary-dashboard/components/MetricCard.tsx): Show individual status counts with click-through functionality
  - QuickKPIRow Component (src/modules/summary-dashboard/components/QuickKPIRow.tsx): Display top-level metrics (total orders, planned vs unplanned)

  4. Batch Master Search API (/batches/master-search)

  Data Points: 456 total batches with pagination, batch names, order counts, creation dates

  Integration Points:
  - New Dashboard Section: Create BatchesOverview component showing batch statistics
  - MetricCard Component: Display total batches, average orders per batch
  - OrdersTableView: Add batch association column and filtering

  5. Company/Branch Hierarchy API (/external-services/eqs/company/child)

  Data Structure: 6 branches under JSW Journey CNR Test company

  Integration Points:
  - LocationSelector Component: Populate dropdown with available branches
  - DashboardHeader Component: Show organizational context
  - FilterPane Component: Implement branch-based filtering across all data views

  6. Selected Orders Views API (/views/selected/orders)

  Current State: Returns null (no active selections)

  Integration Points:
  - OrdersTableView Component: Implement row selection state management
  - New Component: SelectedOrdersPanel for bulk operations
  - Context/State Management: Track selected orders across dashboard

  7. Access Control Permissions API (/accessControl/permissions)

  Usage: UI element visibility and functionality control

  Integration Points:
  - All Components: Conditional rendering based on user permissions
  - Hook Implementation: usePermissions hook already exists at src/modules/summary-dashboard/hooks/usePermissions.ts

  Recommended Implementation Strategy

  Phase 1: Core Data Integration (Week 1-2)

  1. API Service Layer Enhancement
    - Update existing services in src/modules/summary-dashboard/data/ to integrate with real endpoints
    - Implement userSettingsApiService.ts and accessControlApiService.ts
    - Add error handling and caching strategies
  2. State Management
    - Leverage existing React Query setup (@tanstack/react-query)
    - Create custom hooks for each API endpoint
    - Implement optimistic updates for user settings

  Phase 2: UI Component Updates (Week 2-3)

  1. Dashboard Header Enhancement
    - Real-time branch selection with user settings persistence
    - User context display with permissions-based visibility
  2. Metrics Dashboard
    - Connect order status counts to lifecycle board
    - Implement real-time updates for status changes
    - Add batch metrics to KPI row
  3. Dynamic Filtering System
    - Use custom data template to generate filter options
    - Implement branch-based data filtering
    - Add saved filter preferences

  Phase 3: Advanced Features (Week 3-4)

  1. Real-time Updates
    - Implement WebSocket connections for live data updates
    - Add notification system for status changes
    - Optimistic UI updates for better UX
  2. Batch Management Interface
    - Create comprehensive batch overview dashboard
    - Implement batch-order relationship visualization
    - Add batch creation and management capabilities

  Technical Implementation Details

  API Integration Pattern

  // Example service implementation
  export const orderStatusService = {
    getStatusCounts: async (branchId: string) => {
      const response = await fetch(
        `/planning-engine-service/v1/api/orders/status-counts?branch_fteid=${branchId}`
      )
      return response.json()
    }
  }

  // React Query hook
  export const useOrderStatusCounts = (branchId: string) => {
    return useQuery({
      queryKey: ['orderStatus', branchId],
      queryFn: () => orderStatusService.getStatusCounts(branchId),
      refetchInterval: 30000 // 30-second refresh
    })
  }

  Component Enhancement Example

  // Enhanced MetricCard for order status
  const OrderStatusCard = ({ status, count, branchId }: Props) => {
    const navigate = useNavigate()

    const handleClick = () => {
      navigate(`/orders?status=${status}&branch=${branchId}`)
    }

    return (
      <MetricCard
        metric={{
          label: status.replace('_', ' '),
          count,
          statusType: getStatusType(status)
        }}
        onClick={handleClick}
        variant="kpi"
      />
    )
  }

  Data Visualization Opportunities

  1. Order Flow Visualization: Use status counts to create order pipeline visualization
  2. Branch Performance Comparison: Multi-branch metrics dashboard
  3. Batch Efficiency Metrics: Average orders per batch, processing times
  4. Historical Trend Analysis: Status count changes over time
  5. Operational KPIs: SLA compliance, exception rates, throughput metrics

  Performance Considerations

  1. Caching Strategy: Implement intelligent caching with React Query for frequently accessed data
  2. Pagination: Handle large datasets efficiently with server-side pagination
  3. Real-time Updates: Use WebSocket connections sparingly to avoid overwhelming the UI
  4. Error Handling: Implement comprehensive error boundaries and retry mechanisms
  5. Loading States: Use existing DashboardSkeleton component pattern for better UX

  Security & Access Control

  1. Permission-based Rendering: Utilize access control API to show/hide features
  2. Branch-based Data Isolation: Ensure users only see data for permitted branches
  3. API Authentication: Implement proper token management and renewal
  4. Data Validation: Client-side validation using custom data template schemas

  This integration plan leverages your existing component architecture while adding powerful real-time data capabilities. The modular structure allows for incremental
  implementation and testing, ensuring minimal disruption to current functionality.