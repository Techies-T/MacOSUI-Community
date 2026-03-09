const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load development.env if it exists (for local development keys)
const devEnvPath = path.resolve(__dirname, 'development.env');
if (fs.existsSync(devEnvPath)) {
    dotenv.config({ path: devEnvPath });
}

// Ensure an encryption key is available
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
    console.warn("WARNING: DB_ENCRYPTION_KEY is not set. Database secrets will NOT be encrypted properly.");
}

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a plain text string.
 * @param {string} text - The text to encrypt.
 * @returns {string} - The encrypted text in the format: iv:authTag:encryptedData
 */
function encrypt(text) {
    if (!text) return text;
    if (!ENCRYPTION_KEY) return text; // Fallback if no key is provided (unsecure, but prevents crashing)

    try {
        const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
        if (keyBuffer.length !== 32) {
            throw new Error('Invalid encryption key length. Key must be 32 bytes (64 hex characters).');
        }

        const iv = crypto.randomBytes(12); // GCM recommended IV size
        const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error("Encryption failed:", error.message);
        return text; // Fallback to plain text on error to avoid data loss, though risky
    }
}

/**
 * Decrypts an encrypted string.
 * @param {string} hash - The encrypted text in the format: iv:authTag:encryptedData
 * @returns {string} - The decrypted plain text.
 */
function decrypt(hash) {
    if (!hash) return hash;
    if (!ENCRYPTION_KEY) return hash;

    // Check if it's actually encrypted (contains the expected separators)
    const parts = hash.split(':');
    if (parts.length !== 3) {
        return hash; // Probably unencrypted legacy data
    }

    try {
        const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
        if (keyBuffer.length !== 32) {
            throw new Error('Invalid encryption key length. Key must be 32 bytes (64 hex characters).');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error("Decryption failed:", error.message);
        return hash; // Fail safe by returning raw data (which might just be the encrypted string)
    }
}

module.exports = {
    encrypt,
    decrypt
};
