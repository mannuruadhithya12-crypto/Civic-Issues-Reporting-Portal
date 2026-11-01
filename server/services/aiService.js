/**
 * server/services/aiService.js
 * High-level AI services adapter integrated with centralized GeminiClientService.
 * Replaces legacy unvalidated SDK calls with robust structured generation,
 * bounded retries, timeout protection, and graceful degradation.
 */

'use strict';

const { getGeminiClient } = require('./gemini/geminiClient');
const { sanitizePromptInput, CIVIC_TAXONOMY } = require('./gemini/prompts');

/**
 * Checks whether the underlying Gemini service is ready and operational.
 * @returns {boolean}
 */
const isAvailable = () => {
  return getGeminiClient().isAvailable();
};

/**
 * Multimodal image analysis for civic reports.
 * Uses official @google/genai structured generation with schema validation.
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} [mimeType='image/jpeg'] - Image MIME type
 * @returns {Promise<{ available: boolean, data?: Object, usage?: Object, message?: string }>}
 */
const analyzeImage = async (base64Image, mimeType = 'image/jpeg') => {
  const client = getGeminiClient();
  if (!client.isAvailable()) {
    return { available: false, message: "AI analysis is currently unavailable." };
  }

  try {
    const prompt = `You are a civic issue reporting assistant. 
Analyze this image of a civic issue.
Provide a JSON response with exactly this structure:
{
  "category": { "value": "<one of: Potholes, Garbage overflow, Streetlight failures, Water leakage, Illegal parking, Drainage issues, Broken footpaths, Noise pollution, Sewage problems, Public safety issues, Other>", "confidence": <number 0-1> },
  "severity": { "value": "<one of: low, normal, high, urgent>", "confidence": <number 0-1> },
  "summary": "<a one sentence description of the problem>"
}`;

    const result = await client.generateStructuredResponse({
      prompt,
      images: [{ data: base64Image, mimeType }],
      schemaValidator: (data) => ({
        isValid: Boolean(data && data.category && data.severity && data.summary),
        error: 'Missing required civic classification properties (category, severity, summary)'
      }),
      temperature: 0.1
    });

    return { 
      available: true, 
      data: result.data, 
      usage: result.usage 
    };
  } catch (error) {
    console.error("AI analyzeImage error:", error.message || error);
    return { available: false, message: "Error analyzing image with AI." };
  }
};

/**
 * Professional description rewriter for citizen tickets.
 * @param {string} textInput - Raw citizen report text
 * @returns {Promise<{ available: boolean, data?: Object, usage?: Object, message?: string }>}
 */
const improveDescription = async (textInput) => {
  const client = getGeminiClient();
  if (!client.isAvailable()) {
    return { available: false, message: "AI analysis is currently unavailable." };
  }

  try {
    const sanitized = sanitizePromptInput(textInput, 1500);
    const prompt = `You are a civic reporting assistant. Rewrite this user's description of a civic issue to be structured, concise, and professional, suitable for a government ticketing system. Do NOT add fictional details (like exact addresses or names) that are not in the original text.

Original text: "${sanitized}"

Provide a JSON response with exactly this structure:
{
  "improvedDescription": "<improved text>"
}`;

    const result = await client.generateStructuredResponse({
      prompt,
      schemaValidator: (data) => ({
        isValid: Boolean(data && typeof data.improvedDescription === 'string' && data.improvedDescription.length > 0),
        error: 'Missing or empty improvedDescription string'
      }),
      temperature: 0.2
    });

    return { 
      available: true, 
      data: result.data, 
      usage: result.usage 
    };
  } catch (error) {
    console.error("AI improveDescription error:", error.message || error);
    return { available: false, message: "Error improving description with AI." };
  }
};

/**
 * Decision support explainer with deterministic fallback when AI is unavailable or fails.
 * @param {Object} contextData - Context object with priorityScore, priorityLevel, reasons, etc.
 * @returns {Promise<{ available: boolean, explanation: string, usage?: Object }>}
 */
const explainDecision = async (contextData = {}) => {
  const defaultExplanation = `This issue is prioritized as ${contextData.priorityLevel || 'Unknown'} (Score: ${contextData.priorityScore || 0}) due to: ${(contextData.reasons || []).join(', ') || 'No reasons provided'}.`;

  const client = getGeminiClient();
  if (!client.isAvailable()) {
    return {
      available: false,
      explanation: defaultExplanation
    };
  }

  try {
    const sanitizedFacts = sanitizePromptInput(JSON.stringify(contextData, null, 2), 3000);
    const prompt = `You are a Civic Decision Support Assistant. Explain in a short, professional paragraph why the following issue needs attention. 
Do NOT invent any numbers, statistics, or facts. Only use the provided facts.
Do NOT mention "I am an AI" or refer to the fact that you were given JSON.

Context Facts:
${sanitizedFacts}

Respond with valid JSON:
{
  "explanation": "<short paragraph explanation>"
}`;

    const result = await client.generateStructuredResponse({
      prompt,
      schemaValidator: (data) => ({
        isValid: Boolean(data && typeof data.explanation === 'string' && data.explanation.length > 0),
        error: 'Missing explanation property'
      }),
      temperature: 0.2
    });

    return { 
      available: true, 
      explanation: result.data.explanation,
      usage: result.usage
    };
  } catch (error) {
    console.error("AI explainDecision error:", error.message || error);
    return {
      available: false,
      explanation: defaultExplanation
    };
  }
};

module.exports = {
  isAvailable,
  analyzeImage,
  improveDescription,
  explainDecision
};
