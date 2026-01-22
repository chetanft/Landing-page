# Migration Guide: From Tailwind CSS to FT Design System Only

## Overview
This project has been migrated to use **only** FT Design System components and CSS variables. No hardcoded values or Tailwind classes should be used.

## Design Systems Summary
✅ **FT Design System**: The ONLY design system used
❌ **Tailwind CSS**: Completely removed
❌ **Hardcoded values**: Not allowed

## Migration Patterns

### Layout Components

| Tailwind/Hardcode | FT Design System |
|-------------------|------------------|
| `<div className="flex flex-col">` | `<Grid><Col>content</Col></Grid>` |
| `<div className="flex items-center justify-between">` | `<Row align="middle" justify="space-between">` |
| `<div className="grid grid-cols-4">` | `<Row><Col span={6}>item</Col>...</Row>` |
| `<div className="p-4 m-2">` | `<Card>` or `style={{ padding: 'var(--spacing-x4)' }}` |

### Spacing

| Tailwind | FT Design System |
|----------|------------------|
| `gap-4`, `space-y-4` | `<Spacer size="medium" />` |
| `mb-2` | `<Spacer size="small" />` |
| `p-6` | `style={{ padding: 'var(--spacing-x6)' }}` |
| `px-4` | `style={{ paddingInline: 'var(--spacing-x4)' }}` |

### Typography

| Tailwind | FT Design System |
|----------|------------------|
| `<h1 className="text-xl font-bold">` | `<Typography variant="title-secondary">` |
| `<p className="text-sm text-gray-600">` | `<Typography variant="body-primary-regular">` |
| Hardcoded font sizes | Use Typography variants only |

### Components

| Custom/Hardcode | FT Design System |
|-----------------|------------------|
| Custom alert divs | `<Alert type="warning" message="..." />` |
| Custom button styling | `<Button variant="primary" size="md">` |
| Custom form controls | `<Input />`, `<Select />`, etc. |
| Custom cards | `<Card>` |
| Custom modals | `<Modal>`, `<Drawer>` |

## File-by-File Migration Status

### ✅ Completed
- `src/modules/summary-dashboard/pages/SummaryDashboardPage.tsx`
- `src/modules/summary-dashboard/components/ErrorBanner.tsx`
- `src/index.css` (Tailwind removed)
- `package.json` (Tailwind dependencies removed)

### 🔄 Needs Migration
1. `src/modules/summary-dashboard/components/NewLifecycleBoard.tsx`
2. `src/modules/summary-dashboard/components/TitleBar.tsx`
3. `src/modules/summary-dashboard/components/SegmentedTabs.tsx`
4. `src/modules/summary-dashboard/components/AppHeader.tsx`
5. `src/modules/summary-dashboard/components/ProgressItem.tsx`
6. `src/modules/summary-dashboard/components/StatusItem.tsx`
7. `src/modules/summary-dashboard/components/ExceptionItem.tsx`
8. `src/modules/summary-dashboard/components/NewLifecycleColumn.tsx`

## Migration Steps for Each Component

### 1. Replace Layout Divs
```typescript
// Before
<div className="flex flex-col gap-4">
  <div className="flex items-center justify-between">
    <h2>Title</h2>
    <button>Action</button>
  </div>
</div>

// After
<Grid>
  <Row align="middle" justify="space-between">
    <Col>
      <Typography variant="title-secondary">Title</Typography>
    </Col>
    <Col>
      <Button variant="primary">Action</Button>
    </Col>
  </Row>
</Grid>
```

### 2. Replace Hardcoded Styling
```typescript
// Before
<div style={{ padding: '20px', margin: '16px', borderRadius: '8px' }}>

// After
<Card style={{ margin: 'var(--spacing-x4)' }}>
```

### 3. Use FT Design System Variables
```typescript
// CSS Variables Available:
--spacing-x1, --spacing-x2, --spacing-x3, --spacing-x4, --spacing-x5, --spacing-x6
--text-primary, --text-secondary, --text-tertiary
--bg-primary, --bg-secondary, --bg-surface
--border-primary, --border-secondary
--border-radius-sm, --border-radius-md, --border-radius-lg
```

### 4. Component Replacements

#### Alert/Banner Components
```typescript
// Before
<div className="bg-warning-100 border border-warning-200 rounded-lg p-4">
  <span>⚠️ {message}</span>
  <button onClick={onRetry}>Retry</button>
</div>

// After
<Alert
  type="warning"
  message={message}
  action={<Button variant="text" onClick={onRetry}>Retry</Button>}
  showIcon
/>
```

#### Layout Containers
```typescript
// Before
<div className="flex flex-col min-h-screen bg-gray-50">
  <header>Header</header>
  <main className="flex-1 p-6">Content</main>
</div>

// After
<SimpleColumnLayout>
  <AppHeader />
  <Grid style={{ padding: 'var(--spacing-x6)' }}>
    <Row>
      <Col span={24}>Content</Col>
    </Row>
  </Grid>
</SimpleColumnLayout>
```

## Available FT Design System Components

### Layout
- `SimpleColumnLayout`, `Grid`, `Row`, `Col`
- `Card`, `Divider`, `Spacer`

### Typography
- `Typography` with variants: `title-primary`, `title-secondary`, `body-primary-regular`, etc.

### Form Controls
- `Button`, `Input`, `Select`, `Checkbox`, `Switch`, `RadioGroup`

### Feedback
- `Alert`, `Modal`, `Drawer`, `Tooltip`, `Notification`

### Data Display
- `Table`, `Badge`, `Statistic`, `Descriptions`, `Timeline`

### Navigation
- `SegmentedTabs`, `Breadcrumb`, `Pagination`

### Miscellaneous
- `Icon`, `Avatar`, `Image`, `Skeleton`, `Spin`

## Quality Gates

### ✅ Success Criteria
1. Zero Tailwind classes in any component
2. No hardcoded pixel values or colors
3. All styling uses FT Design System components or CSS variables
4. Dev server runs without errors
5. All components render correctly

### 🚫 Anti-Patterns to Avoid
- `className="flex items-center"` → Use `<Row align="middle">`
- `style={{ padding: '16px' }}` → Use `style={{ padding: 'var(--spacing-x4)' }}`
- Custom CSS classes → Use FT components
- Hardcoded colors → Use CSS variables

## Testing the Migration

1. **Visual Review**: Every component should look the same or better
2. **No Console Errors**: Check browser console for missing styles
3. **Responsive Behavior**: Ensure layouts work on different screen sizes
4. **Theme Support**: Components should respect FT Design System themes

## Benefits Achieved

✅ **Consistent Design Language**: Single source of design truth
✅ **Automatic Theme Support**: Dark/light modes work automatically
✅ **Reduced Bundle Size**: No Tailwind CSS overhead
✅ **Better Accessibility**: FT components include ARIA attributes
✅ **Easier Maintenance**: Changes to FT Design System propagate automatically
✅ **Type Safety**: Full TypeScript support for all components