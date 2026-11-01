/**
 * server/services/gemini/responseValidator.js
 * Robust output extraction, JSON parsing, schema validation, and error classification for Gemini.
 */

'use strict';

/**
 * Standard error codes for Gemini client operations.
 */
const ERROR_CODES = {
  UNAVAILABLE: 'GEMINI_UNAVAILABLE',
  TIMEOUT: 'GEMINI_TIMEOUT',
  AUTH_ERROR: 'GEMINI_AUTH_ERROR',
  RATE_LIMIT: 'GEMINI_RATE_LIMIT',
  INVALID_REQUEST: 'GEMINI_INVALID_REQUEST',
  MODEL_ERROR: 'GEMINI_MODEL_ERROR',
  OUTPUT_PARSE_ERROR: 'GEMINI_OUTPUT_PARSE_ERROR',
  CONFIG_ERROR: 'GEMINI_CONFIG_ERROR',
  UNKNOWN: 'GEMINI_UNKNOWN_ERROR'
};

/**
 * Redacts API keys and sensitive credentials from strings.
 * @param {string} text 
 * @returns {string} Redacted text
 */
const sanitizeErrorMessage = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/key=[a-zA-Z0-9_\-]+/gi, (match) => {
      return match.includes('[REDACTED') ? match : 'key=[REDACTED]';
    })
    .replace(/apiKey[:=]\s*["']?[a-zA-Z0-9_\-]+["']?/gi, 'apiKey:[REDACTED]');
};

/**
 * Custom operational error class for Gemini service failures.
 */
class GeminiError extends Error {
  constructor(message, code = ERROR_CODES.UNKNOWN, originalError = null, isRetryable = false) {
    const cleanMsg = sanitizeErrorMessage(message);
    super(cleanMsg);
    this.name = 'GeminiError';
    this.code = code;
    this.isRetryable = isRetryable;
    this.timestamp = new Date().toISOString();
    if (originalError && originalError.stack) {
      // Retain stack internally with sensitive keys redacted
      this.stack = sanitizeErrorMessage(originalError.stack);
    }
  }
}

/**
 * Cleans markdown formatting, code fences, and extra whitespace from raw LLM text.
 * @param {string} rawText 
 * @returns {string} Cleaned JSON candidate string
 */
const extractJsonCandidate = (rawText) => {
  if (typeof rawText !== 'string') return '';
  let cleaned = rawText.trim();

  // Strip ```json ... ``` or ``` ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  // Find the outermost JSON object or array if text exists before or after
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > startIdx) {
      cleaned = cleaned.substring(startIdx, lastBrace + 1);
    } else {
      throw new GeminiError(
        'Gemini model returned incomplete or truncated JSON (missing closing brace).',
        ERROR_CODES.OUTPUT_PARSE_ERROR,
        null,
        false
      );
    }
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket > startIdx) {
      cleaned = cleaned.substring(startIdx, lastBracket + 1);
    } else {
      throw new GeminiError(
        'Gemini model returned incomplete or truncated JSON (missing closing bracket).',
        ERROR_CODES.OUTPUT_PARSE_ERROR,
        null,
        false
      );
    }
  }

  return cleaned.trim();
};

/**
 * Safely parses and validates JSON against an optional schema validator function.
 * @param {string} rawText - Raw text response from Gemini
 * @param {Function} [schemaValidator] - Optional callback (data) => { isValid: boolean, error?: string }
 * @returns {Object} Parsed and validated data
 * @throws {GeminiError} If parsing fails or schema validation fails
 */
const parseAndValidateResponse = (rawText, schemaValidator = null) => {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new GeminiError(
      'Gemini model returned an empty text response.',
      ERROR_CODES.OUTPUT_PARSE_ERROR,
      null,
      false
    );
  }

  const jsonString = extractJsonCandidate(rawText);
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (parseErr) {
    throw new GeminiError(
      `Failed to parse model output as JSON: ${parseErr.message}`,
      ERROR_CODES.OUTPUT_PARSE_ERROR,
      parseErr,
      false
    );
  }

  if (typeof schemaValidator === 'function') {
    const validationResult = schemaValidator(parsed);
    if (!validationResult || validationResult.isValid === false) {
      const reason = validationResult && validationResult.error ? validationResult.error : 'Schema validation failed';
      throw new GeminiError(
        `Gemini output did not satisfy required schema: ${reason}`,
        ERROR_CODES.OUTPUT_PARSE_ERROR,
        null,
        false
      );
    }
  }

  return parsed;
};

/**
 * Classifies an error from the @google/genai SDK into a structured GeminiError.
 * Ensures API keys and sensitive payload strings are stripped from user-facing errors.
 * @param {Error} error 
 * @returns {GeminiError}
 */
const classifyGeminiError = (error) => {
  if (error instanceof GeminiError) return error;

  const rawMsg = (error && error.message) ? error.message : '';
  const msg = rawMsg.toLowerCase();
  const status = error && (error.status || error.code || (error.response && error.response.status));

  // 1. Timeout / Abort errors
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('deadline') || msg.includes('aborted') || (error && error.name === 'AbortError')) {
    return new GeminiError(
      'Gemini request timed out before completion.',
      ERROR_CODES.TIMEOUT,
      error,
      true
    );
  }

  // 2. Authentication errors
  if (status === 401 || status === 403 || msg.includes('api key not valid') || msg.includes('permission_denied') || msg.includes('unauthenticated')) {
    return new GeminiError(
      'Gemini API authentication failed. Verify that GEMINI_API_KEY is configured with valid permissions.',
      ERROR_CODES.AUTH_ERROR,
      error,
      false
    );
  }

  // 3. Rate limiting / Quota errors
  if (status === 429 || msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('rate limit')) {
    return new GeminiError(
      'Gemini rate limit or quota exceeded. Request can be retried after backoff.',
      ERROR_CODES.RATE_LIMIT,
      error,
      true
    );
  }

  // 4. Bad request / Invalid argument / Content safety filter
  if (status === 400 || msg.includes('invalid_argument') || msg.includes('safety') || msg.includes('blocked')) {
    return new GeminiError(
      'Gemini request was rejected due to invalid arguments or safety filtering.',
      ERROR_CODES.INVALID_REQUEST,
      error,
      false
    );
  }

  // 5. Upstream server errors (500, 503, 504)
  if (status >= 500 || msg.includes('internal') || msg.includes('unavailable') || msg.includes('overloaded')) {
    return new GeminiError(
      'Gemini service temporarily unavailable or overloaded.',
      ERROR_CODES.MODEL_ERROR,
      error,
      true
    );
  }

  // Fallback generic error
  return new GeminiError(
    sanitizeErrorMessage(rawMsg) || 'An unexpected error occurred during Gemini processing.',
    ERROR_CODES.UNKNOWN,
    error,
    false
  );
};

module.exports = {
  ERROR_CODES,
  GeminiError,
  sanitizeErrorMessage,
  extractJsonCandidate,
  parseAndValidateResponse,
  classifyGeminiError
};
