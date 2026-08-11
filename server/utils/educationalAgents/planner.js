const { getAgentProfile, profileAllowsSkill } = require("./profiles");

const SUBJECTS = [
  "Accounting",
  "Agriculture",
  "Biology",
  "Business Studies",
  "Chemistry",
  "Computer Science",
  "Economics",
  "English",
  "Geography",
  "History",
  "Mathematics",
  "Physics",
  "Science",
];

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null) ?? null;
}

function normalizeRequest(messageOrRequest, context) {
  if (typeof messageOrRequest === "string") {
    return { message: messageOrRequest, context: context || {} };
  }

  const request = messageOrRequest || {};
  return {
    message: typeof request.message === "string" ? request.message : "",
    context:
      context ||
      request.educationalContext ||
      request.context ||
      request.student ||
      {},
  };
}

function educationConstraints(context) {
  const education = context.education || {};
  const student = context.student || {};
  return {
    curriculum: firstValue(
      context.curriculum,
      education.curriculum,
      student.curriculum
    ),
    grade: firstValue(context.grade, education.grade, student.grade),
  };
}

function extractSubject(message, context) {
  const supplied = firstValue(
    context.subject,
    context.education?.subject,
    context.student?.subject
  );
  if (typeof supplied === "string" && supplied.trim()) return supplied.trim();

  return (
    SUBJECTS.find((subject) =>
      new RegExp(`\\b${subject.replace(" ", "\\s+")}\\b`, "i").test(message)
    ) || null
  );
}

function extractExamDate(message, context) {
  const supplied = firstValue(
    context.exam_date,
    context.examDate,
    context.education?.exam_date,
    context.education?.examDate,
    context.education?.studyPlan?.exam_date,
    context.education?.studyPlan?.examDate
  );
  if (supplied) return String(supplied).slice(0, 10);
  return message.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] || null;
}

function extractHoursPerDay(message, context) {
  const supplied = firstValue(
    context.hours_per_day,
    context.hoursPerDay,
    context.education?.hours_per_day,
    context.education?.hoursPerDay
  );
  if (supplied !== null) {
    const hours = Number(supplied);
    if (Number.isFinite(hours) && hours > 0) return hours;
  }

  const numeric = message.match(
    /\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:(?:a|per|each|every)?\s*day|daily)\b/i
  );
  if (numeric) return Number(numeric[1]);
  if (
    /\b(?:an|one)\s+hour\s+(?:(?:a|per|each|every)?\s*day|daily)\b/i.test(
      message
    )
  )
    return 1;
  return null;
}

function cleanTopic(value) {
  return value
    .replace(/\b(?:please|for me|today)\b.*$/i, "")
    .replace(/[.?!]+$/, "")
    .trim()
    .toLowerCase();
}

function extractTopics(message, context) {
  const supplied = firstValue(
    context.topics,
    context.education?.topics,
    context.education?.studyPlan?.topics
  );
  if (Array.isArray(supplied)) return supplied.filter(Boolean).map(String);

  const match =
    message.match(/\bcovering\s+([^.!?]+)/i) ||
    message.match(/\btopics?(?:\s+are)?\s+([^.!?]+)/i) ||
    message.match(/\bfor\s+([^.!?]+)/i);
  if (!match) return [];
  return match[1]
    .split(/\s*(?:,|\band\b)\s*/i)
    .map(cleanTopic)
    .filter(Boolean)
    .filter((topic) => !/^(?:my\s+)?\d{4}-\d{2}-\d{2}\s+exam$/i.test(topic));
}

function extractCount(message, nouns) {
  const match = message.match(
    new RegExp(`\\b(\\d+)\\s+(?:${nouns.join("|")})\\b`, "i")
  );
  return match ? Number(match[1]) : null;
}

function extractRequestedTopic(message, subject) {
  const match = message.match(/\b(?:about|on|covering)\s+([^.!?]+)/i);
  if (match) return cleanTopic(match[1]);
  return subject;
}

function decision(context, agent, intent, skills, parameters = {}, extra = {}) {
  const profile = getAgentProfile(agent);
  if (!profile || skills.some((skill) => !profileAllowsSkill(profile, skill))) {
    throw new Error(
      `Agent ${agent} cannot use the selected educational skills.`
    );
  }

  const constraints = educationConstraints(context);
  return {
    intent,
    agent,
    role: agent,
    skills,
    parameters,
    missingFields: [],
    steps: skills.slice(),
    advanceTopic: null,
    actionable: skills.length > 0,
    curriculum: constraints.curriculum,
    grade: constraints.grade,
    ...extra,
  };
}

function planEducationalRequest(messageOrRequest, educationalContext) {
  const normalized = normalizeRequest(messageOrRequest, educationalContext);
  const message = normalized.message.trim();
  const context = normalized.context;
  const subject = extractSubject(message, context);
  const lower = message.toLowerCase();

  const remediation =
    /\b(?:got|answered|was|is)\b.{0,30}\b(?:wrong|incorrect)\b/i.test(
      message
    ) ||
    /\b(?:failed|misunderstood|struggling with|weak (?:at|in))\b/i.test(
      message
    );
  if (remediation) {
    return decision(
      context,
      "tutor",
      "mastery-remediation",
      ["check-my-answer", "explain-concept"],
      { subject, topic: extractRequestedTopic(message, subject) },
      {
        steps: ["feedback", "remediation", "reassessment"],
        advanceTopic: false,
      }
    );
  }

  if (
    /\b(?:study|revision|exam prep(?:aration)?)\s+(?:plan|schedule)\b|\bplan\b.{0,30}\b(?:revision|stud(?:y|ying)|exam)\b/i.test(
      lower
    )
  ) {
    const examDate = extractExamDate(message, context);
    const parameters = {
      subject,
      exam_date: examDate,
      hours_per_day: extractHoursPerDay(message, context),
      topics: extractTopics(message, context),
    };
    for (const key of Object.keys(parameters)) {
      if (parameters[key] === null || parameters[key]?.length === 0)
        delete parameters[key];
    }

    if (!examDate) {
      return decision(
        context,
        "academic-coach",
        "collect-study-plan-requirements",
        ["study-planner-elicit"],
        parameters,
        { missingFields: ["exam_date"], steps: ["elicit-requirements"] }
      );
    }
    return decision(
      context,
      "academic-coach",
      "generate-study-plan",
      ["study-planner"],
      parameters,
      { steps: ["generate-study-plan"] }
    );
  }

  if (/\b(?:quiz|test|practice questions?|exam questions?)\b/i.test(message)) {
    const count = extractCount(message, ["questions?", "items?"]);
    return decision(context, "assessor", "create-quiz", ["quiz_create_agent"], {
      subject,
      topic: extractRequestedTopic(message, subject),
      ...(count ? { numQuestions: count } : {}),
    });
  }

  if (
    /\b(?:flashcards?|flash cards?|revision cards?|memory cards?)\b/i.test(
      message
    )
  ) {
    const count = extractCount(message, ["cards?", "flashcards?"]);
    return decision(
      context,
      "tutor",
      "create-flashcards",
      ["flashcard_create_agent"],
      {
        subject,
        topic: extractRequestedTopic(message, subject),
        ...(count ? { numCards: count } : {}),
      }
    );
  }

  if (/\b(?:notes?|study guide|revision guide|summary)\b/i.test(message)) {
    const role = context.permissions?.role || context.role;
    const agent = ["teacher", "manager", "admin"].includes(role)
      ? "teacher-assistant"
      : "tutor";
    return decision(context, agent, "generate-notes", ["generate-notes"], {
      subject,
      topic: extractRequestedTopic(message, subject),
    });
  }

  if (
    /\b(?:explain|teach me|help me understand|what (?:is|are)|how does|why does)\b/i.test(
      message
    )
  ) {
    return decision(context, "tutor", "explain-concept", ["explain-concept"], {
      subject,
      concept: extractRequestedTopic(message, subject),
    });
  }

  return decision(context, "tutor", "fallback-tutoring", [], {
    subject,
    message,
  });
}

class EducationalPlanner {
  plan(messageOrRequest, educationalContext) {
    return planEducationalRequest(messageOrRequest, educationalContext);
  }
}

module.exports = { EducationalPlanner, planEducationalRequest };
