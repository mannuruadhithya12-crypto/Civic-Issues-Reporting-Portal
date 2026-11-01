/**
 * server/test-gemini-foundation.js
 * Comprehensive unit and integration test suite for G1: CivicConnect Gemini Core Foundation.
 * Verifies configuration safety, client behavior, error classification, schema validation,
 * bounded retries, timeout handling, diagnostic hygiene, and safe error rejection.
 */

'use strict';

require('dotenv').config();
const assert = require('assert');
const { getGeminiConfig, validateGeminiConfig, DEFAULT_FLASH_MODEL } = require('./config/geminiConfig');
const { GeminiClientService } = require('./services/gemini/geminiClient');
const { 
  ERROR_CODES, 
  GeminiError, 
  extractJsonCandidate, 
  parseAndValidateResponse, 
  classifyGeminiError,
  sanitizeErrorMessage
} = require('./services/gemini/responseValidator');
const { sanitizePromptInput, SYSTEM_INSTRUCTION_STRUCTURED_JSON, CIVIC_TAXONOMY } = require('./services/gemini/prompts');
const { getStaticDiagnostics, performSmokeTest } = require('./services/gemini/geminiDiagnostics');
const { validateEnv } = require('./config/validateEnv');

let passedTests = 0;
let failedTests = 0;

const recordPass = (name) => {
  passedTests++;
  console.log(`  ✓ PASS: ${name}`);
};

const recordFail = (name, error) => {
  failedTests++;
  console.error(`  ✗ FAIL: ${name}`);
  console.error(`    Details: ${error.message || error}`);
  if (error.stack) console.error(`    Stack: ${error.stack}`);
};

async function runTestSuite() {
  console.log('======================================================================');
  console.log('  CIVICCONNECT: G1 GEMINI CORE FOUNDATION TEST SUITE                  ');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // TEST GROUP 1: Configuration & Secret Sanitization
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Configuration & Secret Sanitization ---');

  try {
    const config = getGeminiConfig();
    assert(config.defaultModel === 'gemini-1.5-flash', 'Default model is gemini-1.5-flash');
    assert(typeof config.timeoutMs === 'number' && config.timeoutMs >= 1000, 'timeoutMs has valid lower bound');
    assert(typeof config.maxRetries === 'number' && config.maxRetries >= 0, 'maxRetries has valid lower bound');
    assert(typeof config.maxOutputTokens === 'number' && config.maxOutputTokens >= 128, 'maxOutputTokens has valid lower bound');

    const sanitized = config.getSanitized();
    assert(sanitized.apiKey === undefined, 'Sanitized config MUST NEVER include raw apiKey');
    assert(typeof sanitized.keyStatus === 'string', 'Sanitized config has keyStatus description');
    if (config.apiKey) {
      assert(!sanitized.keyStatus.includes(config.apiKey), 'keyStatus must not reveal entire raw secret');
    }
    recordPass('Configuration enforces Flash model defaults and masks secrets');
  } catch (err) {
    recordFail('Configuration test failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 2: Safe Rejection of Invalid Configuration
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Safe Rejection of Invalid Configuration ---');

  try {
    // 2.1 Direct validation function
    const invalidConfig = {
      timeoutMs: -500,
      maxRetries: 99,
      maxOutputTokens: 10,
      model: '   ',
      apiKey: 12345
    };
    const validation = validateGeminiConfig(invalidConfig);
    assert(validation.isValid === false, 'Detects invalid configuration parameters');
    assert(validation.errors.length >= 4, `Found multiple validation errors (${validation.errors.length})`);

    // 2.2 Client instantiating with invalid options safely handles it without crashing
    const invalidClient = new GeminiClientService(invalidConfig);
    assert(invalidClient.isAvailable() === false, 'Client is marked unavailable when config is invalid');
    assert(invalidClient.configErrors.length > 0, 'Client stores validation errors safely');
    
    let caughtErr = null;
    try {
      await invalidClient.generateStructuredResponse({ prompt: 'test' });
    } catch (e) {
      caughtErr = e;
    }
    assert(caughtErr !== null, 'Calling generateStructuredResponse with invalid config throws safe error');
    assert(caughtErr.code === ERROR_CODES.UNAVAILABLE, 'Throws UNAVAILABLE error code');
    assert(!caughtErr.message.includes('12345'), 'Does not leak sensitive parameter values');

    recordPass('Backend rejects invalid configuration safely without crashing the process');
  } catch (err) {
    recordFail('Invalid configuration test failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 3: Unconfigured / Disabled State Graceful Degradation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Unconfigured / Disabled State Graceful Degradation ---');

  try {
    // Instantiate isolated client with disabled config
    const disabledClient = new GeminiClientService({
      apiKey: '',
      model: 'gemini-1.5-flash',
      enabled: false,
      timeoutMs: 5000,
      maxRetries: 1,
      maxOutputTokens: 1024,
      getSanitized: () => ({ enabled: false, isConfigured: false, keyStatus: '[NOT CONFIGURED]' })
    });

    assert(disabledClient.isAvailable() === false, 'Client reports isAvailable() === false when disabled');
    
    let caughtErr = null;
    try {
      await disabledClient.generateStructuredResponse({ prompt: 'test' });
    } catch (e) {
      caughtErr = e;
    }

    assert(caughtErr !== null, 'Calling generateStructuredResponse throws when disabled');
    assert(caughtErr.code === ERROR_CODES.UNAVAILABLE, 'Throws GEMINI_UNAVAILABLE code');
    assert(!caughtErr.isRetryable, 'Unavailable error is marked non-retryable');

    // Verify environment validator runs cleanly when Gemini is disabled without key
    const envCheck = validateEnv();
    assert(envCheck.isValid === true, 'Environment validation passes cleanly when Gemini is unconfigured');

    recordPass('Client gracefully handles unconfigured state without process crashes');
  } catch (err) {
    recordFail('Graceful degradation test failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 4: Response Validator & Markdown JSON Extraction
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Response Validator & Markdown JSON Extraction ---');

  try {
    // 4.1 Pure JSON
    const pureJson = '{"category":"Roads","confidence":0.95}';
    assert.deepStrictEqual(extractJsonCandidate(pureJson), pureJson, 'Pure JSON extracts as-is');

    // 4.2 Markdown code block ```json ... ```
    const markdownJson = '```json\n{"category":"Waste","confidence":0.88}\n```';
    assert.deepStrictEqual(extractJsonCandidate(markdownJson), '{"category":"Waste","confidence":0.88}', 'Markdown ```json fences stripped');

    // 4.3 Extraneous conversational text before/after
    const noisyText = 'Here is the analysis:\n\n```json\n{"category":"Water","confidence":0.92}\n```\nHope this helps!';
    assert.deepStrictEqual(extractJsonCandidate(noisyText), '{"category":"Water","confidence":0.92}', 'Noise before and after JSON removed');

    // 4.4 Valid schema validation
    const parsed = parseAndValidateResponse(noisyText, (data) => ({
      isValid: data && data.category === 'Water' && data.confidence > 0.5,
      error: 'Invalid category or low confidence'
    }));
    assert(parsed.category === 'Water', 'Schema validator verified data');

    // 4.5 Schema rejection
    let schemaErr = null;
    try {
      parseAndValidateResponse(noisyText, (data) => ({
        isValid: false,
        error: 'Explicit test rejection'
      }));
    } catch (e) {
      schemaErr = e;
    }
    assert(schemaErr && schemaErr.code === ERROR_CODES.OUTPUT_PARSE_ERROR, 'Fails schema with OUTPUT_PARSE_ERROR');

    // 4.6 Malformed JSON rejection
    let malformedErr = null;
    try {
      parseAndValidateResponse('Not a json at all');
    } catch (e) {
      malformedErr = e;
    }
    assert(malformedErr && malformedErr.code === ERROR_CODES.OUTPUT_PARSE_ERROR, 'Rejects non-JSON with OUTPUT_PARSE_ERROR');

    recordPass('Response parser cleanly extracts and validates JSON across noisy outputs');
  } catch (err) {
    recordFail('Response validator test failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 5: Prompt Sanitization & Taxonomy Integrity
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Prompt Sanitization & Taxonomy Integrity ---');

  try {
    const dirtyInput = 'Dangerous\x00\x08Text\x1F With Null Bytes';
    const clean = sanitizePromptInput(dirtyInput);
    assert(!clean.includes('\x00') && !clean.includes('\x1F'), 'Strips ASCII control characters');
    assert(clean.includes('DangerousText With Null Bytes'), 'Retains clean text');

    // Truncation check
    const longInput = 'A'.repeat(3000);
    const truncated = sanitizePromptInput(longInput, 100);
    assert(truncated.length === 100, 'Truncates text exceeding max length');

    // Civic taxonomy
    assert(Array.isArray(CIVIC_TAXONOMY.departments), 'Departments array exists');
    assert(CIVIC_TAXONOMY.departments.includes('Roads & Infrastructure'), 'Contains Roads department');
    assert(CIVIC_TAXONOMY.severities.includes('urgent'), 'Contains urgent severity');

    recordPass('Prompt sanitization prevents control character injection and enforces length limits');
  } catch (err) {
    recordFail('Prompt sanitization test failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 6: Error Classification & Safety Filtering
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Error Classification & Safety Filtering ---');

  try {
    // 6.1 Timeout
    const timeoutErr = classifyGeminiError(new Error('Operation timed out after 15000ms'));
    assert(timeoutErr.code === ERROR_CODES.TIMEOUT, 'Classifies timeout error');
    assert(timeoutErr.isRetryable === true, 'Timeout is retryable');

    // 6.2 Auth error
    const authErr = classifyGeminiError(new Error('API key not valid. Please pass a valid API key.'));
    assert(authErr.code === ERROR_CODES.AUTH_ERROR, 'Classifies invalid API key error');
    assert(authErr.isRetryable === false, 'Auth error is non-retryable');

    // 6.3 Rate limit / quota
    const quotaErr = classifyGeminiError({ status: 429, message: 'Resource has been exhausted (e.g. check quota).' });
    assert(quotaErr.code === ERROR_CODES.RATE_LIMIT, 'Classifies 429 rate limit error');
    assert(quotaErr.isRetryable === true, 'Rate limit error is retryable');

    // 6.4 Safety block / Bad request
    const safetyErr = classifyGeminiError({ status: 400, message: 'Candidate was blocked due to SAFETY' });
    assert(safetyErr.code === ERROR_CODES.INVALID_REQUEST, 'Classifies safety block');
    assert(safetyErr.isRetryable === false, 'Safety block is non-retryable');

    // 6.5 Upstream server error
    const serverErr = classifyGeminiError({ status: 503, message: 'Service unavailable' });
    assert(serverErr.code === ERROR_CODES.MODEL_ERROR, 'Classifies 503 error');
    assert(serverErr.isRetryable === true, 'Server error is retryable');

    // 6.6 Secret Redaction in Error Messages
    const secretErr1 = new GeminiError('Failed at https://api.google.com?key=AIzaSyD1234567890123456789012345678901');
    assert(!secretErr1.message.includes('AIzaSyD1234567890123456789012345678901'), 'Redacts raw Google API key in URL');
    assert(secretErr1.message.includes('[REDACTED'), 'Replaces key with redacted placeholder');

    const secretErr2 = new GeminiError('API error with apiKey: AIzaSyD9999999999999999999999999999999');
    assert(!secretErr2.message.includes('AIzaSyD9999999999999999999999999999999'), 'Redacts raw key in parameter string');
    assert(secretErr2.message.includes('[REDACTED'), 'Replaces key with redacted placeholder');

    recordPass('Classifies Gemini errors with accurate retryability and zero leaked secrets');
  } catch (err) {
    recordFail('Error classification test failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 7: Mocked Client Execution, Bounded Retries & Usage Metrics
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Mocked Client Execution, Bounded Retries & Usage Metrics ---');

  try {
    let callCount = 0;
    const mockAi = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          callCount++;
          if (callCount === 1) {
            // Simulate transient 503 error on first attempt
            const transientErr = new Error('Model temporarily overloaded');
            transientErr.status = 503;
            throw transientErr;
          }
          // Succeed on second attempt
          return {
            text: () => JSON.stringify({
              category: 'Roads & Infrastructure',
              confidence: 0.98,
              priority: 'high'
            }),
            usageMetadata: {
              promptTokenCount: 142,
              candidatesTokenCount: 38,
              totalTokenCount: 180
            }
          };
        }
      }
    };

    const client = new GeminiClientService({
      apiKey: 'test-mock-key',
      model: 'gemini-1.5-flash',
      enabled: true,
      timeoutMs: 5000,
      maxRetries: 2,
      maxOutputTokens: 2048,
      getSanitized: () => ({ enabled: true, isConfigured: true, keyStatus: '[MOCK_KEY]' })
    });
    // Inject mock ai
    client.ai = mockAi;

    const result = await client.generateStructuredResponse({
      prompt: 'Report of a giant pothole on Main Street',
      schemaValidator: (d) => ({
        isValid: d && d.category && d.confidence > 0.5,
        error: 'Invalid schema'
      })
    });

    assert(callCount === 2, `Retried exactly once after transient 503 (callCount: ${callCount})`);
    assert(result.data.category === 'Roads & Infrastructure', 'Correctly parsed structured data');
    assert(result.usage.totalTokens === 180, 'Extracted usage metadata totalTokens (180)');
    assert(result.usage.promptTokens === 142, 'Extracted promptTokenCount');
    assert(result.usage.candidateTokens === 38, 'Extracted candidatesTokenCount');
    assert(typeof result.durationMs === 'number', 'Calculated request duration');

    recordPass('Client executes bounded retries on transient errors and extracts token usage metadata');
  } catch (err) {
    recordFail('Mocked client execution test failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 8: Diagnostics & Health Service Hygiene
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Diagnostics & Health Service Hygiene ---');

  try {
    const diag = getStaticDiagnostics();
    assert(typeof diag.status === 'string', 'Diagnostics returns status string');
    assert(typeof diag.available === 'boolean', 'Diagnostics returns available boolean');
    assert(diag.apiKey === undefined, 'Static diagnostics NEVER exposes apiKey');
    assert(typeof diag.keyFingerprint === 'string', 'Static diagnostics contains keyFingerprint');

    // Smoke test when unconfigured
    const smokeResult = await performSmokeTest();
    assert(typeof smokeResult.success === 'boolean', 'Smoke test returns boolean success');
    assert(typeof smokeResult.status === 'string', 'Smoke test returns status string');

    // If live credentials are configured in local environment, execute live verification
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_ENABLED === 'true') {
      console.log('  -> Live credentials detected in environment. Running live smoke test...');
      const liveResult = await performSmokeTest();
      assert(typeof liveResult.success === 'boolean', 'Live smoke test returns boolean success');
      console.log(`  -> Live smoke test status: ${liveResult.status} (success=${liveResult.success})`);
    }

    recordPass('Diagnostics service provides sanitized operational metadata');
  } catch (err) {
    recordFail('Diagnostics service test failed', err);
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`  G1 GEMINI FOUNDATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('FATAL ERROR in Gemini test suite:', err);
  process.exit(1);
});
