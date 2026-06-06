const { Deduplicator } = require("../utils/dedupe");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  UnderlineType,
} = require("docx");
const PDFDocument = require("pdfkit");

// ─── MIME types ────────────────────────────────────────────────────────────────
function getMimeType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const mimeTypes = {
    txt: "text/plain",
    html: "text/html",
    csv: "text/csv",
    json: "application/json",
    md: "text/markdown",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// ─── Content cleaner ───────────────────────────────────────────────────────────
const CHART_TYPES = ["bar", "line", "pie", "doughnut", "radar", "scatter"];
const INTERNAL_PATTERNS = [
  /^Agent @\w+ invoked/,
  /Swapping over to agent chat/,
  /Type \/exit to exit/,
  /^Agent is thinking/,
  /^Done thinking/,
  /^Parsed Tool Call:/,
  /^\{"name":/,
  /^@\w+ is executing `.+` tool/,
];

function cleanContent(content) {
  if (typeof content !== "string") return content;

  const lines = content.split("\n").map((line) => {
    // Strip frontend context prefix tags from user messages
    line = line
      .replace(/(\[Subject:[^\]]*\]|\[Curriculum:[^\]]*\]|\[Academic Level:[^\]]*\]|\[Grade:[^\]]*\]|\[Age:[^\]]*\])\s*/g, "")
      .trim();

    // Drop raw chart JSON blobs
    try {
      const parsed = JSON.parse(line);
      if (parsed?.dataset && CHART_TYPES.includes(parsed?.type)) return null;
    } catch { /* not JSON */ }

    // Drop raw tool call argument blobs
    if (/"arguments"\s*:\s*\{/.test(line)) return null;
    if (/^[\w_-]+","arguments"\s*:\s*\{/.test(line)) return null;

    // Drop internal agent status lines
    if (INTERNAL_PATTERNS.some((p) => p.test(line))) return null;

    return line;
  });

  return lines
    .filter((line) => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Inline markdown parser → TextRun[] ───────────────────────────────────────
// Handles: ***bold italic***, **bold**, *italic*, __underline__, ~~strikethrough~~,
// `inline code`, plain text. Returns an array of docx TextRun objects.
function parseInlineMarkdown(text, baseProps = {}) {
  const runs = [];
  const TOKEN_RE = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|~~(.+?)~~|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index), ...baseProps }));
    }

    if (match[2] !== undefined) {
      // ***bold italic***
      runs.push(new TextRun({ text: match[2], bold: true, italics: true, ...baseProps }));
    } else if (match[3] !== undefined) {
      // **bold**
      runs.push(new TextRun({ text: match[3], bold: true, ...baseProps }));
    } else if (match[4] !== undefined) {
      // *italic*
      runs.push(new TextRun({ text: match[4], italics: true, ...baseProps }));
    } else if (match[5] !== undefined) {
      // __underline__
      runs.push(new TextRun({ text: match[5], underline: { type: UnderlineType.SINGLE }, ...baseProps }));
    } else if (match[6] !== undefined) {
      // ~~strikethrough~~
      runs.push(new TextRun({ text: match[6], strike: true, ...baseProps }));
    } else if (match[7] !== undefined) {
      // `inline code`
      runs.push(new TextRun({ text: match[7], font: "Courier New", size: 20, shading: { fill: "F0F0F0" }, ...baseProps }));
    }

    lastIndex = TOKEN_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex), ...baseProps }));
  }

  if (runs.length === 0) runs.push(new TextRun({ text: "", ...baseProps }));

  return runs;
}

// ─── Table parser ──────────────────────────────────────────────────────────────
function parseMarkdownTable(lines) {
  if (lines.length < 2) return null;
  const separator = lines[1];
  if (!/^\|?\s*[-:]+[-| :]*\s*\|?$/.test(separator)) return null;

  const parseRow = (line) =>
    line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

  const headerCells = parseRow(lines[0]);
  const bodyRows = lines.slice(2).map(parseRow);
  const colCount = headerCells.length;
  const colWidth = Math.floor(9360 / colCount);

  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };

  const makeCell = (text, isHeader = false) =>
    new TableCell({
      borders,
      width: { size: colWidth, type: WidthType.DXA },
      shading: isHeader
        ? { fill: "2E75B6", type: ShadingType.CLEAR }
        : { fill: "FFFFFF", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({
          children: parseInlineMarkdown(text, isHeader ? { bold: true, color: "FFFFFF" } : {}),
        }),
      ],
    });

  const rows = [
    new TableRow({ children: headerCells.map((c) => makeCell(c, true)) }),
    ...bodyRows.map((row) => new TableRow({ children: row.map((c) => makeCell(c, false)) })),
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: Array(colCount).fill(colWidth),
    rows,
  });
}

// ─── Main content → docx elements ─────────────────────────────────────────────
function buildDocxChildren(content) {
  const lines = content.split("\n");
  const children = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === "") {
      children.push(new Paragraph({ children: [new TextRun("")] }));
      i++;
      continue;
    }

    // H4
    if (line.startsWith("#### ")) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_4, children: parseInlineMarkdown(line.slice(5).trim()) }));
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: parseInlineMarkdown(line.slice(4).trim()) }));
      i++;
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: parseInlineMarkdown(line.slice(3).trim()) }));
      i++;
      continue;
    }

    // H1
    if (line.startsWith("# ")) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: parseInlineMarkdown(line.slice(2).trim()) }));
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      children.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
        children: [new TextRun("")],
      }));
      i++;
      continue;
    }

    // Code block
    if (line.startsWith("```")) {
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        children.push(new Paragraph({
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          border: { left: { style: BorderStyle.SINGLE, size: 6, color: "AAAAAA", space: 4 } },
          indent: { left: 360 },
          children: [new TextRun({ text: lines[i] || " ", font: "Courier New", size: 20 })],
        }));
        i++;
      }
      i++; // skip closing ```
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      children.push(new Paragraph({
        indent: { left: 720 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: "2E75B6", space: 4 } },
        children: parseInlineMarkdown(line.slice(2).trim(), { italics: true, color: "444444" }),
      }));
      i++;
      continue;
    }

    // Markdown table
    if (line.startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseMarkdownTable(tableLines);
      if (table) {
        children.push(table);
        children.push(new Paragraph({ children: [new TextRun("")] }));
      } else {
        for (const tl of tableLines) {
          children.push(new Paragraph({ children: parseInlineMarkdown(tl) }));
        }
      }
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      children.push(new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        children: parseInlineMarkdown(line.replace(/^\d+\.\s/, "").trim()),
      }));
      i++;
      continue;
    }

    // Nested bullet (2+ spaces then - or *)
    if (/^  +[-*]\s/.test(line)) {
      children.push(new Paragraph({
        numbering: { reference: "bullets", level: 1 },
        children: parseInlineMarkdown(line.replace(/^  +[-*]\s/, "").trim()),
      }));
      i++;
      continue;
    }

    // Bullet list
    if (/^[-*]\s/.test(line)) {
      children.push(new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: parseInlineMarkdown(line.slice(2).trim()),
      }));
      i++;
      continue;
    }

    // Default body paragraph
    children.push(new Paragraph({
      children: parseInlineMarkdown(line),
      spacing: { after: 80 },
    }));
    i++;
  }

  return children;
}

// ─── DOCX generator ────────────────────────────────────────────────────────────
async function generateDocxBuffer(content) {
  const children = buildDocxChildren(content);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: "◦",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "numbers",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 24 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 40, bold: true, font: "Arial", color: "1F3864" },
          paragraph: {
            spacing: { before: 320, after: 160 },
            outlineLevel: 0,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 4 } },
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, font: "Arial", color: "2E75B6" },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: "2F5496" },
          paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 },
        },
        {
          id: "Heading4",
          name: "Heading 4",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, italics: true, font: "Arial", color: "333333" },
          paragraph: { spacing: { before: 160, after: 60 }, outlineLevel: 3 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "Chikoro AI — Student Notes", italics: true, size: 18, color: "888888" })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Page ", size: 18, color: "888888" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" }),
                  new TextRun({ text: " of ", size: 18, color: "888888" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "888888" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

// ─── PDF generator ─────────────────────────────────────────────────────────────
function generatePdfBuffer(content) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 72, size: "LETTER", bufferPages: true });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(9).fillColor("#888888").font("Helvetica-Oblique")
      .text("Chikoro AI — Student Notes", { align: "right" })
      .moveDown(0.5);

    const lines = content.split("\n");
    let i = 0;
    let inCodeBlock = false;

    // Render a line with inline markdown formatting
    function renderInlinePdf(text, opts = {}) {
      const TOKEN_RE = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|~~(.+?)~~|`(.+?)`)/g;
      let lastIndex = 0;
      let match;
      const segments = [];

      while ((match = TOKEN_RE.exec(text)) !== null) {
        if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index), style: "normal" });
        if (match[2]) segments.push({ text: match[2], style: "bolditalic" });
        else if (match[3]) segments.push({ text: match[3], style: "bold" });
        else if (match[4]) segments.push({ text: match[4], style: "italic" });
        else if (match[5]) segments.push({ text: match[5], style: "underline" });
        else if (match[6]) segments.push({ text: match[6], style: "strike" });
        else if (match[7]) segments.push({ text: match[7], style: "code" });
        lastIndex = TOKEN_RE.lastIndex;
      }
      if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), style: "normal" });
      if (segments.length === 0) segments.push({ text, style: "normal" });

      const fs = opts.fontSize || 12;

      for (let s = 0; s < segments.length; s++) {
        const seg = segments[s];
        const continued = s < segments.length - 1;
        doc.fillColor(opts.color || "#000000");

        switch (seg.style) {
          case "bold":
            doc.font("Helvetica-Bold").fontSize(fs);
            break;
          case "italic":
            doc.font("Helvetica-Oblique").fontSize(fs);
            break;
          case "bolditalic":
            doc.font("Helvetica-BoldOblique").fontSize(fs);
            break;
          case "underline":
            doc.font("Helvetica").fontSize(fs);
            doc.text(seg.text, { continued, underline: true, lineBreak: false });
            continue;
          case "strike":
            doc.font("Helvetica").fontSize(fs);
            doc.text(seg.text, { continued, strike: true, lineBreak: false });
            continue;
          case "code":
            doc.font("Courier").fontSize(fs - 1).fillColor("#333333");
            break;
          default:
            doc.font(opts.font || "Helvetica").fontSize(fs);
        }

        doc.text(seg.text, { continued, lineBreak: false });
      }
    }

    while (i < lines.length) {
      const line = lines[i];

      // Code block toggle
      if (line.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        if (!inCodeBlock) doc.moveDown(0.4);
        i++;
        continue;
      }

      if (inCodeBlock) {
        doc.font("Courier").fontSize(10).fillColor("#333333").text(line || " ", { indent: 20 });
        i++;
        continue;
      }

      // Blank line
      if (line.trim() === "") { doc.moveDown(0.4); i++; continue; }

      // H1
      if (line.startsWith("# ")) {
        doc.moveDown(0.5).font("Helvetica-Bold").fontSize(22).fillColor("#1F3864").text(line.slice(2).trim());
        const lx = doc.page.margins.left;
        const rx = doc.page.width - doc.page.margins.right;
        doc.moveTo(lx, doc.y).lineTo(rx, doc.y).strokeColor("#2E75B6").lineWidth(1).stroke();
        doc.moveDown(0.3).fillColor("#000000").font("Helvetica").fontSize(12);
        i++; continue;
      }

      // H2
      if (line.startsWith("## ")) {
        doc.moveDown(0.4).font("Helvetica-Bold").fontSize(17).fillColor("#2E75B6").text(line.slice(3).trim());
        doc.moveDown(0.1).fillColor("#000000").font("Helvetica").fontSize(12);
        i++; continue;
      }

      // H3
      if (line.startsWith("### ")) {
        doc.moveDown(0.3).font("Helvetica-Bold").fontSize(14).fillColor("#2F5496").text(line.slice(4).trim());
        doc.fillColor("#000000").font("Helvetica").fontSize(12);
        i++; continue;
      }

      // H4
      if (line.startsWith("#### ")) {
        doc.moveDown(0.2).font("Helvetica-BoldOblique").fontSize(12).fillColor("#333333").text(line.slice(5).trim());
        doc.fillColor("#000000").font("Helvetica");
        i++; continue;
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        doc.moveDown(0.3);
        doc.moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .strokeColor("#CCCCCC").lineWidth(0.5).stroke();
        doc.moveDown(0.3);
        i++; continue;
      }

      // Blockquote
      if (line.startsWith("> ")) {
        doc.font("Helvetica-Oblique").fontSize(12).fillColor("#444444")
          .text(line.slice(2).trim(), { indent: 30 });
        doc.font("Helvetica").fillColor("#000000");
        i++; continue;
      }

      // Numbered list
      if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\./)[1];
        doc.font("Helvetica").fontSize(12).fillColor("#000000");
        renderInlinePdf(`${num}. ${line.replace(/^\d+\.\s/, "").trim()}`);
        doc.moveDown(0.2);
        i++; continue;
      }

      // Nested bullet
      if (/^  +[-*]\s/.test(line)) {
        doc.font("Helvetica").fontSize(12).fillColor("#000000");
        renderInlinePdf(`  ◦ ${line.replace(/^  +[-*]\s/, "").trim()}`);
        doc.moveDown(0.2);
        i++; continue;
      }

      // Bullet list
      if (/^[-*]\s/.test(line)) {
        doc.font("Helvetica").fontSize(12).fillColor("#000000");
        renderInlinePdf(`• ${line.slice(2).trim()}`);
        doc.moveDown(0.2);
        i++; continue;
      }

      // Markdown table
      if (line.startsWith("|")) {
        const tableLines = [];
        while (i < lines.length && lines[i].startsWith("|")) { tableLines.push(lines[i]); i++; }
        if (tableLines.length >= 2) {
          const parseRow = (l) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
          const headers = parseRow(tableLines[0]);
          const bodyRows = tableLines.slice(2).map(parseRow);
          const colCount = headers.length;
          const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
          const colWidth = contentWidth / colCount;
          const rowH = 18;
          let ty = doc.y + 4;
          const sx = doc.page.margins.left;

          // Header row
          doc.save();
          headers.forEach((h, ci) => {
            doc.rect(sx + ci * colWidth, ty, colWidth, rowH).fill("#2E75B6");
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#FFFFFF")
              .text(h, sx + ci * colWidth + 3, ty + 4, { width: colWidth - 6, lineBreak: false });
          });
          ty += rowH;

          // Body rows
          bodyRows.forEach((row, ri) => {
            const fill = ri % 2 === 0 ? "#FFFFFF" : "#F0F5FF";
            row.forEach((cell, ci) => {
              doc.rect(sx + ci * colWidth, ty, colWidth, rowH).fill(fill);
              doc.font("Helvetica").fontSize(9).fillColor("#000000")
                .text(cell, sx + ci * colWidth + 3, ty + 4, { width: colWidth - 6, lineBreak: false });
            });
            ty += rowH;
          });

          // Outer border
          doc.rect(sx, doc.y + 4, contentWidth, rowH * (bodyRows.length + 1))
            .strokeColor("#CCCCCC").lineWidth(0.5).stroke();
          doc.restore();

          doc.moveDown((rowH * (bodyRows.length + 1)) / 14 + 0.8);
        }
        continue;
      }

      // Default body paragraph
      doc.font("Helvetica").fontSize(12).fillColor("#000000");
      renderInlinePdf(line);
      doc.moveDown(0.3);
      i++;
    }

    // Page numbers on every page
    const range = doc.bufferedPageRange();
    for (let p = 0; p < range.count; p++) {
      doc.switchToPage(p);
      doc.fontSize(9).fillColor("#888888").font("Helvetica").text(
        `Page ${p + 1} of ${range.count}`,
        doc.page.margins.left,
        doc.page.height - 40,
        { align: "center", width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
      );
    }

    doc.end();
  });
}

// ─── Plugin ────────────────────────────────────────────────────────────────────
const saveFileInBrowser = {
  name: "save-file-to-browser",
  startupConfig: { params: {} },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          tracker: new Deduplicator(),
          name: this.name,
          description:
            "Save content to a file when the user explicitly asks for a download. Supports rich markdown formatting for beautiful student notes. Supported formats: .txt, .md, .csv, .json, .html, .pdf, .docx",
          examples: [
            {
              prompt: "Save me that to a file named 'output'",
              call: JSON.stringify({ file_content: "<content>", filename: "output.txt" }),
            },
            {
              prompt: "Save that as a Word document",
              call: JSON.stringify({ file_content: "<content>", filename: "output.docx" }),
            },
            {
              prompt: "Generate notes on photosynthesis as a PDF",
              call: JSON.stringify({ file_content: "# Photosynthesis\n\n## What is it?\n\n**Photosynthesis** is the process...", filename: "photosynthesis-notes.pdf" }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              file_content: {
                type: "string",
                description: [
                  "Content to save. Use markdown for rich formatting:",
                  "# Heading 1   ## Heading 2   ### Heading 3   #### Heading 4",
                  "**bold**   *italic*   ***bold italic***   __underline__   ~~strikethrough~~",
                  "`inline code`   ```code block```",
                  "- bullet point   1. numbered list   > blockquote",
                  "| Col | Col |  ← tables   --- ← horizontal rule",
                ].join("\n"),
              },
              filename: {
                type: "string",
                description: "Filename with extension. Supported: .txt, .md, .csv, .json, .html, .pdf, .docx",
              },
            },
            required: ["file_content", "filename"],
            additionalProperties: false,
          },
          handler: async function ({ file_content = "", filename }) {
            try {
              if (this.tracker.isDuplicate(this.name, { file_content, filename })) {
                this.super.handlerProps.log(`${this.name} exited early — duplicate call.`);
                return `${filename} file has been saved successfully!`;
              }

              const cleanedContent = cleanContent(file_content);
              const ext = filename.split(".").pop().toLowerCase();
              let fileBuffer;

              if (ext === "docx") {
                fileBuffer = await generateDocxBuffer(cleanedContent);
              } else if (ext === "pdf") {
                fileBuffer = await generatePdfBuffer(cleanedContent);
              } else {
                fileBuffer = Buffer.from(cleanedContent, "utf8");
              }

              const mimeType = getMimeType(filename);
              const b64Content = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

              this.super.socket.send("fileDownload", { filename, b64Content });
              this.super.introspect(`${this.caller}: Saving file ${filename}.`);
              this.tracker.trackRun(this.name, { file_content, filename });

              return `${filename} has been saved and will download automatically in the user's browser.`;
            } catch (error) {
              this.super.handlerProps.log(`save-file-to-browser error: ${error.message}`);
              return `Let the user know this action was not successful. Error: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { saveFileInBrowser };