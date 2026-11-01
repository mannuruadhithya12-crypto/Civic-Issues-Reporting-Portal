/**
 * server/services/gemini/prompts/index.js
 * Centralized registry of system prompts, schema directives, and prompt sanitizers for Gemini.
 */

'use strict';

/**
 * Sanitizes user input before embedding into prompts to prevent prompt injection
 * and formatting corruption.
 * @param {string} text - Raw input string
 * @param {number} maxLen - Maximum character length (default 2000)
 * @returns {string} Sanitized string
 */
const sanitizePromptInput = (text, maxLen = 2000) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Strip ASCII control characters
    .trim()
    .slice(0, maxLen);
};

/**
 * System instruction enforcing deterministic structured output without conversational preambles.
 */
const SYSTEM_INSTRUCTION_STRUCTURED_JSON = 
  'You are an expert civic intelligence AI supporting municipal services and citizen issue management. ' +
  'Always respond with strictly valid JSON matching the requested schema. ' +
  'Do not include markdown code block ticks, introductory remarks, or conversational filler.';

/**
 * Core civic departments taxonomy to ensure AI categorizations align with municipal structure.
 */
const CIVIC_TAXONOMY = {
  departments: [
    'Roads & Infrastructure',
    'Waste Management & Sanitation',
    'Water Supply & Drainage',
    'Electrical & Street Lighting',
    'Parks & Recreation',
    'Public Health & Safety',
    'Other'
  ],
  severities: ['low', 'normal', 'high', 'urgent']
};

module.exports = {
  sanitizePromptInput,
  SYSTEM_INSTRUCTION_STRUCTURED_JSON,
  CIVIC_TAXONOMY
};
