# Root Cause Analysis: "No valid branch selected for company hierarchy request"

## Error Details
```
Error: No valid branch selected for company hierarchy request
at getCompanyHierarchy (realApiService.ts:479:13)
```

## Error Location
**File**: `src/modules/summary-dashboard/data/realApiService.ts`  
**Line**: 479  
**Function**: `getCompanyHierarchy()`

## Code Flow Analysis

### Step 1: BranchId Resolution Attempts
The function tries to get a valid branchId in this order:

```typescript
let branchFteid = TokenManager.getUserContext()?.branchId
  || import.meta.env.VITE_FT_TMS_BRANCH_FTEID
  || ''
```

**Attempt 1**: `TokenManager.getUserContext()?.branchId`
- Gets branchId from stored user context
- Could be empty string `''` if not set
- Could be invalid format (not BRH-/BRN-)

**Attempt 2**: `VITE_FT_TMS_BRANCH_FTEID` environment variable
- Falls back to env var if user context branchId is falsy
- Not set in `.env.local` (confirmed earlier)

**Attempt 3**: Empty string `''`
- Final fallback is empty string
- Empty string fails `isBranchFteid()` check

### Step 2: User Settings Fallback
If branchId is not valid, tries user settings API:

```typescript
if (!isBranchFteid(branchFteid)) {
  try {
    const userSettings = await realApiService.getUserSettings()
    const lastBranch = userSettings?.data?.lastSelectedBranch
    if (isBranchFteid(lastBranch)) {
      branchFteid = lastBranch
    }
  } catch (error) {
    // Silently fails, only logs warning
  }
}
```

**Possible Issues**:
- User settings API call fails (network error, auth error)
- User settings API returns but `lastSelectedBranch` is null/undefined
- `lastSelectedBranch` exists but is not in BRH-/BRN- format

### Step 3: Error Thrown
If still not valid after all attempts:

```typescript
if (!isBranchFteid(branchFteid)) {
  throw new Error('No valid branch selected for company hierarchy request')
}
```

## Root Cause Analysis

### Primary Root Cause: Invalid branchId Format

The `user.branchId` is likely one of these scenarios:

#### Scenario A: Empty String (HIGH PROBABILITY)
**Evidence**:
- Line 93 in `AuthContext.tsx`: `branchId: String(ucv.groupId ?? ucv.desk_parent_fteid?.replace('COM-', '') ?? decoded?.branchId ?? '')`
- If all values are undefined/null, defaults to empty string `''`
- Empty string fails `isBranchFteid()` check

**Why it happens**:
- JWT token's `ucv.groupId` might be undefined/null
- `ucv.desk_parent_fteid` might be undefined/null or not BRH-/BRN- format
- `decoded.branchId` might be undefined/null

#### Scenario B: Wrong Format (MEDIUM PROBABILITY)
**Evidence**:
- Line 93: `ucv.desk_parent_fteid?.replace('COM-', '')` - removes COM- prefix
- If `desk_parent_fteid` is `COM-xxx`, after replace becomes `xxx` (not BRH-/BRN-)
- Or could be a numeric ID instead of FTEID format

**Why it happens**:
- Token might contain company FTEID (COM-xxx) instead of branch FTEID (BRH-xxx)
- Token might contain legacy numeric branch ID
- Token might contain group ID that's not in FTEID format

#### Scenario C: User Settings API Failure (MEDIUM PROBABILITY)
**Evidence**:
- User settings API call might fail silently (caught in try-catch)
- Only logs warning: `[getCompanyHierarchy] Failed to resolve branch from user settings`
- If API fails, fallback never happens

**Why it happens**:
- Network error
- Authentication error (wrong token)
- API endpoint unavailable
- User settings might not have `lastSelectedBranch` set

#### Scenario D: Desk Branch Update Failed (MEDIUM PROBABILITY)
**Evidence**:
- Line 209-220 in `AuthContext.tsx`: Attempts to update branchId from desk payload
- Only updates if `isBranchFteid(deskBranchCandidate)` is true
- If desk payload doesn't have valid branch FTEID, update fails silently

**Why it happens**:
- Desk API response doesn't include `branch_fteid` field
- Desk payload has branch info but in wrong format
- Desk payload has `parent_fteid` that's COM-xxx instead of BRH-xxx

## Data Flow Trace

### Login Flow:
1. User logs in → `AuthApiService.login()`
2. JWT token decoded → `ucv.groupId` extracted
3. UserContext created with `branchId: String(ucv.groupId ?? ... ?? '')`
4. If `ucv.groupId` is undefined/null → `branchId = ''` (empty string)

### Desk Fetch Flow (after login):
1. `AuthApiService.getDesks()` called
2. First desk retrieved
3. Attempts to extract branch from desk payload:
   - `desk.branch_fteid`
   - `desk.branchFteid`
   - `desk.branch_id`
   - `desk.branchId`
   - `desk.parent_fteid`
   - `desk.parentFteid`
4. If found and valid format → Updates `userContext.branchId`
5. If not found or invalid → Keeps original (possibly empty string)

### Hierarchy API Call Flow:
1. `useCompanyHierarchy()` hook called
2. `getCompanyHierarchy()` function executes
3. Tries to get branchId from user context → **FAILS** (empty/invalid)
4. Tries env var → **FAILS** (not set)
5. Tries user settings API → **FAILS** (API error or no valid branch)
6. Throws error → Hook in error state → `hierarchyData = undefined`

## Validation Function

```typescript
const isBranchFteid = (value?: string | null) =>
  Boolean(value && (value.startsWith('BRH-') || value.startsWith('BRN-')))
```

**What passes**:
- `"BRH-xxx"` ✅
- `"BRN-xxx"` ✅

**What fails**:
- `""` (empty string) ❌
- `"COM-xxx"` ❌
- `"xxx"` (no prefix) ❌
- `"123"` (numeric) ❌
- `null` ❌
- `undefined` ❌

## Impact Analysis

### Immediate Impact:
- `useCompanyHierarchy()` hook is in **error state**
- `hierarchyData` is `undefined`
- `branchName` in AppHeader is always `null`
- Placeholder "SPD-Santoshnagar" shows because no branch name is available

### Cascading Effects:
- LocationSelector component also uses same hook → might fail
- Any component depending on hierarchy data will fail
- User can't see their actual branch name

## Diagnostic Evidence Needed

To confirm the exact root cause, check:

1. **User Context branchId Value**:
   ```javascript
   // In browser console:
   JSON.parse(localStorage.getItem('ft_user_context')).branchId
   ```
   - Is it empty string `""`?
   - Is it in wrong format?
   - Is it undefined/null?

2. **JWT Token Payload**:
   ```javascript
   // Decode JWT token to see ucv.groupId
   const token = localStorage.getItem('ft_access_token')
   const payload = JSON.parse(atob(token.split('.')[1]))
   console.log('JWT ucv:', payload.ucv)
   ```
   - What is `ucv.groupId`?
   - What is `ucv.desk_parent_fteid`?
   - Are they in BRH-/BRN- format?

3. **Desk Payload**:
   - Check console for: `[AuthContext] Desk payload for branch resolution:`
   - Does it contain `branch_fteid`?
   - What format is it in?

4. **User Settings API**:
   - Check Network tab for `/configurations/user-settings` call
   - Check response for `lastSelectedBranch`
   - Is it in BRH-/BRN- format?

5. **Error Logs**:
   - Check for: `[getCompanyHierarchy] Failed to resolve branch from user settings`
   - What is the error message?

## Most Likely Root Cause

Based on the error and code analysis:

**PRIMARY**: User's `branchId` in UserContext is **empty string `''`** because:
- JWT token's `ucv.groupId` is undefined/null
- JWT token's `ucv.desk_parent_fteid` is undefined/null or COM-xxx format
- Desk payload doesn't contain valid branch FTEID
- User settings API either fails or doesn't have valid branch

**SECONDARY**: User settings API call fails, preventing fallback to `lastSelectedBranch`

## Recommended Solutions (Without Code Changes)

### Solution 1: Verify User Context branchId
Check what value is actually stored:
```javascript
// Run in browser console
const context = JSON.parse(localStorage.getItem('ft_user_context'))
console.log('BranchId:', context?.branchId, 'Type:', typeof context?.branchId, 'Length:', context?.branchId?.length)
```

### Solution 2: Check JWT Token
Decode token to see source data:
```javascript
// Run in browser console
const token = localStorage.getItem('ft_access_token')
const payload = JSON.parse(atob(token.split('.')[1]))
console.log('JWT ucv.groupId:', payload.ucv?.groupId)
console.log('JWT ucv.desk_parent_fteid:', payload.ucv?.desk_parent_fteid)
```

### Solution 3: Check User Settings API Response
Inspect Network tab for `/configurations/user-settings`:
- Is the API called?
- What is the response status?
- What is `lastSelectedBranch` value?

### Solution 4: Check Desk Payload
Look for console log: `[AuthContext] Desk payload for branch resolution:`
- What fields does it contain?
- Does it have branch information?

## Next Steps for Fix

Once root cause is confirmed:

1. **If branchId is empty string**: Need to ensure it's set from a valid source (desk, user settings, or token)
2. **If branchId is wrong format**: Need to transform it to BRH-/BRN- format or get from correct source
3. **If user settings API fails**: Need to handle error gracefully or use alternative source
4. **If desk payload missing**: Need to get branch from different API or user settings

## Files Involved

- `src/modules/summary-dashboard/data/realApiService.ts:461-479` - Error thrown here
- `src/modules/summary-dashboard/auth/AuthContext.tsx:93` - branchId set from token
- `src/modules/summary-dashboard/auth/AuthContext.tsx:200-220` - branchId updated from desk
- `src/modules/summary-dashboard/auth/tokenManager.ts:12-21` - UserContext interface
- `src/modules/summary-dashboard/data/ftTmsClient.ts:38` - branchId extracted from token
