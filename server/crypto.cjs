const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load development.env if it exists (for local development keys)
const devEnvPath = path.resolve(__dirname, 'development.env');
if (fs.existsSync(devEnvPath)) {
    dotenv.config({ path: devEnvPath });
}

const ALGORITHM = 'aes-256-gcm';

/**
 * Fetches DB_ENCRYPTION_KEY string on-demand without keeping persistent plaintext in global cache.
 */
async function fetchRawKey() {
    if (process.env.DB_ENCRYPTION_KEY) {
        return process.env.DB_ENCRYPTION_KEY;
    }

    // Try fetching from AWS Secrets Manager / KMS dynamically
    try {
        const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
        const region = process.env.AWS_REGION || 'ap-northeast-1';
        const client = new SecretsManagerClient({ region });
        
        const secretNames = ['macosui/production/db-encryption-key', 'DB_ENCRYPTION_KEY'];
        for (const name of secretNames) {
            try {
                const command = new GetSecretValueCommand({ SecretId: name });
                const response = await client.send(command);
                if (response.SecretString) {
                    let fetchedKey = null;
                    try {
                        const parsed = JSON.parse(response.SecretString);
                        fetchedKey = parsed.DB_ENCRYPTION_KEY || parsed.db_encryption_key || response.SecretString;
                    } catch (e) {
                        fetchedKey = response.SecretString.trim();
                    }
                    if (fetchedKey) {
                        return fetchedKey;
                    }
                }
            } catch (err) {
                // Secret name not found, try next
            }
        }
    } catch (sdkErr) {
        // SDK not available or non-AWS environment
    }

    return null;
}

/**
 * Encrypts a plain text string using an ephemeral key Buffer, immediately zeroizing the Buffer memory afterwards.
 * @param {string} text - The text to encrypt.
 * @returns {Promise<string>} - The encrypted text in the format: iv:authTag:encryptedData
 */
async function encryptAsync(text) {
    if (!text) return text;
    const rawKey = await fetchRawKey();
    if (!rawKey) return text;

    let keyBuffer = null;
    try {
        keyBuffer = Buffer.from(rawKey, 'hex');
        if (keyBuffer.length !== 32) {
            keyBuffer = crypto.createHash('sha256').update(rawKey).digest();
        }

        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error("Encryption failed:", error.message);
        return text;
    } finally {
        // ✨ Zeroization: Wipes keyBuffer memory immediately after use
        if (keyBuffer && Buffer.isBuffer(keyBuffer)) {
            keyBuffer.fill(0);
        }
    }
}

/**
 * Decrypts an encrypted string using an ephemeral key Buffer, immediately zeroizing the Buffer memory afterwards.
 * @param {string} hash - The encrypted text in the format: iv:authTag:encryptedData
 * @returns {Promise<string>} - The decrypted plain text.
 */
async function decryptAsync(hash) {
    if (!hash) return hash;
    const parts = hash.split(':');
    if (parts.length !== 3) {
        return hash; // Probably unencrypted legacy data
    }

    const rawKey = await fetchRawKey();
    if (!rawKey) return hash;

    let keyBuffer = null;
    try {
        keyBuffer = Buffer.from(rawKey, 'hex');
        if (keyBuffer.length !== 32) {
            keyBuffer = crypto.createHash('sha256').update(rawKey).digest();
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
        return hash;
    } finally {
        // ✨ Zeroization: Wipes keyBuffer memory immediately after use
        if (keyBuffer && Buffer.isBuffer(keyBuffer)) {
            keyBuffer.fill(0);
        }
    }
}

/**
 * Synchronous encrypt fallback for existing callers with immediate Zeroization.
 */
function encrypt(text) {
    if (!text) return text;
    const rawKey = process.env.DB_ENCRYPTION_KEY;
    if (!rawKey) return text;

    let keyBuffer = null;
    try {
        keyBuffer = Buffer.from(rawKey, 'hex');
        if (keyBuffer.length !== 32) {
            keyBuffer = crypto.createHash('sha256').update(rawKey).digest();
        }

        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error("Encryption failed:", error.message);
        return text;
    } finally {
        if (keyBuffer && Buffer.isBuffer(keyBuffer)) {
            keyBuffer.fill(0);
        }
    }
}

/**
 * Synchronous decrypt fallback for existing callers with immediate Zeroization.
 */
function decrypt(hash) {
    if (!hash) return hash;
    const parts = hash.split(':');
    if (parts.length !== 3) {
        return hash;
    }

    const rawKey = process.env.DB_ENCRYPTION_KEY;
    if (!rawKey) return hash;

    let keyBuffer = null;
    try {
        keyBuffer = Buffer.from(rawKey, 'hex');
        if (keyBuffer.length !== 32) {
            keyBuffer = crypto.createHash('sha256').update(rawKey).digest();
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
        return hash;
    } finally {
        if (keyBuffer && Buffer.isBuffer(keyBuffer)) {
            keyBuffer.fill(0);
        }
    }
}

module.exports = {
    fetchRawKey,
    encryptAsync,
    decryptAsync,
    encrypt,
    decrypt
};
