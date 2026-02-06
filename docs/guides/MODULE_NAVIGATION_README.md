# Module Navigation Configuration

## Overview
This document describes the module navigation system implemented for the FreightTiger TMS Summary Dashboard, designed to integrate seamlessly into the main FreightTiger application after user login.

## 🔧 Components Built

### 1. **Module Configuration** (`config/moduleNavigation.ts`)
- **Module URLs**: Defines all FreightTiger TMS module endpoints
- **Permission Mapping**: Maps user permissions to module access
- **Navigation Utilities**: Helper functions for module navigation

```typescript
export const MODULE_URLS = {
  journeys: '/app/journeys',
  orders: '/app/orders',
  indents: '/app/indents',
  shipments: '/app/shipments',
  invoices: '/app/invoices',
  epod: '/app/epod'
}
```

### 2. **Permission-Based Access** (`hooks/usePermissions.ts`)
- **Real User Permissions**: Reads from authenticated user context
- **Module Filtering**: Shows only modules user can access
- **Tab Visibility**: Controls which dashboard tabs are visible

```typescript
const TAB_PERMISSION_MAP = {
  orders: ['view_orders', 'orders.view'],
  journeys: ['view_journeys', 'journeys.view'],
  shipments: ['view_shipments', 'shipments.view'],
  invoices: ['view_invoices', 'invoices.view']
}
```

### 3. **Enhanced Tab Controls** (`components/TabControls.tsx`)
- **"Go to Module" Buttons**: Each tab has a button to navigate to full module
- **Permission Checks**: Only shows buttons for accessible modules
- **Context-Aware Labels**: Button text adapts to current tab

### 4. **Module Navigation Cards** (`components/ModuleNavigation.tsx`)
- **Visual Module Grid**: Card-based navigation to all available modules
- **Real-Time Counts**: Shows current data counts from dashboard
- **Status Indicators**: Visual indicators for module health
- **Quick Actions**: Common action buttons based on permissions

## 🚀 Integration Points

### **After Login Flow**
1. User logs into FreightTiger at `https://www.freighttiger.com/login`
2. Upon successful login, user context includes:
   ```typescript
   {
     organizationId: "company123", // Company ID for data filtering
     branchId: "branch456",       // Branch restriction (optional)
     permissions: ["view_journeys", "create_order", "view_shipments"]
   }
   ```
3. User is redirected to Summary Dashboard
4. Dashboard shows only modules user can access
5. All API calls automatically include company/branch context

### **Navigation Behavior**
- **Tab Navigation**: "Go to [Module]" buttons navigate to full module
- **Card Navigation**: Module cards navigate to module home page
- **Metric Navigation**: Clicking data metrics navigates to filtered module views
- **Quick Actions**: Action buttons navigate to module creation pages

## 📊 Data Filtering

### **Company-Scoped Data**
All API calls automatically include:
```typescript
headers: {
  'X-Org-Id': 'company123',     // Company filter
  'X-Branch-Id': 'branch456',   // Branch filter (if restricted)
  'X-User-Role': 'manager',     // Role-based filtering
  'Authorization': 'Bearer ...' // User authentication
}
```

### **Module URLs with Context**
```typescript
// Examples of navigation with filters:
/app/journeys?status=active&branch=branch456
/app/orders?company=company123&date_range=last_30_days
/app/indents?status=pending&priority=high
```

## 🔐 Permission System

### **Supported Permission Formats**
```typescript
// Both formats supported:
'view_journeys'    // Standard format
'journeys.view'    // Dot notation format

// Module permissions:
'view_orders', 'orders.view'
'view_journeys', 'journeys.view'
'view_shipments', 'shipments.view'
'view_invoices', 'invoices.view'
'view_indents', 'indents.view'
'view_epod', 'epod.view'

// Action permissions:
'create_journey', 'journeys.create'
'create_order', 'orders.create'
'create_indent', 'indents.create'
```

### **Fallback Behavior**
- If no specific permissions found, defaults to showing Journeys tab
- If user has no module access, shows permission denied message
- Module cards only display for accessible modules

## 🎯 Module Mapping

| Dashboard Tab | Module URL | Description |
|---------------|------------|-------------|
| **Journeys** | `/app/journeys` | Vehicle tracking and journey management |
| **Orders** | `/app/orders` | Customer order management and fulfillment |
| **Indents** | `/app/indents` | Indent requests and approval workflow |
| **Shipments** | `/app/shipments` | Shipment tracking and delivery status |
| **Invoices** | `/app/invoices` | Billing and invoice management |
| **ePOD** | `/app/epod` | Electronic Proof of Delivery |

## 📱 User Experience

### **Dashboard Features**
1. **Summary Overview**: Real-time counts and exceptions across all modules
2. **Module Navigation**: Easy navigation to full module interfaces
3. **Quick Actions**: Fast access to common tasks (Create Order, etc.)
4. **Permission-Aware**: Only shows what user can access
5. **Company/Branch Context**: All data automatically filtered to user's scope

### **Navigation Flow**
```
User Login → Summary Dashboard → Module Selection → Full Module Interface
     ↓              ↓                    ↓              ↓
Company/Branch   Real-time Data     Permission-Based   Filtered Views
   Context        Overview           Module Access      & Actions
```

## 🔄 Testing

### **Access the Dashboard**
```bash
http://localhost:5174/v10/summarydashboard
```

### **Test Navigation**
- **Module Buttons**: Click "Go to [Module]" buttons in tab controls
- **Module Cards**: Click module cards in navigation section
- **Quick Actions**: Use quick action buttons for common tasks
- **Permission Testing**: Test with different user permission sets

### **Verify URLs**
All navigation should redirect to FreightTiger URLs:
- `https://your-domain/app/journeys`
- `https://your-domain/app/orders`
- `https://your-domain/app/indents`
- etc.

## ✅ Ready for Production

The module navigation system is **production-ready** with:
- ✅ **Permission-based access control**
- ✅ **Company and branch data filtering**
- ✅ **Seamless FreightTiger integration**
- ✅ **Real-time data visualization**
- ✅ **Responsive navigation interface**
- ✅ **Exception monitoring and alerts**

Simply integrate with your existing login system and the dashboard becomes a fully functional landing page for the FreightTiger TMS application.