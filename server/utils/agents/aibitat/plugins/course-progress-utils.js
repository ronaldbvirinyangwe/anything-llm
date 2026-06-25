const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Simple, dependency-free fuzzy match: normalizes and checks word overlap.
// Good enough for matching a spoken/typed topic against a generated lesson
// title without needing a full Levenshtein library.
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function similarity(a, b) {
  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.max(wordsA.size, wordsB.size);
}

const MATCH_THRESHOLD = 0.5; // require at least half the significant words to overlap

/**
 * Attempts to mark a lesson done based on a fuzzy topic match, scoped to a
 * subject the student is enrolled in. Returns null if no confident match
 * was found, or if the lesson is already done / not yet generated.
 *
 * @param {object} opts
 * @param {number} opts.userId
 * @param {string} opts.subject
 * @param {string} opts.topic   - free-text topic/concept just covered in chat
 * @returns {Promise<{ lessonId: number, lessonTitle: string, moduleTitle: string, courseId: number, alreadyDone: boolean } | null>}
 */
async function markLessonCompleteByTopic({ userId, subject, topic }) {
  if (!userId || !subject || !topic) return null;

  const student = await prisma.students.findFirst({ where: { user_id: Number(userId) } });
  if (!student) return null;

  const course = await prisma.courses.findFirst({
    where: {
      subject,
      curriculum: student.curriculum,
      academicLevel: student.academicLevel,
      grade: student.grade,
    },
  });
  if (!course) return null;

  const enrolled = await prisma.student_courses.findFirst({
    where: { studentId: student.id, courseId: course.id },
  });
  if (!enrolled) return null;

  const modules = await prisma.course_modules.findMany({
    where: { courseId: course.id, status: "ready" },
    include: {
      lessons: { include: { progress: { where: { studentId: student.id } } } },
    },
  });

  let best = null;
  let bestScore = 0;

  for (const m of modules) {
    for (const l of m.lessons) {
      const score = similarity(topic, l.title);
      if (score > bestScore) {
        bestScore = score;
        best = { lesson: l, module: m };
      }
    }
  }

  if (!best || bestScore < MATCH_THRESHOLD) return null;

  const { lesson, module } = best;
  const alreadyDone = lesson.progress.length > 0 && lesson.progress[0].done;

  if (!alreadyDone) {
    await prisma.student_lesson_progress.upsert({
      where: { studentId_lessonId: { studentId: student.id, lessonId: lesson.id } },
      update: { done: true, doneAt: new Date() },
      create: { studentId: student.id, lessonId: lesson.id, done: true, doneAt: new Date() },
    });
  }

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    moduleTitle: module.title,
    courseId: course.id,
    alreadyDone,
  };
}

module.exports = { markLessonCompleteByTopic };