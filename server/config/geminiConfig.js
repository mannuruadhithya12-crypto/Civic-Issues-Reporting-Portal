/**
 * server/config/geminiConfig.js
 * Centralized configuration module for Google Gemini API integration.
 * Safely resolves environment variables with fallback defaults and bounds validation.
 */

'use strict';

const parseInteger = (val, defaultVal, min, max) => {
  if (val === undefined || val === null || val === '') return defaultVal;
  const num = parseInt(val, 10);
  if (isNaN(num)) return defaultVal;
  return Math.min(Math.max(num, min), max);
};

// Default Flash model identifier (fast, economical, multimodal for civic workloads)
const DEFAULT_FLASH_MODEL = 'gemini-1.5-flash';

/**
 * Validates a Gemini configuration object or options against operational constraints.
 * @param {Object} config - Configuration object to validate
 * @returns {{ isValid: boolean, errors: string[] }}
 */
const validateGeminiConfig = (config) => {
  const errors = [];
  if (!config || typeof config !== 'object') {
    return { isValid: false, errors: ['Configuration must be a non-null object'] };
  }

  if (config.timeoutMs !== undefined) {
    const t = Number(config.timeoutMs);
    if (typeof config.timeoutMs !== 'number' || isNaN(t) || t < 500 || t > 120000) {
      errors.push(`timeoutMs must be a number between 500 and 120000 ms (received: ${config.timeoutMs})`);
    }
  }

  if (config.maxRetries !== undefined) {
    const r = Number(config.maxRetries);
    if (typeof config.maxRetries !== 'number' || isNaN(r) || r < 0 || r > 10) {
      errors.push(`maxRetries must be an integer between 0 and 10 (received: ${config.maxRetries})`);
    }
  }

  if (config.maxOutputTokens !== undefined) {
    const o = Number(config.maxOutputTokens);
    if (typeof config.maxOutputTokens !== 'number' || isNaN(o) || o < 128 || o > 16384) {
      errors.push(`maxOutputTokens must be an integer between 128 and 16384 (received: ${config.maxOutputTokens})`);
    }
  }

  if (config.model !== undefined) {
    if (typeof config.model !== 'string' || config.model.trim().length === 0) {
      errors.push('model must be a non-empty string');
    }
  }

  if (config.apiKey !== undefined && config.apiKey !== null) {
    if (typeof config.apiKey !== 'string') {
      errors.push('apiKey must be a string');
    }
  }

  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const getGeminiConfig = () => {
  const rawKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '';
  const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';

  const explicitEnabled = process.env.GEMINI_ENABLED;
  // If explicitly 'false', disabled. If explicitly 'true', enabled only if apiKey is present.
  // If undefined, enabled if apiKey is present.
  const isExplicitlyDisabled = explicitEnabled === 'false';
  const isExplicitlyEnabled = explicitEnabled === 'true';
  const enabled = isExplicitlyDisabled ? false : (isExplicitlyEnabled ? Boolean(apiKey) : Boolean(apiKey));

  const model = (process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim()) || DEFAULT_FLASH_MODEL;
  const timeoutMs = parseInteger(process.env.GEMINI_TIMEOUT_MS, 15000, 1000, 60000);
  const maxRetries = parseInteger(process.env.GEMINI_MAX_RETRIES, 2, 0, 5);
  const maxOutputTokens = parseInteger(process.env.GEMINI_MAX_OUTPUT_TOKENS, 2048, 128, 8192);

  return {
    apiKey,
    model,
    enabled,
    timeoutMs,
    maxRetries,
    maxOutputTokens,
    defaultModel: DEFAULT_FLASH_MODEL,
    isConfigured: () => Boolean(apiKey),
    
    /**
     * Returns sanitized configuration safe for logging and health checks.
     * Guaranteed never to leak raw API key.
     */
    getSanitized: () => ({
      enabled,
      isConfigured: Boolean(apiKey),
      keyStatus: apiKey ? (apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : '[CONFIGURED]') : '[NOT CONFIGURED]',
      model,
      timeoutMs,
      maxRetries,
      maxOutputTokens
    })
  };
};

module.exports = {
  getGeminiConfig,
  validateGeminiConfig,
  DEFAULT_FLASH_MODEL
};
