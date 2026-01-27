# Root Cause Analysis: "SPD-Santoshnagar" Placeholder Not Replaced

## Problem Statement
The UserProfileDropdown component from `ft-design-system` continues to display "SPD-Santoshnagar" as a placeholder instead of the actual branch name, despite implementation to fetch and pass branch data.

## Current Implementation Analysis

### Code Flow
1. **AppHeader.tsx** uses `useCompanyHierarchy()` hook
2. Hook calls `realApiService.getCompanyHierarchy()`
3. API requires a valid `branchId` in BRH- or BRN- format
4. Returns `CompanyHierarchyResponse` with `total_branches` array
5. `useMemo` matches `user.branchId` with `branch.fteid`
6. Extracts `branch.name` and passes as `location` prop to `FTAppHeader`

## Potential Root Causes

### Issue #1: API Call Failure (HIGH PROBABILITY)
**Location**: `src/modules/summary-dashboard/data/realApiService.ts:478-479`

```typescript
if (!isBranchFteid(branchFteid)) {
  throw new Error('No valid branch selected for company hierarchy request')
}
```

**Problem**: 
- If `user.branchId` is not in BRH-/BRN- format, the API call throws an error
- The React Query hook will be in `error` state, not `data` state
- `hierarchyData` will be `undefined`, causing `branchName` to always be `null`

**Evidence**:
- The hook doesn't check for `error` state, only uses `data`
- No error handling in AppHeader component
- If API fails, `branchName` remains `null` and placeholder shows

**Verification Needed**:
- Check browser console for errors: `[getCompanyHierarchy] Planning API error`
- Check if `user.branchId` is in correct format (BRH-xxx or BRN-xxx)
- Check React Query DevTools for hook state (error vs data)

### Issue #2: Hook Disabled (MEDIUM PROBABILITY)
**Location**: `src/modules/summary-dashboard/hooks/useRealApiData.ts:73`

```typescript
enabled: !JOURNEY_COUNT_ONLY_MODE
```

**Problem**:
- If `VITE_JOURNEY_COUNT_ONLY === 'true'`, the hook is disabled
- Hook won't fetch data, `hierarchyData` will be `undefined`
- `branchName` will be `null`

**Verification Needed**:
- Check `.env.local` for `VITE_JOURNEY_COUNT_ONLY`
- Check if hook is actually executing (React Query DevTools)

### Issue #3: Wrong Prop Name (HIGH PROBABILITY)
**Location**: `src/modules/summary-dashboard/components/AppHeader.tsx:101`

```typescript
location: branchName || undefined,
```

**Problem**:
- `ft-design-system` is an external library - we don't know its prop interface
- TypeScript doesn't error because props are likely typed as `any` or `Record<string, any>`
- The library might expect:
  - `branch` instead of `location`
  - `userLocation` as separate prop
  - `branchName` instead of `location`
  - Or it might not accept location at all and fetch it internally

**Evidence**:
- No TypeScript errors (props likely loosely typed)
- Placeholder still shows (prop might be ignored)
- External library might have its own API call logic

**Verification Needed**:
- Check browser DevTools Network tab for API calls from ft-design-system
- Inspect FTAppHeader component props in React DevTools
- Check ft-design-system documentation/source if available

### Issue #4: Data Timing Issue (MEDIUM PROBABILITY)
**Location**: `src/modules/summary-dashboard/components/AppHeader.tsx:46-54`

**Problem**:
- Hierarchy API is async and may take time to load
- Component renders before data is available
- `branchName` is `null` initially, then updates but component might not re-render
- Or FTAppHeader might cache the initial `undefined` value

**Verification Needed**:
- Check if hierarchy data loads after initial render
- Check React DevTools for prop updates
- Add console.log to see when branchName changes

### Issue #5: BranchId Format Mismatch (HIGH PROBABILITY)
**Location**: `src/modules/summary-dashboard/components/AppHeader.tsx:50-51`

```typescript
const branch = hierarchyData.data.total_branches.find(
  (b) => b.fteid === user.branchId
)
```

**Problem**:
- `user.branchId` might be in different format than `branch.fteid`
- Case sensitivity issues
- Extra whitespace or formatting differences
- `user.branchId` might be empty string `''` instead of `undefined`

**Evidence**:
- UserContext.branchId is `string` type (not optional), so it could be empty string
- Empty string `''` would fail the `!user?.branchId` check but still not match any branch

**Verification Needed**:
- Log `user.branchId` value and format
- Log all `branch.fteid` values from hierarchy
- Check for exact string match (including case, whitespace)

### Issue #6: ft-design-system Internal Logic (HIGH PROBABILITY)
**Problem**:
- The `ft-design-system` library might:
  - Make its own API call to fetch branch/location data
  - Use a different data source (e.g., user profile API)
  - Ignore the `location` prop entirely
  - Have hardcoded placeholder logic that overrides props

**Evidence**:
- External library - we don't control its implementation
- Placeholder "SPD-Santoshnagar" is very specific (not generic)
- Might be fetching from a different endpoint

**Verification Needed**:
- Check Network tab for API calls when dropdown opens
- Inspect UserProfileDropdown component in React DevTools
- Check if library has its own API service

## Diagnostic Steps

### Step 1: Verify Hook State
```javascript
// In AppHeader.tsx, add:
const { data: hierarchyData, error: hierarchyError, isLoading } = useCompanyHierarchy()
console.log('Hierarchy Hook State:', { hierarchyData, hierarchyError, isLoading })
```

### Step 2: Verify User Context
```javascript
// In AppHeader.tsx, add:
console.log('User Context:', { 
  branchId: user?.branchId, 
  branchIdType: typeof user?.branchId,
  branchIdLength: user?.branchId?.length,
  isBranchFteid: user?.branchId?.startsWith('BRH-') || user?.branchId?.startsWith('BRN-')
})
```

### Step 3: Verify Branch Matching
```javascript
// In useMemo, add logging:
const branchName = useMemo(() => {
  console.log('Branch Matching:', {
    hasHierarchyData: !!hierarchyData?.data?.total_branches,
    branchCount: hierarchyData?.data?.total_branches?.length,
    userBranchId: user?.branchId,
    allBranchFteids: hierarchyData?.data?.total_branches?.map(b => b.fteid)
  })
  
  if (!hierarchyData?.data?.total_branches || !user?.branchId) {
    return null
  }
  const branch = hierarchyData.data.total_branches.find(
    (b) => b.fteid === user.branchId
  )
  console.log('Matched Branch:', branch)
  return branch?.name || null
}, [hierarchyData, user?.branchId])
```

### Step 4: Verify Prop Passing
```javascript
// Before return, add:
console.log('FTAppHeader Props:', {
  userName,
  userRole,
  branchName,
  locationProp: branchName || undefined,
  fullUserObject: isAuthenticated && user ? {
    name: userName,
    role: userRole,
    location: branchName || undefined,
  } : undefined
})
```

### Step 5: Check Network Tab
- Open browser DevTools → Network tab
- Filter for: `company/child` or `hierarchy`
- Check if API is being called
- Check response status and data
- Check if ft-design-system makes its own API calls

### Step 6: Inspect Component Props
- Open React DevTools
- Find `FTAppHeader` component
- Inspect `user` prop
- Check if `location` property exists
- Check if it's being used by child components

## Most Likely Root Causes (Ranked)

1. **Issue #3: Wrong Prop Name** - `location` prop might not be the correct prop name for ft-design-system
2. **Issue #6: ft-design-system Internal Logic** - Library might be fetching its own data or ignoring the prop
3. **Issue #1: API Call Failure** - Hook might be in error state due to invalid branchId format
4. **Issue #5: BranchId Format Mismatch** - branchId might not match any branch.fteid in hierarchy

## Recommended Next Steps

1. Add comprehensive logging to verify data flow
2. Check browser console for errors
3. Inspect Network tab for API calls
4. Use React DevTools to inspect component props
5. Verify user.branchId format and value
6. Check if ft-design-system has documentation or source code available
7. Try alternative prop names: `branch`, `branchName`, `userLocation`, `userBranch`
