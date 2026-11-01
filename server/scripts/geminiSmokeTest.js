/**
 * server/scripts/geminiSmokeTest.js
 * Standalone operational smoke test utility for Google Gemini API integration.
 * Performs end-to-end connectivity check, model response validation, and token usage reporting.
 * Never prints raw API keys or sensitive complaint text.
 *
 * Usage:
 *   node scripts/geminiSmokeTest.js
 *   npm run test:gemini:smoke
 */

'use strict';

require('dotenv').config();
const { getStaticDiagnostics, performSmokeTest } = require('../services/gemini/geminiDiagnostics');
const { getGeminiConfig } = require('../config/geminiConfig');

async function runSmokeTest() {
  console.log('======================================================================');
  console.log('  CIVICCONNECT: GEMINI FOUNDATION OPERATIONAL SMOKE TEST              ');
  console.log('======================================================================\n');

  const staticDiag = getStaticDiagnostics();
  console.log('1. Static Diagnostics:');
  console.log(`   - Status:           ${staticDiag.status}`);
  console.log(`   - Available:        ${staticDiag.available ? 'YES' : 'NO'}`);
  console.log(`   - Model:            ${staticDiag.model}`);
  console.log(`   - Key Fingerprint:  ${staticDiag.keyFingerprint}`);
  console.log(`   - Timeout:          ${staticDiag.timeoutMs}ms`);
  console.log(`   - Max Retries:      ${staticDiag.maxRetries}`);
  console.log(`   - Max Output Tokens:${staticDiag.maxOutputTokens}`);

  if (staticDiag.configErrors && staticDiag.configErrors.length > 0) {
    console.error('\n❌ Configuration Errors Detected:');
    staticDiag.configErrors.forEach(err => console.error(`   - ${err}`));
    process.exitCode = 1;
    return;
  }

  if (!staticDiag.available) {
    console.log('\nℹ️  Gemini is currently unconfigured or disabled.');
    console.log('   To enable: set GEMINI_API_KEY and ensure GEMINI_ENABLED=true in server/.env');
    console.log('   The CivicConnect application will run normally with AI features gracefully deactivated.');
    console.log('\n======================================================================');
    console.log('  SMOKE TEST RESULT: GRACEFULLY SKIPPED (UNAVAILABLE)');
    console.log('======================================================================');
    process.exitCode = 0;
    return;
  }

  console.log('\n2. Executing Active Model Smoke Test...');
  const result = await performSmokeTest();

  if (result.success) {
    console.log('\n✓ Active Smoke Test PASSED!');
    console.log(`   - Status:      ${result.status}`);
    console.log(`   - Model:       ${result.model}`);
    console.log(`   - Latency:     ${result.durationMs}ms`);
    console.log(`   - Tokens:      Total: ${result.usage?.totalTokens ?? 'n/a'} (Prompt: ${result.usage?.promptTokens ?? 'n/a'}, Candidate: ${result.usage?.candidateTokens ?? 'n/a'})`);
    console.log(`   - Payload:     ${JSON.stringify(result.data)}`);
    console.log('\n======================================================================');
    console.log('  SMOKE TEST RESULT: SUCCESS (HEALTHY)');
    console.log('======================================================================');
    process.exitCode = 0;
  } else {
    console.error('\n✗ Active Smoke Test FAILED:');
    console.error(`   - Status:      ${result.status}`);
    console.error(`   - Error:       ${result.error}`);
    console.error(`   - Retryable:   ${result.isRetryable ? 'YES' : 'NO'}`);
    console.error(`   - Duration:    ${result.durationMs}ms`);
    console.log('\n======================================================================');
    console.log('  SMOKE TEST RESULT: FAILED');
    console.log('======================================================================');
    process.exitCode = 1;
  }
}

runSmokeTest().catch(err => {
  console.error('\nFatal error during Gemini smoke test:', err.message || err);
  process.exitCode = 1;
});
