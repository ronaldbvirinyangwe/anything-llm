const fs = require("fs");
const path = require("path");
const { fromPath } = require("pdf2pic");

/**
 * Converts a PDF file into an array of images (one per page) using native Ghostscript.
 * Extremely fast compared to pure JS solutions.
 * * @param {string} pdfPath - The absolute path to the PDF file.
 * @param {string} outputDir - The directory to save the temporary images.
 * @param {string} baseName - The base filename to use for the output images.
 * @returns {Promise<string[]>} - An array of file paths to the generated images.
 */
async function convertPdfToImages(pdfPath, outputDir, baseName) {
  try {
    console.log(`⚡ Fast-Rasterizing PDF: ${baseName}`);
    
    // Configure the high-speed converter
    const options = {
      density: 150,           // 150 DPI is the sweet spot: readable for OCR, fast to generate
      saveFilename: baseName, // Base name for output files
      savePath: outputDir,    // Where to save them
      format: "jpeg",         // JPEG is faster to encode/decode than PNG
      width: 1024             // Max width to keep AI processing fast
    };

    const storeAsImage = fromPath(pdfPath, options);
    const imagePaths = [];
    
    // We need to know how many pages the PDF has. 
    // pdf2pic has a bulk convert method that returns all pages.
    const results = await storeAsImage.bulk(-1, false); // -1 means all pages
    
    for (const result of results) {
      if (result && result.path) {
        imagePaths.push(result.path);
        console.log(`✅ Extracted page ${result.page} to ${result.name}`);
      }
    }
    
    return imagePaths;
  } catch (error) {
    console.error("❌ Error converting PDF to images:", error);
    throw new Error("Failed to convert PDF to visual pages.");
  }
}

module.exports = {
  convertPdfToImages
};