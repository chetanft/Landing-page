# Password Encryption Guide

The FreightTiger API requires passwords to be AES encrypted before sending. Here are the ways to encrypt your password:

## 🔐 Method 1: Use the HTML Tool (Recommended)

**Easiest and most reliable method**

1. **Open the tool**: Double-click `password-encryptor.html` in your browser
2. **Enter credentials**:
   - Username: Your username/email
   - Plain Password: Your actual password
   - Dynamic ID: Auto-generated (or uncheck to enter manually)
3. **Click "Encrypt Password"**
4. **Copy the results**:
   - Copy the **Encrypted Password**
   - Copy the **Dynamic ID**
5. **Set in Postman**:
   - Go to Environment Variables (eye icon)
   - Set `password` = (paste encrypted password)
   - Set `dynamic_id` = (paste dynamic ID)
   - Set `username` = (your username)

## 🔄 Method 2: Auto-encryption in Postman (If Available)

**Note**: This may not work in all Postman versions as CryptoJS might not be available.

1. **Set in Postman Environment**:
   - `username`: Your username
   - `plain_password`: Your actual password (plain text)
   - `dynamic_id`: Leave empty (will be auto-generated)
2. **Send Login request**: The pre-request script will try to encrypt automatically
3. **Check Console**: If encryption fails, you'll see instructions to use Method 1

## 📋 How Encryption Works

The encryption process follows this algorithm:

```
1. Generate Dynamic ID = timestamp + UUID
   Example: 1703260800000a1b2c3d4-e5f6-4789-a012-3456789abcde

2. Create Key = SHA256(username + dynamicId)
   Example: SHA256("user@example.com" + "1703260800000a1b2c3d4...")
   Result: "a1b2c3d4e5f6..." (hex string)

3. Encrypt Password = AES.encrypt(plainPassword, key)
   Example: AES.encrypt("mypassword", "a1b2c3d4e5f6...")
   Result: "U2FsdGVkX1..." (base64 encrypted string)
```

## 🔍 Verification

After encryption, your encrypted password should:
- Start with `U2FsdGVkX1` (typical AES encrypted format)
- Be a long base64 string
- Match the dynamic_id used for encryption

## ⚠️ Important Notes

1. **Dynamic ID must match**: The same dynamic_id used for encryption must be sent in the `x-ft-unique-id` header
2. **Username must match**: The username used for encryption must match the one sent in the request
3. **One-time use**: Each encryption uses a unique dynamic_id, so you can't reuse encrypted passwords
4. **Security**: Never share your encrypted passwords or dynamic IDs

## 🐛 Troubleshooting

### Problem: "CryptoJS not available" error
**Solution**: Use Method 1 (HTML tool) instead

### Problem: Still getting 401 after encryption
**Check**:
1. Dynamic ID in request header matches the one used for encryption
2. Username matches exactly (case-sensitive)
3. Encrypted password was copied completely (no truncation)

### Problem: Can't open HTML file
**Solution**: 
- Right-click → Open With → Browser
- Or drag and drop into browser window

## 📝 Example

**Input**:
- Username: `user@example.com`
- Password: `MyPassword123`
- Dynamic ID: `1703260800000a1b2c3d4-e5f6-4789-a012-3456789abcde`

**Output**:
- Encrypted Password: `U2FsdGVkX1+vupppZksvRf5pq5g5XkFyigTRLBPwP30=`
- Dynamic ID: `1703260800000a1b2c3d4-e5f6-4789-a012-3456789abcde`

**Postman Request**:
```json
POST /api/authentication/v1/auth/login
Headers:
  x-ft-unique-id: 1703260800000a1b2c3d4-e5f6-4789-a012-3456789abcde
Body:
{
  "username": "user@example.com",
  "password": "U2FsdGVkX1+vupppZksvRf5pq5g5XkFyigTRLBPwP30=",
  "grant_type": "password",
  "app_id": "web"
}
```

---

**Need Help?** Check the Console tab in Postman for detailed error messages.
