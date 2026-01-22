# Troubleshooting 401 Login Error in Postman

## 🔍 Step-by-Step Debugging

### Step 1: Check Console Output

After sending the Login request, check the **Console** tab (bottom left in Postman). You should see:

```
🔍 Login Request Debug Info:
  Username: your_username@example.com
  Plain Password: ***SET*** (or NOT SET)
  Encrypted Password: ***SET*** (or NOT SET)
  Dynamic ID: 17690647726515940c9b5-2f09-4059-9190-7e4f14427a8e
```

**What to check:**
- ✅ Username is set
- ✅ Either `plain_password` OR `password` (encrypted) is set
- ✅ Dynamic ID is set

### Step 2: Verify Environment Variables

1. Click the **eye icon** (top right)
2. Select **FreightTiger TMS Environment**
3. Verify these are set:
   - `username`: Your username/email
   - `password`: Encrypted password (OR `plain_password`: Your plain password)
   - `dynamic_id`: Dynamic ID (if using pre-encrypted password)

### Step 3: Check Request Headers

In the Login request, go to **Headers** tab and verify:

✅ **Required Headers:**
- `Origin: https://www.freighttiger.com`
- `Referer: https://www.freighttiger.com/`
- `x-ft-unique-id: {{dynamic_id}}`
- `Content-Type: application/json`
- `Accept: application/json`

### Step 4: Check Request Body

Go to **Body** tab and verify the JSON:

```json
{
  "username": "{{username}}",
  "password": "{{password}}",
  "grant_type": "password",
  "app_id": "{{app_id}}"
}
```

**Important:**
- `password` should be the **encrypted** password (starts with `U2FsdGVkX1`)
- `username` should match exactly (case-sensitive)
- `dynamic_id` in header must match the one used for encryption

---

## 🔐 Password Encryption Issues

### Problem: Password Not Encrypted Correctly

**Symptoms:**
- 401 error
- Console shows password doesn't start with `U2FsdGVkX1`

**Solution:**

1. **Open `password-encryptor.html`** in your browser
2. **Enter credentials:**
   - Username: Your exact username
   - Plain Password: Your actual password
   - Dynamic ID: Leave auto-generated (or uncheck to enter manually)
3. **Click "Encrypt Password"**
4. **Copy BOTH values:**
   - Encrypted Password (long string starting with `U2FsdGVkX1`)
   - Dynamic ID (the one shown in the tool)
5. **Set in Postman Environment:**
   - `password` = (paste encrypted password)
   - `dynamic_id` = (paste dynamic ID)
   - `username` = (your username)

### Problem: Dynamic ID Mismatch

**Symptoms:**
- 401 error
- Password is encrypted but dynamic_id doesn't match

**Solution:**

The `dynamic_id` used for encryption **MUST** match the `x-ft-unique-id` header.

1. When you encrypt password, **copy the Dynamic ID** shown
2. Set `dynamic_id` in Postman environment to **exactly** that value
3. The header `x-ft-unique-id` will use `{{dynamic_id}}` automatically

---

## ✅ Complete Setup Checklist

Use this checklist to ensure everything is set up correctly:

- [ ] **Environment Selected**: "FreightTiger TMS Environment" is selected (top right dropdown)
- [ ] **Username Set**: `username` variable is set in environment
- [ ] **Password Encrypted**: Used `password-encryptor.html` tool
- [ ] **Password Set**: `password` variable contains encrypted password (starts with `U2FsdGVkX1`)
- [ ] **Dynamic ID Set**: `dynamic_id` matches the one used for encryption
- [ ] **Headers Present**: Origin and Referer headers are in Login request
- [ ] **Request Body**: JSON format is correct with all fields

---

## 🐛 Common Issues & Solutions

### Issue 1: "CryptoJS not available"
**Solution**: Use `password-encryptor.html` tool instead of auto-encryption

### Issue 2: "Missing Origin header"
**Solution**: Re-import the collection (it's now included automatically)

### Issue 3: "Password doesn't match dynamic_id"
**Solution**: 
1. Use `password-encryptor.html` tool
2. Copy BOTH encrypted password AND dynamic_id
3. Set both in environment variables

### Issue 4: "Username not found"
**Solution**: 
- Check username is set in environment
- Check username matches exactly (case-sensitive, no extra spaces)

### Issue 5: "Invalid credentials"
**Solution**:
- Verify username is correct
- Verify password encryption used correct username
- Verify dynamic_id matches between encryption and request

---

## 📋 Quick Fix Procedure

If you're still getting 401, follow these steps **in order**:

1. **Clear and Reset:**
   ```
   - Set username = your_username@example.com
   - Clear password variable
   - Clear dynamic_id variable
   ```

2. **Encrypt Password:**
   ```
   - Open password-encryptor.html
   - Enter username: your_username@example.com
   - Enter password: your_actual_password
   - Click "Encrypt Password"
   ```

3. **Copy Values:**
   ```
   - Copy Encrypted Password (entire string)
   - Copy Dynamic ID (entire string)
   ```

4. **Set in Postman:**
   ```
   - password = (paste encrypted password)
   - dynamic_id = (paste dynamic ID)
   - username = your_username@example.com
   ```

5. **Verify Headers:**
   ```
   - Login request → Headers tab
   - Check Origin: https://www.freighttiger.com
   - Check Referer: https://www.freighttiger.com/
   ```

6. **Send Request:**
   ```
   - Click Send
   - Check Console for debug info
   - Check Test Results for errors
   ```

---

## 🔍 Debugging Output

After sending the request, check the **Console** tab. You should see:

**If successful:**
```
✅ Password encrypted successfully
📤 Request Details:
  Username: your_username@example.com
  Password: U2FsdGVkX1+vupppZksvRf5pq5g5XkFyigTRLBPwP30=...
  Origin Header: https://www.freighttiger.com
  Referer Header: https://www.freighttiger.com/
✅ Access token saved to environment
```

**If failed:**
```
❌ 401 UNAUTHORIZED - Login Failed
🔍 Common Causes:
   1. ❌ Missing Origin header
   2. ❌ Missing Referer header
   6. ⚠️ Password might not be encrypted correctly
   7. ⚠️ Password encryption might not match dynamic_id
```

---

## 💡 Pro Tips

1. **Always use the HTML tool** for password encryption (most reliable)
2. **Copy the entire encrypted password** (it's long, don't truncate)
3. **Copy the entire dynamic_id** (must match exactly)
4. **Check Console first** - it shows exactly what's wrong
5. **One encryption per login** - each dynamic_id is unique

---

## 🆘 Still Not Working?

If you've tried everything and still get 401:

1. **Check Console Output** - It will tell you exactly what's missing
2. **Verify Request Body** - Click "Body" tab and check the actual JSON
3. **Check Response** - Click "Response" tab to see error message from server
4. **Compare with Browser** - Open browser DevTools → Network tab → Compare headers

---

**Last Updated**: January 22, 2026
