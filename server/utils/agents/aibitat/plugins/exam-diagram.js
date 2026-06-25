// plugins/agent-plugins/exam-diagram.js
//
// Hybrid exam diagram generator.
//
// Rendering pipeline (in priority order, with automatic fallback):
//
//   Tier 1 — Kroki (structured diagram languages)
//     The LLM generates source code in Mermaid, PlantUML, SvgBob, or Ditaa.
//     Kroki renders it to SVG via HTTP. Deterministic, no hallucinated labels.
//     Best for: flowcharts, cycles, process diagrams, circuit-style schematics,
//               food webs, data flow, timelines, ecosystem diagrams.
//
//   Tier 2 — LLM raw SVG (freehand biological/chemical illustration)
//     The LLM produces a raw SVG string directly.
//     We validate, sanitise, and fix common issues before accepting it.
//     Best for: cell diagrams, apparatus cross-sections, anatomical drawings,
//               anything that needs free-form shape drawing.
//
//   Tier 3 — LLM SVG simplified retry
//     If Tier 2 fails validation twice, we retry with a much more constrained
//     prompt that limits the diagram to basic shapes and minimal labels.
//     This almost never fails and guarantees the student gets *something*.
//
// Every decision point is logged via this.super.introspect() so failures
// are fully visible in the agent activity panel.

"use strict";

const { Deduplicator } = require("../utils/dedupe");
const Provider = require("../providers/ai-provider");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const https = require("https");
const http = require("http");
const zlib = require("zlib");

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const KROKI_BASE_URL = "https://kroki.io";

// Maximum time to wait for the Kroki API (ms). Kroki is fast but can be slow
// under load — 8 s is generous without blocking the agent for too long.
const KROKI_TIMEOUT_MS = 8000;

// Maximum time for each LLM call (ms).
const LLM_TIMEOUT_MS = 30000;

// Minimum SVG length we'll accept as valid output (characters).
// An SVG shorter than this is almost certainly truncated or empty.
const MIN_SVG_LENGTH = 200;

// Maximum SVG length we'll accept. SVGs longer than this are a sign the LLM
// went off-script; we reject and retry rather than pass garbage to the client.
const MAX_SVG_LENGTH = 80000;

// How many times we'll retry the LLM SVG path before giving up.
const MAX_LLM_RETRIES = 2;

// ─── Kroki-supported diagram languages ───────────────────────────────────────
// Maps an internal render_mode to the Kroki path segment and the language name
// we include in prompts so the LLM knows what syntax to use.
const KROKI_MODES = {
  mermaid: {
    krokilang: "mermaid",
    label: "Mermaid",
    description: "Mermaid diagram language (flowchart, sequenceDiagram, graph LR/TD syntax)",
  },
  plantuml: {
    krokilang: "plantuml",
    label: "PlantUML",
    description: "PlantUML (@startuml / @enduml syntax)",
  },
  svgbob: {
    krokilang: "svgbob",
    label: "SvgBob",
    description: "SvgBob ASCII-art diagram language (uses +, -, |, /, \\, >, <, v, ^ characters)",
  },
  ditaa: {
    krokilang: "ditaa",
    label: "Ditaa",
    description: "Ditaa ASCII box-and-line diagram language",
  },
};

// ─── Diagram type catalogue ───────────────────────────────────────────────────
// Each entry describes a diagram family.
// render_strategy controls which rendering tier is tried first:
//   "kroki_first"  — try Kroki (Tier 1) then fall back to LLM SVG
//   "svg_first"    — go straight to LLM SVG (Tier 2); Kroki can't help here
//
// preferred_kroki_mode is the Kroki language that works best for this family.
// subject_conventions are injected into the LLM SVG prompt when used.

const DIAGRAM_CATALOGUE = {
  biology: {
    label: "Biology / Life Science",
    render_strategy: "svg_first", // cell diagrams, organs — need freehand shapes
    preferred_kroki_mode: "mermaid", // used when concept is a cycle/process
    process_keywords: ["cycle", "process", "pathway", "stages", "steps", "flow", "food web", "food chain", "succession", "lifecycle", "life cycle"],
    subject_conventions: [
      "Use leader lines with horizontal end-ticks for labels (standard biology convention).",
      "Fill enclosed regions with soft, distinct colours (#d4e8f7 for cytoplasm, #f7f0d4 for cell wall, etc.).",
      "Arrow direction indicates process flow (e.g. direction of nerve impulse, blood flow).",
      "Include a scale bar if the structure is microscopic.",
      "All organelles must be labelled; never leave a drawn structure without a label.",
    ],
  },
  physics: {
    label: "Physics",
    render_strategy: "kroki_first", // circuits, ray diagrams, force diagrams — structured
    preferred_kroki_mode: "mermaid",
    process_keywords: ["circuit", "ray", "wave", "field", "force diagram", "free body", "energy flow", "particle"],
    subject_conventions: [
      "Force arrows must be straight, single-headed, and labelled with the force name and magnitude if given.",
      "Ray diagrams: incident ray dashed, refracted/reflected ray solid.",
      "Include axis labels and units on all graphs.",
      "Use standard circuit symbols (IEC 60617) for circuit diagrams.",
      "Dashed construction lines must be clearly distinguishable from real rays/forces.",
    ],
  },
  chemistry: {
    label: "Chemistry",
    render_strategy: "svg_first", // apparatus cross-sections need freehand
    preferred_kroki_mode: "plantuml",
    process_keywords: ["cycle", "process", "reaction pathway", "mechanism", "stages"],
    subject_conventions: [
      "Use standard laboratory apparatus outlines (beaker, conical flask, Liebig condenser, round-bottom flask).",
      "Bond lines in structural formulae must be equal length and at correct angles (109.5° for sp3, 120° for sp2).",
      "Reaction arrows: single-headed (→) for one-way, double-headed (⇌) for equilibrium.",
      "Label all apparatus, chemicals, and direction of flow (e.g. cooling water in/out).",
      "Indicate heat sources (Bunsen burner triangle) and clamps/stands where appropriate.",
    ],
  },
  geography: {
    label: "Geography",
    render_strategy: "kroki_first", // cycles, processes — structured diagrams work well
    preferred_kroki_mode: "mermaid",
    process_keywords: ["cycle", "process", "formation", "stages", "coastal", "river", "weathering"],
    subject_conventions: [
      "Include a north arrow on map-style diagrams.",
      "Use a simple key/legend box in the bottom-right corner.",
      "Contour lines should be smooth curves, labelled at intervals.",
      "Rivers flow downhill — ensure arrow direction is consistent with elevation.",
      "Use standard geographical notation for cross-sections (hatching for rock strata, blue for water).",
    ],
  },
  generic: {
    label: "Generic / Cross-subject",
    render_strategy: "kroki_first",
    preferred_kroki_mode: "mermaid",
    process_keywords: ["process", "flow", "stages", "steps", "cycle", "system"],
    subject_conventions: [
      "Label every component clearly.",
      "Use a clean, uncluttered layout with plenty of white space.",
      "Prefer dark lines on white background for print compatibility.",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — RENDER STRATEGY CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════════

// Determines whether a given concept should be handled by Kroki or the LLM SVG
// path, and which Kroki language to use if going the Kroki route.
//
// The classification is intentionally heuristic: we check whether the concept
// contains process/cycle keywords, which are reliably representable in Mermaid
// or PlantUML. If it does, we prefer Kroki even for biology (where the default
// is svg_first), because "water cycle" is better as a Mermaid flowchart than
// as a freehand SVG.
function classifyRenderStrategy(concept, diagramType) {
  const meta = DIAGRAM_CATALOGUE[diagramType] ?? DIAGRAM_CATALOGUE.generic;
  const conceptLower = concept.toLowerCase();

  const isProcessConcept = meta.process_keywords.some((kw) =>
    conceptLower.includes(kw)
  );

  if (isProcessConcept) {
    // Override svg_first if the concept is clearly a process/cycle
    return {
      strategy: "kroki_first",
      krokilang: meta.preferred_kroki_mode,
    };
  }

  return {
    strategy: meta.render_strategy,
    krokilang: meta.preferred_kroki_mode,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — KROKI RENDERING (TIER 1)
// ═══════════════════════════════════════════════════════════════════════════════

// Encodes diagram source for Kroki's GET endpoint (deflate + base64url).
function encodeForKroki(source) {
  const deflated = zlib.deflateRawSync(Buffer.from(source, "utf-8"));
  return deflated
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Calls the Kroki public API and returns the SVG string, or throws on failure.
function fetchKrokiSvg(krokilang, encodedSource) {
  return new Promise((resolve, reject) => {
    const url = `${KROKI_BASE_URL}/${krokilang}/svg/${encodedSource}`;
    const client = url.startsWith("https") ? https : http;

    const req = client.get(url, { timeout: KROKI_TIMEOUT_MS }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Kroki returned HTTP ${res.statusCode}`));
        return;
      }

      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");
        if (!body.includes("<svg")) {
          reject(new Error("Kroki response did not contain SVG markup"));
        } else {
          resolve(body);
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Kroki request timed out after ${KROKI_TIMEOUT_MS}ms`));
    });

    req.on("error", reject);
  });
}

// Builds the prompt that asks the LLM to generate Kroki-compatible source code.
function buildKrokiSourcePrompt(krokilang, concept, subject, examLevel, extraInstructions, conventions) {
  const mode = KROKI_MODES[krokilang];
  const conventionLines = conventions.map((c) => `- ${c}`).join("\n");

  const systemPrompt = [
    `You are an expert academic diagram author. Your task is to write ${mode.label} source code`,
    `that will be rendered by the Kroki API into an SVG diagram for an examination paper.`,
    "",
    "CRITICAL OUTPUT RULES:",
    `- Output ONLY valid ${mode.label} source code. Nothing else. No explanation, no markdown fences.`,
    `- The diagram syntax must be strictly valid ${mode.description}.`,
    "- Every node, step, or component must be clearly labelled.",
    "- Use left-to-right (LR) or top-to-bottom (TD) layout where the concept flows naturally.",
    "- Keep the diagram readable at A4 print size — no more than 12 nodes/steps.",
    "- Do NOT use Unicode characters outside of basic Latin — Kroki may reject them.",
    "",
    "SUBJECT CONVENTIONS:",
    conventionLines,
  ].join("\n");

  const userPrompt = [
    `Generate ${mode.label} diagram source code for: "${concept}"`,
    subject ? `Subject: ${subject}.` : "",
    examLevel ? `Examination level: ${examLevel}.` : "",
    extraInstructions ? `Additional requirements: ${extraInstructions}` : "",
    `Output only the ${mode.label} source. Start immediately with the diagram syntax.`,
  ]
    .filter(Boolean)
    .join("\n");

  return { systemPrompt, userPrompt };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — LLM RAW SVG RENDERING (TIER 2 & 3)
// ═══════════════════════════════════════════════════════════════════════════════

// Builds the full-detail system prompt for Tier 2 (first attempt).
function buildSvgSystemPromptFull(diagramType, subject, examLevel, conventions) {
  const conventionLines = conventions.map((c) => `- ${c}`).join("\n");

  return [
    "You are an expert technical illustrator specialising in examination-standard diagrams.",
    `Subject area: ${subject || diagramType}.`,
    `Target exam level: ${examLevel || "Secondary / A-Level equivalent"}.`,
    "",
    "YOUR ONLY OUTPUT must be a single, complete, valid SVG element — nothing else.",
    "No markdown fences. No explanation. No preamble. Start with '<svg' and end with '</svg>'.",
    "",
    "TECHNICAL REQUIREMENTS:",
    "- viewBox: '0 0 600 420' (portrait-friendly for A4 exam papers).",
    "- All text: font-family=\"'Helvetica Neue', Arial, sans-serif\"; minimum font-size 11px for labels.",
    "- Stroke colour: #1a1a1a (near-black) for print clarity.",
    "- Use fill='none' on structural outlines; use soft fills for enclosed regions.",
    "  Suggested fills: #d4e8f7 (blue), #d4f7d4 (green), #f7f0d4 (yellow), #f7d4d4 (red), #e8d4f7 (purple).",
    "- Every label must be in a <text> element — NEVER embed text in paths.",
    "- Leader lines: <line> elements ending in <circle r='2' fill='#1a1a1a'/>.",
    "- Arrows: define ONE <marker id='arrow'> in <defs> and reuse it everywhere.",
    "  Example: <marker id='arrow' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'>",
    "             <path d='M0,0 L0,6 L8,3 z' fill='#1a1a1a'/>",
    "           </marker>",
    "  Apply with: marker-end='url(#arrow)'",
    "- Do NOT use: <foreignObject>, <script>, <style> with external fonts, or inline event handlers.",
    "- The diagram must render correctly in black-and-white print.",
    "  Where colour is the only differentiator, also use stroke-dasharray patterns.",
    "- Include a plain-text title at the top: <text x='300' y='24' text-anchor='middle'",
    "  font-size='15' font-weight='bold' fill='#1a1a1a'>TITLE HERE</text>",
    "",
    "SUBJECT-SPECIFIC CONVENTIONS:",
    conventionLines,
    "",
    "OUTPUT: Raw SVG only. Start with '<svg'. End with '</svg>'.",
  ].join("\n");
}

// Builds a simplified system prompt for Tier 3 (fallback retry).
// This prompt drastically constrains what the LLM can do, trading richness for
// guaranteed syntactic validity.
function buildSvgSystemPromptSimplified(subject, examLevel) {
  return [
    "You are a technical diagram generator. Produce a simple, valid SVG diagram.",
    `Topic: ${subject || "Science"}. Level: ${examLevel || "Secondary"}.`,
    "",
    "STRICT RULES — follow exactly:",
    "- Output ONLY raw SVG. Start with '<svg viewBox=\"0 0 600 420\"' and end with '</svg>'.",
    "- Use ONLY these SVG elements: <rect>, <circle>, <ellipse>, <line>, <path>, <text>, <g>, <defs>, <marker>.",
    "- All text must be inside <text> elements with font-family=\"Arial\" and font-size between 10 and 16.",
    "- Use stroke='#000000' and fill='none' for shapes unless adding a soft background colour.",
    "- Soft fills only: #e8f4f8, #e8f8e8, #f8f4e8, #f8e8e8.",
    "- No external references, no scripts, no CSS classes, no <style> blocks.",
    "- Keep the diagram simple: 5–8 labelled components maximum.",
    "- Every component drawn must have a label.",
    "- Output raw SVG only. No other text.",
  ].join("\n");
}

// Builds the user-facing prompt for LLM SVG generation (both Tier 2 and 3).
function buildSvgUserPrompt(concept, subject, examLevel, extraInstructions, simplified = false) {
  const parts = [
    `Draw a fully labelled, examination-standard diagram of: "${concept}".`,
    subject ? `Subject: ${subject}.` : "",
    examLevel ? `This is for a ${examLevel} examination paper.` : "",
  ];

  if (!simplified && extraInstructions) {
    parts.push(`Additional requirements: ${extraInstructions}`);
  } else if (simplified) {
    parts.push("Keep it simple: draw and label the key parts only. No decoration.");
  }

  parts.push("Return only the SVG. Start with '<svg'. End with '</svg>'.");
  return parts.filter(Boolean).join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — SVG VALIDATION & SANITISATION
// ═══════════════════════════════════════════════════════════════════════════════

// Strips any accidental markdown fences the LLM may have wrapped around the SVG.
function stripMarkdownFences(raw) {
  return raw
    .replace(/^```(?:svg|xml|html)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
}

// Removes dangerous SVG elements that could cause XSS or break rendering.
function sanitiseSvg(svg) {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")   // inline event handlers
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

// Ensures the SVG has a viewBox. If it has width/height attributes but no
// viewBox, synthesises one from them.
function ensureViewBox(svg) {
  if (/viewBox\s*=/i.test(svg)) return svg;

  const wMatch = svg.match(/width\s*=\s*["']?(\d+)/i);
  const hMatch = svg.match(/height\s*=\s*["']?(\d+)/i);
  if (wMatch && hMatch) {
    return svg.replace(/<svg/, `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`);
  }

  // Default fallback viewBox
  return svg.replace(/<svg/, '<svg viewBox="0 0 600 420"');
}

// Main validation function. Returns { valid: bool, reason: string, svg: string }.
function validateAndSanitiseSvg(raw) {
  if (!raw || typeof raw !== "string") {
    return { valid: false, reason: "Response was empty or not a string.", svg: null };
  }

  let svg = stripMarkdownFences(raw);

  if (!svg.includes("<svg")) {
    return { valid: false, reason: "Response does not contain an <svg> element.", svg: null };
  }

  // Extract just the SVG element (in case the model prepended text)
  const svgStart = svg.indexOf("<svg");
  const svgEnd = svg.lastIndexOf("</svg>") + 6;
  if (svgStart > 0 || svgEnd < svg.length) {
    svg = svg.slice(svgStart, svgEnd > 6 ? svgEnd : undefined);
  }

  if (svg.length < MIN_SVG_LENGTH) {
    return { valid: false, reason: `SVG is too short (${svg.length} chars) — likely truncated.`, svg: null };
  }

  if (svg.length > MAX_SVG_LENGTH) {
    return { valid: false, reason: `SVG is too long (${svg.length} chars) — likely malformed.`, svg: null };
  }

  if (!svg.includes("</svg>")) {
    return { valid: false, reason: "SVG is not closed — missing </svg>.", svg: null };
  }

  // Check for at least one <text> element (diagrams without labels are useless)
  if (!/<text[\s>]/i.test(svg)) {
    return { valid: false, reason: "SVG contains no <text> labels — diagram would be unlabelled.", svg: null };
  }

  // Sanitise
  svg = sanitiseSvg(svg);
  svg = ensureViewBox(svg);

  return { valid: true, reason: null, svg };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — LLM CALL WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

// Wraps an LLM call with a timeout and returns the text content, or throws.
async function callLlm(llm, messages, signal) {
  const timeoutSignal = AbortSignal.timeout(LLM_TIMEOUT_MS);

  // Combine the caller's abort signal with our own timeout
  const combinedSignal = signal
    ? AbortSignal.any
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal
    : timeoutSignal;

  const result = await llm.invoke(messages, { signal: combinedSignal });

  const content =
    typeof result?.content === "string"
      ? result.content
      : result?.content?.[0]?.text ?? null;

  if (!content || content.trim().length === 0) {
    throw new Error("LLM returned an empty response.");
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — MAIN RENDERING PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

// Attempts Tier 1 (Kroki). Returns { svg, source, krokilang } or throws.
async function renderWithKroki(llm, krokilang, concept, subject, examLevel, extraInstructions, conventions, signal, log) {
  const { systemPrompt, userPrompt } = buildKrokiSourcePrompt(
    krokilang, concept, subject, examLevel, extraInstructions, conventions
  );

  log(`Tier 1: Requesting ${KROKI_MODES[krokilang].label} source from LLM.`);
  const source = await callLlm(
    llm,
    [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
    signal
  );

  // Strip fences that may wrap the source
  const cleanSource = source
    .replace(/^```\w*\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  log(`Tier 1: LLM produced ${cleanSource.length} chars of ${KROKI_MODES[krokilang].label} source. Sending to Kroki.`);

  const encoded = encodeForKroki(cleanSource);
  const svg = await fetchKrokiSvg(krokilang, encoded);

  log(`Tier 1: Kroki returned SVG (${svg.length} chars). Validating.`);

  const validation = validateAndSanitiseSvg(svg);
  if (!validation.valid) {
    throw new Error(`Kroki SVG failed validation: ${validation.reason}`);
  }

  return { svg: validation.svg, source: cleanSource, krokilang };
}

// Attempts Tier 2 or 3 (LLM SVG). Returns the validated SVG string or throws.
async function renderWithLlmSvg(llm, concept, diagramType, subject, examLevel, extraInstructions, conventions, signal, log) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_LLM_RETRIES; attempt++) {
    const simplified = attempt > 1;
    const tierLabel = simplified ? "Tier 3 (simplified retry)" : "Tier 2";

    log(`${tierLabel}: Requesting raw SVG from LLM (attempt ${attempt}/${MAX_LLM_RETRIES}).`);

    const systemPrompt = simplified
      ? buildSvgSystemPromptSimplified(subject, examLevel)
      : buildSvgSystemPromptFull(diagramType, subject, examLevel, conventions);

    const userPrompt = buildSvgUserPrompt(
      concept, subject, examLevel, extraInstructions, simplified
    );

    try {
      const raw = await callLlm(
        llm,
        [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
        signal
      );

      const validation = validateAndSanitiseSvg(raw);

      if (!validation.valid) {
        log(`${tierLabel}: SVG validation failed — ${validation.reason}`);
        lastError = new Error(validation.reason);
        continue; // try again with simplified prompt
      }

      log(`${tierLabel}: Valid SVG received (${validation.svg.length} chars).`);
      return validation.svg;
    } catch (err) {
      log(`${tierLabel}: Error — ${err.message}`);
      lastError = err;
    }
  }

  throw lastError ?? new Error("LLM SVG rendering failed after all retries.");
}

// Master pipeline function. Tries Kroki first if the strategy says so, then
// falls back through the tiers, logging every transition.
async function runRenderingPipeline({
  llm,
  concept,
  diagramType,
  subject,
  examLevel,
  extraInstructions,
  signal,
  log,
}) {
  const meta = DIAGRAM_CATALOGUE[diagramType] ?? DIAGRAM_CATALOGUE.generic;
  const conventions = meta.subject_conventions;
  const { strategy, krokilang } = classifyRenderStrategy(concept, diagramType);

  log(`Pipeline start. Concept: "${concept}". Type: ${diagramType}. Strategy: ${strategy}. Kroki lang: ${krokilang}.`);

  const result = {
    svg: null,
    renderMethod: null, // "kroki" | "llm_svg" | "llm_svg_simplified"
    krokilang: null,
  };

  // ── Tier 1: Kroki ──────────────────────────────────────────────────────────
  if (strategy === "kroki_first") {
    try {
      const kroki = await renderWithKroki(
        llm, krokilang, concept, subject, examLevel,
        extraInstructions, conventions, signal, log
      );
      result.svg = kroki.svg;
      result.renderMethod = "kroki";
      result.krokilang = kroki.krokilang;
      log(`Pipeline complete via Kroki (${krokilang}).`);
      return result;
    } catch (err) {
      log(`Tier 1 failed: ${err.message}. Falling back to LLM SVG.`);
    }
  }

  // ── Tier 2 + 3: LLM SVG (with internal retry / simplification) ────────────
  try {
    const svg = await renderWithLlmSvg(
      llm, concept, diagramType, subject, examLevel,
      extraInstructions, conventions, signal, log
    );
    result.svg = svg;
    result.renderMethod = "llm_svg";
    log(`Pipeline complete via LLM SVG.`);
    return result;
  } catch (err) {
    // If we haven't tried Kroki yet (svg_first strategy), try it now as a
    // last-resort fallback before giving up entirely.
    if (strategy === "svg_first") {
      log(`LLM SVG failed: ${err.message}. Attempting Kroki as last resort.`);
      try {
        const kroki = await renderWithKroki(
          llm, krokilang, concept, subject, examLevel,
          extraInstructions, conventions, signal, log
        );
        result.svg = kroki.svg;
        result.renderMethod = "kroki_fallback";
        result.krokilang = kroki.krokilang;
        log(`Pipeline complete via Kroki fallback.`);
        return result;
      } catch (krokiErr) {
        log(`Kroki fallback also failed: ${krokiErr.message}.`);
      }
    }

    throw new Error(
      `All rendering tiers exhausted. Last error: ${err.message}`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — PLUGIN DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

const ExamDiagram = {
  name: "exam-diagram",
  startupConfig: {
    params: {},
  },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: this.name,
          tracker: new Deduplicator(),
          controller: new AbortController(),

          description:
            "Generates a labelled, examination-standard diagram for biology, physics, chemistry, " +
            "geography, or any academic subject. Automatically selects the best rendering method " +
            "(Kroki structured diagrams for cycles/processes, LLM-generated SVG for freehand " +
            "biological/chemical illustrations) and falls back gracefully if any method fails. " +
            "Use when a student or teacher asks for a diagram, illustration, sketch, or visual " +
            "of any concept. Examples: 'draw a diagram of the heart', 'show me the water cycle', " +
            "'circuit diagram for a series circuit', 'label the nitrogen cycle', " +
            "'diagram of distillation apparatus', 'draw mitosis stages'.",

          examples: [
            {
              prompt: "Draw a labelled diagram of a plant cell.",
              call: JSON.stringify({
                diagram_type: "biology",
                subject: "Biology",
                concept: "plant cell structure",
                exam_level: "O-Level",
                extra_instructions: "Include: cell wall, cell membrane, nucleus, chloroplast, vacuole, mitochondria, ribosomes.",
              }),
            },
            {
              prompt: "Show me the water cycle for my geography exam.",
              call: JSON.stringify({
                diagram_type: "geography",
                subject: "Geography",
                concept: "water cycle (hydrological cycle)",
                exam_level: "A-Level",
                extra_instructions: "Show evaporation, condensation, precipitation, surface runoff, infiltration, and transpiration with labelled arrows.",
              }),
            },
            {
              prompt: "Draw a series circuit with a battery, resistor, and bulb.",
              call: JSON.stringify({
                diagram_type: "physics",
                subject: "Physics",
                concept: "series circuit with battery, resistor, and light bulb",
                exam_level: "O-Level",
                extra_instructions: "Label each component. Show direction of conventional current.",
              }),
            },
            {
              prompt: "Diagram the apparatus for simple distillation.",
              call: JSON.stringify({
                diagram_type: "chemistry",
                subject: "Chemistry",
                concept: "simple distillation apparatus",
                exam_level: "O-Level",
                extra_instructions: "Label: round-bottom flask, Liebig condenser, thermometer, receiving flask, heat source. Show water in/out on condenser.",
              }),
            },
            {
              prompt: "Show me the stages of mitosis.",
              call: JSON.stringify({
                diagram_type: "biology",
                subject: "Biology",
                concept: "stages of mitosis",
                exam_level: "A-Level",
                extra_instructions: "Show prophase, metaphase, anaphase, telophase as sequential panels. Label chromosomes, spindle fibres, cell plate.",
              }),
            },
            {
              prompt: "Draw the nitrogen cycle.",
              call: JSON.stringify({
                diagram_type: "biology",
                subject: "Biology",
                concept: "nitrogen cycle",
                exam_level: "A-Level",
                extra_instructions: "Include: nitrogen fixation, nitrification, denitrification, ammonification. Label the bacteria responsible at each step.",
              }),
            },
          ],

          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              diagram_type: {
                type: "string",
                enum: ["biology", "physics", "chemistry", "geography", "generic"],
                description:
                  "The subject family of the diagram. Drives labelling conventions, rendering strategy, " +
                  "and style rules. Use 'generic' for cross-subject or conceptual diagrams (flowcharts, mind maps).",
              },
              subject: {
                type: "string",
                description: "The specific subject, e.g. 'Biology', 'Physics', 'Human Geography'. Used to fine-tune prompts.",
              },
              concept: {
                type: "string",
                description:
                  "What should be drawn — be specific and descriptive. " +
                  "e.g. 'mitosis — all four stages', 'refraction through a glass block', " +
                  "'nitrogen cycle', 'voltaic cell with copper and zinc electrodes in CuSO4'.",
              },
              exam_level: {
                type: "string",
                "x-nullable": true,
                description:
                  "The examination level: 'Primary', 'O-Level', 'GCSE', 'A-Level', 'IB', 'AP', etc. " +
                  "Affects complexity and detail. Infer from the student profile if available.",
              },
              extra_instructions: {
                type: "string",
                "x-nullable": true,
                description:
                  "Additional drawing instructions: specific structures to include, labels that must appear, " +
                  "orientation, number of panels, etc.",
              },
            },
            required: ["diagram_type", "concept"],
            additionalProperties: false,
          },

          handler: async function ({
            diagram_type = "generic",
            subject = null,
            concept,
            exam_level = null,
            extra_instructions = null,
          }) {
            // Convenience log wrapper that always prefixes with the caller name
            const log = (msg) => this.super.introspect(`${this.caller}: ${msg}`);

            try {
              // ── Deduplication guard ─────────────────────────────────────────
              const callKey = { diagram_type, concept };
              if (this.tracker.isDuplicate(this.name, callKey)) {
                this.super.handlerProps.log(`${this.name} exited early — duplicate call.`);
                return "This diagram has already been generated in this session.";
              }

              log(`Starting diagram generation for "${concept}" (${diagram_type}, ${exam_level ?? "unspecified level"}).`);

              // ── Abort handler ───────────────────────────────────────────────
              this.super.onAbort(() => {
                this.super.handlerProps.log("Abort triggered — cancelling diagram generation.");
                this.controller.abort();
              });

              // ── Initialise LLM ──────────────────────────────────────────────
              // Temperature 0.2: we want consistent, accurate diagrams, not creativity.
              const llm = Provider.LangChainChatModel(this.super.provider, {
                temperature: 0.2,
                model: this.super.model,
              });

              // ── Run the rendering pipeline ──────────────────────────────────
              const renderResult = await runRenderingPipeline({
                llm,
                concept,
                diagramType: diagram_type,
                subject,
                examLevel: exam_level,
                extraInstructions: extra_instructions,
                signal: this.controller.signal,
                log,
              });

              log(`Diagram ready. Method: ${renderResult.renderMethod}. SVG size: ${renderResult.svg.length} chars.`);

              // ── Send to client ──────────────────────────────────────────────
              this.super.socket.send("ExamDiagram", {
                svg: renderResult.svg,
                concept,
                subject: subject ?? diagram_type,
                exam_level: exam_level ?? "General",
                render_method: renderResult.renderMethod,
                kroki_lang: renderResult.krokilang ?? null,
              });

              // ── Persistence metadata ────────────────────────────────────────
              this.super._replySpecialAttributes = {
                saveAsType: "ExamDiagram",
                storedResponse: (caption = "") =>
                  JSON.stringify({
                    svg: renderResult.svg,
                    concept,
                    subject: subject ?? diagram_type,
                    exam_level: exam_level ?? "General",
                    render_method: renderResult.renderMethod,
                    kroki_lang: renderResult.krokilang ?? null,
                    caption,
                  }),
                postSave: () => this.tracker.removeUniqueConstraint?.(this.name),
              };

              this.tracker.trackRun(this.name, callKey);

              // ── Close session ───────────────────────────────────────────────
              this.super.socket.send("agentClose", {
                message: "Diagram generated successfully.",
              });
              this.super.close();

              return `Diagram generated successfully using ${renderResult.renderMethod}. Session complete.`;
            } catch (error) {
              this.super.handlerProps.log(
                `exam-diagram raised an unrecoverable error: ${error.message}`
              );
              return (
                `Let the user know this action was not successful. ` +
                `The diagram could not be generated after trying all available rendering methods. ` +
                `Error: ${error.message}. ` +
                `Suggest the student describe the concept differently or try a simpler version.`
              );
            }
          },
        });
      },
    };
  },
};

module.exports = { ExamDiagram };