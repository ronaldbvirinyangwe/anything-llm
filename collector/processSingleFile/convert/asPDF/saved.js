const { v4 } = require("uuid");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../../utils/files");
const { tokenizeString } = require("../../../utils/tokenizer");
const { default: slugify } = require("slugify");
const PDFLoader = require("./PDFLoader");
const OCRLoader = require("../../../utils/OCRLoader");
const { analyzeImageWithVision } = require('../../../../server/endpoints/Imageextractor');
const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const isGarbage = (text) => {
  const cleaned = text.replace(/\s/g, '');
  const unique = new Set(cleaned.match(/.{1,10}/g) || []);
  return cleaned.length > 0 && unique.size < 5;
};

const isScanned = (text) => {
  const cleaned = text.replace(/\s/g, '');
  return cleaned.length < 200;
};

async function extractTextViaVision(fullFilePath) {
  const tempDir = path.join(os.tmpdir(), `pdf_pages_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Convert PDF pages to images
    try {
      execSync(`pdftoppm -r 150 -png "${fullFilePath}" "${tempDir}/page"`, { timeout: 60000 });
    } catch (e) {
      console.error('❌ pdftoppm failed:', e.message);
      execSync(`convert -density 150 "${fullFilePath}" "${tempDir}/page-%d.png"`, { timeout: 60000 });
    }

    const pageImages = fs.readdirSync(tempDir)
      .filter(f => f.endsWith('.png'))
      .sort()
      .map(f => path.join(tempDir, f));

    console.log(`📄 Vision analyzing ${pageImages.length} scanned pages...`);

    const pageTexts = [];
    for (const imagePath of pageImages) {
      const analysis = await analyzeImageWithVision(imagePath, path.basename(imagePath));
      if (analysis?.description) {
        pageTexts.push(analysis.description);
      }
    }

    return pageTexts.join('\n\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function asPdf({
  fullFilePath = "",
  filename = "",
  options = {},
  metadata = {},
}) {
  console.log("asPDF options received:", JSON.stringify(options));
  const pdfLoader = new PDFLoader(fullFilePath, {
    splitPages: true,
  });

  console.log(`-- Working ${filename} --`);
  const pageContent = [];
  let docs = await pdfLoader.load();

  const extractedText = docs.map(d => d.pageContent).join('');

  // Step 1: Try OCR if text is garbage
  if (docs.length === 0 || isGarbage(extractedText)) {
    console.log(`[asPDF] Text appears to be garbage or empty. Attempting OCR...`);
    docs = await new OCRLoader({
      targetLanguages: options?.ocr?.langList,
    }).ocrPDF(fullFilePath);
  }

  // Step 2: If still scanned/empty after OCR, use vision analysis
  const postOCRText = docs.map(d => d.pageContent).join('');
  if (isScanned(postOCRText) || isGarbage(postOCRText)) {
    console.log('🔍 OCR insufficient — routing through vision analysis...');
    try {
      const visionText = await extractTextViaVision(fullFilePath);
      if (visionText && visionText.trim().length > 100) {
        console.log(`✅ Vision extracted ${visionText.length} characters`);
        docs = [{ pageContent: visionText, metadata: { source: fullFilePath } }];
      }
    } catch (e) {
      console.error('❌ Vision fallback failed:', e.message);
    }
  }

  for (const doc of docs) {
    console.log(
      `-- Parsing content from pg ${
        doc.metadata?.loc?.pageNumber || "unknown"
      } --`
    );
    if (!doc.pageContent || !doc.pageContent.length) continue;
    pageContent.push(doc.pageContent);
  }

  if (!pageContent.length) {
    console.error(`[asPDF] Resulting text content was empty for ${filename}.`);
    trashFile(fullFilePath);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      documents: [],
    };
  }

  const content = pageContent.join("");
  const data = {
    id: v4(),
    url: "file://" + fullFilePath,
    title: metadata.title || filename,
    docAuthor:
      metadata.docAuthor ||
      docs[0]?.metadata?.pdf?.info?.Creator ||
      "no author found",
    description:
      metadata.description ||
      docs[0]?.metadata?.pdf?.info?.Title ||
      "No description found.",
    docSource: metadata.docSource || "pdf file uploaded by the user.",
    chunkSource: metadata.chunkSource || "",
    published: createdDate(fullFilePath),
    wordCount: content.split(" ").length,
    pageContent: content,
    token_count_estimate: tokenizeString(content),
  };

  const document = writeToServerDocuments({
    data,
    filename: `${slugify(filename)}-${data.id}`,
    options: { parseOnly: options.parseOnly },
  });
  trashFile(fullFilePath);
  console.log(`[SUCCESS]: ${filename} converted & ready for embedding.\n`);
 return { success: true, reason: null, documents: [{ ...document, pageContent: content }] };
}

module.exports = asPdf;