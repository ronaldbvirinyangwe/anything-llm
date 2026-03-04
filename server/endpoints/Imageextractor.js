const { getLLMProvider } = require("../utils/helpers/index");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp"); // Added sharp for lightning-fast image compression

/**
 * Detect image type and purpose
 */
function detectImageType(filename, description = "") {
  const lower = filename.toLowerCase();
  const descLower = description.toLowerCase();
  
  if (lower.includes('diagram') || descLower.includes('diagram') || 
      descLower.includes('flowchart') || descLower.includes('chart') && !descLower.includes('bar chart') && !descLower.includes('pie chart')) {
    return 'diagram';
  }
  
  if (lower.includes('math') || lower.includes('equation') || 
      descLower.includes('equation') || descLower.includes('formula')) {
    return 'mathematical';
  }
  
  if (lower.includes('graph') || lower.includes('chart') || lower.includes('plot') ||
      descLower.includes('graph') || descLower.includes('axis') || descLower.includes('data point')) {
    return 'graph';
  }
  
  if (lower.includes('screenshot') || lower.includes('screen')) {
    return 'screenshot';
  }
  
  if (descLower.includes('concept') || descLower.includes('illustration') ||
      descLower.includes('example')) {
    return 'educational';
  }
  
  return 'general';
}

/**
 * Extract detailed information from an image using vision-capable LLM
 */
async function analyzeImageWithVision(imagePath, originalName, metadata = {}) {
  try {
    const optimizedImageBuffer = await sharp(imagePath)
      .resize({ width: 2048, withoutEnlargement: true })
      .jpeg({ quality: 95 })
      .toBuffer();

    const base64Image = optimizedImageBuffer.toString('base64');
    const mimeType = 'image/jpeg';
    const contentString = `data:image/jpeg;base64,${base64Image}`;

    const visionUrl = process.env.VLLM_VISION_BASE_PATH 
      || process.env.VLLM_BASE_PATH 
      || 'http://192.168.1.128:11435/v1';
    const modelToUse = process.env.OLLAMA_VISION_MODEL || 'lightonai/LightOnOCR-2-1B';

    console.log(`📸 Calling vision directly: ${visionUrl} model: ${modelToUse}`);

    const response = await fetch(`${visionUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Extract ALL visible text from this image verbatim. Include every question number, option A B C D, and all text.' },
            { type: 'image_url', image_url: { url: contentString } }
          ]
        }],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    const data = await response.json();
    const description = data?.choices?.[0]?.message?.content || '';

    if (!description) {
      console.error('❌ Vision returned empty');
      return null;
    }

    console.log(`✅ Vision extracted ${description.length} chars from ${originalName}`);
    const imageType = detectImageType(originalName, description);
    return {
      originalName,
      description,
      imageType,
      extractedText: description,
      metadata: { ...metadata, originalName, mimeType, analyzedAt: new Date().toISOString(), imageType, visionModel: modelToUse }
    };

  } catch (error) {
    console.error('❌ Error analyzing image:', error.message);
    return null;
  }
}

/**
 * Extract text content from analysis description
 */
function extractTextFromAnalysis(description) {
  if (!description) return "";
  
  const textSections = [];

  const latexMatches = description.match(/\$\$([\s\S]+?)\$\$|\$([\s\S]+?)\$/g);
  if (latexMatches) {
    textSections.push("Mathematical Equations (LaTeX):\n" + latexMatches.join('\n'));
  }
  
  const dataMatch = description.match(/(?:Data & Key Points|Data Points|Key Information)[:\s]+([\s\S]+?)(?=\n\n|#{1,3}|Extracted Text|$)/i);
  if (dataMatch) {
    textSections.push("Data Points:\n" + dataMatch[1].trim());
  }

  const textMatch = description.match(/(?:Text Content|Visible Text|Extracted Text)[:\s]+([\s\S]+?)(?=\n\n|#{1,3}|$)/i);
  if (textMatch) {
    textSections.push("Visible Text:\n" + textMatch[1].trim());
  }
  
  if (!latexMatches) {
    const equationMatch = description.match(/(?:Equation|Formula)[:\s]+([\s\S]+?)(?=\n\n|#{1,3}|$)/i);
    if (equationMatch) {
      textSections.push("Equation Context:\n" + equationMatch[1].trim());
    }
  }
  
  return textSections.join('\n\n');
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.tiff': 'image/tiff',
    '.heic': 'image/heic'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

/**
 * Process multiple images in parallel using Promise.all chunking
 */
async function processImagesInBatch(imagePaths, onProgress = null, concurrencyLimit = 3) {
  const results = [];
  const chunks = [];
  
  for (let i = 0; i < imagePaths.length; i += concurrencyLimit) {
    chunks.push(imagePaths.slice(i, i + concurrencyLimit));
  }

  let processedCount = 0;

  for (const chunk of chunks) {
    const promises = chunk.map(async (imagePath) => {
      const originalName = path.basename(imagePath);
      
      if (onProgress) {
        onProgress({
          current: processedCount + 1,
          total: imagePaths.length,
          filename: originalName,
          status: 'processing'
        });
      }
      
      const analysis = await analyzeImageWithVision(imagePath, originalName);
      
      processedCount++;
      
      if (analysis) {
        if (onProgress) onProgress({ status: 'complete', filename: originalName });
        return { path: imagePath, originalName, ...analysis };
      } else {
        console.error(`❌ Failed to analyze ${originalName}`);
        if (onProgress) onProgress({ status: 'failed', filename: originalName });
        return null;
      }
    });

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults.filter(Boolean));
  }
  
  return results;
}

/**
 * Generate embeddable content from image analysis
 */
function generateEmbeddableContent(analysis) {
  const sections = [];
  
  sections.push(`Image: ${analysis.originalName || "Unknown"}`);
  sections.push(`Type: ${analysis.imageType}`);
  sections.push('');
  
  sections.push('Description:');
  sections.push(analysis.description);
  sections.push('');
  
  if (analysis.extractedText && analysis.extractedText.trim()) {
    sections.push('Extracted Data & Text:');
    sections.push(analysis.extractedText);
    sections.push('');
  }
  
  return sections.join('\n');
}

/**
 * Create searchable tags from image analysis
 */
function generateSearchTags(analysis) {
  const tags = new Set();
  
  tags.add(analysis.imageType);
  
  const description = (analysis.description || "").toLowerCase();
  
  const educationalTerms = [
    'diagram', 'chart', 'graph', 'equation', 'formula',
    'concept', 'illustration', 'example', 'model', 'structure',
    'process', 'cycle', 'system', 'relationship', 'comparison',
    'data', 'analysis', 'calculation', 'proof', 'solution',
    'trend', 'statistics', 'percentage', 'growth'
  ];
  
  educationalTerms.forEach(term => {
    if (description.includes(term)) tags.add(term);
  });
  
  return Array.from(tags);
}

module.exports = {
  analyzeImageWithVision,
  processImagesInBatch,
  generateEmbeddableContent,
  generateSearchTags,
  detectImageType
};