const DATE = "11 August 2026";
const DATE_ISO = "2026-08-11";

const links = {
  pillar: {
    label: "Complete Chikoro AI feature guide",
    to: "/blog/chikoro-ai-features-guide",
  },
  students: {
    label: "Chikoro AI for students in Zimbabwe",
    to: "/blog/chikoro-ai-for-students-zimbabwe",
  },
  teachers: {
    label: "Chikoro AI for teachers in Zimbabwe",
    to: "/blog/chikoro-ai-for-teachers-zimbabwe",
  },
  parents: {
    label: "Chikoro AI for parents in Zimbabwe",
    to: "/blog/chikoro-ai-for-parents-zimbabwe",
  },
  schools: {
    label: "Chikoro AI for schools and education leaders",
    to: "/blog/chikoro-ai-for-schools-zimbabwe",
  },
};

const common = { date: DATE, dateIso: DATE_ISO };

export const featureGuideArticles = {
  update: {
    ...common,
    shortTitle: "August 2026 product update",
    title:
      "What Chikoro AI Can Do Now: Today, Offline Learning and Mastery Recovery",
    tag: "Product Update",
    readTime: "10 min read",
    directAnswer:
      "Chikoro AI now connects curriculum mastery, diagnostics, teacher assignments, downloadable learning, a personalised Today dashboard and spaced review. Students can see what to do next, complete supported work with limited connectivity and revisit weak topics on a 1, 3, 7, 14 and 30-day schedule. AI tutoring and diagnostic generation still require internet access and an available model.",
    sections: [
      {
        id: "what-changed",
        heading: "What changed in Chikoro AI?",
        paragraphs: [
          "The latest Chikoro AI work turns several separate study tools into one connected learning cycle. A learner can identify a weak curriculum topic, receive a recommended next action, complete an assignment or lesson, practise the topic again and see stronger evidence appear on the Mastery Map.",
          "The seven connected capabilities are curriculum mastery, diagnostic assessments, expanded course content, assignments and gradebooks, offline and low-data learning, the Today dashboard, and Mastery Recovery. Together they answer three practical questions: What should I study now? What evidence shows that I understand it? What should I review before I forget it?",
        ],
        callout: {
          tone: "info",
          title: "A learning system, not only a chatbot",
          body: "Tutor chat remains useful for explanations, but the platform now also records structured evidence from diagnostics, quizzes, lessons, assignments and review attempts. That evidence helps Chikoro AI recommend a concrete next step instead of leaving the learner with an empty prompt box.",
        },
      },
      {
        id: "today-dashboard",
        heading: "The Today dashboard chooses a useful next step",
        paragraphs: [
          "A student can open Chikoro AI and begin from the Today dashboard. It combines current assignments, study-plan tasks, weak areas, curriculum mastery gaps, available lessons, due reviews and notifications. A deterministic priority order turns those signals into a short list of actions with direct links to the relevant activity.",
          "This matters because a long list of tools can create its own kind of confusion. Today reduces that choice: urgent schoolwork comes forward, due recovery practice is visible, and broader study suggestions fill the space when nothing is overdue.",
        ],
        items: [
          "Due and overdue assignments can lead directly to the assigned work.",
          "Scheduled study-plan tasks can become the next recommended session.",
          "Weak topics and low mastery can lead to targeted practice or a relevant lesson.",
          "Due Mastery Recovery questions return at the correct review interval.",
          "Notifications and course progress provide context without replacing the main action.",
        ],
      },
      {
        id: "diagnostics-and-mastery",
        heading:
          "Diagnostics and the Mastery Map establish where help is needed",
        paragraphs: [
          "Curriculum topics give progress a common structure. Instead of treating every quiz as an isolated score, Chikoro AI can connect assessment evidence to a subject and topic. The Mastery Map then shows which areas have stronger evidence, which need attention and which have not yet been assessed.",
          "A diagnostic assessment can establish a starting point before a learner begins a topic or revision period. Incorrect diagnostic answers can seed the recovery queue, while correct scored work contributes evidence toward mastery. Course completion is still shown, but opening or finishing a lesson is not treated as proof that the learner can answer questions independently.",
        ],
        callout: {
          tone: "caution",
          title: "Diagnostic generation depends on an AI service",
          body: "Creating a new AI-generated diagnostic requires internet access and an available configured model. If that service is unavailable, existing learning records remain useful, but the platform cannot honestly generate a new diagnostic until the service returns.",
        },
      },
      {
        id: "mastery-recovery",
        heading: "Mastery Recovery turns mistakes into scheduled practice",
        paragraphs: [
          "When a learner gets a supported multiple-choice question wrong in a diagnostic or teacher-shared quiz, Chikoro AI can add that question to Mastery Recovery. A correct answer moves the question through fixed intervals of 1, 3, 7, 14 and 30 days. A wrong answer resets it for the following day.",
          "The spacing is deliberately simple and transparent. Learners do not need to guess when to revisit a difficult idea, and teachers or families can understand why a question has returned. Repeating the same item immediately does not create extra mastery evidence, which prevents rapid guessing from looking like durable learning.",
        ],
        items: [
          "Day 1 checks whether the correction was understood after a short delay.",
          "Days 3 and 7 strengthen recall across the first week.",
          "Days 14 and 30 test whether the knowledge lasts over longer gaps.",
          "A recovered topic can appear as stronger evidence on the Mastery Map.",
        ],
      },
      {
        id: "assignments-gradebook",
        heading: "Assignments connect teacher work to student progress",
        paragraphs: [
          "Teachers can create assignments, send them to linked students, track submission status and return a grade with feedback. Students receive the assignment in their own workspace and can open the exact task rather than searching through a general quiz list.",
          "Completed graded work becomes read-only for the learner, preserving the result and teacher feedback. The gradebook gives teachers one place to see who has submitted, who still needs support and how the class is progressing. Multiple-choice questions can also feed Mastery Recovery when a learner needs another attempt later.",
        ],
      },
      {
        id: "offline-low-data",
        heading: "What works offline or in low-data mode?",
        paragraphs: [
          "Chikoro AI now stores supported learning resources by account on the device. Downloaded course modules, cached student assignments and the review queue can remain available when the connection drops. Supported lesson completion, assignment submissions and review attempts can enter an outbox and synchronise when the device reconnects.",
          "Each queued submission has an idempotency identifier. This helps the server recognise the same operation if a weak connection causes it to be sent again, reducing duplicate progress records. An offline status control shows whether work is waiting to synchronise or needs attention.",
        ],
        table: {
          caption: "Chikoro AI online and offline capability comparison",
          headers: [
            "Activity",
            "Offline or low-data support",
            "What synchronises",
          ],
          rows: [
            [
              "Downloaded courses",
              "Previously downloaded modules can be opened on the same device and account",
              "Supported lesson and quiz completion",
            ],
            [
              "Student assignments",
              "Cached assignment details can be opened and supported responses saved",
              "Queued submissions when a connection returns",
            ],
            [
              "Mastery Recovery",
              "Cached due questions can be answered without a live request",
              "Independent review attempts with duplicate protection",
            ],
            [
              "AI tutor and new diagnostics",
              "Not available offline",
              "A live AI service is required; these requests are not queued as completed work",
            ],
          ],
        },
      },
      {
        id: "roles",
        heading: "How the connected workflow helps each role",
        table: {
          caption:
            "Benefits of the connected Chikoro AI learning workflow by role",
          headers: ["Role", "What they can do", "What the evidence means"],
          rows: [
            [
              "Students",
              "Follow Today, complete assigned or downloaded work, and recover weak topics",
              "Mastery reflects scored evidence, not only activity or lesson completion",
            ],
            [
              "Teachers",
              "Set work, monitor submissions, return feedback and review question outcomes",
              "The gradebook supports teaching decisions but does not replace professional judgement",
            ],
            [
              "Parents",
              "View available reports, subject patterns, weak areas and recent learning activity",
              "Reports cover activity recorded inside Chikoro AI, not every part of school performance",
            ],
            [
              "Schools",
              "Use permission-controlled dashboards to examine participation and assessment trends",
              "Aggregates support intervention planning; they are not official examination or school records",
            ],
          ],
        },
      },
      {
        id: "daily-routine",
        heading: "A practical daily Chikoro AI routine",
        ordered: true,
        items: [
          "Open Today and complete the first urgent or scheduled action.",
          "Answer due Mastery Recovery questions without checking notes first.",
          "Open the Mastery Map and choose one topic that still needs evidence.",
          "Use a course lesson or tutor explanation to learn the difficult concept.",
          "Complete scored practice or assigned work to test independent understanding.",
          "Read the feedback and let incorrect supported questions return through recovery practice.",
          "Before going offline, download the needed course content and open current assignments once so supported data is available on the device.",
        ],
      },
      {
        id: "limits",
        heading: "Current limits users should understand",
        items: [
          "AI chat, content generation and new AI-generated diagnostics require a working internet connection and model provider.",
          "Offline support covers selected downloaded or cached learning workflows, not every screen in the application.",
          "AI explanations, generated questions and suggested marks may contain errors and should be checked against trusted materials or by a teacher.",
          "Mastery is an evidence-based guide inside Chikoro AI, not an official ZIMSEC or Cambridge grade prediction.",
          "Parent and school reports represent activity recorded in Chikoro AI and do not replace a complete school information system.",
          "Offline work should be allowed to synchronise before a shared or public device is cleared or changed.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the Chikoro AI Today dashboard?",
        answer:
          "Today is a personalised student home screen that combines assignments, study plans, weak areas, mastery gaps, lessons, due reviews and notifications, then provides direct links to useful next actions.",
      },
      {
        question: "How does Mastery Recovery work?",
        answer:
          "Supported incorrect questions enter a review queue. Correct answers move through 1, 3, 7, 14 and 30-day intervals, while an incorrect answer schedules the question for the next day.",
      },
      {
        question: "Can Chikoro AI work without internet?",
        answer:
          "Selected downloaded courses, cached assignments and cached review questions can work offline on the same device and account. Supported progress waits in an outbox and synchronises later. AI tutor chat and new AI-generated diagnostics remain online-only.",
      },
      {
        question: "Does finishing a lesson mean a topic is mastered?",
        answer:
          "No. Lesson completion records participation and progress, while mastery uses scored assessment or review evidence. Keeping those measures separate avoids claiming that content exposure proves understanding.",
      },
      {
        question: "Can teachers assign and grade work in Chikoro AI?",
        answer:
          "Yes. Teachers can create assignments for linked learners, monitor submissions and return grades and feedback. Available multiple-choice mistakes can also contribute to later recovery practice.",
      },
      {
        question: "Are repeated offline submissions counted twice?",
        answer:
          "Supported queued operations use unique idempotency identifiers so the server can recognise a retry of the same submission. This is designed to prevent duplicate progress when a weak connection resends work.",
      },
      {
        question: "Does Chikoro AI replace a teacher?",
        answer:
          "No. Chikoro AI organises practice, feedback and progress evidence, but teachers remain responsible for checking generated material, interpreting results and making consequential education decisions.",
      },
    ],
    related: [links.pillar, links.students, links.teachers, links.parents],
  },
  pillar: {
    ...common,
    shortTitle: "Complete feature guide",
    title:
      "Chikoro AI Features: A Complete Guide for Zimbabwean Learners, Teachers and Families",
    tag: "Chikoro AI Guide",
    readTime: "13 min read",
    directAnswer:
      "Chikoro AI is an education platform for Zimbabwean students, teachers and parents. Its implemented features include curriculum-aware tutoring, document-supported chat, quizzes, flashcards, study plans, teacher planning tools, AI-assisted marking and progress reports. School-level analytics also exist, but they require controlled administrative setup and feature flags.",
    sections: [
      {
        id: "what-is-chikoro-ai",
        heading: "What is Chikoro AI?",
        paragraphs: [
          "Chikoro AI combines an AI tutor with role-specific study, teaching, assessment and reporting tools. During student enrolment, the platform records the learner's age, academic level, grade and choice of ZIMSEC or Cambridge. Those details can be used to shape explanations, generated notes, practice questions and study plans.",
          "Students, teachers and parents have separate account roles and permissions. A teacher can create and assign a quiz, while a linked parent can view the learner's available report. This is more specific than offering the same chatbot screen to every user.",
        ],
      },
      {
        id: "role-comparison",
        heading: "Which Chikoro AI features are available to each role?",
        paragraphs: [
          "The table summarises the main implemented workflows. Availability still depends on account permissions, deployment configuration and the AI services connected to the installation.",
        ],
        table: {
          caption: "Comparison of implemented Chikoro AI features by role",
          headers: [
            "Role",
            "Main tools",
            "Recorded progress",
            "Important limit",
          ],
          rows: [
            [
              "Students",
              "Tutor chat, uploads, notes, quizzes, flashcards, answer checking and study plans",
              "Quiz results, feedback, weak areas, XP, streaks and lesson completion",
              "AI answers and marks need checking; generated Courses currently have a limited catalogue",
            ],
            [
              "Teachers",
              "Lesson plans, schemes of work, resource suggestions, quiz building and exam-paper extraction",
              "Submissions, averages, individual results and question success rates",
              "Generated content and structured-answer marks require teacher review",
            ],
            [
              "Parents",
              "Child linking, reports, PDF export and notification preferences",
              "Quiz averages, subject patterns, weak areas, streak and available activity",
              "Reports cover Chikoro AI activity, not the child's complete school record",
            ],
            [
              "Schools and leaders",
              "Scoped organisation and class dashboards with access controls",
              "Participation, attempts, average scores, support indicators and trends",
              "Feature-flagged and administrator-led; not a full school information system",
            ],
          ],
        },
      },
      {
        id: "student-learning-tools",
        heading: "What learning tools do students receive?",
        subsections: [
          {
            heading: "Curriculum-aware tutoring",
            paragraphs: [
              "A student receives a Study workspace for ongoing conversations. Subject, grade and curriculum context can accompany questions, and specialist tools load the student's profile before generating an explanation. A learner can request a simple, standard or deeper explanation and continue with follow-up questions.",
              "The prompts ask for age-appropriate language and, where useful, familiar Zimbabwean examples such as EcoCash, ZESA, markets, tuckshops and kombis. This improves relevance, but it does not prove that every answer matches an official syllabus document.",
            ],
          },
          {
            heading: "Notes, quizzes and flashcards",
            paragraphs: [
              "Students can request brief, standard or detailed notes. Generated notes include definitions, key concepts, examples, takeaways and revision questions. Quiz and flashcard generators accept a subject, topic, grade, difficulty and number of items, and generated sets can be saved for later use.",
              "Supported quiz submissions produce a score and question-level feedback. Repeated mistakes can become weak-area cards containing the question, wrong answer, correct answer, explanation and the number of times the difficulty has appeared.",
            ],
          },
          {
            heading: "Study plans and answer checking",
            paragraphs: [
              "The study planner uses an exam date, topic list, daily study time and days off to create a dated revision schedule. Topics can be typed, drawn from document titles in the workspace, or combined from both sources.",
              "The answer checker can evaluate typed work or text extracted from an uploaded answer page. It returns a suggested verdict, marks, strengths, missing points, improvement advice and a model answer.",
            ],
          },
        ],
      },
      {
        id: "document-and-language-support",
        heading: "How do uploads and language support work?",
        paragraphs: [
          "When a workspace contains documents, the chat can search them for relevant passages and add that material to the AI context. Attachments can also supply image or document content to a multimodal model. This is useful for notes, worksheets and clearly scanned past-paper pages.",
          "Learners can ask questions and request explanations in English, Shona or Ndebele. Language quality depends on the configured model, and specialised vocabulary should be checked with a teacher or trusted text.",
        ],
        callout: {
          tone: "caution",
          title: "Uploads are not error-proof",
          body: "Blurred photographs, handwriting, diagrams, mathematical notation, multi-column pages and tables can be misread. Always compare the response with the source page before relying on it.",
        },
      },
      {
        id: "teacher-tools",
        heading: "What can teachers create and manage?",
        paragraphs: [
          "Teachers have dedicated tools for lesson plans, schemes of work, teaching-resource suggestions, quizzes and exam-paper extraction. They can link learners through subject-specific class codes, assign a quiz to selected linked students, or create a separate quiz link and code.",
          "A quiz can contain multiple-choice, structured or mixed questions. Teachers can set a time limit and tab-switch limit. Results include submission counts, average, highest and lowest scores, individual feedback and question-level success rates.",
          "The Scheme of Work Creator accepts an optional syllabus PDF and holiday weeks. When a syllabus is uploaded, extracted text is supplied as context for topic and objective generation. Teachers must still check sequencing, omissions, resources and assessment suggestions before classroom use.",
        ],
      },
      {
        id: "parent-and-school-reporting",
        heading: "What reporting is available to parents and schools?",
        paragraphs: [
          "A student can generate an eight-character parent link code that expires after seven days. A linked parent can open reports containing available quiz scores, subject averages, trends, weak areas, streak information, flashcard totals and suggestions for support at home. Reports can be exported as PDF.",
          "The education hierarchy can represent organisations, provinces, districts, schools, departments, classes and academic periods. Permission-controlled dashboards aggregate registered and active learners, assessment attempts, participation, average quiz scores, learners below a 50% average, subject summaries and monthly trends.",
        ],
        callout: {
          tone: "caution",
          title: "School analytics are a controlled-rollout feature",
          body: "Education dashboards require frontend and backend feature flags plus administrator-configured organisations, classes and memberships. They report activity inside Chikoro AI and do not replace attendance, fees, timetables or official examination systems.",
        },
      },
      {
        id: "accuracy-and-caveats",
        heading: "Which limitations should users understand?",
        items: [
          "AI-generated explanations, questions, plans and resources may contain mistakes or omit syllabus details.",
          "Multiple-choice marking is based on parsed answer keys, while structured answers are judged by an AI model and need human review for consequential use.",
          "Exam-paper extraction depends on scan quality and may replace diagrams with incomplete text descriptions.",
          "Resource Finder suggestions and links must be opened and verified before they are shared with learners.",
          "Parent email alerts require a configured email provider; push alerts require a registered device token.",
          "Generated Courses should be treated as beta because the current subject catalogue and grades are limited and generation status is partly held in server memory.",
          "Core AI functions require an internet connection; offline tutoring is not implemented.",
        ],
      },
      {
        id: "getting-started",
        heading: "How to get started with Chikoro AI",
        ordered: true,
        items: [
          "Create an account and choose the correct student, teacher or parent role.",
          "Complete the role-specific profile with accurate information.",
          "Students should confirm their curriculum and grade before asking for study material.",
          "Begin with one focused task, such as explaining one concept or creating five practice questions.",
          "Compare important output with a syllabus, textbook, mark scheme or teacher.",
          "Use class and parent link codes only with people you know and trust.",
          "Build a repeatable routine: learn, practise, read the feedback and revisit weak areas.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does Chikoro AI support ZIMSEC and Cambridge?",
        answer:
          "Yes. Student profiles and several generation forms support both. Generated content still needs comparison with the current official syllabus, particularly before classroom or formal assessment use.",
      },
      {
        question: "Can students use Shona or Ndebele?",
        answer:
          "Students can ask for responses in English, Shona or Ndebele. The output comes from the configured AI model, so exact technical terminology should be checked when precision matters.",
      },
      {
        question: "Does Chikoro AI automatically mark all homework?",
        answer:
          "No. It marks supported platform quizzes and can give AI feedback on typed or uploaded answers. The repository does not contain a complete general homework distribution, collection, moderation and gradebook workflow.",
      },
      {
        question: "Are AI-generated marks official?",
        answer:
          "No. They are suitable for practice and formative feedback. A teacher should review marks used for formal reports, promotion, certification or other consequential decisions.",
      },
      {
        question: "Can Chikoro AI work offline?",
        answer:
          "No. Tutoring, generation, document retrieval, OCR and AI marking require an internet connection and correctly configured backend services.",
      },
      {
        question: "Is Chikoro AI a full school-management system?",
        answer:
          "No. Its leadership dashboards focus on Chikoro AI participation and quiz performance. Attendance, fees, timetables, payroll and official examination administration are outside the implemented scope.",
      },
    ],
    related: [links.students, links.teachers, links.parents, links.schools],
  },

  students: {
    ...common,
    shortTitle: "Student guide",
    title:
      "Chikoro AI for Students in Zimbabwe: Study, Practise and Track Your Progress",
    tag: "Student Guide",
    readTime: "11 min read",
    directAnswer:
      "Zimbabwean students can use Chikoro AI to ask curriculum-aware questions, work with uploaded material, generate notes, take quizzes, revise with flashcards, create an exam study plan and review answer feedback. It is most useful as a guided practice partner, not as a source to copy without checking.",
    sections: [
      {
        id: "student-workspace",
        heading: "What can a student do in Chikoro AI?",
        paragraphs: [
          "After student enrolment, Chikoro AI creates a Study workspace. Learners can keep a conversation going with follow-up questions and use separate threads for different subjects or tasks. The profile stores age, academic level, grade and ZIMSEC or Cambridge selection so specialist learning tools can adapt their output.",
          "A useful session can move from explanation to practice: ask what a concept means, request one worked example, take a short quiz, read the feedback and then create flashcards for the parts that were difficult.",
        ],
        items: [
          "Explain a concept at a simple, standard or deeper level.",
          "Generate brief, standard or detailed notes on a named topic.",
          "Create quizzes and flashcards by subject, topic and difficulty.",
          "Check a typed answer or text extracted from uploaded work.",
          "Build a dated study plan before an examination.",
          "Review previous quiz results and recurring weak areas.",
        ],
      },
      {
        id: "ask-better-questions",
        heading: "How should students ask for useful explanations?",
        paragraphs: [
          "Specific instructions produce more useful study support. Instead of writing 'help with maths', name the exact concept and the kind of help needed. For example: 'Explain elimination in simultaneous equations, then show one ZIMSEC-style worked example without skipping steps.'",
          "The concept tool is instructed to adjust vocabulary and examples to the learner's profile. Students can also ask the tutor to simplify an earlier response, compare two ideas or explain why a particular method works.",
        ],
        callout: {
          title: "A practical prompt pattern",
          body: "Name the subject, topic, curriculum level and task: 'For ZIMSEC Form 3 Biology, explain osmosis simply, use one Zimbabwean everyday example, then ask me two questions to check my understanding.'",
        },
      },
      {
        id: "languages-and-uploads",
        heading: "Can students learn from uploads or in a home language?",
        paragraphs: [
          "The chat accepts attachments and can retrieve relevant text from documents stored in the workspace. A learner can ask about a passage in notes, a worksheet question or a clearly scanned past-paper page. When sources are retrieved, the chat can include citations to the relevant material.",
          "Students can request an explanation in English, Shona or Ndebele. They can also ask for a bilingual explanation, such as Shona first followed by a short English summary. Because multilingual quality is model-dependent, learners should verify specialised subject terms.",
        ],
        callout: {
          tone: "caution",
          title: "Check what the system read",
          body: "Before accepting feedback on an uploaded page, confirm that the question, numbers, symbols and learner answer were extracted correctly. Handwriting, diagrams and poor lighting can change the meaning.",
        },
      },
      {
        id: "quizzes-flashcards-and-mistakes",
        heading: "How do quizzes, flashcards and weak areas work together?",
        paragraphs: [
          "A generated quiz can contain multiple-choice and short-answer questions. The student chooses a subject, topic, grade, difficulty and number of questions. Saved quiz and flashcard histories allow completed material to be opened again.",
          "Supported submissions record a percentage and detailed feedback. Multiple-choice answers are checked against an answer key. Structured answers receive AI-generated marks and comments. The platform can record missed questions as weak-area cards and count repeated difficulty with the same question.",
          "A learner can request a new multiple-choice question that tests the same underlying concept with different wording or numbers. This is more useful than memorising the answer to the original question.",
        ],
      },
      {
        id: "answer-checking",
        heading: "Can Chikoro AI check written work?",
        paragraphs: [
          "Students can type a question and answer directly or use text extracted from an uploaded answer page. The answer-checking tool returns a verdict, suggested marks, strengths, missing or incorrect points, improvement advice and a model answer.",
          "This is formative feedback. An AI model can misunderstand an open response, award inconsistent marks or infer the wrong question from a scan. Use the result to improve a draft and ask a teacher to review any important assessment.",
        ],
      },
      {
        id: "study-plans",
        heading: "How does the personal study planner work?",
        paragraphs: [
          "The Study Plan Builder asks for a subject, exam date, optional start date, topics, available hours per day and days off. Topics can come from what the learner types, document titles already in the workspace, or both.",
          "The plan contains weekly focus areas and dated sessions with specific activities, duration and goals. It also includes rest days and final examination tips. Plans are saved to the student's account. Tracking logic can mark topics complete and reschedule missed sessions when the relevant AI tools activate, so this should be treated as assisted rather than guaranteed automatic tracking.",
        ],
      },
      {
        id: "courses-beta",
        heading: "What should students know about generated Courses?",
        paragraphs: [
          "The Courses area can generate modules, lessons and assignments, track completed lessons and accept a link to submitted work. The current subject catalogue covers only selected ZIMSEC Form 1 and Form 3 subjects and selected Cambridge Form 1 subjects.",
        ],
        callout: {
          tone: "caution",
          title: "Courses is a beta workflow",
          body: "Course-generation progress is partly stored in server memory and may be interrupted by a restart. Assignment submission exists, but a complete teacher review workflow is not evident. Use tutoring, quizzes, notes and study plans as the more established paths.",
        },
      },
      {
        id: "student-getting-started",
        heading: "Student getting-started steps",
        ordered: true,
        items: [
          "Register and enrol as a student using accurate profile information.",
          "Confirm ZIMSEC or Cambridge and select the correct grade and subject.",
          "Ask one focused question about a topic currently being taught.",
          "Request one worked example and explain the method back in your own words.",
          "Generate a short quiz and answer it without copying from notes.",
          "Read feedback on correct and incorrect answers, not only the final score.",
          "Create flashcards or similar practice for repeated weak areas.",
          "Build a realistic study plan once the exam date and topic list are known.",
          "Generate a parent link code only if a trusted parent or guardian should see reports.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can Chikoro AI do my homework for me?",
        answer:
          "It can explain a question, generate examples and check your attempt. The productive approach is to try first and then request feedback. Copying a response will not prepare you for a supervised examination.",
      },
      {
        question: "Can I upload a past paper or worksheet?",
        answer:
          "Yes, the chat supports uploaded material. Ask about a clearly identified question and check that all text, numbers and diagrams were interpreted correctly.",
      },
      {
        question: "Will Chikoro AI remember my weak subjects?",
        answer:
          "Completed quiz results and weak-area cards are stored. The tutor can use recent quiz history as context, but only activity completed under the same account is included.",
      },
      {
        question: "Can I make a revision timetable?",
        answer:
          "Yes. Supply an exam date, topics, available study time and days off. Check all generated dates and reduce the workload if it is not realistic.",
      },
      {
        question: "Does Chikoro AI replace my teacher?",
        answer:
          "No. It provides explanations and practice. Teachers remain essential for syllabus interpretation, practical work, classroom assessment and professional judgement.",
      },
      {
        question: "Are structured answers marked exactly like ZIMSEC?",
        answer:
          "No guarantee can be made. The AI is prompted with curriculum and mark-scheme context, but its result is not an official ZIMSEC mark and should be reviewed by a teacher.",
      },
    ],
    related: [links.pillar, links.teachers, links.parents, links.schools],
  },

  teachers: {
    ...common,
    shortTitle: "Teacher guide",
    title:
      "Chikoro AI for Teachers in Zimbabwe: Lesson Plans, Quizzes and Learner Reports",
    tag: "Teacher Guide",
    readTime: "12 min read",
    directAnswer:
      "Teachers can use Chikoro AI to draft lesson plans and schemes of work, find possible resources, generate quizzes, extract questions from exam papers, link learners, share assessments and review results. These tools produce useful first drafts and formative feedback, but teachers must verify content and moderate consequential marks.",
    sections: [
      {
        id: "teacher-dashboard",
        heading: "What does the teacher dashboard show?",
        paragraphs: [
          "The teacher dashboard brings the planning, assessment, linking and reporting tools into one place. It shows the number of linked students, subject groups, shared quizzes and linked learners whose recorded quiz average is below 50%.",
          "The displayed class count is derived from teacher-student links grouped by subject. It is useful as an overview but should not be presented as a complete class register.",
        ],
      },
      {
        id: "lesson-plans",
        heading: "How does the AI Lesson Planner work?",
        paragraphs: [
          "A teacher enters the subject, topic, grade, lesson duration and optional objectives. Chikoro AI returns a lesson title, objectives, introduction, lesson development, assessment ideas and homework or reflection task.",
          "The prompt asks for Bloom's Taxonomy verbs and a progression through different levels of thinking. The result remains a generated draft. The teacher should adapt it for the actual class, available materials, lesson time, prior learning and current syllabus.",
        ],
      },
      {
        id: "schemes-of-work",
        heading: "Can teachers create a scheme of work from a syllabus?",
        paragraphs: [
          "The Scheme of Work Creator accepts subject, grade, term, curriculum, number of weeks, holiday weeks and optional notes. It returns a weekly structure containing topics, objectives, activities, resources and assessment.",
          "An official syllabus PDF can be uploaded. The server extracts a relevant portion and tells the AI to use it as the source of truth. This provides stronger context than a curriculum label alone, but extraction can omit or distort content.",
        ],
        callout: {
          tone: "caution",
          title: "Teacher review remains mandatory",
          body: "Check every week against the original syllabus. Confirm topic order, term coverage, holiday dates, resources, practical requirements and assessment expectations before adopting the scheme.",
        },
      },
      {
        id: "quiz-generator",
        heading: "What assessments can the Quiz Generator create?",
        paragraphs: [
          "Teachers select a subject, topic, grade, curriculum, difficulty, question count and multiple-choice, structured or mixed format. The prompts include subject-specific conventions, such as method and accuracy marks in Mathematics, units in Science and evidence-based marking in Humanities.",
          "An individual generated question can be redone before publication. The teacher should read the complete paper, solve numerical questions independently and check every answer key or mark scheme.",
        ],
        items: [
          "Create a general quiz link and code.",
          "Assign a quiz to selected linked students.",
          "Configure a time limit and tab-switch limit.",
          "Notify assigned students in-app and, when configured, through push notifications.",
          "Enforce one submission per learner and quiz code.",
        ],
      },
      {
        id: "marking-and-results",
        heading: "How are quizzes marked and reported?",
        paragraphs: [
          "Multiple-choice answers are compared with the parsed answer key. Structured answers are sent to an AI model with the question and available mark scheme. Feedback can include marks, strengths, missing points, improvement suggestions and encouragement.",
          "The teacher results view provides submission count, average, highest and lowest score, individual learner details and question success rates. A broader student report can combine quiz history, weak areas, XP and saved flashcard totals into an AI-written summary.",
        ],
        callout: {
          tone: "caution",
          title: "AI marking is formative",
          body: "Use AI feedback for practice and first-pass review. The repository has a teacher-review data table but does not show a complete moderation interface. A teacher should review results used for formal grading or other consequential decisions.",
        },
      },
      {
        id: "exam-paper-extraction",
        heading: "How does exam-paper extraction work?",
        paragraphs: [
          "A teacher can upload a PDF or image of an exam paper, with an optional separate mark scheme. The configured file limit is 10 MB. PDF text is extracted directly, while images are preprocessed and sent to a vision OCR model.",
          "The tool attempts to identify multiple-choice, structured, essay, fill-in, true-or-false, data-response and matching questions. It preserves visible mark allocations and converts unavailable diagrams into text descriptions. The output can then be used as quiz content.",
          "Complex notation, poor scans, diagrams and tables can be lost. Compare every extracted question and mark scheme with the original before sharing it.",
        ],
      },
      {
        id: "resource-finder",
        heading: "What does Resource Finder provide?",
        paragraphs: [
          "Resource Finder uses subject, topic, grade, curriculum and teacher notes to build a web query. It asks the AI for an overview, key concepts, possible resources and suggestions for classroom use.",
          "The web source may return few direct links, and generated book or platform suggestions are not automatically verified. Open every resource and confirm accessibility, relevance, copyright position and learner suitability.",
        ],
      },
      {
        id: "teacher-getting-started",
        heading: "Teacher getting-started steps",
        ordered: true,
        items: [
          "Register and enrol as a teacher with your name and school.",
          "Create a subject-specific class link and ask learners to join with the code.",
          "Confirm that the linked learner list is correct.",
          "Generate a five-question formative quiz on one topic already taught.",
          "Review and solve every question before sharing it.",
          "Set a reasonable time limit and treat tab switching as a limited signal, not proof of misconduct.",
          "Review individual submissions and question success rates after the quiz.",
          "Use the lesson planner or scheme creator for a first draft, then apply professional judgement.",
          "Encourage learners to share a separate parent code if their family should receive progress reports.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I upload a ZIMSEC or Cambridge syllabus?",
        answer:
          "The Scheme of Work Creator accepts a syllabus PDF. Its extracted text informs generation, but teachers must check the output against the original document.",
      },
      {
        question: "Can Chikoro AI create structured questions?",
        answer:
          "Yes. Teachers can choose multiple-choice, structured or mixed formats. Generated questions and mark schemes need review before use.",
      },
      {
        question: "Can Chikoro AI mark essays and long answers?",
        answer:
          "It can suggest marks and feedback using an AI model. A qualified teacher should moderate any result that affects an official grade or decision.",
      },
      {
        question: "Can a learner submit a quiz without an account?",
        answer:
          "A code or link can open the quiz, but the implemented submission workflow requires an authenticated student profile.",
      },
      {
        question: "Does the tab limit prove that a learner cheated?",
        answer:
          "No. It records tab switching and can trigger auto-submission. Connectivity, device behaviour and accessibility needs can also affect the signal, so it should not be treated as conclusive evidence.",
      },
      {
        question: "Are lesson plans and schemes stored in a teacher library?",
        answer:
          "The tools return generated content and support export-oriented use, but a complete searchable backend library for saved plans and schemes is not evident. Do not promise permanent archives without further implementation.",
      },
    ],
    related: [links.pillar, links.students, links.parents, links.schools],
  },

  parents: {
    ...common,
    shortTitle: "Parent guide",
    title:
      "Chikoro AI for Parents in Zimbabwe: Follow Your Child's Learning Progress",
    tag: "Parent Guide",
    readTime: "9 min read",
    directAnswer:
      "Parents can link to a child's Chikoro AI account using a code created by the learner. Once linked, they can view available quiz performance, subject patterns, weak areas, recent activity and practical support suggestions. Low-score alerts and weekly digests are available when notification services and preferences are configured.",
    sections: [
      {
        id: "link-a-child",
        heading: "How does a parent link to a child's account?",
        paragraphs: [
          "The learner starts the process from an authenticated student account. Chikoro AI creates an eight-character code that expires after seven days and becomes invalid after use. The parent enters that code in the parent dashboard.",
          "This prevents a parent account from searching for and opening an unrelated learner's report. The dashboard can list more than one linked child, but each learner must generate a separate valid code.",
        ],
      },
      {
        id: "parent-report",
        heading: "What can a parent report contain?",
        paragraphs: [
          "The report is built from activity recorded in the child's Chikoro AI account. It can be viewed on screen and exported as a PDF. Where data exists, the interface presents quiz performance, trends and areas that may need attention.",
        ],
        items: [
          "Recent quiz attempts and percentage scores",
          "Overall and subject-level averages",
          "Recent score trend and available class comparisons",
          "Questions or concepts recorded as weak areas",
          "How often a weak-area question has appeared",
          "Study streak and generated flashcard totals",
          "Plain-language suggestions for helping at home",
        ],
        callout: {
          tone: "caution",
          title: "This is not an official school report",
          body: "The report covers activity recorded inside Chikoro AI. It is not a term report, attendance register, ZIMSEC result or complete record of work done at school. Some detailed count fields also require further reporting QA.",
        },
      },
      {
        id: "weak-areas",
        heading: "How are weak areas identified?",
        paragraphs: [
          "When a learner gets a supported quiz question wrong, the platform can record the question, wrong answer, correct answer, feedback and the number of times the difficulty has been seen. Parent reports group these records by subject.",
          "This helps a parent ask a focused question such as 'Which part of quadratic equations is difficult?' rather than reacting only to a Mathematics percentage. Weak areas cover supported Chikoro AI activity, not every exercise completed elsewhere.",
        ],
      },
      {
        id: "interpret-feedback",
        heading: "How should parents interpret AI-generated feedback?",
        paragraphs: [
          "Use feedback as the beginning of a calm conversation. Ask the learner to explain the question, read the correction together and then try a similar problem. If the AI conflicts with a teacher, textbook or mark scheme, seek human clarification.",
          "One AI-marked result should not be used to label a child as lazy, dishonest or incapable. Structured-answer scores are produced by an AI model and may be inconsistent. Look for a pattern across several attempts and discuss important concerns with the teacher.",
        ],
      },
      {
        id: "notifications",
        heading: "Which parent alerts are implemented?",
        paragraphs: [
          "Parents can turn low-score alerts on or off and select a threshold from 0% to 100%. For supported quiz submissions at or below the threshold, the platform can send a push alert and an email when the required services are configured.",
          "A weekly digest can summarise quiz count, weekly average, subject breakdown, trend and lower-performing subjects. When no quiz is recorded, push logic can send a gentle activity reminder instead.",
        ],
        callout: {
          tone: "caution",
          title: "Delivery depends on setup",
          body: "Email requires a saved parent address and a configured Resend API key. Push notifications require a valid registered device token. Weekly digests operate for saved notification-setting records, so delivery should not be promised in every deployment.",
        },
      },
      {
        id: "support-at-home",
        heading: "How can a parent support learning without doing the work?",
        items: [
          "Choose one repeated weak area for a short review instead of trying to fix every subject at once.",
          "Ask the child to explain the method in their own words before looking at the model answer.",
          "Encourage one short practice quiz when there has been no recent activity.",
          "Recognise steady improvement rather than demanding a perfect score.",
          "Help the learner choose realistic study hours and rest days before an exam.",
          "Ask the teacher to review any AI result that affects a formal school decision.",
        ],
      },
      {
        id: "parent-getting-started",
        heading: "Parent getting-started steps",
        ordered: true,
        items: [
          "Ask your child to sign in and generate a parent link code.",
          "Create a parent account and complete the parent profile.",
          "Enter the code within seven days and keep it private.",
          "Open the first report and check how many quizzes support each average.",
          "Look for repeated weak areas instead of reacting to one result.",
          "Save an email address if email reports are wanted.",
          "Choose a sensible low-score threshold and notification preferences.",
          "Discuss the report calmly with the learner and involve the teacher where needed.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I read every message my child sends?",
        answer:
          "The implemented parent report focuses on quiz activity, weak areas, flashcards, streaks and related summaries. It is not presented as a full transcript of every learner chat.",
      },
      {
        question: "Does my child have to provide the link code?",
        answer:
          "Yes. The code is created from the learner's authenticated account, expires after seven days and can only be used once.",
      },
      {
        question: "Are parent reports official school reports?",
        answer:
          "No. They summarise activity inside Chikoro AI. Official grades, attendance and teacher comments should come from the school.",
      },
      {
        question: "Will I always receive a weekly email?",
        answer:
          "No guarantee can be made. You must save an email address and preferences, and the deployment must have its email service configured. Email filtering may also affect delivery.",
      },
      {
        question: "What should I do if an AI mark looks wrong?",
        answer:
          "Compare the response with a mark scheme or trusted text and ask the learner's teacher. AI feedback should not override a formal teacher judgement without review.",
      },
      {
        question: "Can I change my child's curriculum from the parent account?",
        answer:
          "The current parent workflow is for linking, reports and notifications. Curriculum selection belongs to the student profile and is not implemented as a parent setting.",
      },
    ],
    related: [links.pillar, links.students, links.teachers, links.schools],
  },

  schools: {
    ...common,
    shortTitle: "Schools and leadership guide",
    title:
      "Chikoro AI for Schools in Zimbabwe: Assessment Insights and Education Dashboards",
    tag: "Schools & Leadership",
    readTime: "11 min read",
    directAnswer:
      "Chikoro AI includes controlled-rollout dashboards for classes, schools, districts, provinces and other education structures. Permitted leaders can view participation and quiz-performance summaries within their scope. The dashboards require feature flags and administrator-configured organisations, memberships and classes; they are learning analytics, not a full school information system.",
    sections: [
      {
        id: "implemented-school-structure",
        heading: "What school-level structure is implemented?",
        paragraphs: [
          "The data model represents education organisations and parent-child relationships between them. It also supports academic periods, classes, student class membership, teacher class membership and time-bounded organisation roles.",
          "This makes it possible to provide different views for a school leader, department, classroom, district or wider administrative scope while restricting access to the organisations and classes assigned to each user.",
        ],
        items: [
          "Provinces, districts, schools and school departments",
          "Classes connected to schools, departments and academic periods",
          "Teacher and learner class membership",
          "Organisation memberships with validity dates",
          "A separate permission for viewing personally identifiable information",
          "School detail verification submitted by authorised school roles and reviewed by an administrator",
        ],
      },
      {
        id: "dashboard-metrics",
        heading: "Which metrics can leadership dashboards show?",
        paragraphs: [
          "Class and organisation dashboards calculate their figures from configured rosters, Chikoro AI quiz results and recent Chikoro AI chats. Subject, grade and date filters can narrow the report.",
        ],
        items: [
          "Registered learners in the configured scope",
          "Learners with a quiz result or chat in the previous 30 days",
          "Assessment attempts and participating learners",
          "Assessment participation percentage",
          "Average quiz score",
          "Learners whose average recorded quiz score is below 50%",
          "Subject-level averages and attempt counts",
          "Monthly average-score and attempt trends",
        ],
        callout: {
          tone: "caution",
          title: "Active does not mean present at school",
          body: "An active learner is someone with recent Chikoro AI chat or quiz activity. This metric is not an attendance register and should never be reported as school attendance.",
        },
      },
      {
        id: "scope-and-access",
        heading: "How do scope and access control work?",
        paragraphs: [
          "Access depends on the user's global role, organisation memberships and teacher-class assignments. Memberships can have start and end dates and can be revoked. The system separately determines whether a user can view an organisation, list child units, open a class or see identifying information.",
          "Depending on configured permissions, a leader can move from a broad organisation to child units such as province, district, school, department or class. Each child scope can have its own aggregated summary.",
          "Dashboard completeness depends on accurate setup. Missing class links, incomplete rosters or inconsistent use of Chikoro AI assessments will produce incomplete figures.",
        ],
      },
      {
        id: "school-verification",
        heading: "What does school verification mean inside Chikoro AI?",
        paragraphs: [
          "A school administrator, headmaster or deputy head with the appropriate membership can submit proposed school details. These include school name, level, province, district, sector, responsible authority, address and notes.",
          "A global Chikoro AI administrator can approve or reject the submission. Approval updates organisation metadata and marks the record as confirmed by the school.",
        ],
        callout: {
          tone: "caution",
          title: "Not statutory accreditation",
          body: "This workflow verifies details within Chikoro AI. It is not government school registration, Ministry approval, ZIMSEC centre registration or legal accreditation.",
        },
      },
      {
        id: "classroom-to-leadership",
        heading: "How does classroom activity become leadership data?",
        paragraphs: [
          "Teachers create subject-specific class links and learners join with a code. When the education hierarchy is configured, synchronisation logic can connect those teacher-student subject relationships to matching education classes.",
          "Teacher-assigned and student-completed quizzes create the assessment records used in summaries. As results accumulate, dashboards can calculate participation, averages, support indicators, subject patterns and trends.",
        ],
        items: [
          "Configure the organisation and academic period correctly.",
          "Place teachers and learners in the correct classes.",
          "Use reviewed formative assessments consistently.",
          "Interpret comparisons in light of different roster sizes and platform adoption.",
        ],
      },
      {
        id: "not-a-school-mis",
        heading: "What does Chikoro AI not replace?",
        paragraphs: [
          "The defensible institutional use is curriculum-oriented AI learning support plus participation and performance signals generated inside Chikoro AI. The current repository does not implement a complete school management or statutory reporting platform.",
        ],
        items: [
          "Official attendance and enrolment registers",
          "Fees, accounting, payroll or procurement",
          "Timetables and room scheduling",
          "Government school-registration systems",
          "Official continuous-assessment or examination records",
          "ZIMSEC candidate registration and result systems",
          "Safeguarding, discipline and case-management procedures",
          "Professional moderation of high-stakes assessment",
        ],
      },
      {
        id: "rollout-considerations",
        heading: "What should a school decide before rollout?",
        paragraphs: [
          "A school should define the educational purpose before creating accounts. A limited pilot for tutoring or low-stakes formative quizzes is easier to evaluate than an immediate whole-school launch.",
        ],
        items: [
          "Which grades and subjects are included in the first phase",
          "Who reviews generated questions, answer keys and teaching material",
          "Which assessments remain informal and which require teacher moderation",
          "Who can view learner-identifying information",
          "How parent linking, consent and support will be explained",
          "How inaccurate or harmful AI output will be reported and corrected",
          "Whether notification services are configured and supported",
          "How data retention and account closure will be handled",
        ],
      },
      {
        id: "school-getting-started",
        heading: "School and leadership getting-started steps",
        ordered: true,
        items: [
          "Confirm that the education-hierarchy feature is enabled on both frontend and backend.",
          "Ask the platform administrator to configure the organisation tree and active academic period.",
          "Create or verify the school, departments and classes required for the pilot.",
          "Assign leadership and teacher memberships using the least access needed.",
          "Link teachers and learners to the correct classes and compare the roster with school records.",
          "Pilot one subject and grade with short, teacher-reviewed formative quizzes.",
          "Compare participation and score figures with the known pilot activity.",
          "Train teachers to verify generated content and moderate AI marks.",
          "Review privacy, consent, support and retention arrangements before expanding.",
        ],
      },
    ],
    faqs: [
      {
        question: "Are school dashboards available in every deployment?",
        answer:
          "No. The routes and frontend are controlled by environment flags and require administrator-led organisation, membership and class setup.",
      },
      {
        question: "Can a headmaster automatically see every learner's details?",
        answer:
          "No. Access depends on assigned memberships and capabilities. Personally identifiable information has a separate permission that should be granted sparingly.",
      },
      {
        question: "Can the dashboard show attendance?",
        answer:
          "No. Active learner counts refer to recent Chikoro AI quiz or chat activity, not physical or official school attendance.",
      },
      {
        question: "Does Chikoro AI integrate directly with ZIMSEC systems?",
        answer:
          "No direct registration, official result or candidate-data integration is evident. ZIMSEC context comes from profiles, prompts, teacher input and optional syllabus documents.",
      },
      {
        question: "Can a district compare schools?",
        answer:
          "The hierarchy can aggregate child school scopes where permissions and data are configured. Any comparison reflects Chikoro AI activity only and must account for roster size and adoption differences.",
      },
      {
        question: "Is institutional onboarding self-service?",
        answer:
          "No complete self-service school provisioning and purchasing flow is evident. Organisation setup, memberships, classes and verification require administrative involvement.",
      },
    ],
    related: [links.pillar, links.students, links.teachers, links.parents],
  },
};
