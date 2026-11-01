/**
 * server/services/gemini/geminiClient.js
 * Centralized, production-grade Google Gemini client using the official @google/genai SDK.
 * Features bounded retries, timeout enforcement, schema validation, safe error classification,
 * request usage metrics, and strict secret redaction.
 */

'use strict';

const { GoogleGenAI } = require('@google/genai');
const { getGeminiConfig, validateGeminiConfig } = require('../../config/geminiConfig');
const { 
  ERROR_CODES, 
  GeminiError, 
  parseAndValidateResponse, 
  classifyGeminiError 
} = require('./responseValidator');
const { sanitizePromptInput, SYSTEM_INSTRUCTION_STRUCTURED_JSON } = require('./prompts');

class GeminiClientService {
  constructor(config = null) {
    const rawConfig = config || getGeminiConfig();
    const validation = validateGeminiConfig(rawConfig);

    if (!validation.isValid) {
      console.warn('[Gemini] Invalid configuration provided:', validation.errors.join('; '));
      this.config = {
        ...rawConfig,
        enabled: false,
        isConfigured: () => false,
        getSanitized: () => ({
          enabled: false,
          isConfigured: false,
          keyStatus: '[INVALID CONFIGURATION]',
          errors: validation.errors
        })
      };
      this.ai = null;
      this.configErrors = validation.errors;
      return;
    }

    this.config = rawConfig;
    this.ai = null;
    this.configErrors = [];
    this._initializeClient();
  }

  /**
   * Initializes the underlying GoogleGenAI client if configured and enabled.
   * Never throws on startup; logs clean status without leaking credentials.
   * @private
   */
  _initializeClient() {
    if (this.config.enabled && this.config.apiKey && this.configErrors.length === 0) {
      try {
        this.ai = new GoogleGenAI({
          apiKey: this.config.apiKey,
          httpOptions: { timeout: this.config.timeoutMs }
        });
      } catch (err) {
        console.error('[Gemini] Client initialization error:', err.message);
        this.ai = null;
      }
    } else {
      this.ai = null;
    }
  }

  /**
   * Refreshes client configuration from environment.
   */
  reloadConfig() {
    const rawConfig = getGeminiConfig();
    const validation = validateGeminiConfig(rawConfig);

    if (!validation.isValid) {
      this.configErrors = validation.errors;
      this.ai = null;
      this.config = {
        ...rawConfig,
        enabled: false,
        isConfigured: () => false,
        getSanitized: () => ({
          enabled: false,
          isConfigured: false,
          keyStatus: '[INVALID CONFIGURATION]',
          errors: validation.errors
        })
      };
      return this.config.getSanitized();
    }

    this.config = rawConfig;
    this.configErrors = [];
    this._initializeClient();
    return this.config.getSanitized();
  }

  /**
   * Checks whether Gemini is configured, enabled, and ready for queries.
   * @returns {boolean}
   */
  isAvailable() {
    return Boolean(
      this.config &&
      this.config.enabled &&
      this.config.apiKey &&
      this.ai &&
      (!this.configErrors || this.configErrors.length === 0)
    );
  }

  /**
   * Returns sanitized diagnostic information safe for health endpoints.
   */
  getDiagnostics() {
    return {
      available: this.isAvailable(),
      ...this.config.getSanitized(),
      hasConfigErrors: this.configErrors.length > 0,
      configErrors: this.configErrors
    };
  }

  /**
   * Returns the configured model identifier.
   * @returns {string}
   */
  getModel() {
    return this.config?.model || 'gemini-2.5-flash';
  }

  /**
   * Generates a validated, structured JSON response from Gemini.
   * Enforces configurable timeout, bounded retries on transient errors,
   * schema validation, and usage metric extraction.
   *
   * @param {Object} options
   * @param {string} options.prompt - Prompt text for the model
   * @param {string} [options.systemInstruction] - Optional system instruction
   * @param {Array<Object>} [options.images] - Optional inline images [{ data: base64, mimeType: string }]
   * @param {Function} [options.schemaValidator] - Optional callback (json) => { isValid: boolean, error?: string }
   * @param {Object} [options.responseSchema] - Optional JSON schema object passed directly to Gemini config
   * @param {string} [options.model] - Override model (defaults to configured Flash model)
   * @param {number} [options.temperature=0.2] - Sampling temperature (low for deterministic JSON)
   * @param {number} [options.maxOutputTokens] - Token ceiling override
   * @returns {Promise<{ data: Object, usage: Object, model: string, durationMs: number }>}
   */
  async generateStructuredResponse({
    prompt,
    systemInstruction = SYSTEM_INSTRUCTION_STRUCTURED_JSON,
    images = [],
    schemaValidator = null,
    responseSchema = null,
    model = null,
    temperature = 0.2,
    maxOutputTokens = null
  }) {
    if (!this.isAvailable()) {
      const reason = this.configErrors.length > 0
        ? `invalid configuration: ${this.configErrors.join('; ')}`
        : 'service is disabled or unconfigured';
      throw new GeminiError(
        `Gemini AI service is currently unavailable (${reason}).`,
        ERROR_CODES.UNAVAILABLE,
        null,
        false
      );
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new GeminiError(
        'Prompt is required and must be a non-empty string.',
        ERROR_CODES.INVALID_REQUEST,
        null,
        false
      );
    }

    const targetModel = model || this.config.model;
    const tokenLimit = maxOutputTokens || this.config.maxOutputTokens;
    const timeoutMs = this.config.timeoutMs;
    const maxRetries = this.config.maxRetries;

    const sanitizedPrompt = sanitizePromptInput(prompt);

    // Build multimodal contents array
    const contents = [sanitizedPrompt];
    if (Array.isArray(images)) {
      for (const img of images) {
        if (img && img.data && img.mimeType) {
          const rawBase64 = img.data.includes(',') ? img.data.split(',')[1] : img.data;
          contents.push({
            inlineData: {
              data: rawBase64,
              mimeType: img.mimeType
            }
          });
        }
      }
    }

    const genConfig = {
      responseMimeType: 'application/json',
      temperature,
      maxOutputTokens: tokenLimit
    };

    if (systemInstruction) {
      genConfig.systemInstruction = systemInstruction;
    }

    if (responseSchema) {
      genConfig.responseSchema = responseSchema;
    }

    let lastError = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 300ms, 600ms, 1200ms...
          const backoffMs = 300 * Math.pow(2, attempt - 1);
          await new Promise(res => setTimeout(res, backoffMs));
        }

        // Execute API call wrapped in strict wall-clock timeout
        const response = await this._executeWithTimeout(
          () => this.ai.models.generateContent({
            model: targetModel,
            contents,
            config: genConfig
          }),
          timeoutMs
        );

        const durationMs = Date.now() - startTime;

        // Extract raw text safely (handles both getter property and method call)
        let rawText = '';
        if (response) {
          if (typeof response.text === 'function') {
            rawText = response.text();
          } else if (typeof response.text === 'string') {
            rawText = response.text;
          }
        }

        // Validate and parse JSON
        const validatedData = parseAndValidateResponse(rawText, schemaValidator);

        // Extract usage metadata if present
        const usage = {
          promptTokens: response.usageMetadata?.promptTokenCount || null,
          candidateTokens: response.usageMetadata?.candidatesTokenCount || null,
          totalTokens: response.usageMetadata?.totalTokenCount || null
        };

        // Redacted operational log (never logs API keys, prompts, or complaint content)
        console.log(`[Gemini] model=${targetModel} attempt=${attempt + 1} duration=${durationMs}ms tokens=${usage.totalTokens || 'n/a'}`);

        return {
          data: validatedData,
          usage,
          model: targetModel,
          durationMs
        };

      } catch (err) {
        const classified = classifyGeminiError(err);
        lastError = classified;

        // If error is not retryable (e.g. auth, schema, invalid request), fail immediately
        if (!classified.isRetryable || attempt >= maxRetries) {
          throw classified;
        }

        console.warn(`[Gemini] Retryable failure (attempt ${attempt + 1}/${maxRetries + 1}): ${classified.message}`);
      }
    }

    throw lastError || new GeminiError('Gemini request failed after all retry attempts.', ERROR_CODES.UNKNOWN);
  }

  /**
   * Executes a promise generator with a strict wall-clock timeout.
   * @private
   */
  async _executeWithTimeout(fn, timeoutMs) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new GeminiError(`Operation timed out after ${timeoutMs}ms`, ERROR_CODES.TIMEOUT, null, true));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
}

// Singleton client instance
let defaultClient = null;

const getGeminiClient = () => {
  if (!defaultClient) {
    defaultClient = new GeminiClientService();
  }
  return defaultClient;
};

module.exports = {
  GeminiClientService,
  getGeminiClient
};
