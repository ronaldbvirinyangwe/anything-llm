const { Deduplicator } = require("../utils/dedupe");
const { runCourseGeneration } = require("./course-gen-core");

const GenerateCourse = {
  name: "generate-course",
  startupConfig: { params: {} },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: this.name,
          tracker: new Deduplicator(),

          description:
            "Starts generating a course for a subject in the background (module 1 builds first; later " +
            "modules generate as the student progresses), using the student's curriculum, academic level, " +
            "and grade automatically — never ask for those. Returns immediately; generation continues " +
            "after this call returns. Use this when the student picks a subject to study and no course " +
            "exists for it yet.",

          examples: [
            { prompt: "I want to start studying Biology", call: JSON.stringify({ subject: "Biology" }) },
          ],

          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: { subject: { type: "string" } },
            required: ["subject"],
            additionalProperties: false,
          },

          handler: async function ({ subject }) {
            try {
              const callKey = { subject };
              if (this.tracker.isDuplicate(this.name, callKey)) {
                return "A course for this subject is already being generated. Check the Courses page for progress.";
              }
              this.tracker.trackRun(this.name, callKey);

              const userId = this.super.handlerProps.invocation?.user_id;

              // ── Check if it already exists / is already in progress BEFORE
              // firing anything off, so we can give an accurate immediate reply.
              const { getStudentProfile } = require("./course-gen-core");
              const student = await getStudentProfile(userId);
              if (!student) {
                return "Let the user know this action was not successful. No student profile was found.";
              }

              const { PrismaClient } = require("@prisma/client");
              const prisma = new PrismaClient();
              const existing = await prisma.courses.findFirst({
                where: {
                  subject,
                  curriculum: student.curriculum,
                  academicLevel: student.academicLevel,
                  grade: student.grade,
                },
              });

              if (existing && existing.status === "ready") {
                await prisma.student_courses.upsert({
                  where: { studentId_courseId: { studentId: student.id, courseId: existing.id } },
                  create: { studentId: student.id, courseId: existing.id },
                  update: {},
                });
                return `A ${subject} course already exists — the student is enrolled. They can resume it from the Courses page.`;
              }

              if (existing && existing.status === "generating") {
                return `${subject} is already being generated — the student can check progress on the Courses page.`;
              }

              // ── Fire-and-forget: do NOT await this. Generation continues
              // in the background; the DB rows (courses.status,
              // course_modules.status) are the source of truth that the
              // Courses page polls. The chat reply returns immediately.
              runCourseGeneration({
                userId,
                subject,
                provider: this.super.provider,
                model: this.super.model,
                onProgress: (msg) => this.super.introspect(`${this.caller}: ${msg}`),
              }).catch((error) => {
                this.super.handlerProps.log(`generate-course background failure: ${error.message}`);
              });

              return `Started building the ${subject} course in the background — the student can open the Courses page to watch it come together, starting with module 1.`;
            } catch (error) {
              this.super.handlerProps.log(`generate-course raised an error. ${error.message}`);
              return `Let the user know this action was not successful. An error occurred while starting course generation: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { GenerateCourse };