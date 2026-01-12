process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();
const { viewLocalFiles, normalizePath, isWithin } = require("../utils/files");
const { purgeDocument, purgeFolder } = require("../utils/files/purgeDocument");
const { getVectorDbClass } = require("../utils/helpers");
const { updateENV, dumpENV } = require("../utils/helpers/updateENV");
const {
  reqBody,
  makeJWT,
  userFromSession,
  multiUserMode,
  queryParams,
} = require("../utils/http");
const { handleAssetUpload, handlePfpUpload } = require("../utils/files/multer");
const { v4 } = require("uuid");
const { SystemSettings } = require("../models/systemSettings");
const { User } = require("../models/user");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const fs = require("fs");
const fsPromises = require('fs').promises; 
const path = require("path");
const {
  getDefaultFilename,
  determineLogoFilepath,
  fetchLogo,
  validFilename,
  renameLogoFile,
  removeCustomLogo,
  LOGO_FILENAME,
  isDefaultFilename,
} = require("../utils/files/logo");
const { Telemetry } = require("../models/telemetry");
const { WelcomeMessages } = require("../models/welcomeMessages");
const { ApiKey } = require("../models/apiKeys");
const { getCustomModels } = require("../utils/helpers/customModels");
const { WorkspaceChats } = require("../models/workspaceChats");
const {
  flexUserRoleValid,
  ROLES,
  isMultiUserSetup,
} = require("../utils/middleware/multiUserProtected");
const { fetchPfp, determinePfpFilepath } = require("../utils/files/pfp");
const { exportChatsAsType } = require("../utils/helpers/chat/convertTo");
const { EventLogs } = require("../models/eventLogs");
const { CollectorApi } = require("../utils/collectorApi");
const {
  recoverAccount,
  resetPassword,
  generateRecoveryCodes,
} = require("../utils/PasswordRecovery");
const { SlashCommandPresets } = require("../models/slashCommandsPresets");
const { EncryptionManager } = require("../utils/EncryptionManager");
const { BrowserExtensionApiKey } = require("../models/browserExtensionApiKey");
const {
  chatHistoryViewable,
} = require("../utils/middleware/chatHistoryViewable");
const {
  simpleSSOEnabled,
  simpleSSOLoginDisabled,
} = require("../utils/middleware/simpleSSOEnabled");
const { TemporaryAuthToken } = require("../models/temporaryAuthToken");
const { SystemPromptVariables } = require("../models/systemPromptVariables");
const { VALID_COMMANDS } = require("../utils/chats");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { Workspace } = require("../models/workspace");
const jwt = require("jsonwebtoken");
const { Paynow } = require("paynow");
const axios = require("axios");
const crypto = require("crypto");
const { connectedClients } = require("../utils/websocket");
const multer = require('multer');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');
// const fs = require('fs').promises;
const sharp = require('sharp');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fetch = require('node-fetch');



const {
  PAYNOW_INTEGRATION_ID,
  PAYNOW_INTEGRATION_KEY,
  APP_BASE_URL, // e.g. "https://chikoro-ai.com" (optional)
} = process.env;

// Helper – build a Paynow client
function makePaynow() {
  const paynow = new Paynow(
    PAYNOW_INTEGRATION_ID,
    PAYNOW_INTEGRATION_KEY
  );
  paynow.resultUrl = "https://chikoro-ai.com";
paynow.returnUrl = "http://example.com/return?gateway=paynow&merchantReference=1234";
  return paynow;
}

const ECOCASH_REGEX = /^(07[7-8])[0-9]{7}$/;

function systemEndpoints(app) {
  if (!app) return;

  app.get("/ping", (_, response) => {
    response.status(200).json({ online: true });
  });

  app.get("/migrate", async (_, response) => {
    response.sendStatus(200);
  });

  app.get("/env-dump", async (_, response) => {
    if (process.env.NODE_ENV !== "production")
      return response.sendStatus(200).end();
    dumpENV();
    response.sendStatus(200).end();
  });

   app.post("/system/enrol/student", [validatedRequest], async (request, response) => {
  try {
    const { name, age, academicLevel, curriculum, grade } = reqBody(request);
    const sessionUser = await userFromSession(request, response);
    if (!sessionUser?.id) return response.status(401).json({ error: "Unauthorized" });

    // Prevent duplicate profiles
    const existing = await prisma.students.findFirst({ where: { user_id: sessionUser.id } });
    if (existing) return response.status(409).json({ error: "Student profile already exists." });

    // Create new student record
    const student = await prisma.students.create({
      data: {
        user_id: sessionUser.id,
        name,
        age: parseInt(age),
        academicLevel,
        curriculum,
        grade,
      },
    });

    // Update user role
    const updatedUser = await prisma.users.update({
      where: { id: sessionUser.id },
      data: { role: "student" },
    });

    // ✅ Generate a fresh JWT with updated role
    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    await EventLogs.logEvent("student_enrolled", { username: sessionUser.username }, sessionUser.id);

    // Return both the student data and the new token
    response.status(200).json({
      success: true,
      student,
      token: newToken,
      message: "Student enrolled successfully. Token refreshed.",
    });
  } catch (err) {
    console.error("Error enrolling student:", err);
    response.status(500).json({ error: "Internal server error" });
  }
});

const upload = multer({ 
  dest: 'exams/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Extract text from PDF
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = await fsPromises.readFile(filePath);
    
    // Load PDF document - simplified for v5.x
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(dataBuffer),
      verbosity: 0,
      isEvalSupported: false,
    });
    
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    
    console.log(`📄 Processing ${numPages} pages...`);
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Sort items by Y position (top to bottom) then X position (left to right)
      const items = textContent.items.sort((a, b) => {
        const yDiff = Math.abs(b.transform[5] - a.transform[5]);
        if (yDiff > 5) {
          return b.transform[5] - a.transform[5]; // Sort by Y (top to bottom)
        }
        return a.transform[4] - b.transform[4]; // Sort by X (left to right)
      });
      
      let pageText = '';
      let lastY = null;
      
      items.forEach(item => {
        const currentY = item.transform[5];
        
        // Add newline if Y position changed significantly (new line)
        if (lastY !== null && Math.abs(lastY - currentY) > 5) {
          pageText += '\n';
        }
        
        pageText += item.str + ' ';
        lastY = currentY;
      });
      
      fullText += pageText + '\n\n';
      console.log(`✓ Page ${pageNum}/${numPages} extracted`);
    }
    
    // Clean extracted text
    const cleanedText = fullText
      // Remove Cambridge exam headers/footers
      .replace(/0970\/31\/M\/J\/25.*?UCLES 2025/g, '')
      .replace(/\[Turn over\]/g, '')
      .replace(/DO NOT WRITE IN THIS MARGIN/g, '')
      .replace(/\* \d+ \*/g, '') // Remove barcode patterns
      .replace(/Ĭ[^\n]+/g, '') // Remove unicode artifacts
      .replace(/ĥ[^\n]+/g, '')
      .replace(/¥[^\n]+/g, '')
      .replace(/Ġ[^\n]+/g, '')
      // Normalize spacing
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    return cleanedText;
  } catch (error) {
    console.error('PDF.js extraction error:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}


async function preprocessImageForOCR(filePath) {
  try {
    const outputPath = filePath + '_processed.png';
    
    console.log("🎨 Preprocessing image for OCR...");
    
    await sharp(filePath)
      // Convert to grayscale
      .grayscale()
      // Enhance contrast
      .normalize()
      // Increase sharpness for better text recognition
      .sharpen()
      // Apply threshold to create clean black and white
      .threshold(128)
      // Ensure sufficient resolution (scale up if needed)
      .resize({
        width: 2480, // A4 at 300 DPI width
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFile(outputPath);
    
    console.log("✓ Image preprocessed");
    return outputPath;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    throw new Error('Failed to preprocess image: ' + error.message);
  }
}
async function extractTextFromImage(filePath) {
  let processedPath = null;
  
  try {
    // Preprocess image first
    processedPath = await preprocessImageForOCR(filePath);
    
    console.log("🔍 Running OCR on preprocessed image...");
    
    // Use enhanced OCR settings
    const { data: { text } } = await Tesseract.recognize(
      processedPath, 
      'eng', 
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        // Optimize for document text
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        // Whitelist common exam characters
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!()[]{}/-:;"\' \n',
        preserve_interword_spaces: '1',
      }
    );
    
    console.log("✓ OCR completed");
    
    // Delete processed image
    try {
      await fsPromises.unlink(processedPath);
    } catch (e) {
      console.warn('Could not delete processed image:', e);
    }
    
    // Apply same cleaning as PDF
    const cleanedText = text
      .replace(/0970\/31\/M\/J\/25.*?UCLES 2025/g, '')
      .replace(/\[Turn over\]/g, '')
      .replace(/DO NOT WRITE IN THIS MARGIN/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    return cleanedText;
  } catch (error) {
    // Clean up processed file on error
    if (processedPath) {
      try {
        await fsPromises.unlink(processedPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    console.error('Enhanced OCR extraction error:', error);
    throw new Error('Failed to extract text from image: ' + error.message);
  }
}
// ==========================================
// MAIN EXTRACTION ROUTE (UPDATED)
// ==========================================
app.post("/teacher/extract-exam-paper", 
  [validatedRequest, upload.fields([
    { name: 'examPaper', maxCount: 1 },
    { name: 'markScheme', maxCount: 1 }
  ])], 
  async (req, res) => {
    let examFilePath = null;
    let markSchemeFilePath = null;

    try {
      const { metadata } = req.body;
      
      if (!metadata) {
        return res.status(400).json({ 
          success: false, 
          error: "Metadata is required" 
        });
      }

      const parsedMetadata = JSON.parse(metadata);
      
      if (!req.files || !req.files.examPaper) {
        return res.status(400).json({ 
          success: false, 
          error: "Exam paper file is required" 
        });
      }

      const examFile = req.files.examPaper[0];
      examFilePath = examFile.path;
      
      const markSchemeFile = req.files.markScheme ? req.files.markScheme[0] : null;
      if (markSchemeFile) {
        markSchemeFilePath = markSchemeFile.path;
      }

      console.log("📄 Extracting exam paper from:", examFile.originalname);
      console.log("📝 File type:", examFile.mimetype);

      // STEP 1: Extract text from exam paper
      let examText = '';
      if (examFile.mimetype === 'application/pdf') {
        console.log("📖 Processing PDF with pdfjs-dist...");
        examText = await extractTextFromPDF(examFilePath);
      } else if (examFile.mimetype.startsWith('image/')) {
        console.log("🖼️ Processing image with Sharp + Tesseract OCR...");
        examText = await extractTextFromImage(examFilePath);
      } else {
        return res.status(400).json({ 
          success: false, 
          error: "Unsupported file type. Please upload PDF or image (JPG, PNG)." 
        });
      }

      console.log(`📝 Extracted ${examText.length} characters from exam paper`);

      if (!examText || examText.trim().length < 100) {
        return res.status(400).json({ 
          success: false, 
          error: "Could not extract sufficient text from the exam paper. Please ensure the file is clear and readable." 
        });
      }

      // STEP 2: Extract text from mark scheme if provided
      let markSchemeText = '';
      if (markSchemeFile) {
        console.log("📋 Extracting mark scheme from:", markSchemeFile.originalname);
        if (markSchemeFile.mimetype === 'application/pdf') {
          markSchemeText = await extractTextFromPDF(markSchemeFilePath);
        } else if (markSchemeFile.mimetype.startsWith('image/')) {
          markSchemeText = await extractTextFromImage(markSchemeFilePath);
        }
        console.log(`📝 Extracted ${markSchemeText.length} characters from mark scheme`);
      }

      // STEP 3: First AI call - Structure identification (Optional - for logging)
      const structurePrompt = `You are analyzing a Cambridge IGCSE exam paper for the Zimbabwean curriculum.

EXAM PAPER TEXT:
${examText.substring(0, 8000)}

Your task: Identify and extract ONLY the question structure.

Output ONLY valid JSON with no other text:
{
  "questions": [
    {
      "number": "1",
      "hasSubQuestions": true,
      "subQuestions": ["a", "b", "c", "d"],
      "totalMarks": 11
    }
  ]
}

JSON output:`;

      console.log("🧠 Step 1: Analyzing paper structure...");
      const structureResponse = await generateLessonPlanAI(structurePrompt);
      
      // Parse structure
      let structure;
      try {
        const cleanStructure = structureResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .replace(/^[^{]*/, '') // Remove everything before first {
          .replace(/[^}]*$/, '}') // Remove everything after last }
          .trim();
        structure = JSON.parse(cleanStructure);
      } catch (parseError) {
        console.error("Failed to parse structure:", parseError);
        console.log("Structure response:", structureResponse.substring(0, 200));
        // Fallback: continue without structure
        structure = { questions: [] };
      }

      console.log(`✓ Identified ${structure.questions.length} questions`);

      // STEP 4: Second AI call - Extract questions in StudentQuiz-compatible format
      const extractionPrompt = `You are extracting questions from a Cambridge IGCSE Biology exam paper.

EXAM PAPER TEXT:
${examText}

${markSchemeText ? `MARK SCHEME TEXT:\n${markSchemeText}\n` : ''}

METADATA:
- Subject: ${parsedMetadata.subject}
- Grade: ${parsedMetadata.grade}

OUTPUT FORMAT - MUST FOLLOW EXACTLY:

For Multiple Choice Questions:
1. Question text goes here?
A) First option
B) Second option
C) Third option
D) Fourth option
**Answer: B**

For Structured Questions:
2. Question text including sub-parts (a), (b), (i), (ii) etc.

Mark Scheme:
- First point (1 mark)
- Second point (1 mark)

CRITICAL RULES:
1. Start IMMEDIATELY with "1." - NO introduction or preamble
2. Each question starts on a new line with its number: "1.", "2.", "3."
3. Put ONE blank line between questions
4. For multiple choice: list options A) B) C) D) then **Answer: X**
5. For structured: include sub-questions in the question text, then add "Mark Scheme:" section
6. Keep everything simple - this will be parsed by students

EXAMPLE OUTPUT:

1. Fig. 1.1 shows some specialised cells. State the letters that identify: (a) contain an acrosome (b) contain haemoglobin (c) are found in plants (d) are found in the peripheral nervous system [4 marks]

Mark Scheme:
- (a) D - 1 mark
- (b) A - 1 mark  
- (c) C and E - 1 mark each
- (d) B - 1 mark

2. What is the function of chlorophyll in plants?
A) To store glucose
B) To absorb light for photosynthesis
C) To transport water
D) To produce oxygen
**Answer: B**

3. A student investigated photosynthesis in an aquatic plant. (a) State the gas produced (b) Explain why the rate increased then leveled off [5 marks]

Mark Scheme:
- (a) Oxygen - 1 mark
- (b) Rate increases with more CO2 available - 2 marks
- (b) Levels off when another factor becomes limiting - 2 marks

NOW EXTRACT ALL QUESTIONS (start with "1." immediately, no preamble):`;

      console.log("🧠 Step 2: Extracting questions and mark schemes...");
      const extractedContent = await generateLessonPlanAI(extractionPrompt);
      
      // Clean the response - be aggressive
      let cleanedContent = extractedContent
        .replace(/^(Here's|Here is|Here are|Sure|Certainly|Okay|I'll|Let me|Below|Following).*?[:.\n]/im, '')
        .replace(/^(the|all)?\s*(extracted|formatted|complete)?\s*(questions?|exam|paper).*?[:.\n]/im, '')
        .replace(/```[a-z]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();

      // Find where the actual questions start (look for "1." at the beginning of a line)
      const firstQuestionMatch = cleanedContent.match(/^1\.\s/m);
      if (firstQuestionMatch) {
        cleanedContent = cleanedContent.substring(firstQuestionMatch.index);
      }

      // Ensure proper spacing between questions (StudentQuiz format)
      cleanedContent = cleanedContent
        .replace(/\n(\d+\.)/g, '\n\n$1') // Add blank line before each question number
        .replace(/\n{3,}/g, '\n\n') // Remove excessive blank lines
        .trim();

      // Count questions - look for numbered patterns
      const questionMatches = cleanedContent.match(/^\d+\.\s/gm);
      const questionCount = questionMatches ? questionMatches.length : 0;

      console.log(`Found ${questionCount} questions in extracted content`);

      if (questionCount === 0) {
        // Debug logging
        console.log("First 500 chars of cleaned content:", cleanedContent.substring(0, 500));
        throw new Error("No questions could be extracted. The AI response may not be properly formatted.");
      }

      console.log(`✅ Successfully extracted ${questionCount} questions from exam paper`);

      // Clean up uploaded files
      try {
        if (examFilePath) await fsPromises.unlink(examFilePath);
        if (markSchemeFilePath) await fsPromises.unlink(markSchemeFilePath);
      } catch (unlinkError) {
        console.error("Warning: Could not delete temporary files:", unlinkError);
      }

      return res.status(200).json({
        success: true,
        extractedQuiz: {
          content: cleanedContent,
          questionCount: questionCount,
          metadata: parsedMetadata,
          hasMarkScheme: !!markSchemeText,
          extractionMethod: examFile.mimetype === 'application/pdf' ? 'pdfjs-dist' : 'sharp+tesseract'
        },
        message: `Successfully extracted ${questionCount} questions from the exam paper.`
      });

    } catch (err) {
      console.error("🔥 Exam extraction error:", err);
      
      // Clean up files on error
      try {
        if (examFilePath) await fsPromises.unlink(examFilePath);
        if (markSchemeFilePath) await fsPromises.unlink(markSchemeFilePath);
      } catch (unlinkError) {
        console.error("Warning: Could not delete temporary files on error:", unlinkError);
      }

      return res.status(500).json({ 
        success: false, 
        error: err.message || "Failed to extract exam paper.",
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }
);



 app.post("/system/enrol/teacher", [validatedRequest], async (request, response) => {
  try {
    const { name, school } = reqBody(request);
    const sessionUser = await userFromSession(request, response);
    if (!sessionUser?.id) return response.status(401).json({ error: "Unauthorized" });

    const existing = await prisma.teachers.findFirst({ where: { user_id: sessionUser.id } });
    if (existing) return response.status(409).json({ error: "Teacher profile already exists." });

    const teacher = await prisma.teachers.create({
      data: { user_id: sessionUser.id, name, school },
    });

    const updatedUser = await prisma.users.update({
      where: { id: sessionUser.id },
      data: { role: "teacher" },
    });

    const newToken = jwt.sign(
      { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    response.status(200).json({
      success: true,
      teacher,
      token: newToken,
      message: "Teacher enrolled successfully. Token refreshed.",
    });
  } catch (err) {
    console.error("Error enrolling teacher:", err);
    response.status(500).json({ error: "Internal server error" });
  }
});

app.post("/system/enrol/parent", [validatedRequest], async (request, response) => {
  try {
    const { name, studentName } = reqBody(request);
    const sessionUser = await userFromSession(request, response);

    if (!sessionUser?.id)
      return response.status(401).json({ error: "Unauthorized" });

    // ✅ Validate required fields
    if (!name) {
      return response.status(400).json({ 
        error: "Parent name is required." 
      });
    }

    // Prevent duplicate parent profiles
    const existing = await prisma.parents.findFirst({
      where: { user_id: sessionUser.id },
    });
    if (existing)
      return response
        .status(409)
        .json({ error: "Parent profile already exists." });

    // ✅ Create new parent profile
    const parent = await prisma.parents.create({
      data: {
        user_id: sessionUser.id,
        name: name.trim(),
      },
    });

    // ✅ Update user role to "parent"
    const updatedUser = await prisma.users.update({
      where: { id: sessionUser.id },
      data: { role: "parent" },
    });

    // ✅ Issue new JWT token with updated role
    const jwt = require("jsonwebtoken");
    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    await EventLogs.logEvent(
      "parent_enrolled",
      { username: sessionUser.username },
      sessionUser.id
    );

    response.status(200).json({
      success: true,
      parent,
      token: newToken,
      message: "Parent enrolled successfully. Token refreshed.",
    });
  } catch (err) {
    console.error("Error enrolling parent:", err);
    response
      .status(500)
      .json({ error: "Internal server error during parent enrolment." });
  }
});

    app.get("/system/student/:userId", [validatedRequest], async (request, response) => {
    try {
      const { userId } = request.params;
      const student = await prisma.students.findFirst({
        where: { user_id: Number(userId) },
        include: { user: true },
      });

    if (student?.subscription_expiration_date && new Date() > student.subscription_expiration_date) {
      // Expired — mark status back to "none"
      await prisma.students.updateMany({
        where: {
          user_id: Number(student.user_id),
        },
        data: {
          subscription_status: "none",
        },
      });
    }

    if (!student) {
      return response.status(404).json({ success: false, error: "Student not found" });
    }

    response.status(200).json({ success: true, student });
  } catch (err) {
    console.error("Error fetching student:", err);
    response.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.get("/system/teacher/:userId", [validatedRequest], async (request, response) => {
  try {
    const { userId } = request.params;
    const id = Number(userId);

    if (isNaN(id)) {
      return response.status(400).json({ success: false, error: "Invalid teacher ID." });
    }

    const teacher = await prisma.teachers.findFirst({
      where: { user_id: id },
      include: { user: true },
    });

    if (!teacher) {
      return response.status(404).json({ success: false, error: "Teacher not found" });
    }

    response.status(200).json({ success: true, teacher });
  } catch (err) {
    console.error("Error fetching teacher:", err);
    response.status(500).json({ success: false, error: "Internal server error" });
  }
});

   app.get("/system/parent/:userId", [validatedRequest], async (request, response) => {
    try {
      const { userId } = request.params;
      const parent = await prisma.parents.findFirst({
        where: { user_id: Number(userId) },
        include: { user: true },
      });

      if (!parent) {
        return response.status(404).json({ success: false, error: "Parent not found" });
      }

      response.status(200).json({ success: true, parent });
    } catch (err) {
      console.error("Error fetching parent:", err);
      response.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.get("/system/profile/:userId", [validatedRequest], async (req, res) => {
  try {
    const { userId } = req.params;
    const id = Number(userId);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid userId parameter." });
    }

    // Find the user first (so we know their role)
    const user = await prisma.users.findUnique({
      where: { id },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "User not found." });
    }

    let profile = null;

    // Fetch from the correct profile table
    if (user.role === "student") {
      profile = await prisma.students.findFirst({
        where: { user_id: id },
      });
    } else if (user.role === "teacher") {
      profile = await prisma.teachers.findFirst({
        where: { user_id: id },
      });
    } else if (user.role === "parent") {
      profile = await prisma.parents.findFirst({
        where: { user_id: id },
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: `${user.role || "unknown"} profile not found.`,
      });
    }

    res.status(200).json({
      success: true,
      user,
      profile,
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching profile.",
    });
  }
});
app.post("/system/refresh-role", [validatedRequest], async (req, res) => {
  try {
    const sessionUser = await userFromSession(req, res);
    if (!sessionUser?.id)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const updatedUser = await prisma.users.findUnique({
      where: { id: sessionUser.id },
    });

    if (!updatedUser)
      return res
        .status(404)
        .json({ success: false, error: "User not found in database." });

    const jwt = require("jsonwebtoken");
    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      success: true,
      token: newToken,
      role: updatedUser.role, // ✅ include this explicitly
      message: "JWT refreshed successfully",
    });
  } catch (err) {
    console.error("Error refreshing JWT:", err);
    res
      .status(500)
      .json({ success: false, error: "Internal server error during refresh." });
  }
});

app.get("/system/my-profile", [validatedRequest], async (req, res) => {
  try {
    const sessionUser = await userFromSession(req, res);
    if (!sessionUser?.id)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    // Try to find a matching profile in each table
    let profile = null;

    if (sessionUser.role === "student") {
      profile = await prisma.students.findFirst({
        where: { user_id: sessionUser.id },
      });
    } else if (sessionUser.role === "teacher") {
      profile = await prisma.teachers.findFirst({
        where: { user_id: sessionUser.id },
      });
    } else if (sessionUser.role === "parent") {
      profile = await prisma.parents.findFirst({
        where: { user_id: sessionUser.id },
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: "Profile not found or user role not set.",
      });
    }

    res.status(200).json({
      success: true,
      role: sessionUser.role,
      profile,
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// ==============================================
// 📊 Teacher Dashboard Stats
// ==============================================
app.get("/system/teacher-dashboard/stats/:userId", [validatedRequest], async (req, res) => {
  try {
    const { userId } = req.params;
    const id = Number(userId);
    if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid user ID." });

    // Fetch the user's profile (reusing your existing route logic)
    const user = await prisma.users.findUnique({
      where: { id },
      select: { id: true, username: true, role: true },
    });

    if (!user) return res.status(404).json({ success: false, error: "User not found." });
    if (user.role !== "teacher") return res.status(403).json({ success: false, error: "User is not a teacher." });

    const teacher = await prisma.teachers.findFirst({ where: { user_id: id } });
    if (!teacher) return res.status(404).json({ success: false, error: "Teacher profile not found." });

   // Count linked students and activities
const studentLinks = await prisma.teacher_students.count({
  where: { teacherId: teacher.id },
});

const lessonPlans = await prisma.event_logs.count({
  where: {
    userId: id,
    event: "lesson_plan_generated",
  },
});

const quizzes = await prisma.event_logs.count({
  where: {
    userId: id,
    event: "quiz_generated",
  },
});

const classes = await prisma.teacher_students.groupBy({
  by: ["subject"],
  where: { teacherId: teacher.id },
});

    res.json({
      success: true,
      teacher,
      stats: {
        totalStudents: studentLinks,
        totalClasses: classes.length,
        quizzesCreated: quizzes,
        lessonPlans: lessonPlans,
      },
    });
  } catch (err) {
    console.error("Error fetching teacher dashboard stats:", err);
    res.status(500).json({ success: false, error: "Internal server error while fetching dashboard stats." });
  }
});

app.post("/payments/initiate", [validatedRequest], async (req, res) => {
  try {
    const sessionUser = res.locals.user;
    if (!sessionUser?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { paymentMethod, phoneNumber } = req.body;

    // sessionUser.id is the student database ID after merge
    // We need to find by that ID, not by user_id
    const student = await prisma.students.findUnique({
      where: { id: sessionUser.id },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    // 🧠 Plan and amount
    const hasSchool = !!student.school;
    const plan = hasSchool ? "school basic" : "premium";
    const amount = hasSchool ? 3.0 : 0.01;

    // ✅ Validate payment method
    if (paymentMethod === "card") {
      // ok
    } else if (paymentMethod === "ecocash") {
      const ECOCASH_REGEX = /^(077|078)\d{7}$/;
      if (!phoneNumber || !ECOCASH_REGEX.test(phoneNumber)) {
        return res
          .status(400)
          .json({ error: "Valid Ecocash number required (077/078)." });
      }
    } else {
      return res.status(400).json({ error: "Invalid payment method." });
    }

    // 🔧 Initialize Paynow payment
    const paynow = makePaynow();
    const reference = `ChikoroSub-${student.user_id}-${Date.now()}`;
    const payment = paynow.createPayment(
      reference,
      "ronaldbvirinyangwe@icloud.com"
    );
    payment.add(`Chikoro AI ${plan} Subscription`, amount);

    let initResponse;
    if (paymentMethod === "card") {
      initResponse = await paynow.send(payment);
    } else {
      initResponse = await paynow.sendMobile(payment, phoneNumber, "ecocash");
    }
    
    console.log("Paynow init response:", initResponse);
    
    if (!initResponse?.success) {
      const reason = initResponse?.error || "Payment initiation failed.";
      return res.status(400).json({ error: reason });
    }

    // 💾 Persist the pending subscription
    await prisma.students.update({
      where: { id: student.id },
      data: {
        subscription_status: "pending",
        subscription_plan: plan,
        subscription_payment_poll_url: initResponse.pollUrl || null,
      },
    });

    // ✅ Respond
    if (paymentMethod === "card") {
      return res.json({
        success: true,
        redirectUrl: initResponse.redirectUrl,
      });
    } else {
      return res.json({
        success: true,
        instructions:
          initResponse.instructions ||
          "Approve the payment on your phone.",
      });
    }
  } catch (err) {
    console.error("Payment Initiation Error:", err);
    return res
      .status(500)
      .json({ error: "Internal error while initiating payment." });
  }
});
  // -----------------------------
  // GET /payments/status
  // -----------------------------
app.get("/payments/status", [validatedRequest], async (req, res) => {
  try {
    const user = res.locals.user;
    console.log("🔍 Payment Status Check:");
    console.log("   User ID:", user?.id);
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    // After middleware merge, user.id is the student's database ID
    // So we can directly find by that ID
    const student = await prisma.students.findUnique({
      where: { id: user.id },
    });

    console.log("   Found Student ID:", student?.id);
    console.log("   Student Status:", student?.subscription_status);
    console.log("   Has PollURL:", !!student?.subscription_payment_poll_url);
    console.log("   PollURL:", student?.subscription_payment_poll_url);

    if (!student?.subscription_payment_poll_url) {
      return res
        .status(404)
        .json({ error: "No pending payment transaction found for this user." });
    }

    const paynow = makePaynow();
    const status = await paynow.pollTransaction(
      student.subscription_payment_poll_url
    );

    console.log("   Paynow Status:", status?.status);

    if (status && status.status === "paid") {
      const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
      const expirationDate = new Date(Date.now() + THIRTY_DAYS_MS);

      const updatedStudent = await prisma.students.update({
        where: { id: student.id },
        data: {
          subscription_status: "paid",
          subscription_expiration_date: expirationDate,
          subscription_payment_poll_url: null,
        },
      });

       await prisma.payment_logs.create({
    data: {
      student_id: student.id,
      amount: student.subscription_plan === "school basic" ? 3.0 : 5.0,
      payment_method: "mobile", // or "ecocash"
      recorded_by: student.user_id, // or sessionUser.id
      notes: "Mobile payment confirmed via Paynow.",
    },
  });

      return res.json({
        success: true,
        status: "paid",
        message: "Payment confirmed and subscription activated.",
        student: updatedStudent,
      });
    }

    return res.json({
      success: false,
      status: status?.status || "pending",
      message: 'Payment status is not yet "paid".',
    });
  } catch (err) {
    console.error("Payment Status Error:", err);
    return res.status(500).json({ error: "Failed to check payment status." });
  }
});

  

  app.get("/setup-complete", async (_, response) => {
    try {
      const results = await SystemSettings.currentSettings();
      response.status(200).json({ results });
    } catch (e) {
      console.error(e.message, e);
      response.sendStatus(500).end();
    }
  });

  app.get(
    "/system/check-token",
    [validatedRequest],
    async (request, response) => {
      try {
        if (multiUserMode(response)) {
          const user = await userFromSession(request, response);
          if (!user || user.suspended) {
            response.sendStatus(403).end();
            return;
          }

          response.sendStatus(200).end();
          return;
        }

        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  // ====================================================
// 🧠 QUIZ RESULTS ENDPOINTS
// ====================================================

app.get("/quiz/results", [validatedRequest], async (req, res) => {
  try {
    const sessionUser = await userFromSession(req, res);
    if (!sessionUser?.id)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    // Fetch all quiz results for this user
    const results = await prisma.quiz_results.findMany({
      where: { user_id: sessionUser.id },
      orderBy: { submitted_at: "desc" },
    });

    if (!results.length)
      return res.status(404).json({ success: false, message: "No quiz results found." });

    res.status(200).json({ success: true, results });
  } catch (err) {
    console.error("Error fetching quiz results:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

app.get("/quiz/result/:id", [validatedRequest], async (req, res) => {
  const { id } = req.params;
  const user = res.locals.user;

  try {
    const result = await prisma.quiz_results.findUnique({
      where: { id: Number(id) },
      include: {
        user: { select: { username: true, role: true } },
        feedbacks: true, // ✅ correct relation name (not quiz_feedback)
      },
    });

    if (!result) {
      return res.status(404).json({ success: false, error: "Result not found." });
    }

    // ✅ Authorization check
    if (result.user_id !== user.id && user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Unauthorized access." });
    }

    // 🧩 Build feedback array
    const feedback = result.feedbacks.map((f) => ({
      question: f.question,
      userAnswer: f.user_answer,
      correct_answer: f.correct_answer,
      correct: f.is_correct,
      feedback: f.feedback,
    }));

    // 🧠 Return full result with feedback
    res.json({
      success: true,
      result: {
        id: result.id,
        subject: result.subject,
        score: result.score,
        total_questions: result.total_questions,
        correct_answers: result.correct_answers,
        submitted_at: result.submitted_at,
        user: result.user,
        feedback,
      },
    });
  } catch (err) {
    console.error("🔥 Error fetching quiz result:", err);
    res.status(500).json({ success: false, error: "Failed to fetch quiz result." });
  }
});

app.post("/quiz/generate", [validatedRequest], async (req, res) => {
  try {
    const { subject, grade, topic, numQuestions = 10, difficulty = "medium", questionType = "mixed" } = req.body;

    if (!subject || !grade) {
      return res.status(400).json({ success: false, error: "Subject and grade are required." });
    }

    // Use topic if provided, otherwise use subject as the topic
    const quizTopic = topic || subject;

    // Build comprehensive prompt similar to teacher/generate-quiz
    let prompt = `You are a quiz generator for the Zimbabwean curriculum. Generate ONLY the quiz questions with NO introductory text.

Create a ${difficulty} difficulty quiz with ${numQuestions} questions about ${quizTopic} for ${subject}, grade ${grade}.

CRITICAL: Start immediately with question 1. No preamble, no explanations, just questions.
`;

    if (questionType === 'multiple-choice' || questionType === 'MCQ') {
      prompt += `
Format each question EXACTLY like this:

1. What is photosynthesis?
A) The process of respiration
B) The process plants use to make food
C) Cell division
D) The process of digestion
**Answer: B**

2. Which organelle performs photosynthesis?
A) Nucleus
B) Mitochondria
C) Chloroplast
D) Ribosome
**Answer: C**

RULES:
- Start with question number
- Provide exactly 4 options (A, B, C, D)
- Mark correct answer as **Answer: X** immediately after options
- NO introductory text
- NO explanations between questions
`;
    } 
    else if (questionType === 'structured' || questionType === 'short-answer') {
      prompt += `
Format each question EXACTLY like this:

1. Explain the process of photosynthesis. [4 marks]
Mark Scheme:
- Plants use light energy (1 mark)
- Carbon dioxide and water are reactants (1 mark)
- Glucose and oxygen are products (1 mark)
- Occurs in chloroplasts (1 mark)

2. Describe the role of chloroplasts. [3 marks]
Mark Scheme:
- Site of photosynthesis (1 mark)
- Contains chlorophyll (1 mark)
- Found in plant cells (1 mark)

RULES:
- Start with question number
- Include marks in square brackets
- Provide detailed mark scheme immediately after
- NO introductory text
`;
    }
    else if (questionType === 'mixed') {
      prompt += `
Alternate between multiple choice and structured questions in EQUAL proportion.

Example format:

1. What is photosynthesis?
A) The process of respiration
B) The process plants use to make food
C) Cell division
D) The process of digestion
**Answer: B**

2. Explain how plants perform photosynthesis. [3 marks]
Mark Scheme:
- Uses light energy (1 mark)
- CO2 + H2O → glucose (1 mark)
- Occurs in chloroplasts (1 mark)

3. Which organelle performs photosynthesis?
A) Nucleus
B) Mitochondria
C) Chloroplast
D) Ribosome
**Answer: C**

4. Describe the importance of photosynthesis to life on Earth. [4 marks]
Mark Scheme:
- Produces oxygen for respiration (1 mark)
- Base of food chains (1 mark)
- Removes CO2 from atmosphere (1 mark)
- Provides energy for organisms (1 mark)

RULES:
- Start immediately with question 1
- Alternate: MCQ, Structured, MCQ, Structured...
- NO introductory text
- For MCQ: Include **Answer: X** after options
- For Structured: Include Mark Scheme after question
`;
    }

    prompt += `\n\nREMEMBER: Start with "1." immediately. No preamble or introduction!`;

    console.log("🧠 Generating quiz via AI...");

    // Use the AI generation function (assuming generateLessonPlanAI exists)
    const quiz = await generateLessonPlanAI(prompt);
    
    // Clean the response - remove any preamble
    const cleanedQuiz = quiz
      .replace(/^.*?(?:here'?s?|here is).*?quiz.*?:/i, '')
      .replace(/^(sure|certainly|okay|alright)[!,.\s]*/i, '')
      .replace(/```.*?```/gs, '')
      .trim();

    console.log(`✅ Generated quiz for ${subject} - Grade ${grade}`);

    // Return the cleaned quiz content
    return res.status(200).json({
      success: true,
      quiz: cleanedQuiz,
      metadata: {
        subject,
        grade,
        topic: quizTopic,
        difficulty,
        questionType,
        numQuestions
      },
      message: `Generated ${numQuestions} ${difficulty} ${questionType} questions for ${subject} Grade ${grade}.`,
    });

  } catch (err) {
    console.error("🔥 Quiz generation error:", err);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to generate quiz.",
      details: err.message 
    });
  }
});

// ========== ENHANCED QUIZ MARKING ENDPOINT ==========
app.post("/quiz/mark", [validatedRequest], async (req, res) => {
  const { quiz, answers } = req.body;
  const user = res.locals.user;

  try {
    // ---------- Helper functions ----------
    const normalize = (s = "") =>
      String(s || "")
        .replace(/[^\p{L}\p{N}\s.()-]/gu, "")
        .toLowerCase()
        .trim();

    const extractLetter = (val = "") => {
      const m = String(val || "").match(/\b([ABCD])\b/i);
      return m ? m[1].toUpperCase() : null;
    };

    // ---------- AI Feedback Generation ----------
    const generateMCQFeedback = async (question, userAnswer, correctAnswer, options) => {
      const prompt = `
You are an encouraging teacher providing feedback on a multiple-choice question.

Question: ${question}
Options:
${options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}

Student's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}

Provide detailed feedback that:
1. Confirms if the answer is correct or incorrect
2. Explains WHY the correct answer is right (even if they got it right, reinforce the concept)
3. If incorrect, explain the misconception and why their choice was wrong
4. Provide additional context or a helpful tip to remember this concept
5. Be encouraging and constructive

Keep it concise but thorough (3-4 sentences).

**Note**: you are the teacher, do not say the student demonstrates a good understanding or something like that, say you demonstrate a good understanding because, remember you are addressing the student directly.
`;

      try {
        const aiFeedback = await generateLessonPlanAI(prompt);
        return aiFeedback.trim();
      } catch (error) {
        console.error("AI feedback generation failed:", error);
        return "Unable to generate detailed feedback at this time.";
      }
    };

    const generateStructuredFeedback = async (question, userAnswer, modelAnswer) => {
      const prompt = `
You are an expert teacher grading a structured question answer. Be fair but thorough.

Question: ${question}

Mark Scheme/Model Answer:
${modelAnswer || "Award marks for accurate, relevant points that demonstrate understanding."}

Student's Answer:
${userAnswer}

Provide:
1. A numerical score out of the total marks available (estimate marks based on complexity)
2. Detailed feedback on what was done well
3. What was missing or could be improved
4. Specific suggestions for strengthening the answer
5. Encouragement and next steps

Format your response as:
SCORE: X/Y
FEEDBACK: [Your detailed feedback]

**Note**: you are the teacher, do not say the student demonstrates a good understanding or something like that, say you demonstrate a good understanding because, remember you are addressing the student directly.
`;

      try {
        const aiGrading = await generateLessonPlanAI(prompt);
        
        // Parse AI response
        const scoreMatch = aiGrading.match(/SCORE:\s*(\d+)\s*\/\s*(\d+)/i);
        const feedbackMatch = aiGrading.match(/FEEDBACK:\s*(.+)/is);

        return {
          pointsEarned: scoreMatch ? parseInt(scoreMatch[1]) : 0,
          pointsPossible: scoreMatch ? parseInt(scoreMatch[2]) : 4,
          feedback: feedbackMatch ? feedbackMatch[1].trim() : aiGrading
        };
      } catch (error) {
        console.error("AI grading failed:", error);
        return {
          pointsEarned: 0,
          pointsPossible: 4,
          feedback: "Unable to generate detailed feedback at this time."
        };
      }
    };

    // ---------- Process each question ----------
    const results = [];
    let totalPoints = 0;
    let earnedPoints = 0;
    let correctCount = 0;

    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      const userAnswer = (answers[i] ?? "").toString().trim();
      const type = (q.type || "").toLowerCase();

      let result = {
        questionNumber: i + 1,
        question: q.question,
        userAnswer: userAnswer,
        type: type === "mcq" ? "multiple-choice" : "structured"
      };

      if (type === "mcq") {
        // Multiple Choice Question
        const opts = Array.isArray(q.options) ? q.options : [];
        const correctLetter = extractLetter(q.correct_answer);
        const userLetter = extractLetter(userAnswer);
        
        const correctIdx = correctLetter ? "ABCD".indexOf(correctLetter) : -1;
        const userIdx = userLetter ? "ABCD".indexOf(userLetter) : -1;
        
        const isCorrect = userLetter && correctLetter && userLetter === correctLetter;

        if (isCorrect) {
          correctCount++;
          earnedPoints += 1;
        }
        totalPoints += 1;

        // Generate AI-powered feedback
        const aiFeedback = await generateMCQFeedback(
          q.question,
          userAnswer,
          correctLetter,
          opts
        );

        result.isCorrect = isCorrect;
        result.correctAnswer = correctLetter;
        result.pointsEarned = isCorrect ? 1 : 0;
        result.pointsPossible = 1;
        result.feedback = aiFeedback;
        result.details = {
          student_choice: { 
            letter: userLetter, 
            text: userIdx >= 0 ? opts[userIdx] : userAnswer 
          },
          correct_choice: { 
            letter: correctLetter, 
            text: correctIdx >= 0 ? opts[correctIdx] : q.correct_answer 
          }
        };

      } else {
        // Structured/Short Answer Question
        if (!normalize(userAnswer)) {
          result.pointsEarned = 0;
          result.pointsPossible = 4;
          result.feedback = `❌ No valid answer provided.\n\n**Model Answer:** ${q.correct_answer}`;
          result.isCorrect = false;
          totalPoints += 4;
        } else {
          const aiGrading = await generateStructuredFeedback(
            q.question,
            userAnswer,
            q.correct_answer
          );

          earnedPoints += aiGrading.pointsEarned;
          totalPoints += aiGrading.pointsPossible;

          result.pointsEarned = aiGrading.pointsEarned;
          result.pointsPossible = aiGrading.pointsPossible;
          result.feedback = aiGrading.feedback;
          result.isCorrect = aiGrading.pointsEarned >= (aiGrading.pointsPossible * 0.7);
          result.markScheme = q.correct_answer;
        }
      }

      results.push(result);
    }

    // ---------- Calculate final score ----------
    const finalScore = totalPoints > 0 
      ? Math.round((earnedPoints / totalPoints) * 100) 
      : 0;

    // ---------- Save to database ----------
    const savedResult = await prisma.quiz_results.create({
      data: {
        user_id: user.id,
        subject: quiz.subject,
        score: finalScore,
        total_questions: quiz.questions.length,
        correct_answers: correctCount,
        detailed_feedback: JSON.stringify(results),
        submitted_at: new Date(),
      },
    });

    // Save individual feedback items
    for (const r of results) {
      await prisma.quiz_feedback.create({
        data: {
          quiz_result_id: savedResult.id,
          question: r.question,
          user_answer: r.userAnswer,
          correct_answer: quiz.questions.find((x) => x.question === r.question)?.correct_answer || "",
          feedback: r.feedback,
          is_correct: r.isCorrect || false,
        },
      });
    }

    // Log event
    await EventLogs.logEvent("quiz_submitted", { 
      subject: quiz.subject, 
      score: finalScore,
      earnedPoints,
      totalPoints
    }, user.id);

    // ---------- Return comprehensive response ----------
    res.json({ 
      success: true, 
      resultId: savedResult.id, 
      score: finalScore,
      earnedPoints,
      totalPoints,
      feedback: results,
      summary: `You scored ${earnedPoints}/${totalPoints} points (${finalScore}%)`
    });

  } catch (err) {
    console.error("🔥 Quiz marking error:", err);
    res.status(500).json({ success: false, error: "Marking failed" });
  }
});

// ========== QUIZ SUBMISSION ENDPOINT (kept for compatibility) ==========
app.post("/quiz/submit", [validatedRequest], async (req, res) => {
  try {
    const sessionUser = await userFromSession(req, res);
    if (!sessionUser?.id)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const { subject, score, total_questions, correct_answers } = reqBody(req);
    if (!subject || score === undefined)
      return res.status(400).json({ success: false, error: "Missing quiz fields." });

    const result = await prisma.quiz_results.create({
      data: {
        user_id: sessionUser.id,
        subject,
        score,
        total_questions,
        correct_answers,
        submitted_at: new Date(),
      },
    });

    await EventLogs.logEvent("quiz_submitted", { subject, score }, sessionUser.id);
    res.status(201).json({ success: true, result });
  } catch (err) {
    console.error("Error submitting quiz:", err);
    res.status(500).json({ success: false, error: "Failed to submit quiz." });
  }
});

async function generateLessonPlanAI(prompt) {
  try {
    const ollamaUrl =
      process.env.OLLAMA_API_URL || "http://192.168.12.187:11434/api/generate";

    // Enable streaming response
    const response = await axios.post(
      ollamaUrl,
      { model: "gpt-oss:20b", prompt, stream: false },
      { responseType: "text" }
    );

    // 🔹 If stream:false, Ollama will return a complete text block
    if (response.data && typeof response.data === "string") {
      try {
        const parsed = JSON.parse(response.data);
        return parsed.response || parsed.output || JSON.stringify(parsed);
      } catch {
        // Sometimes Ollama returns newline-delimited JSON, combine them
        const lines = response.data
          .split("\n")
          .filter((line) => line.trim().startsWith("{"))
          .map((line) => {
            try {
              return JSON.parse(line).response || "";
            } catch {
              return "";
            }
          })
          .join("");
        return lines.trim();
      }
    }

    // ✅ Handle when Axios parsed it already
    if (response.data?.response) return response.data.response;
    if (Array.isArray(response.data))
      return response.data.map((c) => c.response || c.output || "").join("");

    return JSON.stringify(response.data);
  } catch (err) {
    console.error("AI generation failed:", err.message);
    throw new Error("AI model is unavailable or misconfigured.");
  }
}

app.post(
  "/system/teacher-tools/generate-lesson-plan",
  [validatedRequest],
  async (request, response) => {
    try {
      const sessionUser = await userFromSession(request, response);
      if (!sessionUser?.id) {
        return response
          .status(401)
          .json({ success: false, error: "Unauthorized" });
      }

      const { subject, topic, grade, duration, objectives } = request.body;

      if (!subject || !topic || !grade) {
        return response.status(400).json({
          success: false,
          error: "Subject, topic, and grade are required.",
        });
      }

      // 🧠 AI Prompt
     const prompt = `
You are a professional ${subject} teacher preparing a detailed lesson plan for ${grade} students.

Topic: ${topic}
Lesson Duration: ${duration || "30 minutes"}
Objectives: 
- Write a maximum of 3 learning objectives using Bloom's Taxonomy verbs (e.g., describe, explain, apply, analyze, evaluate, create) to target a range of cognitive skills.

Create a complete, structured lesson plan in Markdown format with:
- Lesson Title
- Objectives (organized by Bloom's Taxonomy, from Remember to Create)
- Introduction (engage students using a Bloom's-level question or activity)
- Lesson Development (activities and examples that progress through Bloom’s levels; use verbs and question stems from Bloom's Taxonomy to scaffold learning)
- Assessment ideas (include tasks/questions for different Bloom's levels)
- Homework or reflection task (encourage higher-level thinking, e.g., design, critique, invent)
`;

      // 🧩 Generate the AI lesson plan
      const aiResponse = await generateLessonPlanAI(prompt);

      // 🧾 Log & respond
      await EventLogs.logEvent(
        "lesson_plan_generated",
        { subject, topic },
        sessionUser.id
      );

      response.status(200).json({
        success: true,
        lessonPlan: aiResponse,
      });
    } catch (err) {
      console.error("Error generating lesson plan:", err);
      response.status(500).json({
        success: false,
        error: "Internal server error while generating lesson plan.",
      });
    }
  }
);

app.post("/system/teacher-tools/generate-scheme-of-work", [validatedRequest], async (request, response) => {
  try {
    const sessionUser = await userFromSession(request, response);
    if (!sessionUser?.id)
      return response.status(401).json({ success: false, error: "Unauthorized" });

    const { subject, grade, term, weeks, curriculum, notes } = request.body;
    if (!subject || !grade || !term)
      return response.status(400).json({ success: false, error: "Missing required fields" });

    const prompt = `
You are a professional ${subject} teacher creating a Scheme of Work for ${grade} (${curriculum || "ZIMSEC/Cambridge"}) — ${term}.
Generate a week-by-week structured scheme covering ${weeks || 8} weeks.

Each week should include:
- **Week Number**
- **Topic**
- **Learning Objectives**
- **Teaching Activities**
- **Resources**
- **Assessment/Assignment**
${notes ? `\nNotes from teacher: ${notes}` : ""}

Return the scheme in Markdown format with clear sections.
`;

    const schemeResponse = await generateLessonPlanAI(prompt);
    response.json({ success: true, scheme: schemeResponse });
  } catch (err) {
    console.error("Error generating scheme of work:", err);
    response.status(500).json({ success: false, error: "Internal error generating scheme of work." });
  }
});

async function searchDuckDuckGo(query) {
  const encodedQuery = encodeURIComponent(query);
  // DuckDuckGo's Instant Answer API endpoint
  const url = `http://api.duckduckgo.com/?q=${encodedQuery}&format=json&pretty=1&no_html=1&skip_disambig=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // The RelatedTopics array often contains web links (called FirstURL)
    const results = data.RelatedTopics.filter(t => t.FirstURL).map(t => ({
      title: t.Text.split(' - ')[0], // Simple extraction
      url: t.FirstURL
    }));

    return results;
  } catch (error) {
    console.error("DuckDuckGo API search error:", error);
    return []; // Return empty array on failure
  }
}

app.post(
  "/system/teacher-tools/resource-finder",
  [validatedRequest],
  async (request, response) => {
    try {
      const sessionUser = await userFromSession(request, response);
      if (!sessionUser?.id) {
        return response
          .status(401)
          .json({ success: false, error: "Unauthorized" });
      }

      const { subject, topic, grade, curriculum, notes } = request.body;

      if (!subject || !topic) {
        return response.status(400).json({
          success: false,
          error: "Subject and topic are required fields.",
        });
      }

      // 🔍 1. Build an optimized search query
      const searchQuery = `${subject} ${topic} teaching resources ${curriculum || 'ZIMSEC'} Grade ${grade || ''}`;
      
      // 🌐 2. Call the DuckDuckGo search function
      const webSearchResults = await searchDuckDuckGo(searchQuery);

      // 📝 3. Format results for the AI prompt
      const formattedResults = webSearchResults.length > 0
        ? webSearchResults.map(result => 
            `- [${result.title}](${result.url})`
          ).join('\n')
        : "None found on the web for direct inclusion.";
      
      const externalResourcesBlock = `
--- External Search Results (Use these as inspiration or direct resources) ---
${formattedResults}
-------------------------------------------------------------------------
`;


      // 🧠 4. Build the AI prompt dynamically, incorporating the web results
      const prompt = `
You are Chikoro AI — a Zimbabwean bilingual AI teaching assistant.
Find and list **teaching and learning resources** for the following topic.

Subject: ${subject}
Topic: ${topic}
Grade/Level: ${grade || "Not specified"}
Curriculum: ${curriculum || "ZIMSEC"}
Additional Notes: ${notes || "None"}

${externalResourcesBlock}

Please produce your answer in clean **Markdown** format with these sections:
1. **Overview** – A 2–3 paragraph topic summary in simple terms.
2. **Key Concepts** – List of main ideas and subtopics learners should know.
3. **Recommended Resources** – At least 5 resources, which may include:
   - Textbooks or notes (give example titles)
   - Online articles or PDFs (mention type or credible platforms)
   - YouTube channels or educational videos
   - Local or Zimbabwean resources if relevant
   
   **IMPORTANT**: Look at the 'External Search Results' above and include the *most relevant* of those links in your final 'Recommended Resources' list, formatted as a proper Markdown link with a description.
   
4. **Suggested Use** – How a teacher might use these resources (e.g., group work, revision, enrichment).

Ensure the output is formatted for readability and teaching use.
      `;

      // 🧩 Generate AI output (same helper used for lesson plans)
      const aiResponse = await generateLessonPlanAI(prompt);

      // 🧾 Log & respond
      await EventLogs.logEvent(
        "resource_finder_used",
        { subject, topic, webResultsCount: webSearchResults.length },
        sessionUser.id
      );

      response.status(200).json({
        success: true,
        resources: aiResponse,
      });
    } catch (err) {
      console.error("Error generating resources:", err);
      response.status(500).json({
        success: false,
        error:
          "Internal server error while generating teaching resources.",
      });
    }
  }
);

app.get("/system/reports/student/:id", [validatedRequest], async (request, response) => {
  try {
    const sessionUser = await userFromSession(request, response);
    if (!sessionUser?.user_id) {
      return response.status(401).json({ success: false, error: "Unauthorized" });
    }

    const studentId = parseInt(request.params.id);
    if (!studentId || isNaN(studentId)) {
      return response.status(400).json({ success: false, error: "Invalid student ID" });
    }

    // 🧠 Fetch student data
    const student = await prisma.students.findUnique({ 
      where: { id: studentId } 
    });
    
    if (!student) {
      return response.status(404).json({ success: false, error: "Student not found" });
    }

    console.log("Student user_id:", student.user_id);

    if (!student.user_id) {
      return response.status(400).json({ 
        success: false, 
        error: "Student record has no user_id" 
      });
    }

    // ✅ Fetch quizzes
    const quizzes = await prisma.quiz_results.findMany({
      where: { user_id: student.user_id },
      select: { 
        id: true, 
        subject: true, 
        score: true, 
        total_questions: true,
        correct_answers: true,
        submitted_at: true
      },
      orderBy: { submitted_at: 'desc' },
    });

    // ✅ Fetch XP logs - FIXED BOTH ISSUES
    const xpLogs = await prisma.event_logs.findMany({
      where: { 
        userId: student.user_id, 
        event: "xp_gain" 
      },
      select: { 
        metadata: true, 
        occurredAt: true  // ✅ FIXED: occurredAt (not createdAt)
      },
    });

    // 🧮 Calculate stats
    const difficultyWeights = { Easy: 1, Medium: 1.5, Hard: 2 };

let totalWeightedScore = 0;
let totalWeight = 0;

for (const q of quizzes) {
  const percentage = q.score; 
  const difficulty = q.shared_quizzes?.difficulty || "Medium";
  const difficultyWeight = difficultyWeights[difficulty] || 1;
  const weight = q.total_questions * difficultyWeight;

  totalWeightedScore += percentage * weight;
  totalWeight += weight;
}

const averageScore =
  totalWeight > 0 ? (totalWeightedScore / totalWeight).toFixed(1) : "0.0";

    const totalFlashcards = 0;
    const mastered = 0;

    const totalXP = xpLogs.reduce((sum, log) => {
      const points = typeof log.metadata === 'object' 
        ? log.metadata?.points || 0 
        : 0;
      return sum + points;
    }, 0);

    // 🧠 Generate AI summary
    const summaryPrompt = `
You are Chikoro AI, an educational data analyst for teachers.
Analyze the following student's progress and write a professional, encouraging summary.

Name: ${student.name}
Grade: ${student.grade}
Average Quiz Score: ${averageScore}%
Total Quizzes Taken: ${quizzes.length}
XP Points: ${totalXP}

Recent Quizzes:
${quizzes.length > 0 
  ? quizzes
      .slice(0, 5)
     .map((q) => `- ${q.subject || 'General'}: ${q.score}% (${q.correct_answers}/${q.total_questions} correct)`)
      .join("\n")
  : "No quizzes taken yet."
}

Provide:
1. A short paragraph summary of overall performance.
2. Key strengths observed.
3. Areas for improvement.
4. Suggested next learning steps.

Format neatly in Markdown with proper headers.
Only provide the summary text — no additional explanations or questions
    `;

    const aiSummary = await generateLessonPlanAI(summaryPrompt);

    // ✅ Transform quizzes
    const formattedQuizzes = quizzes.map(q => ({
      id: q.id,
      subject: q.subject,
      score: q.score,
       correct_answers: q.correct_answers, 
      total: q.total_questions,
      createdAt: q.submitted_at,
    }));

    // ✅ Respond
    response.status(200).json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
      },
      quizzes: formattedQuizzes,
      summary: aiSummary,
      averageScore: parseFloat(averageScore),
      totalXP,
      mastered,
      totalFlashcards,
    });
  } catch (err) {
    console.error("📉 Error generating report:", err);
    console.error("Error stack:", err.stack);
    response.status(500).json({
      success: false,
      error: "Internal server error while generating report.",
    });
  }
});

app.post("/system/link-student/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { studentId, subject } = req.body;
    const id = Number(userId);

    if (isNaN(id) || !studentId || !subject)
      return res.status(400).json({ success: false, error: "Invalid request data." });

    const teacher = await prisma.teachers.findFirst({ where: { userId: id } });
    if (!teacher) return res.status(404).json({ success: false, error: "Teacher profile not found." });

    const existing = await prisma.teacher_students.findFirst({
      where: { teacherId: teacher.id, studentId },
    });
    if (existing)
      return res.status(409).json({ success: false, error: "Student already linked." });

    const link = await prisma.teacher_students.create({
      data: { teacherId: teacher.id, studentId, subject },
    });

    res.json({ success: true, link });
  } catch (err) {
    console.error("Error linking student:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
}); 

app.post("/system/teacher/generate-quiz", [validatedRequest], async (req, res) => {
  try {
    const { subject, topic, grade, difficulty, numQuestions, questionType } = req.body;

  let prompt = `You are a quiz generator. Generate ONLY the quiz questions with NO introductory text.

Create a ${difficulty} difficulty quiz with ${numQuestions} questions about ${topic} for ${subject}, grade ${grade}.

CRITICAL: Start immediately with question 1. No preamble, no explanations, just questions.
`;

if (questionType === 'multiple-choice') {
  prompt += `
Format each question EXACTLY like this:

1. What is photosynthesis?
A) The process of respiration
B) The process plants use to make food
C) Cell division
D) The process of digestion
**Answer: B**

2. Which organelle performs photosynthesis?
A) Nucleus
B) Mitochondria
C) Chloroplast
D) Ribosome
**Answer: C**

RULES:
- Start with question number
- Provide exactly 4 options (A, B, C, D)
- Mark correct answer as **Answer: X** immediately after options
- NO introductory text
- NO explanations between questions
`;
} 
else if (questionType === 'structured') {
  prompt += `
Format each question EXACTLY like this:

1. Explain the process of photosynthesis. [4 marks]
Mark Scheme:
- Plants use light energy (1 mark)
- Carbon dioxide and water are reactants (1 mark)
- Glucose and oxygen are products (1 mark)
- Occurs in chloroplasts (1 mark)

2. Describe the role of chloroplasts. [3 marks]
Mark Scheme:
- Site of photosynthesis (1 mark)
- Contains chlorophyll (1 mark)
- Found in plant cells (1 mark)

RULES:
- Start with question number
- Include marks in square brackets
- Provide detailed mark scheme immediately after
- NO introductory text
`;
}
else if (questionType === 'mixed') {
  prompt += `
Alternate between multiple choice and structured questions in EQUAL proportion.

Example format:

1. What is photosynthesis?
A) The process of respiration
B) The process plants use to make food
C) Cell division
D) The process of digestion
**Answer: B**

2. Explain how plants perform photosynthesis. [3 marks]
Mark Scheme:
- Uses light energy (1 mark)
- CO2 + H2O → glucose (1 mark)
- Occurs in chloroplasts (1 mark)

3. Which organelle performs photosynthesis?
A) Nucleus
B) Mitochondria
C) Chloroplast
D) Ribosome
**Answer: C**

4. Describe the importance of photosynthesis to life on Earth. [4 marks]
Mark Scheme:
- Produces oxygen for respiration (1 mark)
- Base of food chains (1 mark)
- Removes CO2 from atmosphere (1 mark)
- Provides energy for organisms (1 mark)

RULES:
- Start immediately with question 1
- Alternate: MCQ, Structured, MCQ, Structured...
- NO introductory text
- For MCQ: Include **Answer: X** after options
- For Structured: Include Mark Scheme after question
`;
}

prompt += `\n\nREMEMBER: Start with "1." immediately. No preamble or introduction!`;

    // ✅ Use the same function you use for lesson plans
    const quiz = await generateLessonPlanAI(prompt);
    
    // Clean the response
    const cleanedQuiz = quiz
      .replace(/^.*?(?:here'?s?|here is).*?quiz.*?:/i, '')
      .replace(/^(sure|certainly|okay|alright)[!,.\s]*/i, '')
      .replace(/```.*?```/gs, '')
      .trim();

    res.json({ success: true, quiz: cleanedQuiz });
  } catch (err) {
    console.error("Error generating quiz:", err);
    res.status(500).json({ success: false, error: "Failed to generate quiz" });
  }
});

app.post("/system/teacher/share-quiz-with-class", [validatedRequest], async (req, res) => {
  try {
    const sessionUser = await userFromSession(req, res);
    if (!sessionUser?.user_id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { quiz, subject, topic, difficulty, studentIds } = req.body;

    // Generate unique quiz code
    const crypto = await import("crypto");
    const quizCode = crypto.randomBytes(6).toString("hex").toUpperCase();

    const teacher = await prisma.teachers.findFirst({
      where: { user_id: sessionUser.user_id }
    });

    if (!teacher) {
      return res.status(400).json({ success: false, error: "Teacher record not found" });
    }

    // Save quiz to database
    const savedQuiz = await prisma.shared_quizzes.create({
      data: {
        teacher_id: teacher.id,
        quiz_code: quizCode,
        subject,
        topic,
        difficulty,
        quiz_content: quiz,
        is_class_specific: true,
        created_at: new Date()
      }
    });

    // Link quiz to specific students
    const studentQuizLinks = studentIds.map(studentId => ({
      quiz_id: savedQuiz.id,
      student_id: studentId,
      assigned_at: new Date(),
      completed: false
    }));

    await prisma.student_quiz_assignments.createMany({
      data: studentQuizLinks
    });

    // Get student user IDs from student records
    const students = await prisma.students.findMany({
      where: {
        id: { in: studentIds }
      },
      select: {
        id: true,
        user_id: true
      }
    });

    console.log("📊 Found students:", students);
    console.log("🔌 Connected clients:", Array.from(connectedClients.keys()));

    // Create notifications for each student
    const notifications = students.map(student => ({
      userId: student.user_id, // Use user_id instead of student id
      type: 'quiz_assigned',
      message: `New ${subject} quiz: ${topic}`,
      link: `/student/quiz/${quizCode}`,
      createdAt: new Date()
    }));

    await prisma.notifications.createMany({
      data: notifications
    });

    // Send real-time WebSocket notifications using user_id
    let notificationsSent = 0;
    students.forEach((student) => {
      const clientWs = connectedClients.get(student.user_id);
      console.log(`🔍 Checking user_id ${student.user_id}:`, clientWs ? "Connected" : "Not connected");
      
      if (clientWs && clientWs.readyState === 1) { // 1 = OPEN
        clientWs.send(
          JSON.stringify({
            type: "quiz_assigned",
            message: `New ${subject} quiz: ${topic}`,
            link: `/student/quiz/${quizCode}`,
            createdAt: new Date().toISOString()
          })
        );
        notificationsSent++;
        console.log(`✅ Sent notification to user_id ${student.user_id}`);
      } else {
        console.log(`⚠️ User ${student.user_id} not connected or socket not open`);
      }
    });

    const quizLink = `https://chikoro-ai.com/student/quiz/${quizCode}`;

    res.json({
      success: true,
      quizLink,
      studentsNotified: students.length,
      notificationsSent
    });

  } catch (err) {
    console.error("Error sharing quiz with class:", err);
    res.status(500).json({ success: false, error: "Failed to share quiz" });
  }
});

app.get("/system/notifications/unread", [validatedRequest], async (req, res) => {
  try {
    const sessionUser = await userFromSession(req, res);
    if (!sessionUser?.user_id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Fetch unread quiz notifications
    const notifications = await prisma.notifications.findMany({
      where: {
        userId: sessionUser.user_id,
        type: 'quiz_assigned',
        read: false,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    console.log(`📬 User ${sessionUser.user_id} has ${notifications.length} unread notifications`);

    res.json({
      success: true,
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        message: n.message,
        link: n.link,
        createdAt: n.createdAt,
      }))
    });

  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ success: false, error: "Failed to fetch notifications" });
  }
});

app.patch("/system/notifications/:id/read", [validatedRequest], async (req, res) => {
  try {
    const sessionUser = await userFromSession(req, res);
    if (!sessionUser?.user_id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const notificationId = parseInt(req.params.id);

    // Verify notification belongs to user and update
    const notification = await prisma.notifications.findFirst({
      where: {
        id: notificationId,
        userId: sessionUser.user_id,
      }
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }

    await prisma.notifications.update({
      where: { id: notificationId },
      data: { read: true },
    });

    console.log(`✅ Marked notification ${notificationId} as read`);

    res.json({ success: true });

  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ success: false, error: "Failed to update notification" });
  }
});
// Create public quiz link (not class-specific)
app.post("/system/teacher/create-quiz-link", [validatedRequest], async (req, res) => {
  try {
    const sessionUser = await userFromSession(req, res);
    if (!sessionUser?.user_id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { quiz, subject, topic, difficulty } = req.body;

    const crypto = await import("crypto");
    const quizCode = crypto.randomBytes(6).toString("hex").toUpperCase();
const teacher = await prisma.teachers.findFirst({
  where: { user_id: sessionUser.user_id },
});

if (!teacher) {
  return res.status(404).json({ success: false, error: "Teacher not found" });
}

await prisma.shared_quizzes.create({
  data: {
    teacher_id: teacher.id,
    quiz_code: quizCode,
    subject,
    topic,
    difficulty,
    quiz_content: quiz,
    is_class_specific: false,
    created_at: new Date(),
  },
});

    const quizLink = `https://chikoro-ai.com/student/quiz/${quizCode}`;

    res.json({ success: true, link: quizLink });

  } catch (err) {
    console.error("Error creating quiz link:", err);
    res.status(500).json({ success: false, error: "Failed to create quiz link" });
  }
});

// Get quiz by code
app.get("/system/quiz/:code", async (req, res) => {
  try {
    const quiz = await prisma.shared_quizzes.findUnique({
      where: { quiz_code: req.params.code },
    });

    if (!quiz) {
      return res.status(404).json({ success: false, error: "Quiz not found" });
    }

    res.json({ success: true, quiz });
  } catch (err) {
    console.error("Error fetching quiz:", err);
    res.status(500).json({ success: false, error: "Failed to load quiz" });
  }
});

// Submit student quiz
app.post("/system/student/submit-quiz", async (req, res) => {
  try {
    const { quizCode, answers, studentId } = req.body;

    const quiz = await prisma.shared_quizzes.findUnique({
      where: { quiz_code: quizCode },
    });

    if (!quiz) {
      return res.status(404).json({ success: false, error: "Quiz not found" });
    }

    // 🧹 Clean and parse quiz
    const cleanedQuiz = quiz.quiz_content
      .replace(/^.*?(?:here'?s?|here is).*?quiz.*?:/i, "")
      .replace(/^(sure|certainly|okay|alright)[!,.\s]*/i, "")
      .replace(/```.*?```/gs, "")
      .trim();

    const questionBlocks = cleanedQuiz.split(/\n(?=\d+\.)/);

    // 📘 Parse questions with correct answers and mark schemes
    const parsedQuestions = questionBlocks.map((block, i) => {
      const lines = block.split("\n").filter((l) => l.trim());
      const questionText = lines[0]?.replace(/^\d+\.\s*/, "");
      const hasOptions = lines.some((l) => /^[A-D]\)/.test(l));
      const answerMatch = block.match(/\*?\*?Answer:\s*([A-D])/i);
      
      // Extract mark scheme for structured questions
      const markSchemeIndex = lines.findIndex(line => 
        /^(Mark Scheme|Answer|Expected Answer|Marking Points?):/i.test(line)
      );
      const markScheme = markSchemeIndex > 0 
        ? lines.slice(markSchemeIndex).join('\n')
        : null;

      return {
        index: i,
        question: questionText,
        fullBlock: block,
        type: hasOptions ? "multiple-choice" : "structured",
        correctAnswer: answerMatch ? answerMatch[1].toUpperCase() : null,
        options: hasOptions ? lines.filter(l => /^[A-D]\)/.test(l)) : [],
        markScheme: markScheme,
      };
    });

    // 🧮 Grade and generate feedback for each answer
    const detailedFeedback = [];
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const studentAnswer of answers) {
      const question = parsedQuestions[studentAnswer.questionIndex];
      if (!question) continue;

      let feedback = {
        questionNumber: studentAnswer.questionIndex + 1,
        question: question.question,
        studentAnswer: studentAnswer.answer,
        type: question.type,
      };

      if (question.type === "multiple-choice") {
        // Auto-grade multiple choice
        const studentLetter = studentAnswer.answer.trim().charAt(0).toUpperCase();
        const isCorrect = studentLetter === question.correctAnswer;
        
        if (isCorrect) {
          correctCount++;
          earnedPoints += 1;
        }
        totalPoints += 1;

        // Generate AI feedback for multiple choice
        const mcFeedbackPrompt = `
You are an encouraging teacher providing feedback on a multiple-choice question.

Question: ${question.question}
Options:
${question.options.join('\n')}

Student's Answer: ${studentAnswer.answer}
Correct Answer: ${question.correctAnswer})

Provide detailed feedback that:
1. Confirms if the answer is correct or incorrect
2. Explains WHY the correct answer is right (even if they got it right, reinforce the concept)
3. If incorrect, explain the misconception and why their choice was wrong
4. Provide additional context or a helpful tip to remember this concept
5. Be encouraging and constructive

Keep it concise but thorough (3-4 sentences).
`;

        const aiFeedback = await generateLessonPlanAI(mcFeedbackPrompt);

        feedback.isCorrect = isCorrect;
        feedback.correctAnswer = question.correctAnswer;
        feedback.explanation = aiFeedback.trim();
        feedback.pointsEarned = isCorrect ? 1 : 0;
        feedback.pointsPossible = 1;

      } else {
        // AI-powered grading for structured questions
        const structuredGradingPrompt = `
You are an expert teacher grading a structured question answer. Be fair but thorough.

Question: ${question.question}

Mark Scheme:
${question.markScheme || "Award marks for accurate, relevant points that demonstrate understanding."}

Student's Answer:
${studentAnswer.answer}

Provide:
1. A numerical score out of the total marks available (estimate based on mark scheme)
2. Detailed feedback on what was done well
3. What was missing or could be improved
4. Specific suggestions for strengthening the answer
5. Encouragement and next steps

Format your response as:
SCORE: X/Y
FEEDBACK: [Your detailed feedback]
`;

        const aiGrading = await generateLessonPlanAI(structuredGradingPrompt);

        // Parse AI response
        const scoreMatch = aiGrading.match(/SCORE:\s*(\d+)\s*\/\s*(\d+)/i);
        const feedbackMatch = aiGrading.match(/FEEDBACK:\s*(.+)/is);

        const pointsEarnedStructured = scoreMatch ? parseInt(scoreMatch[1]) : 0;
        const pointsPossibleStructured = scoreMatch ? parseInt(scoreMatch[2]) : 4;

        earnedPoints += pointsEarnedStructured;
        totalPoints += pointsPossibleStructured;

        feedback.pointsEarned = pointsEarnedStructured;
        feedback.pointsPossible = pointsPossibleStructured;
        feedback.explanation = feedbackMatch ? feedbackMatch[1].trim() : aiGrading;
        feedback.markScheme = question.markScheme;
      }

      detailedFeedback.push(feedback);
    }

    // Calculate final score
    const finalScore = totalPoints > 0 
      ? Math.round((earnedPoints / totalPoints) * 100) 
      : 0;

    // 🗂️ Save quiz results with detailed feedback
    const result = await prisma.quiz_results.create({
      data: {
        user_id: studentId,
        subject: quiz.subject,
        quiz_code: quiz.quiz_code,
        shared_quiz_id: quiz.id,
        total_questions: answers.length,
        correct_answers: correctCount,
        score: finalScore,
        detailed_feedback: JSON.stringify(detailedFeedback),
        submitted_at: new Date(),
      },
    });

    // ✅ Return comprehensive feedback
    res.json({
      success: true,
      resultId: result.id,
      score: finalScore,
      earnedPoints,
      totalPoints,
      feedback: detailedFeedback,
      summary: `You scored ${earnedPoints}/${totalPoints} points (${finalScore}%)`,
    });

  } catch (err) {
    console.error("Error submitting quiz:", err);
    res.status(500).json({ success: false, error: "Submission failed" });
  }
});

app.get("/system/teacher/quiz-results/:quizId", async (req, res) => {
  const results = await prisma.quiz_results.findMany({
    where: { shared_quiz_id: parseInt(req.params.quizId) },
    include: { user: true },
  });

  res.json({ success: true, results });
});
// Endpoint for students to access quiz
app.get("/system/quiz/:quizCode", async (req, res) => {
  try {
    const { quizCode } = req.params;

    const quiz = await prisma.shared_quizzes.findUnique({
      where: { quiz_code: quizCode },
      include: {
        teacher: {
          include: {
            user: {
              select: { username: true }
            }
          }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ success: false, error: "Quiz not found" });
    }

    res.json({
      success: true,
      quiz: {
        subject: quiz.subject,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        content: quiz.quiz_content,
        teacherName: quiz.teacher.user.username
      }
    });

  } catch (err) {
    console.error("Error fetching quiz:", err);
    res.status(500).json({ success: false, error: "Failed to fetch quiz" });
  }
});

app.post("/system/teacher/redo-question", async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await generateLessonPlanAI(prompt);
    const question = response.split("\n")[0]; // simple extraction
    res.json({ success: true, question });
  } catch (err) {
    console.error("Error regenerating question:", err);
    res.status(500).json({ success: false, error: "AI regeneration failed." });
  }
});

app.get("/system/teacher/my-students/:userId", async (req, res) => {
  const { userId } = req.params;
  const id = Number(userId);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid teacher ID." });

  try {
    const teacher = await prisma.teachers.findFirst({
      where: { user_id: id },
    });
    if (!teacher) 
      return res.status(404).json({ success: false, error: "Teacher not found." });

    const linked = await prisma.teacher_students.findMany({
      where: { teacherId: teacher.id },
      include: { student: true },
    });

    const students = linked.map((link) => ({
      id: link.student.id,
      name: link.student.name,
      grade: link.student.grade,
      subject: link.subject,
    }));

    res.json({ success: true, students });
  } catch (err) {
    console.error("Error fetching teacher's linked students:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get child report for parent
app.get("/system/parent/child-report/:childId", [validatedRequest], async (req, res) => {
  try {
    const { childId } = req.params;
    
    // Get userId from the token in the Authorization header
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: "Authentication required" 
      });
    }

    // Decode the token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    console.log("🔍 Fetching report for childId:", childId, "by userId:", userId);
    
    // Find parent record
    const parent = await prisma.parents.findFirst({
      where: { user_id: Number(userId) },
    });

    if (!parent) {
      console.log("❌ Parent not found for userId:", userId);
      return res.status(403).json({ 
        success: false, 
        error: "Parent profile not found" 
      });
    }

    console.log("✅ Parent found:", parent.id);

    // Verify this parent is linked to this child
    const link = await prisma.parent_students.findFirst({
      where: {
        parentId: parent.id,
        studentId: Number(childId),
      },
    });

    if (!link) {
      console.log("❌ No link found between parent and child");
      return res.status(403).json({ 
        success: false, 
        error: "You don't have access to this child's reports" 
      });
    }

    console.log("✅ Link verified:", link.id);
    
    // Get student info
    const student = await prisma.students.findUnique({
      where: { id: Number(childId) },
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        error: "Student not found" 
      });
    }

    console.log("✅ Student found:", student.name);

    // Get quiz results for this student
    const quizResults = await prisma.quiz_results.findMany({
      where: { user_id: student.user_id },
      orderBy: { submitted_at: 'desc' },
      take: 50, // Get more for better analytics
    });

    console.log("✅ Found", quizResults.length, "quiz results");

    // Format quizzes to match frontend expectations
    const quizzes = quizResults.map(result => ({
      id: result.id,
      subject: result.subject || 'General',
      topic: result.topic || 'General Topic',
      score: result.score || 0,
      correct_answers: result.correctAnswers || 0,
      total: result.totalQuestions || 0,
      difficulty: result.difficulty || 'Medium', // Add difficulty field if exists, otherwise default
      createdAt: result.submitted_at || result.completedAt || new Date(), // Use submitted_at or completedAt
    }));

    // Calculate statistics
    const totalQuizzes = quizzes.length;
    const averageScore = totalQuizzes > 0 
      ? Math.round(quizzes.reduce((sum, q) => sum + parseFloat(q.score), 0) / totalQuizzes)
      : 0;
    
    // Calculate total XP (you might want to get this from a separate table)
    const totalXP = quizzes.reduce((sum, q) => {
      const score = parseFloat(q.score);
      // Award XP based on score: 10 XP per quiz + bonus for high scores
      return sum + 10 + (score >= 80 ? 15 : score >= 60 ? 10 : 5);
    }, 0);

    // Get flashcard statistics (adjust based on your schema)
    // You'll need to query your flashcards table if you have one
    const totalFlashcards = 0; // TODO: Query from your flashcards table
    const mastered = 0; // TODO: Query mastered flashcards

    // Generate AI summary
    const generateSummary = () => {
      if (totalQuizzes === 0) {
        return "No quiz data available yet. Encourage your child to complete some quizzes to see detailed insights!";
      }

      const topSubjects = {};
      quizzes.forEach(q => {
        const subj = q.subject || 'General';
        if (!topSubjects[subj]) {
          topSubjects[subj] = { total: 0, count: 0 };
        }
        topSubjects[subj].total += parseFloat(q.score);
        topSubjects[subj].count += 1;
      });

      const subjectAverages = Object.entries(topSubjects)
        .map(([subject, data]) => ({
          subject,
          average: (data.total / data.count).toFixed(1)
        }))
        .sort((a, b) => b.average - a.average);

      const bestSubject = subjectAverages[0];
      const weakestSubject = subjectAverages[subjectAverages.length - 1];

      let summary = `## Overall Performance\n\n`;
      summary += `${student.name} has completed **${totalQuizzes} quizzes** with an average score of **${averageScore}%**. `;
      
      if (averageScore >= 80) {
        summary += `This is an excellent performance! 🎉\n\n`;
      } else if (averageScore >= 60) {
        summary += `This shows good progress with room for improvement. 📈\n\n`;
      } else {
        summary += `There's significant room for growth. Keep practicing! 💪\n\n`;
      }

      summary += `## Subject Analysis\n\n`;
      summary += `**Strongest Subject:** ${bestSubject.subject} (${bestSubject.average}% average) 🌟\n\n`;
      
      if (subjectAverages.length > 1) {
        summary += `**Area for Improvement:** ${weakestSubject.subject} (${weakestSubject.average}% average)\n\n`;
      }

      // Recent performance trend
      const recentQuizzes = quizzes.slice(0, 5);
      const recentAvg = recentQuizzes.reduce((sum, q) => sum + parseFloat(q.score), 0) / recentQuizzes.length;
      
      summary += `## Recent Trend\n\n`;
      summary += `Recent average: **${recentAvg.toFixed(1)}%** `;
      
      if (recentAvg > averageScore + 5) {
        summary += `(Improving! 📈)\n\n`;
      } else if (recentAvg < averageScore - 5) {
        summary += `(Needs attention 🔍)\n\n`;
      } else {
        summary += `(Stable performance ➡️)\n\n`;
      }

      summary += `## Recommendations\n\n`;
      summary += `- Continue practicing ${bestSubject.subject} to maintain excellence\n`;
      if (subjectAverages.length > 1) {
        summary += `- Spend more time on ${weakestSubject.subject} concepts\n`;
      }
      summary += `- Aim for consistency by taking regular quizzes\n`;
      summary += `- Review incorrect answers to learn from mistakes\n`;

      return summary;
    };

    const summary = generateSummary();

    // Return data in the format the frontend expects
    res.json({ 
      success: true, 
      child: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        streak: 0, // TODO: Calculate streak from activity
      },
      reports: [
        {
          date: new Date().toISOString(),
          quizzes: quizzes,
          summary: summary,
          averageScore: averageScore,
          totalXP: totalXP,
          mastered: mastered,
          totalFlashcards: totalFlashcards,
        }
      ]
    });
  } catch (err) {
    console.error("Error fetching child report:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch report",
      details: err.message 
    });
  }
});

app.get("/system/students", async (req, res) => {
  try {
    const students = await prisma.students.findMany({
      select: { id: true, name: true, grade: true, subscription_status: true,subscription_plan: true,subscription_expiration_date: true, },
    });
    res.json({ success: true, students });
  } catch (err) {
    console.error("Error fetching all students:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});


app.get("/system/parent/my-children/:parentId", [validatedRequest], async (req, res) => {
  try {
    const { parentId } = req.params;
    const links = await prisma.parent_students.findMany({
      where: { parentId: Number(parentId) },
      include: {
        student: true,
      },
    });

    // Map child stats (extend as needed)
    const children = links.map(link => ({
      id: link.student.id,
      name: link.student.name,
      grade: link.student.grade,
      linkId: link.id,
    }));

    res.json({ success: true, children });
  } catch (err) {
    console.error("Error fetching children:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Generate a unique link code for students
app.post("/system/student/generate-link-code", [validatedRequest], async (req, res) => {
  try {
    const { studentId } = req.body;
    
    // Validate studentId
    if (!studentId || isNaN(Number(studentId))) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid student ID" 
      });
    }
    
    // Verify student exists
    const student = await prisma.students.findUnique({
      where: { id: Number(studentId) },
    });
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        error: "Student not found" 
      });
    }
    
    // Generate a unique 8-character code
    const linkCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newCode = await prisma.student_link_codes.create({
      data: {
        studentId: Number(studentId),
        code: linkCode,
        expiresAt,
        used: false,
      },
    });

    res.json({ 
      success: true, 
      linkCode: newCode.code, 
      expiresAt: newCode.expiresAt 
    });
  } catch (err) {
    console.error("Error generating link code:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to generate code",
      details: err.message 
    });
  }
});

// Backend: Parent uses code to link
app.post("/system/parent/link-child", [validatedRequest], async (req, res) => {
  try {
    const { parentId, linkCode } = req.body;

    console.log("🔍 Received:", { parentId, linkCode }); // Debug log

    // Validate inputs
    if (!parentId || !linkCode) {
      return res.status(400).json({ 
        success: false, 
        error: "Parent ID and link code are required" 
      });
    }

    // First, find the parent record using the user ID
    const parent = await prisma.parents.findFirst({
      where: { user_id: Number(parentId) },
    });

    if (!parent) {
      return res.status(404).json({ 
        success: false, 
        error: "Parent profile not found" 
      });
    }

    console.log("✅ Parent found:", parent.id); // Debug log

    // Find and validate the link code
    const codeRecord = await prisma.student_link_codes.findFirst({
      where: {
        code: linkCode.toUpperCase(),
        used: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!codeRecord) {
      return res.status(404).json({ 
        success: false, 
        error: "Invalid or expired link code" 
      });
    }

    console.log("✅ Code validated:", codeRecord.code); // Debug log

    // Check if already linked (use parent.id, not parentId from request)
    const existingLink = await prisma.parent_students.findFirst({
      where: {
        parentId: parent.id, // Use the actual parent record ID
        studentId: codeRecord.studentId,
      },
    });

    if (existingLink) {
      return res.status(400).json({ 
        success: false, 
        error: "This child is already linked to your account" 
      });
    }

    // Create the link (use parent.id)
    const link = await prisma.parent_students.create({
      data: {
        parentId: parent.id, // Use the actual parent record ID
        studentId: codeRecord.studentId,
        linkedAt: new Date(),
      },
      include: {
        student: true,
      },
    });

    console.log("✅ Link created:", link.id); // Debug log

    // Mark code as used
    await prisma.student_link_codes.update({
      where: { id: codeRecord.id },
      data: { 
        used: true, 
        usedAt: new Date() 
      },
    });

    res.json({ 
      success: true, 
      link,
      message: `Successfully linked ${link.student.name}` 
    });
  } catch (err) {
    console.error("Error linking child:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to link child",
      details: err.message 
    });
  }
});


app.post("/system/teacher/create-class-link", [validatedRequest], async (req, res) => {
  try {
    const { subject } = req.body;
    const sessionUser = await userFromSession(req, res);

    if (!sessionUser?.user_id) {  // ✅ Check user_id instead of id
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const teacher = await prisma.teachers.findFirst({
  where: { user_id: sessionUser.user_id },  // ✅ Use user_id instead of id
    });

    if (!teacher) {
      return res.status(404).json({ success: false, error: "Teacher not found" });
    }

    const crypto = await import("crypto");
    const classCode = subject.slice(0, 3).toUpperCase() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();

    const classLink = await prisma.class_links.create({
      data: { teacherId: teacher.id, subject, classCode },
    });

    const joinUrl = `https://chikoro-ai.com/join/${classCode}`;
    res.json({ success: true, classLink: { ...classLink, joinUrl } });
  } catch (err) {
    console.error("Error creating class link:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post("/system/student/join-class/:classCode", [validatedRequest], async (req, res) => {
  try {
    const { classCode } = req.params;
    const sessionUser = await userFromSession(req, res);

    if (!sessionUser?.user_id)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const student = await prisma.students.findFirst({
      where: { user_id: sessionUser.user_id },
    });
    if (!student)
      return res.status(404).json({ success: false, error: "Student profile not found" });

    const classLink = await prisma.class_links.findUnique({ where: { classCode } });
    if (!classLink)
      return res.status(404).json({ success: false, error: "Class not found" });

    // ✅ Check for the specific teacher-student-subject combo
    const existing = await prisma.teacher_students.findFirst({
      where: { 
        teacherId: classLink.teacherId, 
        studentId: student.id,
        subject: classLink.subject  // ✅ Added subject check
      },
    });
    
    if (existing)
      return res.status(409).json({ 
        success: false, 
        error: `Already joined ${classLink.subject} with this teacher` 
      });

    await prisma.teacher_students.create({
      data: {
        teacherId: classLink.teacherId,
        studentId: student.id,
        subject: classLink.subject,
      },
    });

    res.json({ success: true, message: `Joined ${classLink.subject} successfully!` });
  } catch (err) {
    console.error("Error joining class:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.get("/system/student/active-link-code/:studentId", [validatedRequest], async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const linkCode = await prisma.student_link_codes.findFirst({
      where: {
        studentId: Number(studentId),
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, linkCode });
  } catch (err) {
    console.error("Error fetching active link code:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post("/request-token", async (request, response) => {
    try {
      const bcrypt = require("bcrypt");

      if (await SystemSettings.isMultiUserMode()) {
        if (simpleSSOLoginDisabled()) {
          response.status(403).json({
            user: null,
            valid: false,
            token: null,
            message:
              "[005] Login via credentials has been disabled by the administrator.",
          });
          return;
        }

        const { username, password } = reqBody(request);
        const existingUser = await User._get({ username: String(username) });

        if (!existingUser) {
          await EventLogs.logEvent(
            "failed_login_invalid_username",
            {
              ip: request.ip || "Unknown IP",
              username: username || "Unknown user",
            },
            existingUser?.id
          );
          response.status(200).json({
            user: null,
            valid: false,
            token: null,
            message: "[001] Invalid login credentials.",
          });
          return;
        }

        if (!bcrypt.compareSync(String(password), existingUser.password)) {
          await EventLogs.logEvent(
            "failed_login_invalid_password",
            {
              ip: request.ip || "Unknown IP",
              username: username || "Unknown user",
            },
            existingUser?.id
          );
          response.status(200).json({
            user: null,
            valid: false,
            token: null,
            message: "[002] Invalid login credentials.",
          });
          return;
        }

        if (existingUser.suspended) {
          await EventLogs.logEvent(
            "failed_login_account_suspended",
            {
              ip: request.ip || "Unknown IP",
              username: username || "Unknown user",
            },
            existingUser?.id
          );
          response.status(200).json({
            user: null,
            valid: false,
            token: null,
            message: "[004] Account suspended by admin.",
          });
          return;
        }

        await Telemetry.sendTelemetry(
          "login_event",
          { multiUserMode: false },
          existingUser?.id
        );

        await EventLogs.logEvent(
          "login_event",
          {
            ip: request.ip || "Unknown IP",
            username: existingUser.username || "Unknown user",
          },
          existingUser?.id
        );

        // Generate a session token for the user then check if they have seen the recovery codes
        // and if not, generate recovery codes and return them to the frontend.
        const sessionToken = makeJWT(
          { id: existingUser.id, username: existingUser.username },
          process.env.JWT_EXPIRY
        );
        if (!existingUser.seen_recovery_codes) {
          const plainTextCodes = await generateRecoveryCodes(existingUser.id);
          response.status(200).json({
            valid: true,
            user: User.filterFields(existingUser),
            token: sessionToken,
            message: null,
            recoveryCodes: plainTextCodes,
          });
          return;
        }

        response.status(200).json({
          valid: true,
          user: User.filterFields(existingUser),
          token: sessionToken,
          message: null,
        });
        return;
      } else {
        const { password } = reqBody(request);
        if (
          !bcrypt.compareSync(
            password,
            bcrypt.hashSync(process.env.AUTH_TOKEN, 10)
          )
        ) {
          await EventLogs.logEvent("failed_login_invalid_password", {
            ip: request.ip || "Unknown IP",
            multiUserMode: false,
          });
          response.status(401).json({
            valid: false,
            token: null,
            message: "[003] Invalid password provided",
          });
          return;
        }

        await Telemetry.sendTelemetry("login_event", { multiUserMode: false });
        await EventLogs.logEvent("login_event", {
          ip: request.ip || "Unknown IP",
          multiUserMode: false,
        });
        response.status(200).json({
          valid: true,
          token: makeJWT(
            { p: new EncryptionManager().encrypt(password) },
            process.env.JWT_EXPIRY
          ),
          message: null,
        });
      }
    } catch (e) {
      console.error(e.message, e);
      response.sendStatus(500).end();
    }
  });

    app.post("/system/register", async (request, response) => {
    try {
      const bcrypt = require("bcrypt");
      const jwt = require("jsonwebtoken");

      const { username, password } = reqBody(request);
      if (!username || !password) {
        return response.status(400).json({
          success: false,
          error: "Missing username or password.",
        });
      }

      // check if multi-user mode is active
      const isMultiUser = await SystemSettings.isMultiUserMode();
      if (!isMultiUser) {
        return response.status(403).json({
          success: false,
          error: "Registration is only available in multi-user mode.",
        });
      }

      // check if user already exists
      const existingUser = await User._get({ username: String(username) });
      if (existingUser) {
        return response.status(409).json({
          success: false,
          error: "Username already exists.",
        });
      }

      // create new user
      const { user, error } = await User.create({
  username,
  password,
  role: ROLES.user, // use the predefined constant
});

      if (error || !user) {
        return response.status(500).json({
          success: false,
          error: error || "Failed to create user.",
        });
      }

      // generate session token
      const token = makeJWT(
        { id: user.id, username: user.username },
        process.env.JWT_EXPIRY
      );

      await EventLogs.logEvent("user_registered", {
        username: user.username,
        ip: request.ip || "Unknown IP",
      });

      return response.status(200).json({
        success: true,
        user: User.filterFields(user),
        token,
      });
    } catch (e) {
      console.error("Registration error:", e);
      response.status(500).json({
        success: false,
        error: "Internal server error during registration.",
      });
    }
  });

  app.get(
    "/request-token/sso/simple",
    [simpleSSOEnabled],
    async (request, response) => {
      const { token: tempAuthToken } = request.query;
      const { sessionToken, token, error } =
        await TemporaryAuthToken.validate(tempAuthToken);

      if (error) {
        await EventLogs.logEvent("failed_login_invalid_temporary_auth_token", {
          ip: request.ip || "Unknown IP",
          multiUserMode: true,
        });
        return response.status(401).json({
          valid: false,
          token: null,
          message: `[001] An error occurred while validating the token: ${error}`,
        });
      }

      await Telemetry.sendTelemetry(
        "login_event",
        { multiUserMode: true },
        token.user.id
      );
      await EventLogs.logEvent(
        "login_event",
        {
          ip: request.ip || "Unknown IP",
          username: token.user.username || "Unknown user",
        },
        token.user.id
      );

      response.status(200).json({
        valid: true,
        user: User.filterFields(token.user),
        token: sessionToken,
        message: null,
      });
    }
  );

  app.post(
    "/system/recover-account",
    [isMultiUserSetup],
    async (request, response) => {
      try {
        const { username, recoveryCodes } = reqBody(request);
        const { success, resetToken, error } = await recoverAccount(
          username,
          recoveryCodes
        );

        if (success) {
          response.status(200).json({ success, resetToken });
        } else {
          response.status(400).json({ success, message: error });
        }
      } catch (error) {
        console.error("Error recovering account:", error);
        response
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    }
  );

  app.post(
    "/system/reset-password",
    [isMultiUserSetup],
    async (request, response) => {
      try {
        const { token, newPassword, confirmPassword } = reqBody(request);
        const { success, message, error } = await resetPassword(
          token,
          newPassword,
          confirmPassword
        );

        if (success) {
          response.status(200).json({ success, message });
        } else {
          response.status(400).json({ success, error });
        }
      } catch (error) {
        console.error("Error resetting password:", error);
        response.status(500).json({ success: false, message: error.message });
      }
    }
  );

  app.get(
    "/system/system-vectors",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const query = queryParams(request);
        const VectorDb = getVectorDbClass();
        const vectorCount = !!query.slug
          ? await VectorDb.namespaceCount(query.slug)
          : await VectorDb.totalVectors();
        response.status(200).json({ vectorCount });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/system/remove-document",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { name } = reqBody(request);
        await purgeDocument(name);
        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/system/remove-documents",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { names } = reqBody(request);
        for await (const name of names) await purgeDocument(name);
        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/system/remove-folder",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { name } = reqBody(request);
        await purgeFolder(name);
        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/system/local-files",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (_, response) => {
      try {
        const localFiles = await viewLocalFiles();
        response.status(200).json({ localFiles });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/system/document-processing-status",
    [validatedRequest],
    async (_, response) => {
      try {
        const online = await new CollectorApi().online();
        response.sendStatus(online ? 200 : 503);
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/system/accepted-document-types",
    [validatedRequest],
    async (_, response) => {
      try {
        const types = await new CollectorApi().acceptedFileTypes();
        if (!types) {
          response.sendStatus(404).end();
          return;
        }

        response.status(200).json({ types });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/system/update-env",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const body = reqBody(request);
        const { newValues, error } = await updateENV(
          body,
          false,
          response?.locals?.user?.id
        );
        response.status(200).json({ newValues, error });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/system/update-password",
    [validatedRequest],
    async (request, response) => {
      try {
        // Cannot update password in multi - user mode.
        if (multiUserMode(response)) {
          response.sendStatus(401).end();
          return;
        }

        let error = null;
        const { usePassword, newPassword } = reqBody(request);
        if (!usePassword) {
          // Password is being disabled so directly unset everything to bypass validation.
          process.env.AUTH_TOKEN = "";
          process.env.JWT_SECRET = "";
        } else {
          error = await updateENV(
            {
              AuthToken: newPassword,
              JWTSecret: v4(),
            },
            true
          )?.error;
        }
        response.status(200).json({ success: !error, error });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/system/enable-multi-user",
    [validatedRequest],
    async (request, response) => {
      try {
        if (response.locals.multiUserMode) {
          response.status(200).json({
            success: false,
            error: "Multi-user mode is already enabled.",
          });
          return;
        }

        const { username, password } = reqBody(request);
        const { user, error } = await User.create({
          username,
          password,
          role: ROLES.admin,
        });

        if (error || !user) {
          response.status(400).json({
            success: false,
            error: error || "Failed to enable multi-user mode.",
          });
          return;
        }

        await SystemSettings._updateSettings({
          multi_user_mode: true,
        });
        await BrowserExtensionApiKey.migrateApiKeysToMultiUser(user.id);

        await updateENV(
          {
            JWTSecret: process.env.JWT_SECRET || v4(),
          },
          true
        );
        await Telemetry.sendTelemetry("enabled_multi_user_mode", {
          multiUserMode: true,
        });
        await EventLogs.logEvent("multi_user_mode_enabled", {}, user?.id);
        response.status(200).json({ success: !!user, error });
      } catch (e) {
        await User.delete({});
        await SystemSettings._updateSettings({
          multi_user_mode: false,
        });

        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get("/system/multi-user-mode", async (_, response) => {
    try {
      const multiUserMode = await SystemSettings.isMultiUserMode();
      response.status(200).json({ multiUserMode });
    } catch (e) {
      console.error(e.message, e);
      response.sendStatus(500).end();
    }
  });

  app.get("/system/logo", async function (request, response) {
    try {
      const darkMode =
        !request?.query?.theme || request?.query?.theme === "default";
      const defaultFilename = getDefaultFilename(darkMode);
      const logoPath = await determineLogoFilepath(defaultFilename);
      const { found, buffer, size, mime } = fetchLogo(logoPath);

      if (!found) {
        response.sendStatus(204).end();
        return;
      }

      const currentLogoFilename = await SystemSettings.currentLogoFilename();
      response.writeHead(200, {
        "Access-Control-Expose-Headers":
          "Content-Disposition,X-Is-Custom-Logo,Content-Type,Content-Length",
        "Content-Type": mime || "image/png",
        "Content-Disposition": `attachment; filename=${path.basename(
          logoPath
        )}`,
        "Content-Length": size,
        "X-Is-Custom-Logo":
          currentLogoFilename !== null &&
          currentLogoFilename !== defaultFilename &&
          !isDefaultFilename(currentLogoFilename),
      });
      response.end(Buffer.from(buffer, "base64"));
      return;
    } catch (error) {
      console.error("Error processing the logo request:", error);
      response.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/system/footer-data", [validatedRequest], async (_, response) => {
    try {
      const footerData =
        (await SystemSettings.get({ label: "footer_data" }))?.value ??
        JSON.stringify([]);
      response.status(200).json({ footerData: footerData });
    } catch (error) {
      console.error("Error fetching footer data:", error);
      response.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/system/support-email", [validatedRequest], async (_, response) => {
    try {
      const supportEmail =
        (
          await SystemSettings.get({
            label: "support_email",
          })
        )?.value ?? null;
      response.status(200).json({ supportEmail: supportEmail });
    } catch (error) {
      console.error("Error fetching support email:", error);
      response.status(500).json({ message: "Internal server error" });
    }
  });

  // No middleware protection in order to get this on the login page
  app.get("/system/custom-app-name", async (_, response) => {
    try {
      const customAppName =
        (
          await SystemSettings.get({
            label: "custom_app_name",
          })
        )?.value ?? null;
      response.status(200).json({ customAppName: customAppName });
    } catch (error) {
      console.error("Error fetching custom app name:", error);
      response.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(
    "/system/pfp/:id",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async function (request, response) {
      try {
        const { id } = request.params;
        if (response.locals?.user?.id !== Number(id))
          return response.sendStatus(204).end();

        const pfpPath = await determinePfpFilepath(id);
        if (!pfpPath) return response.sendStatus(204).end();

        const { found, buffer, size, mime } = fetchPfp(pfpPath);
        if (!found) return response.sendStatus(204).end();

        response.writeHead(200, {
          "Content-Type": mime || "image/png",
          "Content-Disposition": `attachment; filename=${path.basename(pfpPath)}`,
          "Content-Length": size,
        });
        response.end(Buffer.from(buffer, "base64"));
        return;
      } catch (error) {
        console.error("Error processing the logo request:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/system/upload-pfp",
    [validatedRequest, flexUserRoleValid([ROLES.all]), handlePfpUpload],
    async function (request, response) {
      try {
        const user = await userFromSession(request, response);
        const uploadedFileName = request.randomFileName;
        if (!uploadedFileName) {
          return response.status(400).json({ message: "File upload failed." });
        }

        const userRecord = await User.get({ id: user.id });
        const oldPfpFilename = userRecord.pfpFilename;
        if (oldPfpFilename) {
          const storagePath = path.join(__dirname, "../storage/assets/pfp");
          const oldPfpPath = path.join(
            storagePath,
            normalizePath(userRecord.pfpFilename)
          );
          if (!isWithin(path.resolve(storagePath), path.resolve(oldPfpPath)))
            throw new Error("Invalid path name");
          if (fs.existsSync(oldPfpPath)) fs.unlinkSync(oldPfpPath);
        }

        const { success, error } = await User.update(user.id, {
          pfpFilename: uploadedFileName,
        });

        return response.status(success ? 200 : 500).json({
          message: success
            ? "Profile picture uploaded successfully."
            : error || "Failed to update with new profile picture.",
        });
      } catch (error) {
        console.error("Error processing the profile picture upload:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.delete(
    "/system/remove-pfp",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async function (request, response) {
      try {
        const user = await userFromSession(request, response);
        const userRecord = await User.get({ id: user.id });
        const oldPfpFilename = userRecord.pfpFilename;

        if (oldPfpFilename) {
          const storagePath = path.join(__dirname, "../storage/assets/pfp");
          const oldPfpPath = path.join(
            storagePath,
            normalizePath(oldPfpFilename)
          );
          if (!isWithin(path.resolve(storagePath), path.resolve(oldPfpPath)))
            throw new Error("Invalid path name");
          if (fs.existsSync(oldPfpPath)) fs.unlinkSync(oldPfpPath);
        }

        const { success, error } = await User.update(user.id, {
          pfpFilename: null,
        });

        return response.status(success ? 200 : 500).json({
          message: success
            ? "Profile picture removed successfully."
            : error || "Failed to remove profile picture.",
        });
      } catch (error) {
        console.error("Error processing the profile picture removal:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/system/upload-logo",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      handleAssetUpload,
    ],
    async (request, response) => {
      if (!request?.file || !request?.file.originalname) {
        return response.status(400).json({ message: "No logo file provided." });
      }

      if (!validFilename(request.file.originalname)) {
        return response.status(400).json({
          message: "Invalid file name. Please choose a different file.",
        });
      }

      try {
        const newFilename = await renameLogoFile(request.file.originalname);
        const existingLogoFilename = await SystemSettings.currentLogoFilename();
        await removeCustomLogo(existingLogoFilename);

        const { success, error } = await SystemSettings._updateSettings({
          logo_filename: newFilename,
        });

        return response.status(success ? 200 : 500).json({
          message: success
            ? "Logo uploaded successfully."
            : error || "Failed to update with new logo.",
        });
      } catch (error) {
        console.error("Error processing the logo upload:", error);
        response.status(500).json({ message: "Error uploading the logo." });
      }
    }
  );

  app.get("/system/is-default-logo", async (_, response) => {
    try {
      const currentLogoFilename = await SystemSettings.currentLogoFilename();
      const isDefaultLogo =
        !currentLogoFilename || currentLogoFilename === LOGO_FILENAME;
      response.status(200).json({ isDefaultLogo });
    } catch (error) {
      console.error("Error processing the logo request:", error);
      response.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(
    "/system/remove-logo",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (_request, response) => {
      try {
        const currentLogoFilename = await SystemSettings.currentLogoFilename();
        await removeCustomLogo(currentLogoFilename);
        const { success, error } = await SystemSettings._updateSettings({
          logo_filename: LOGO_FILENAME,
        });

        return response.status(success ? 200 : 500).json({
          message: success
            ? "Logo removed successfully."
            : error || "Failed to update with new logo.",
        });
      } catch (error) {
        console.error("Error processing the logo removal:", error);
        response.status(500).json({ message: "Error removing the logo." });
      }
    }
  );

  app.get(
    "/system/welcome-messages",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async function (_, response) {
      try {
        const welcomeMessages = await WelcomeMessages.getMessages();
        response.status(200).json({ success: true, welcomeMessages });
      } catch (error) {
        console.error("Error fetching welcome messages:", error);
        response
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    }
  );

  app.post(
    "/system/set-welcome-messages",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { messages = [] } = reqBody(request);
        if (!Array.isArray(messages)) {
          return response.status(400).json({
            success: false,
            message: "Invalid message format. Expected an array of messages.",
          });
        }

        await WelcomeMessages.saveAll(messages);
        return response.status(200).json({
          success: true,
          message: "Welcome messages saved successfully.",
        });
      } catch (error) {
        console.error("Error processing the welcome messages:", error);
        response.status(500).json({
          success: true,
          message: "Error saving the welcome messages.",
        });
      }
    }
  );

  app.get("/system/api-keys", [validatedRequest], async (_, response) => {
    try {
      if (response.locals.multiUserMode) {
        return response.sendStatus(401).end();
      }

      const apiKeys = await ApiKey.where({});
      return response.status(200).json({
        apiKeys,
        error: null,
      });
    } catch (error) {
      console.error(error);
      response.status(500).json({
        apiKey: null,
        error: "Could not find an API Key.",
      });
    }
  });

  app.post(
    "/system/generate-api-key",
    [validatedRequest],
    async (_, response) => {
      try {
        if (response.locals.multiUserMode) {
          return response.sendStatus(401).end();
        }

        const { apiKey, error } = await ApiKey.create();
        await EventLogs.logEvent(
          "api_key_created",
          {},
          response?.locals?.user?.id
        );
        return response.status(200).json({
          apiKey,
          error,
        });
      } catch (error) {
        console.error(error);
        response.status(500).json({
          apiKey: null,
          error: "Error generating api key.",
        });
      }
    }
  );

  // TODO: This endpoint is replicated in the admin endpoints file.
  // and should be consolidated to be a single endpoint with flexible role protection.
  app.delete(
    "/system/api-key/:id",
    [validatedRequest],
    async (request, response) => {
      try {
        if (response.locals.multiUserMode)
          return response.sendStatus(401).end();
        const { id } = request.params;
        if (!id || isNaN(Number(id))) return response.sendStatus(400).end();

        await ApiKey.delete({ id: Number(id) });
        await EventLogs.logEvent(
          "api_key_deleted",
          { deletedBy: response.locals?.user?.username },
          response?.locals?.user?.id
        );
        return response.status(200).end();
      } catch (error) {
        console.error(error);
        response.status(500).end();
      }
    }
  );

  app.post(
    "/system/custom-models",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { provider, apiKey = null, basePath = null } = reqBody(request);
        const { models, error } = await getCustomModels(
          provider,
          apiKey,
          basePath
        );
        return response.status(200).json({
          models,
          error,
        });
      } catch (error) {
        console.error(error);
        response.status(500).end();
      }
    }
  );

  app.post(
    "/system/event-logs",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { offset = 0, limit = 10 } = reqBody(request);
        const logs = await EventLogs.whereWithData({}, limit, offset * limit, {
          id: "desc",
        });
        const totalLogs = await EventLogs.count();
        const hasPages = totalLogs > (offset + 1) * limit;

        response.status(200).json({ logs: logs, hasPages, totalLogs });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/system/event-logs",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (_, response) => {
      try {
        await EventLogs.delete();
        await EventLogs.logEvent(
          "event_logs_cleared",
          {},
          response?.locals?.user?.id
        );
        response.json({ success: true });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/system/workspace-chats",
    [
      chatHistoryViewable,
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
    ],
    async (request, response) => {
      try {
        const { offset = 0, limit = 20 } = reqBody(request);
        const chats = await WorkspaceChats.whereWithData(
          {},
          limit,
          offset * limit,
          { id: "desc" }
        );
        const totalChats = await WorkspaceChats.count();
        const hasPages = totalChats > (offset + 1) * limit;

        response.status(200).json({ chats: chats, hasPages, totalChats });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/system/workspace-chats/:id",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { id } = request.params;
        Number(id) === -1
          ? await WorkspaceChats.delete({}, true)
          : await WorkspaceChats.delete({ id: Number(id) });
        response.json({ success: true, error: null });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/system/export-chats",
    [
      chatHistoryViewable,
      validatedRequest,
      flexUserRoleValid([ROLES.manager, ROLES.admin]),
    ],
    async (request, response) => {
      try {
        const { type = "jsonl", chatType = "workspace" } = request.query;
        const { contentType, data } = await exportChatsAsType(type, chatType);
        await EventLogs.logEvent(
          "exported_chats",
          {
            type,
            chatType,
          },
          response.locals.user?.id
        );
        response.setHeader("Content-Type", contentType);
        response.status(200).send(data);
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

 app.post(
  "/system/create-workflow",
  [validatedRequest, flexUserRoleValid(["admin", "teacher", "student", "parent", "user"])],
  async (req, res) => {
    try {
      const user = await userFromSession(req, res);
      const { name } = reqBody(req);
      if (!name)
        return res.status(400).json({ success: false, error: "Workspace name required." });

      const { Workspace } = require("../models/workspace");
      const { workspace, message: error } = await Workspace.new(name, user.id);
      if (!workspace)
        return res.status(500).json({ success: false, error });

      return res.status(200).json({ success: true, workspace });
    } catch (err) {
      console.error("❌ Error creating workflow:", err);
      return res.status(500).json({ success: false, error: "Internal error" });
    }
  }
);

  // Used for when a user in multi-user updates their own profile
  // from the UI.
  app.post("/system/user", [validatedRequest], async (request, response) => {
    try {
      const sessionUser = await userFromSession(request, response);
      const { username, password, bio } = reqBody(request);
      const id = Number(sessionUser.id);

      if (!id) {
        response.status(400).json({ success: false, error: "Invalid user ID" });
        return;
      }

      const updates = {};
      if (username)
        updates.username = User.validations.username(String(username));
      if (password) updates.password = String(password);
      if (bio) updates.bio = String(bio);

      if (Object.keys(updates).length === 0) {
        response
          .status(400)
          .json({ success: false, error: "No updates provided" });
        return;
      }

      const { success, error } = await User.update(id, updates);
      response.status(200).json({ success, error });
    } catch (e) {
      console.error(e);
      response.sendStatus(500).end();
    }
  });

  app.get(
    "/system/slash-command-presets",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const userPresets = await SlashCommandPresets.getUserPresets(user?.id);
        response.status(200).json({ presets: userPresets });
      } catch (error) {
        console.error("Error fetching slash command presets:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/system/slash-command-presets",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { command, prompt, description } = reqBody(request);
        const formattedCommand = SlashCommandPresets.formatCommand(
          String(command)
        );

        if (Object.keys(VALID_COMMANDS).includes(formattedCommand)) {
          return response.status(400).json({
            message:
              "Cannot create a preset with a command that matches a system command",
          });
        }

        const presetData = {
          command: formattedCommand,
          prompt: String(prompt),
          description: String(description),
        };

        const preset = await SlashCommandPresets.create(user?.id, presetData);
        if (!preset) {
          return response
            .status(500)
            .json({ message: "Failed to create preset" });
        }
        response.status(201).json({ preset });
      } catch (error) {
        console.error("Error creating slash command preset:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/system/slash-command-presets/:slashCommandId",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slashCommandId } = request.params;
        const { command, prompt, description } = reqBody(request);
        const formattedCommand = SlashCommandPresets.formatCommand(
          String(command)
        );

        if (Object.keys(VALID_COMMANDS).includes(formattedCommand)) {
          return response.status(400).json({
            message:
              "Cannot update a preset to use a command that matches a system command",
          });
        }

        // Valid user running owns the preset if user session is valid.
        const ownsPreset = await SlashCommandPresets.get({
          userId: user?.id ?? null,
          id: Number(slashCommandId),
        });
        if (!ownsPreset)
          return response.status(404).json({ message: "Preset not found" });

        const updates = {
          command: formattedCommand,
          prompt: String(prompt),
          description: String(description),
        };

        const preset = await SlashCommandPresets.update(
          Number(slashCommandId),
          updates
        );
        if (!preset) return response.sendStatus(422);
        response.status(200).json({ preset: { ...ownsPreset, ...updates } });
      } catch (error) {
        console.error("Error updating slash command preset:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.delete(
    "/system/slash-command-presets/:slashCommandId",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { slashCommandId } = request.params;
        const user = await userFromSession(request, response);

        // Valid user running owns the preset if user session is valid.
        const ownsPreset = await SlashCommandPresets.get({
          userId: user?.id ?? null,
          id: Number(slashCommandId),
        });
        if (!ownsPreset)
          return response
            .status(403)
            .json({ message: "Failed to delete preset" });

        await SlashCommandPresets.delete(Number(slashCommandId));
        response.sendStatus(204);
      } catch (error) {
        console.error("Error deleting slash command preset:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.get(
    "/system/prompt-variables",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const variables = await SystemPromptVariables.getAll(user?.id);
        response.status(200).json({ variables });
      } catch (error) {
        console.error("Error fetching system prompt variables:", error);
        response.status(500).json({
          success: false,
          error: `Failed to fetch system prompt variables: ${error.message}`,
        });
      }
    }
  );

  app.post(
    "/system/prompt-variables",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { key, value, description = null } = reqBody(request);

        if (!key || !value) {
          return response.status(400).json({
            success: false,
            error: "Key and value are required",
          });
        }

        const variable = await SystemPromptVariables.create({
          key,
          value,
          description,
          userId: user?.id || null,
        });

        response.status(200).json({
          success: true,
          variable,
        });
      } catch (error) {
        console.error("Error creating system prompt variable:", error);
        response.status(500).json({
          success: false,
          error: `Failed to create system prompt variable: ${error.message}`,
        });
      }
    }
  );

  app.put(
    "/system/prompt-variables/:id",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const { key, value, description = null } = reqBody(request);

        if (!key || !value) {
          return response.status(400).json({
            success: false,
            error: "Key and value are required",
          });
        }

        const variable = await SystemPromptVariables.update(Number(id), {
          key,
          value,
          description,
        });

        if (!variable) {
          return response.status(404).json({
            success: false,
            error: "Variable not found",
          });
        }

        response.status(200).json({
          success: true,
          variable,
        });
      } catch (error) {
        console.error("Error updating system prompt variable:", error);
        response.status(500).json({
          success: false,
          error: `Failed to update system prompt variable: ${error.message}`,
        });
      }
    }
  );

  app.delete(
    "/system/prompt-variables/:id",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const success = await SystemPromptVariables.delete(Number(id));

        if (!success) {
          return response.status(404).json({
            success: false,
            error: "System prompt variable not found or could not be deleted",
          });
        }

        response.status(200).json({
          success: true,
        });
      } catch (error) {
        console.error("Error deleting system prompt variable:", error);
        response.status(500).json({
          success: false,
          error: `Failed to delete system prompt variable: ${error.message}`,
        });
      }
    }
  );

  app.post(
    "/system/validate-sql-connection",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { engine, connectionString } = reqBody(request);
        if (!engine || !connectionString) {
          return response.status(400).json({
            success: false,
            error: "Both engine and connection details are required.",
          });
        }

        const {
          validateConnection,
        } = require("../utils/agents/aibitat/plugins/sql-agent/SQLConnectors");
        const result = await validateConnection(engine, { connectionString });

        if (!result.success) {
          return response.status(200).json({
            success: false,
            error: `Unable to connect to ${engine}. Please verify your connection details.`,
          });
        }

        response.status(200).json(result);
      } catch (error) {
        console.error("SQL validation error:", error);
        response.status(500).json({
          success: false,
          error: `Unable to connect to ${engine}. Please verify your connection details.`,
        });
      }
    }
  );

app.get("/system/teacher/my-students/:teacherId", [validatedRequest], async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    const links = await prisma.teacher_students.findMany({
      where: { teacherId: Number(teacherId) },
      include: {
        student: true,  // Include the actual student record
      },
    });

    const students = links.map((link) => ({
      id: link.student.id,           // ✅ Use student ID, not relationship ID
      name: link.student.name,
      grade: link.student.grade,
      subject: link.subject,
      linkId: link.id,               // Include relationship ID separately if needed
    }));

    res.json({ success: true, students });
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.get("/system/parent/child-report/:childId", [validatedRequest], async (req, res) => {
  try {
    const { childId } = req.params;
    
    // Get userId from the token in the Authorization header
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: "Authentication required" 
      });
    }

    // Decode the token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    console.log("🔍 Fetching report for childId:", childId, "by userId:", userId);
    
    // Find parent record
    const parent = await prisma.parents.findFirst({
      where: { user_id: Number(userId) },
    });

    if (!parent) {
      console.log("❌ Parent not found for userId:", userId);
      return res.status(403).json({ 
        success: false, 
        error: "Parent profile not found" 
      });
    }

    console.log("✅ Parent found:", parent.id);

    // Verify this parent is linked to this child
    const link = await prisma.parent_students.findFirst({
      where: {
        parentId: parent.id,
        studentId: Number(childId),
      },
    });

    if (!link) {
      console.log("❌ No link found between parent and child");
      return res.status(403).json({ 
        success: false, 
        error: "You don't have access to this child's reports" 
      });
    }

    console.log("✅ Link verified:", link.id);
    
    // Get student info
    const student = await prisma.students.findUnique({
      where: { id: Number(childId) },
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        error: "Student not found" 
      });
    }

    console.log("✅ Student found:", student.name);

    if (!student.user_id) {
      return res.status(400).json({ 
        success: false, 
        error: "Student record has no user_id. Cannot fetch reports." 
      });
    }

    // Get quiz results for this student (with all details)
    const quizzes = await prisma.quiz_results.findMany({
      where: { user_id: student.user_id },
      select: { 
        id: true, 
        subject: true, 
        score: true, 
        total_questions: true,
        correct_answers: true,
        submitted_at: true,
        difficulty: true,
      },
      orderBy: { submitted_at: 'desc' },
    });

    console.log("✅ Found", quizzes.length, "quiz results");

    // Get XP logs
    const xpLogs = await prisma.event_logs.findMany({
      where: { 
        userId: student.user_id,
        event: "xp_gain" 
      },
      select: { 
        metadata: true, 
        occurredAt: true
      },
    });

    console.log(`✅ Found ${xpLogs.length} XP logs`);

    // Calculate stats
    const averageScore =
      quizzes.length > 0
        ? (quizzes.reduce((acc, q) => acc + (q.score / q.total_questions) * 100, 0) / quizzes.length).toFixed(1)
        : "0.0";

    const totalFlashcards = 0;
    const mastered = 0;

    const totalXP = xpLogs.reduce((sum, log) => {
      const points = typeof log.metadata === 'object' 
        ? log.metadata?.points || 0 
        : 0;
      return sum + points;
    }, 0);

    // Generate AI summary
    const summaryPrompt = `
You are Chikoro AI, an educational data analyst for parents.
Analyze the following student's progress and write a warm, encouraging summary for their parent.

Name: ${student.name}
Grade: ${student.grade}
Average Quiz Score: ${averageScore}%
Total Quizzes Taken: ${quizzes.length}
XP Points: ${totalXP}

Recent Quizzes:
${quizzes.length > 0 
  ? quizzes
      .slice(0, 5)
      .map((q) => `- ${q.subject || 'General'}: ${((q.score / q.total_questions) * 100).toFixed(1)}% (${q.correct_answers}/${q.total_questions} correct)`)
      .join("\n")
  : "No quizzes taken yet."
}

Provide:
1. A short paragraph summary of overall performance (parent-friendly tone).
2. Key strengths to celebrate.
3. Areas where gentle support might help.
4. Suggested ways parents can encourage continued learning.

Format neatly in Markdown with proper headers.
    `;

    const aiSummary = await generateLessonPlanAI(summaryPrompt);

    // Format quizzes for frontend
    const formattedQuizzes = quizzes.map(q => ({
      id: q.id,
      subject: q.subject,
      score: ((q.score / q.total_questions) * 100).toFixed(1),
      correct_answers: q.correct_answers,
      total: q.total_questions,
      createdAt: q.submitted_at,
      difficulty: q.difficulty || "Medium",
    }));

    res.json({ 
      success: true, 
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
      },
      quizzes: formattedQuizzes,
      summary: aiSummary,
      averageScore: parseFloat(averageScore),
      totalXP,
      mastered,
      totalFlashcards,
    });
  } catch (err) {
    console.error("Error fetching child report:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch report",
      details: err.message 
    });
  }
});

app.post("/payments/cash/:studentId", [validatedRequest], async (req, res) => {
  try {
    // 🧍 Verify user is admin
    const user = res.locals.user;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const studentId = parseInt(req.params.studentId);
    const { amount, plan, duration, notes } = req.body;

    // 🧠 Find student
    const student = await prisma.students.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // 📅 Calculate expiration date
    const daysToAdd = parseInt(duration) || 30;
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const expirationDate = new Date(Date.now() + daysToAdd * MS_PER_DAY);

    // 💾 Update student subscription
    const updatedStudent = await prisma.students.update({
      where: { id: studentId },
      data: {
        subscription_status: "paid",
        subscription_plan: plan || (student.school ? "school basic" : "premium"),
        subscription_expiration_date: expirationDate,
        subscription_payment_poll_url: null,
      },
    });

    // 🧾 Record the cash payment in logs
    await prisma.payment_logs.create({
      data: {
        student_id: studentId,
        amount: parseFloat(amount),
        payment_method: "cash",
        subscription_plan: plan || (student.school ? "school basic" : "premium"),
        subscription_duration_days: daysToAdd,
        recorded_by: user.id,
        notes: notes || null,
      },
    });

    // 📨 Notify or log
    console.log(
      `✅ Admin ${user.username} activated cash subscription for ${student.name} (${daysToAdd} days)`
    );

    return res.json({
      success: true,
      message: `Cash payment recorded. Subscription active for ${daysToAdd} days.`,
      student: updatedStudent,
    });
  } catch (err) {
    console.error("Cash Payment Error:", err);
    return res.status(500).json({ error: "Failed to record cash payment." });
  }
});


app.get("/payments/history", [validatedRequest], async (req, res) => {
  try {
    const user = res.locals.user;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    // Only admins can view payment history
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const payments = await prisma.payment_logs.findMany({
      orderBy: { created_at: "desc" },
      include: {
        student: {
          select: {
            name: true,
          },
        },
        recorder: {
          select: {
            username: true,
          },
        },
      },
    });

    const formatted = payments.map((p) => ({
      id: p.id,
      created_at: p.created_at,
      student_name: p.student?.name || "Unknown Student",
      amount: p.amount,
      payment_method: p.payment_method,
      recorded_by_name: p.recorder?.username || "System",
      notes: p.notes,
    }));

    return res.json({ success: true, payments: formatted });
  } catch (err) {
    console.error("Payment History Error:", err);
    return res.status(500).json({ error: "Failed to fetch payment history." });
  }
});

  
}



module.exports = { systemEndpoints };
