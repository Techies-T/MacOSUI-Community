const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load development.env if it exists (for local development keys)
const devEnvPath = path.resolve(__dirname, 'development.env');
if (fs.existsSync(devEnvPath)) {
    dotenv.config({ path: devEnvPath });
}

let cachedKey = null;
let isKmsAttempted = false;

/**
 * Fetches DB_ENCRYPTION_KEY dynamically from AWS KMS / Secrets Manager, Process Env, or Local Dev Env.
 */
async function getKey() {
    if (cachedKey) return cachedKey;
    if (process.env.DB_ENCRYPTION_KEY) {
        cachedKey = process.env.DB_ENCRYPTION_KEY;
        return cachedKey;
    }

    // Try fetching from AWS Secrets Manager / KMS if not yet attempted
    if (!isKmsAttempted) {
        isKmsAttempted = true;
        try {
            const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
            const region = process.env.AWS_REGION || 'ap-northeast-1';
            const client = new SecretsManagerClient({ region });
            
            // Try known secret names
            const secretNames = ['macosui/production/db-encryption-key', 'DB_ENCRYPTION_KEY'];
            for (const name of secretNames) {
                try {
                    const command = new GetSecretValueCommand({ SecretId: name });
                    const response = await client.send(command);
                    if (response.SecretString) {
                        try {
                            const parsed = JSON.parse(response.SecretString);
                            cachedKey = parsed.DB_ENCRYPTION_KEY || parsed.db_encryption_key || response.SecretString;
                        } catch (e) {
                            cachedKey = response.SecretString.trim();
                        }
                        if (cachedKey) {
                            console.log(`[Security] DB_ENCRYPTION_KEY successfully retrieved from AWS KMS / Secrets Manager (${name}).`);
                            process.env.DB_ENCRYPTION_KEY = cachedKey;
                            return cachedKey;
                        }
                    }
                } catch (err) {
                    // Secret name not found, try next
                }
            }
        } catch (sdkErr) {
            console.log("[Security Note] AWS Secrets Manager SDK not available or KMS key not fetched, relying on local env.");
        }
    }

    return process.env.DB_ENCRYPTION_KEY || null;
}

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a plain text string using the DB_ENCRYPTION_KEY.
 * @param {string} text - The text to encrypt.
 * @returns {string} - The encrypted text in the format: iv:authTag:encryptedData
 */
function encrypt(text) {
    if (!text) return text;
    const currentKey = cachedKey || process.env.DB_ENCRYPTION_KEY;
    if (!currentKey) return text;

    try {
        let keyBuffer = Buffer.from(currentKey, 'hex');
        if (keyBuffer.length !== 32) {
            keyBuffer = crypto.createHash('sha256').update(currentKey).digest();
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
    }
}

/**
 * Decrypts an encrypted string using the DB_ENCRYPTION_KEY.
 * @param {string} hash - The encrypted text in the format: iv:authTag:encryptedData
 * @returns {string} - The decrypted plain text.
 */
function decrypt(hash) {
    if (!hash) return hash;
    const currentKey = cachedKey || process.env.DB_ENCRYPTION_KEY;
    if (!currentKey) return hash;

    const parts = hash.split(':');
    if (parts.length !== 3) {
        return hash; // Probably unencrypted legacy data
    }

    try {
        let keyBuffer = Buffer.from(currentKey, 'hex');
        if (keyBuffer.length !== 32) {
            keyBuffer = crypto.createHash('sha256').update(currentKey).digest();
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
    }
}

// Initial async key load on module import
getKey().catch(err => console.error("Async KMS key init error:", err));

module.exports = {
    getKey,
    encrypt,
    decrypt
};
