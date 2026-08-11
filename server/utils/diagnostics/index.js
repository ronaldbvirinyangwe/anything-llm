const {
  callJsonLLM,
  resolveDefaultLLM,
} = require("../agents/aibitat/plugins/course-gen-core");

const QUESTION_COUNT = 12;
const OPTION_IDS = ["A", "B", "C", "D"];

function boundedText(value, max) {
  const text = String(value || "").trim();
  return text && text.length <= max ? text : null;
}

function normalizeDiagnostic(raw, preferredTopics = []) {
  if (!raw || !Array.isArray(raw.questions))
    throw new Error("Diagnostic response has no questions");

  const questions = raw.questions.map((question, index) => {
    const id = boundedText(question.id, 20);
    let topic = boundedText(question.topic, 100);
    const prompt = boundedText(question.prompt, 1000);
    const explanation = boundedText(question.explanation, 1500);
    const correctOption = String(question.correctOption || "").toUpperCase();
    if (
      !id ||
      !topic ||
      !prompt ||
      !explanation ||
      !OPTION_IDS.includes(correctOption)
    )
      throw new Error(`Diagnostic question ${index + 1} is invalid`);
    if (preferredTopics.length) {
      topic = preferredTopics.find(
        (preferred) => preferred.toLowerCase() === topic.toLowerCase()
      );
      if (!topic)
        throw new Error("Diagnostic used a topic outside the course blueprint");
    }
    if (!Array.isArray(question.options) || question.options.length !== 4)
      throw new Error(`Diagnostic question ${index + 1} needs four options`);

    const options = question.options.map((option, optionIndex) => {
      const optionId = String(option?.id || "").toUpperCase();
      const text = boundedText(option?.text, 500);
      if (optionId !== OPTION_IDS[optionIndex] || !text)
        throw new Error(`Diagnostic question ${index + 1} has invalid options`);
      return { id: optionId, text };
    });

    return {
      id,
      topic,
      prompt,
      options,
      correctOption,
      explanation,
      difficulty: ["foundational", "standard", "stretch"].includes(
        question.difficulty
      )
        ? question.difficulty
        : "standard",
    };
  });

  if (questions.length !== QUESTION_COUNT)
    throw new Error(`Diagnostic must contain ${QUESTION_COUNT} questions`);
  if (new Set(questions.map(({ id }) => id)).size !== questions.length)
    throw new Error("Diagnostic question IDs must be unique");
  if (
    new Set(questions.map(({ prompt }) => prompt.toLowerCase())).size !==
    questions.length
  )
    throw new Error("Diagnostic questions must be unique");

  const topics = [...new Set(questions.map(({ topic }) => topic))];
  if (topics.length < 3 || topics.length > 5)
    throw new Error("Diagnostic must cover three to five topics");
  if (
    topics.some(
      (topic) => questions.filter((q) => q.topic === topic).length < 2
    )
  )
    throw new Error("Each diagnostic topic needs at least two questions");

  return { version: 1, topics, questions };
}

function publicAssessment(assessment) {
  const stored = assessment.questions || { topics: [], questions: [] };
  return {
    id: assessment.id,
    subject: assessment.subject,
    curriculum: assessment.curriculum,
    grade: assessment.grade,
    status: assessment.status,
    questionCount: assessment.questionCount,
    topics: stored.topics || [],
    questions: (stored.questions || []).map(
      ({ id, topic, prompt, options, difficulty }) => ({
        id,
        topic,
        prompt,
        options,
        difficulty,
      })
    ),
    expiresAt: assessment.expiresAt,
    submittedAt: assessment.submittedAt,
    report: assessment.status === "submitted" ? assessment.report : null,
  };
}

async function generateDiagnostic({ student, subject, preferredTopics = [] }) {
  const { provider, model } = await resolveDefaultLLM();
  if (!provider || !model)
    throw new Error("No diagnostic generation model configured");
  const topicDirection = preferredTopics.length
    ? `Use exactly these course topics: ${preferredTopics.join(" | ")}.`
    : "Choose exactly four broad, distinct topics from this syllabus level.";
  const systemPrompt = [
    `You design low-stakes diagnostic assessments for ${student.curriculum} ${student.grade} learners.`,
    `Create exactly ${QUESTION_COUNT} multiple-choice ${subject} questions across exactly four topics, with three questions per topic.`,
    topicDirection,
    "Use a balanced mix of foundational, standard, and stretch questions.",
    "Every question must test understanding, not trivia. Avoid ambiguous wording and trick questions.",
    "Return only JSON in this shape:",
    '{"questions":[{"id":"q1","topic":"...","prompt":"...","options":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"correctOption":"A","explanation":"...","difficulty":"foundational|standard|stretch"}]}',
  ].join("\n");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const raw = await callJsonLLM({
      provider,
      model,
      systemPrompt,
      userPrompt: `Student age: ${student.age}. Academic level: ${student.academicLevel}. Subject: ${subject}.`,
      signal: controller.signal,
    });
    return {
      diagnostic: normalizeDiagnostic(raw, preferredTopics),
      provider,
      model,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function gradeDiagnostic(assessment, answers) {
  const stored = assessment.questions;
  const answerMap = new Map(
    answers.map(({ questionId, optionId }) => [questionId, optionId])
  );
  const topicMap = new Map();
  let correct = 0;

  const questionResults = stored.questions.map((question) => {
    const selectedOption = answerMap.get(question.id) || null;
    const isCorrect = selectedOption === question.correctOption;
    if (isCorrect) correct += 1;
    if (!topicMap.has(question.topic))
      topicMap.set(question.topic, { correct: 0, total: 0, questions: [] });
    const topic = topicMap.get(question.topic);
    topic.total += 1;
    if (isCorrect) topic.correct += 1;
    const result = {
      questionId: question.id,
      topic: question.topic,
      prompt: question.prompt,
      selectedOption,
      correctOption: question.correctOption,
      isCorrect,
      explanation: question.explanation,
      options: question.options,
    };
    topic.questions.push(result);
    return result;
  });

  const topics = [...topicMap.entries()].map(([name, value]) => ({
    name,
    score: Math.round((value.correct / value.total) * 100),
    correct: value.correct,
    total: value.total,
    questions: value.questions,
  }));
  const ranked = [...topics].sort((a, b) => b.score - a.score);
  return {
    overallScore: Math.round((correct / stored.questions.length) * 100),
    correct,
    total: stored.questions.length,
    topics,
    strengths: ranked
      .filter(({ score }) => score >= 70)
      .map(({ name }) => name),
    priorities: ranked
      .filter(({ score }) => score < 60)
      .reverse()
      .map(({ name }) => name),
    recommendedTopic:
      [...topics].sort((a, b) => a.score - b.score)[0]?.name || null,
    questions: questionResults,
  };
}

module.exports = {
  QUESTION_COUNT,
  generateDiagnostic,
  gradeDiagnostic,
  normalizeDiagnostic,
  publicAssessment,
};
