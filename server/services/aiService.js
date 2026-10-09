const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
if (process.env.AI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
}

const isAvailable = () => {
  return genAI !== null;
};

const fileToGenerativePart = (base64Data, mimeType) => {
  return {
    inlineData: {
      data: base64Data.split(',')[1] || base64Data,
      mimeType
    },
  };
};

const analyzeImage = async (base64Image, mimeType) => {
  if (!isAvailable()) {
    return { available: false, message: "AI analysis is currently unavailable." };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imagePart = fileToGenerativePart(base64Image, mimeType);
    
    const prompt = `You are a civic issue reporting assistant. 
    Analyze this image of a civic issue.
    Provide a JSON response with exactly this structure:
    {
      "category": { "value": "<one of: Potholes, Garbage overflow, Streetlight failures, Water leakage, Illegal parking, Drainage issues, Broken footpaths, Noise pollution, Sewage problems, Public safety issues, Other>", "confidence": <number 0-1> },
      "severity": { "value": "<one of: low, normal, high, urgent>", "confidence": <number 0-1> },
      "summary": "<a one sentence description of the problem>"
    }`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Clean markdown block if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return { available: true, data: JSON.parse(cleanText) };
  } catch (error) {
    console.error("AI analyzeImage error:", error);
    return { available: false, message: "Error analyzing image with AI." };
  }
};

const improveDescription = async (textInput) => {
  if (!isAvailable()) {
    return { available: false, message: "AI analysis is currently unavailable." };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a civic reporting assistant. Rewrite this user's description of a civic issue to be structured, concise, and professional, suitable for a government ticketing system. Do NOT add fictional details (like exact addresses or names) that are not in the original text.
    
    Original text: "${textInput}"
    
    Provide a JSON response with exactly this structure:
    {
      "improvedDescription": "<improved text>"
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return { available: true, data: JSON.parse(cleanText) };
  } catch (error) {
    console.error("AI improveDescription error:", error);
    return { available: false, message: "Error improving description with AI." };
  }
};

const explainDecision = async (contextData) => {
  if (!isAvailable()) {
    // Deterministic fallback if Gemini is unavailable
    return {
      available: false,
      explanation: `This issue is prioritized as ${contextData.priorityLevel || 'Unknown'} (Score: ${contextData.priorityScore || 0}) due to: ${(contextData.reasons || []).join(', ') || 'No reasons provided'}.`
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a Civic Decision Support Assistant. Explain in a short, professional paragraph why the following issue needs attention. 
    Do NOT invent any numbers, statistics, or facts. Only use the provided facts.
    Do NOT mention "I am an AI" or refer to the fact that you were given JSON.
    
    Context Facts:
    ${JSON.stringify(contextData, null, 2)}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    return { available: true, explanation: text };
  } catch (error) {
    console.error("AI explainDecision error:", error);
    // Deterministic fallback on error
    return {
      available: false,
      explanation: `This issue is prioritized as ${contextData.priorityLevel || 'Unknown'} (Score: ${contextData.priorityScore || 0}) due to: ${(contextData.reasons || []).join(', ') || 'No reasons provided'}.`
    };
  }
};

module.exports = {
  isAvailable,
  analyzeImage,
  improveDescription,
  explainDecision
};
