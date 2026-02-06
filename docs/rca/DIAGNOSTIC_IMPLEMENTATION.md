# Diagnostic Implementation Summary

## Changes Made to AppHeader.tsx

### 1. Added Error Handling ✅
- Now destructures `error` and `isLoading` from `useCompanyHierarchy()` hook
- Checks for `hierarchyError` before processing data
- Logs error messages in development mode

### 2. Added Comprehensive Logging ✅

**Diagnostic Info Logging** (lines 29-44):
- Logs user branchId value, type, length, and format validation
- Logs hierarchy API loading state
- Logs hierarchy API errors
- Logs hierarchy data availability and branch count
- Logs all branch FTEIDs from hierarchy for comparison

**Branch Matching Logging** (lines 65-98):
- Logs hierarchy data availability
- Logs user branchId being searched
- Logs all available branch FTEIDs
- Logs whether a match was found
- Logs matched branch details (name, fteid)

**Props Logging** (lines 153-163):
- Logs all props being passed to FTAppHeader
- Logs branchName value
- Logs complete userObject with all prop name attempts

### 3. Added Multiple Prop Name Attempts ✅
Now passing branch name with multiple prop names simultaneously:
- `location: branchName`
- `branch: branchName`
- `branchName: branchName`
- `userLocation: branchName`

This allows us to test which prop name ft-design-system actually accepts.

## What to Check Next

### Step 1: Open Browser Console
1. Open the application in browser
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Look for logs prefixed with `[AppHeader]`

**Check for:**
- `[AppHeader] Diagnostic Info:` - Shows user branchId and hierarchy state
- `[AppHeader] Branch Matching:` - Shows matching process
- `[AppHeader] Matched Branch:` - Shows if branch was found
- `[AppHeader] FTAppHeader Props:` - Shows what props are being passed
- Any errors: `[AppHeader] Hierarchy API error:`

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Filter for: `company/child` or `hierarchy`
3. Check if API is being called
4. Check response status:
   - **200**: API succeeded, check response data
   - **400/500**: API failed, check error message
   - **No request**: API not being called (hook disabled or error before call)

### Step 3: Inspect Component Props
1. Install React DevTools extension if not already installed
2. Open React DevTools
3. Find `FTAppHeader` component
4. Inspect `user` prop:
   - Does it contain `location`, `branch`, `branchName`, or `userLocation`?
   - What is the value of each?
   - Are they being passed correctly?

### Step 4: Analyze Console Output

**Expected Scenarios:**

#### Scenario A: API Error
```
[AppHeader] Diagnostic Info: {
  hierarchyError: "No valid branch selected for company hierarchy request"
  ...
}
```
**Root Cause**: User's branchId is not in BRH-/BRN- format
**Solution**: Check user.branchId format and fix if needed

#### Scenario B: No Match Found
```
[AppHeader] Matched Branch: {
  found: false,
  searchedBranchId: "BRH-xxx",
  allBranchFteids: ["BRH-yyy", "BRH-zzz"]
}
```
**Root Cause**: User's branchId doesn't match any branch in hierarchy
**Solution**: Verify branchId is correct or use different matching logic

#### Scenario C: Data Loaded But Prop Not Working
```
[AppHeader] Matched Branch: {
  found: true,
  branchName: "Actual Branch Name"
}
[AppHeader] FTAppHeader Props: {
  branchName: "Actual Branch Name",
  userObject: { location: "Actual Branch Name", branch: "Actual Branch Name", ... }
}
```
**Root Cause**: ft-design-system doesn't accept any of the prop names we're trying
**Solution**: Check ft-design-system documentation or inspect component internals

#### Scenario D: Hook Disabled
```
[AppHeader] Diagnostic Info: {
  hierarchyLoading: false,
  hasHierarchyData: false,
  hierarchyError: undefined
}
```
**Root Cause**: Hook is disabled (JOURNEY_COUNT_ONLY_MODE enabled)
**Solution**: Check .env.local for VITE_JOURNEY_COUNT_ONLY

## Key Diagnostic Points

1. **User BranchId Format**: Must be `BRH-xxx` or `BRN-xxx` format
2. **API Call Status**: Check Network tab for actual API calls
3. **Hook State**: Check if hook is in `error`, `loading`, or `success` state
4. **Prop Acceptance**: Check React DevTools to see which prop (if any) is being used
5. **Data Matching**: Verify branchId matches branch.fteid exactly

## Next Actions Based on Findings

### If API Error:
- Fix user.branchId format
- Or handle error state gracefully
- Or use fallback data source

### If No Match:
- Check branchId value vs available branches
- Consider case-insensitive matching
- Consider partial matching
- Use first branch as fallback

### If Prop Not Accepted:
- Check ft-design-system source code if available
- Try inspecting UserProfileDropdown component internals
- Check if library makes its own API call
- Consider CSS override as last resort

### If Hook Disabled:
- Check VITE_JOURNEY_COUNT_ONLY environment variable
- Enable hook if needed
- Or use alternative data source

## Files Modified
- `src/modules/summary-dashboard/components/AppHeader.tsx` - Added diagnostics and error handling
