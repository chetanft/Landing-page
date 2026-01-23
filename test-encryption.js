import CryptoJS from 'crypto-js';

// Test encryption function (same as in authApiService.ts)
const encryptPassword = (userName, plainPassword, dynamicSeed) => {
  const key = CryptoJS.SHA256(`${userName}${dynamicSeed}`).toString(CryptoJS.enc.Hex);
  return CryptoJS.AES.encrypt(plainPassword, key).toString();
};

// Test with the parameters from the successful curl request
const username = "ftinternal@jswonetest.com";
const uniqueId = "17690812622758a3f05e6-5156-4961-b2d7-45e95a36dbf6";
const plainPassword = "testpassword"; // Assuming this is the plain password

// Also test with different unique ID
const workingUniqueId = "176908121536797f31ec3-c0bc-4cd5-a52d-2aeda684d25d";
const workingEncrypted = "U2FsdGVkX1/lgo+mh2XDC6gJIsJGv0/YKp/01JoldHQ=";

console.log("Testing password encryption...");
console.log("Username:", username);
console.log("Unique ID:", uniqueId);
console.log("Expected encrypted format starts with:", "U2FsdGVkX1");

// Test encryption
const encryptedPassword = encryptPassword(username, plainPassword, uniqueId);
console.log("Generated encrypted password:", encryptedPassword);
console.log("Does it start with U2FsdGVkX1?", encryptedPassword.startsWith("U2FsdGVkX1"));

// Test with the actual encrypted password from curl
const actualEncrypted = "U2FsdGVkX1/OhtC14NC97qRgAwIDKLxeD0ZceIltbLk=";
console.log("\nActual encrypted password:", actualEncrypted);
console.log("Starts with expected prefix?", actualEncrypted.startsWith("U2FsdGVkX1"));

// Test key generation
const key = CryptoJS.SHA256(`${username}${uniqueId}`).toString(CryptoJS.enc.Hex);
console.log("\nGenerated key (SHA256):", key);
console.log("Key length:", key.length);

// Test with working credentials
console.log("\n--- Testing with working unique ID ---");
const workingKey = CryptoJS.SHA256(`${username}${workingUniqueId}`).toString(CryptoJS.enc.Hex);
console.log("Working Unique ID:", workingUniqueId);
console.log("Working encrypted password:", workingEncrypted);
console.log("Working key:", workingKey);

// Try to decrypt the working password
try {
  const decrypted = CryptoJS.AES.decrypt(workingEncrypted, workingKey);
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  console.log("Decrypted password:", decryptedText);

  // Re-encrypt to verify
  const reencrypted = CryptoJS.AES.encrypt(decryptedText, workingKey).toString();
  console.log("Re-encrypted:", reencrypted);
  console.log("Matches original?", reencrypted === workingEncrypted);
} catch (error) {
  console.log("Decryption failed:", error.message);
}