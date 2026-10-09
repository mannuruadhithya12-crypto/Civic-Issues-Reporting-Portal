const aiService = require('../services/aiService');

exports.analyzeImage = async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    
    if (!image) {
      return res.status(400).json({ message: "Image data is required" });
    }

    const result = await aiService.analyzeImage(image, mimeType || 'image/jpeg');
    
    if (!result.available) {
      return res.status(503).json(result); // 503 Service Unavailable
    }
    
    res.json(result);
  } catch (err) {
    console.error("aiController.analyzeImage error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.improveDescription = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const result = await aiService.improveDescription(text);
    
    if (!result.available) {
      return res.status(503).json(result);
    }
    
    res.json(result);
  } catch (err) {
    console.error("aiController.improveDescription error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
