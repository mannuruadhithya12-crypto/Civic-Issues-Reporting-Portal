/**
 * server/services/gemini/geminiDiagnostics.js
 * Health, diagnostic, and smoke-testing service for the Gemini integration.
 * Safely evaluates operational status without leaking credentials.
 */

'use strict';

const { getGeminiClient } = require('./geminiClient');
const { getGeminiConfig } = require('../../config/geminiConfig');

/**
 * Evaluates current Gemini service status without triggering paid/network calls.
 * @returns {Object} Static diagnostic summary
 */
const getStaticDiagnostics = () => {
  const client = getGeminiClient();
  const config = getGeminiConfig();

  const isConfigured = config.isConfigured();
  const isEnabled = config.enabled;
  const isAvailable = client.isAvailable();
  const hasConfigErrors = Boolean(client.configErrors && client.configErrors.length > 0);

  let status = 'DISABLED';
  if (hasConfigErrors) {
    status = 'INVALID_CONFIGURATION';
  } else if (isEnabled && isAvailable) {
    status = 'READY';
  } else if (isConfigured && !isEnabled) {
    status = 'CONFIGURED_BUT_DISABLED';
  } else if (!isConfigured) {
    status = 'NOT_CONFIGURED';
  }

  return {
    status,
    available: isAvailable,
    model: config.model,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    maxOutputTokens: config.maxOutputTokens,
    keyConfigured: isConfigured,
    // Redacted key fingerprint
    keyFingerprint: config.getSanitized().keyStatus,
    configErrors: client.configErrors || [],
    timestamp: new Date().toISOString()
  };
};

/**
 * Performs an active smoke test against the configured Gemini model.
 * Verifies live network connectivity, API key validity, and JSON response parsing.
 * @param {Object} [options]
 * @param {string} [options.model] - Optional model override
 * @returns {Promise<{ success: boolean, status: string, durationMs?: number, model?: string, error?: string }>}
 */
const performSmokeTest = async (options = {}) => {
  const client = getGeminiClient();
  const startTime = Date.now();

  if (!client.isAvailable()) {
    const staticDiag = getStaticDiagnostics();
    return {
      success: false,
      status: staticDiag.status,
      error: 'Gemini client is not enabled or API credentials are not configured.',
      durationMs: 0
    };
  }

  try {
    const testPrompt = 'Respond with a simple health check JSON object with key "status" set to "healthy" and "timestamp" containing the current ISO date.';
    
    const result = await client.generateStructuredResponse({
      prompt: testPrompt,
      systemInstruction: 'Respond only with valid JSON: {"status": "healthy", "timestamp": "<ISO>"}',
      schemaValidator: (data) => ({
        isValid: data && typeof data === 'object' && (data.status === 'healthy' || typeof data.status === 'string'),
        error: 'Missing expected status property'
      }),
      model: options.model,
      temperature: 0.0,
      maxOutputTokens: 256
    });

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      status: 'HEALTHY',
      model: result.model,
      durationMs,
      data: result.data,
      usage: result.usage
    };

  } catch (err) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      status: err.code || 'ERROR',
      error: err.message,
      isRetryable: Boolean(err.isRetryable),
      durationMs
    };
  }
};

module.exports = {
  getStaticDiagnostics,
  performSmokeTest
};
