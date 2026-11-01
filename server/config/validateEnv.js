/**
 * Environment Variable Validation Module
 * Enforces production readiness and validates required configuration at server startup.
 */

function validateEnv() {
  const errors = [];
  const warnings = [];

  const env = process.env.NODE_ENV || 'development';

  // 1. JWT_SECRET
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is missing. Authentication cannot function securely without a secret key.');
  } else if (env === 'production') {
    if (process.env.JWT_SECRET === 'SECRET123' || process.env.JWT_SECRET === 'your_jwt_secret') {
      errors.push('JWT_SECRET uses an insecure default development secret in production.');
    }
    if (process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET is shorter than 32 characters in production. Consider using a 256-bit cryptographically secure key.');
    }
  }

  // 2. MONGO_URI
  if (!process.env.MONGO_URI && !process.env.FORCE_MEMORY_DB && env === 'production') {
    errors.push('MONGO_URI is required for production deployments.');
  }

  // 3. PORT
  const port = process.env.PORT || 5000;
  const portNum = Number(port);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    errors.push(`Invalid PORT configuration: "${port}". Must be an integer between 1 and 65535.`);
  }

  // 4. ENABLE_DEMO_MODE
  if (process.env.ENABLE_DEMO_MODE && !['true', 'false'].includes(process.env.ENABLE_DEMO_MODE)) {
    warnings.push(`ENABLE_DEMO_MODE should be explicitly 'true' or 'false' (received '${process.env.ENABLE_DEMO_MODE}').`);
  }

  // 5. CORS_ORIGIN in production
  if (env === 'production') {
    if (!process.env.CORS_ORIGIN) {
      warnings.push('CORS_ORIGIN is not specified in production; defaulting to localhost origins.');
    } else if (process.env.CORS_ORIGIN === '*') {
      warnings.push('CORS_ORIGIN is set to wildcard "*" in production. Restrict to specific frontend origins to protect user sessions.');
    }
  }

  // 6. GEMINI CONFIGURATION
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY);
  if (process.env.GEMINI_ENABLED && !['true', 'false'].includes(process.env.GEMINI_ENABLED)) {
    warnings.push(`GEMINI_ENABLED should be explicitly 'true' or 'false' (received '${process.env.GEMINI_ENABLED}').`);
  }
  if (process.env.GEMINI_ENABLED === 'true' && !hasGeminiKey) {
    warnings.push('GEMINI_ENABLED is "true" but GEMINI_API_KEY is not configured. Gemini features will remain gracefully disabled.');
  }

  if (process.env.GEMINI_TIMEOUT_MS) {
    const t = Number(process.env.GEMINI_TIMEOUT_MS);
    if (isNaN(t) || t < 500 || t > 120000) {
      warnings.push(`GEMINI_TIMEOUT_MS ("${process.env.GEMINI_TIMEOUT_MS}") should be an integer between 500 and 120000 ms.`);
    }
  }

  if (process.env.GEMINI_MAX_RETRIES) {
    const r = Number(process.env.GEMINI_MAX_RETRIES);
    if (isNaN(r) || r < 0 || r > 10) {
      warnings.push(`GEMINI_MAX_RETRIES ("${process.env.GEMINI_MAX_RETRIES}") should be an integer between 0 and 10.`);
    }
  }

  if (process.env.GEMINI_MAX_OUTPUT_TOKENS) {
    const o = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS);
    if (isNaN(o) || o < 128 || o > 16384) {
      warnings.push(`GEMINI_MAX_OUTPUT_TOKENS ("${process.env.GEMINI_MAX_OUTPUT_TOKENS}") should be an integer between 128 and 16384.`);
    }
  }

  if (process.env.GEMINI_MODEL !== undefined && process.env.GEMINI_MODEL.trim() === '') {
    warnings.push('GEMINI_MODEL is set but contains empty whitespace.');
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(e => console.error(`   - ${e}`));
    if (env === 'production') {
      throw new Error(`Environment validation failed with ${errors.length} error(s).`);
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Environment validation warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    environment: env,
    port: portNum
  };
}

module.exports = { validateEnv };
