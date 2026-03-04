/**
 * Real Integration Test for Image Processing System
 * Run with: node test.js [path-to-image]
 * Example: node test.js ./my-diagram.png
 */

require('dotenv').config(); // Ensure env vars are loaded
const path = require('path');
const fs = require('fs');
const Imageextractor = require('./Imageextractor');

const {
  analyzeImageWithVision,
  generateEmbeddableContent,
  generateSearchTags,
  detectImageType
} = Imageextractor;

async function runRealIntegrationTest() {
  console.log('\n🚀 Starting LIVE Image Analysis Test...\n');

  // 1. Validate Environment
  console.log('1️⃣  Checking Environment Configuration...');
  const envStatus = {
    'LLM_PROVIDER': process.env.LLM_PROVIDER,
    'OLLAMA_MODEL': process.env.OLLAMA_MODEL || process.env.LLM_MODEL,
    'VLLM_BASE_PATH': process.env.VLLM_BASE_PATH,
  };

  let missingConfig = false;
  console.table(envStatus);

  if (!envStatus.OLLAMA_MODEL) {
    console.error('❌ Error: OLLAMA_MODEL (or LLM_MODEL) is not set.');
    missingConfig = true;
  }
  
  // Warning only - specific providers might not need base path
  if (!envStatus.VLLM_BASE_PATH) {
    console.warn('⚠️  Warning: VLLM_BASE_PATH is missing. Vision might fail if using vLLM/Ollama via OpenAI SDK.');
  }

  if (missingConfig) return;

  // 2. Resolve Image Path
  // Uses command line arg OR defaults to looking for a logo in the project
  const userPath = process.argv[2];
  const defaultPath = path.join(__dirname, './anything-llm-icon.png');
  
  let targetImagePath = userPath ? path.resolve(userPath) : defaultPath;

  if (!fs.existsSync(targetImagePath)) {
    console.error(`\n❌ Image not found at: ${targetImagePath}`);
    console.log('Usage: node test.js <path_to_your_image>');
    return;
  }

  console.log(`\n📸 Processing Target: ${targetImagePath}`);
  console.log(`   Size: ${(fs.statSync(targetImagePath).size / 1024).toFixed(2)} KB`);

  // 3. Execute Real Vision Analysis
  console.log('\n2️⃣  Sending to Vision Model (This may take a moment)...');
  const startTime = Date.now();
  
  try {
    const analysisResult = await analyzeImageWithVision(
      targetImagePath, 
      path.basename(targetImagePath)
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!analysisResult) {
      console.error('❌ Analysis Failed: The LLM returned null or encountered an error.');
      console.error('   Check your LLM console/logs for connection issues.');
      return;
    }

    console.log(`✅ Analysis Complete in ${duration}s`);
    
    // 4. Output Raw Analysis
    console.log('\n════════════════ RAW LLM OUTPUT ════════════════');
    console.log(`Type Detected: ${analysisResult.imageType.toUpperCase()}`);
    console.log('------------------------------------------------');
    console.log(analysisResult.description);
    console.log('════════════════════════════════════════════════');

    // 5. Test Tag Generation (Using REAL data)
    console.log('\n3️⃣  Generating Search Tags (from real output)...');
    const tags = generateSearchTags(analysisResult);
    console.log(`   🏷️  Tags: [${tags.join(', ')}]`);

    // 6. Test Embeddable Content (Using REAL data)
    console.log('\n4️⃣  Formatting Embeddable Content...');
    const embedContent = generateEmbeddableContent(analysisResult);
    console.log('   📄 Preview:');
    console.log('   ' + embedContent.replace(/\n/g, '\n   ').substring(0, 300) + '...\n');

    console.log('✅ Integration Test Passed: System is fully operational.');

  } catch (error) {
    console.error('\n💥 FATAL ERROR during execution:');
    console.error(error.stack);
  }
}

// Execute
runRealIntegrationTest();