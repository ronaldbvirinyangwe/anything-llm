import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiExternalLink,
  FiFileText,
  FiLoader,
  FiPlay,
  FiRefreshCw,
  FiSend,
  FiZap,
  FiX,
} from "react-icons/fi";
import chikoroLogo from "@/media/logo/logo.jpg";
import CoursesModel from "@/models/courses";
import "katex/dist/katex.min.css";
import "./courses.css";

const GENERATION_STAGES = ["planner", "writer", "assignments", "review"];

const STATUS_LABELS = {
  complete: "Complete",
  completed: "Complete",
  ready: "Ready",
  generating: "Generating",
  not_started: "Not started",
  submitted: "Submitted",
  needs_revision: "Needs revision",
  failed: "Failed",
  error: "Failed",
};

function readableStatus(status) {
  return (
    STATUS_LABELS[status] ||
    String(status || "not_started")
      .replaceAll("_", " ")
      .replace(/^./, (character) => character.toUpperCase())
  );
}

function courseProgress(course) {
  const lessons = (course.modules || []).flatMap(
    (module) => module.lessons || []
  );
  const completed = lessons.filter((lesson) => lesson.done).length;
  return {
    completed,
    total: lessons.length,
    percentage: lessons.length
      ? Math.round((completed / lessons.length) * 100)
      : 0,
  };
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function StatusBadge({ status }) {
  const normalized = status || "not_started";
  return (
    <span className={`courses-status courses-status--${normalized}`}>
      {normalized === "generating" && (
        <FiLoader className="courses-spin" aria-hidden="true" />
      )}
      {readableStatus(normalized)}
    </span>
  );
}

function ProgressBar({ value, label }) {
  return (
    <div className="courses-progress" aria-label={label}>
      <div className="courses-progress__track" aria-hidden="true">
        <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span>{value}%</span>
    </div>
  );
}

function EmptyState({ icon, title, children, action }) {
  return (
    <div className="courses-empty">
      <span className="courses-empty__icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

function DetailDrawer({ title, eyebrow, onClose, children }) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;

      const focusable = drawerRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="courses-drawer-layer"
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        ref={drawerRef}
        className="courses-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="courses-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="courses-drawer__header">
          <div>
            <span className="courses-eyebrow">{eyebrow}</span>
            <h2 id="courses-drawer-title">{title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="courses-icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close details"
          >
            <FiX aria-hidden="true" />
          </button>
        </header>
        <div className="courses-drawer__body">{children}</div>
      </aside>
    </div>
  );
}

function LoadingBlock({ label = "Loading courses" }) {
  return (
    <div className="courses-loading" role="status">
      <FiLoader className="courses-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function ErrorNotice({ message, onRetry }) {
  return (
    <div className="courses-notice courses-notice--error" role="alert">
      <div>
        <strong>Something went wrong</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button
          className="courses-button courses-button--secondary"
          type="button"
          onClick={onRetry}
        >
          <FiRefreshCw aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}

function GenerationProgress({ state }) {
  const stageIndex = Number.isInteger(state?.stageIndex)
    ? state.stageIndex
    : GENERATION_STAGES.indexOf(state?.stage);
  const progress = Math.max(
    5,
    Math.round(((stageIndex + 0.5) / GENERATION_STAGES.length) * 100)
  );

  return (
    <div className="courses-generation" role="status" aria-live="polite">
      <div className="courses-generation__heading">
        <span className="courses-generation__orb">
          <FiZap aria-hidden="true" />
        </span>
        <div>
          <strong>Building your {state.subject} course</strong>
          <p>{state.message || "Preparing your learning plan..."}</p>
        </div>
        <span>{Math.min(progress, 95)}%</span>
      </div>
      <div className="courses-generation__track" aria-hidden="true">
        <span style={{ width: `${Math.min(progress, 95)}%` }} />
      </div>
      <ol
        className="courses-generation__stages"
        aria-label="Course generation stages"
      >
        {GENERATION_STAGES.map((stage, index) => (
          <li key={stage} className={index <= stageIndex ? "is-active" : ""}>
            {index < stageIndex ? (
              <FiCheck aria-hidden="true" />
            ) : (
              <span>{index + 1}</span>
            )}
            {readableStatus(stage)}
          </li>
        ))}
      </ol>
    </div>
  );
}

function SubjectCatalog({
  subjects,
  courses,
  generations,
  onGenerate,
  onOpenCourse,
}) {
  if (!subjects.length) {
    return (
      <EmptyState icon="🧭" title="No subjects available yet">
        Your school profile does not currently have a subject catalog. Check
        that your curriculum and grade are set.
      </EmptyState>
    );
  }

  return (
    <div className="courses-subject-grid">
      {subjects.map((subject) => {
        const course = courses.find((item) => item.subject === subject.name);
        const generation = generations[subject.name];
        const isGenerating = generation?.status === "generating";
        const hasFailed = generation?.status === "error";

        return (
          <article className="courses-subject-card" key={subject.id}>
            <div className="courses-subject-card__top">
              <span className="courses-subject-card__icon" aria-hidden="true">
                {subject.icon || "📘"}
              </span>
              {course ? (
                <StatusBadge
                  status={
                    course.status === "generating" ? "generating" : "ready"
                  }
                />
              ) : null}
            </div>
            <h3>{subject.name}</h3>
            <p>
              {course
                ? `${course.modules?.length || 0} modules in your learning path`
                : isGenerating
                  ? generation.message || "Building your course..."
                  : "Create a course matched to your curriculum and level."}
            </p>
            {hasFailed && (
              <span className="courses-inline-error">
                {generation.error || generation.message}
              </span>
            )}
            <button
              type="button"
              className={`courses-button ${course ? "courses-button--secondary" : "courses-button--primary"}`}
              onClick={() =>
                course ? onOpenCourse(course.id) : onGenerate(subject.name)
              }
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <FiLoader className="courses-spin" aria-hidden="true" />{" "}
                  Generating
                </>
              ) : course ? (
                <>
                  <FiPlay aria-hidden="true" /> Continue course
                </>
              ) : (
                <>
                  <FiZap aria-hidden="true" />{" "}
                  {hasFailed ? "Try again" : "Build course"}
                </>
              )}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function CourseCard({ course, onOpen }) {
  const progress = courseProgress(course);
  const assignments = (course.modules || []).reduce(
    (total, module) => total + (module.assignments?.length || 0),
    0
  );

  return (
    <article className="courses-course-card">
      <div className="courses-course-card__accent" aria-hidden="true">
        {course.icon || "📘"}
      </div>
      <div className="courses-course-card__body">
        <div className="courses-course-card__meta">
          <span>{course.curriculum}</span>
          <span>{course.grade || course.academicLevel}</span>
        </div>
        <h3>{course.subject}</h3>
        <p>
          {course.modules?.length || 0} modules · {progress.total} lessons ·{" "}
          {assignments} assignments
        </p>
        <ProgressBar
          value={progress.percentage}
          label={`${course.subject} ${progress.percentage}% complete`}
        />
        <div className="courses-course-card__footer">
          <span>
            {progress.completed} of {progress.total} lessons done
          </span>
          <button
            className="courses-text-button"
            type="button"
            onClick={() => onOpen(course.id)}
          >
            {progress.percentage ? "Keep learning" : "Start learning"}{" "}
            <FiArrowLeft className="courses-arrow-forward" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

function Dashboard({
  subjects,
  courses,
  generations,
  onGenerate,
  onOpenCourse,
}) {
  const activeGenerations = Object.entries(generations)
    .filter(([, state]) => state?.status === "generating")
    .map(([subject, state]) => ({ subject, ...state }));
  const completedLessons = courses.reduce(
    (total, course) => total + courseProgress(course).completed,
    0
  );
  const totalLessons = courses.reduce(
    (total, course) => total + courseProgress(course).total,
    0
  );

  return (
    <>
      <section className="courses-hero">
        <div>
          <span className="courses-eyebrow">Your learning space</span>
          <h1>Courses built around your syllabus.</h1>
          <p>
            Move through focused lessons, practical assignments, and a clear
            path to completion.
          </p>
        </div>
        <div className="courses-hero__stats" aria-label="Learning summary">
          <div>
            <strong>{courses.length}</strong>
            <span>Active courses</span>
          </div>
          <div>
            <strong>{completedLessons}</strong>
            <span>Lessons complete</span>
          </div>
          <div>
            <strong>{Math.max(totalLessons - completedLessons, 0)}</strong>
            <span>Lessons ahead</span>
          </div>
        </div>
      </section>

      {activeGenerations.map((state) => (
        <GenerationProgress key={state.subject} state={state} />
      ))}

      <section className="courses-section" aria-labelledby="my-courses-heading">
        <div className="courses-section__heading">
          <div>
            <span className="courses-eyebrow">In progress</span>
            <h2 id="my-courses-heading">My courses</h2>
          </div>
          {courses.length > 0 && <span>{courses.length} enrolled</span>}
        </div>
        {courses.length ? (
          <div className="courses-course-grid">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onOpen={onOpenCourse}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon="📚" title="Your course shelf is ready">
            Pick a subject below and Chikoro will build your first course.
          </EmptyState>
        )}
      </section>

      <section className="courses-section" aria-labelledby="subjects-heading">
        <div className="courses-section__heading">
          <div>
            <span className="courses-eyebrow">Subject catalog</span>
            <h2 id="subjects-heading">Explore your subjects</h2>
          </div>
          <span>{subjects.length} available</span>
        </div>
        <SubjectCatalog
          subjects={subjects}
          courses={courses}
          generations={generations}
          onGenerate={onGenerate}
          onOpenCourse={onOpenCourse}
        />
      </section>
    </>
  );
}

function CourseDetail({
  course,
  moduleGeneration,
  onBack,
  onOpenLesson,
  onOpenAssignment,
  onGenerateModule,
}) {
  const firstModuleId = course.modules?.[0]?.id;
  const [expandedModules, setExpandedModules] = useState(
    () => new Set([firstModuleId])
  );
  const progress = courseProgress(course);

  useEffect(() => {
    setExpandedModules(new Set([firstModuleId]));
  }, [course.id, firstModuleId]);

  const toggleModule = (moduleId) => {
    setExpandedModules((current) => {
      const next = new Set(current);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  };

  return (
    <div className="courses-detail">
      <button className="courses-back" type="button" onClick={onBack}>
        <FiArrowLeft aria-hidden="true" /> All courses
      </button>
      <section className="courses-detail__hero">
        <div className="courses-detail__icon" aria-hidden="true">
          {course.icon || "📘"}
        </div>
        <div className="courses-detail__copy">
          <div className="courses-course-card__meta">
            <span>{course.curriculum}</span>
            <span>{course.grade || course.academicLevel}</span>
          </div>
          <h1>{course.subject}</h1>
          <p>{course.modules?.length || 0} carefully sequenced modules</p>
        </div>
        <div className="courses-detail__progress">
          <strong>{progress.percentage}%</strong>
          <span>course complete</span>
          <ProgressBar
            value={progress.percentage}
            label={`${progress.percentage}% course complete`}
          />
        </div>
      </section>

      <div className="courses-detail__summary">
        <div>
          <FiBookOpen aria-hidden="true" />
          <span>
            <strong>{progress.total}</strong> lessons
          </span>
        </div>
        <div>
          <FiCheckCircle aria-hidden="true" />
          <span>
            <strong>{progress.completed}</strong> completed
          </span>
        </div>
        <div>
          <FiClock aria-hidden="true" />
          <span>
            <strong>{Math.max(progress.total - progress.completed, 0)}</strong>{" "}
            remaining
          </span>
        </div>
      </div>

      <section className="courses-section" aria-labelledby="curriculum-heading">
        <div className="courses-section__heading">
          <div>
            <span className="courses-eyebrow">Course path</span>
            <h2 id="curriculum-heading">Modules and lessons</h2>
          </div>
        </div>
        {!course.modules?.length ? (
          <EmptyState icon="🧱" title="Modules are being prepared">
            This course does not have any modules available yet. Check back
            shortly.
          </EmptyState>
        ) : (
          <div className="courses-module-list">
            {course.modules.map((module, moduleIndex) => {
              const expanded = expandedModules.has(module.id);
              const generating =
                moduleGeneration[module.id]?.status === "generating";
              const lessonsDone = (module.lessons || []).filter(
                (lesson) => lesson.done
              ).length;
              return (
                <article
                  className={`courses-module ${expanded ? "is-expanded" : ""}`}
                  key={module.id}
                >
                  <button
                    type="button"
                    className="courses-module__header"
                    onClick={() => toggleModule(module.id)}
                    aria-expanded={expanded}
                    aria-controls={`course-module-${module.id}`}
                  >
                    <span className="courses-module__number">
                      {String(moduleIndex + 1).padStart(2, "0")}
                    </span>
                    <span className="courses-module__title">
                      <strong>{module.title}</strong>
                      <small>
                        {module.lessons?.length || 0} lessons · {lessonsDone}{" "}
                        complete
                      </small>
                    </span>
                    <StatusBadge
                      status={generating ? "generating" : module.status}
                    />
                    <FiChevronDown
                      className="courses-module__chevron"
                      aria-hidden="true"
                    />
                  </button>
                  {expanded && (
                    <div
                      className="courses-module__content"
                      id={`course-module-${module.id}`}
                    >
                      {generating && (
                        <div
                          className="courses-module__generating"
                          role="status"
                        >
                          <FiLoader
                            className="courses-spin"
                            aria-hidden="true"
                          />
                          {moduleGeneration[module.id]?.message ||
                            "Preparing this module..."}
                        </div>
                      )}
                      {!generating &&
                        module.status === "not_started" &&
                        !(
                          module.lessons?.length || module.assignments?.length
                        ) && (
                          <div className="courses-module__prepare">
                            <div>
                              <strong>Ready for the next step?</strong>
                              <p>
                                Generate this module when you are ready to study
                                it.
                              </p>
                            </div>
                            <button
                              className="courses-button courses-button--primary"
                              type="button"
                              onClick={() => onGenerateModule(module.id)}
                            >
                              <FiZap aria-hidden="true" /> Prepare module
                            </button>
                          </div>
                        )}
                      {(module.lessons || []).map((lesson, lessonIndex) => (
                        <button
                          className="courses-resource-row"
                          type="button"
                          key={lesson.id}
                          onClick={() => onOpenLesson(lesson.id)}
                        >
                          <span
                            className={`courses-resource-row__state ${lesson.done ? "is-done" : ""}`}
                          >
                            {lesson.done ? (
                              <FiCheck aria-hidden="true" />
                            ) : (
                              lessonIndex + 1
                            )}
                          </span>
                          <span className="courses-resource-row__title">
                            <strong>{lesson.title}</strong>
                            <small>
                              {lesson.durationMin
                                ? `${lesson.durationMin} min`
                                : "Self-paced lesson"}
                            </small>
                          </span>
                          <FiBookOpen aria-hidden="true" />
                        </button>
                      ))}
                      {(module.assignments || []).map((assignment) => (
                        <button
                          className="courses-resource-row courses-resource-row--assignment"
                          type="button"
                          key={assignment.id}
                          onClick={() => onOpenAssignment(assignment.id)}
                        >
                          <span className="courses-resource-row__state">
                            <FiFileText aria-hidden="true" />
                          </span>
                          <span className="courses-resource-row__title">
                            <strong>{assignment.title}</strong>
                            <small>
                              {assignment.etaHours
                                ? `${assignment.etaHours} estimated`
                                : "Assignment"}
                            </small>
                          </span>
                          <StatusBadge status={assignment.status} />
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function LessonDrawer({ lessonId, onClose, onCompleted }) {
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    CoursesModel.lesson(lessonId, { signal: controller.signal })
      .then(({ lesson: result }) => setLesson(result))
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      });
    return () => controller.abort();
  }, [lessonId]);

  const complete = async () => {
    setSaving(true);
    setError("");
    try {
      await CoursesModel.completeLesson(lesson.id);
      setLesson((current) => ({ ...current, done: true }));
      onCompleted(lesson.id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailDrawer
      title={lesson?.title || "Lesson"}
      eyebrow={lesson?.moduleTitle || "Course lesson"}
      onClose={onClose}
    >
      {!lesson && !error && <LoadingBlock label="Loading lesson" />}
      {error && <ErrorNotice message={error} />}
      {lesson && (
        <>
          <div className="courses-detail-meta">
            <span>
              <FiClock aria-hidden="true" />{" "}
              {lesson.durationMin
                ? `${lesson.durationMin} minutes`
                : "Self-paced"}
            </span>
            {lesson.done && (
              <span className="courses-complete-label">
                <FiCheckCircle aria-hidden="true" /> Completed
              </span>
            )}
          </div>
          <div className="courses-markdown">
            {lesson.contentMd ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {lesson.contentMd}
              </ReactMarkdown>
            ) : (
              <p>This lesson content is not available yet.</p>
            )}
          </div>
          <footer className="courses-drawer__footer">
            <button
              className="courses-button courses-button--primary"
              type="button"
              onClick={complete}
              disabled={lesson.done || saving}
            >
              {saving ? (
                <FiLoader className="courses-spin" aria-hidden="true" />
              ) : (
                <FiCheckCircle aria-hidden="true" />
              )}
              {lesson.done
                ? "Lesson completed"
                : saving
                  ? "Saving..."
                  : "Mark as complete"}
            </button>
          </footer>
        </>
      )}
    </DetailDrawer>
  );
}

function AssignmentDrawer({ assignmentId, onClose, onSubmitted }) {
  const [assignment, setAssignment] = useState(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    CoursesModel.assignment(assignmentId, { signal: controller.signal })
      .then(({ assignment: result }) => {
        setAssignment(result);
        setSubmissionLink(result.submissionLink || "");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      });
    return () => controller.abort();
  }, [assignmentId]);

  const steps = useMemo(() => {
    if (!assignment?.steps) return [];
    return Array.isArray(assignment.steps)
      ? assignment.steps
      : [assignment.steps];
  }, [assignment?.steps]);

  const submit = async (event) => {
    event.preventDefault();
    const value = submissionLink.trim();
    if (!isHttpUrl(value)) {
      setError("Enter a complete http:// or https:// link to your work.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await CoursesModel.submitAssignment(assignment.id, value);
      setAssignment((current) => ({
        ...current,
        status: "submitted",
        submissionLink: value,
      }));
      onSubmitted(assignment.id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailDrawer
      title={assignment?.title || "Assignment"}
      eyebrow="Course assignment"
      onClose={onClose}
    >
      {!assignment && !error && <LoadingBlock label="Loading assignment" />}
      {error && <ErrorNotice message={error} />}
      {assignment && (
        <>
          <div className="courses-detail-meta">
            <StatusBadge status={assignment.status} />
            {assignment.etaHours && (
              <span>
                <FiClock aria-hidden="true" /> {assignment.etaHours}
              </span>
            )}
          </div>
          {assignment.description && (
            <p className="courses-assignment-description">
              {assignment.description}
            </p>
          )}
          {steps.length > 0 && (
            <section
              className="courses-steps"
              aria-labelledby="assignment-steps-heading"
            >
              <h3 id="assignment-steps-heading">What to do</h3>
              <ol>
                {steps.map((step, index) => {
                  const text =
                    typeof step === "string"
                      ? step
                      : step.text ||
                        step.description ||
                        step.title ||
                        JSON.stringify(step);
                  return (
                    <li key={`${index}-${text}`}>
                      <span>{index + 1}</span>
                      <p>{text}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
          {assignment.feedback && (
            <div className="courses-feedback">
              <strong>Teacher feedback</strong>
              <p>{assignment.feedback}</p>
            </div>
          )}
          {assignment.submissionLink &&
            isHttpUrl(assignment.submissionLink) && (
              <a
                className="courses-submission-link"
                href={assignment.submissionLink}
                target="_blank"
                rel="noreferrer"
              >
                View current submission <FiExternalLink aria-hidden="true" />
              </a>
            )}
          <form
            className="courses-submission-form"
            onSubmit={submit}
            noValidate
          >
            <label htmlFor="course-submission-link">Link to your work</label>
            <p>
              Share a viewable link from Google Drive, OneDrive, or another
              trusted service.
            </p>
            <div className="courses-submission-form__row">
              <input
                id="course-submission-link"
                type="url"
                inputMode="url"
                value={submissionLink}
                onChange={(event) => setSubmissionLink(event.target.value)}
                placeholder="https://..."
                aria-describedby="course-submission-help"
                required
              />
              <button
                className="courses-button courses-button--primary"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <FiLoader className="courses-spin" aria-hidden="true" />
                ) : (
                  <FiSend aria-hidden="true" />
                )}
                {saving
                  ? "Submitting..."
                  : assignment.status === "not_started"
                    ? "Submit"
                    : "Update"}
              </button>
            </div>
            <span
              id="course-submission-help"
              className="courses-visually-hidden"
            >
              A complete link beginning with http or https is required.
            </span>
          </form>
        </>
      )}
    </DetailDrawer>
  );
}

export function Courses() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [lessonId, setLessonId] = useState(null);
  const [assignmentId, setAssignmentId] = useState(null);
  const [generations, setGenerations] = useState({});
  const [moduleGeneration, setModuleGeneration] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedCourse =
    courses.find((course) => course.id === selectedCourseId) || null;

  const loadCourses = async () => {
    const { courses: results = [] } = await CoursesModel.list();
    setCourses(results);
    return results;
  };

  const load = async () => {
    setLoading(true);
    setError("");
    const [subjectsResult, coursesResult] = await Promise.allSettled([
      CoursesModel.subjects(),
      CoursesModel.list(),
    ]);

    if (subjectsResult.status === "fulfilled")
      setSubjects(subjectsResult.value.subjects || []);
    if (coursesResult.status === "fulfilled")
      setCourses(coursesResult.value.courses || []);

    const failures = [subjectsResult, coursesResult].filter(
      (result) => result.status === "rejected"
    );
    if (failures.length === 2) setError(failures[0].reason.message);
    else if (failures.length === 1)
      setNotice(
        `Some course information could not be loaded: ${failures[0].reason.message}`
      );
    setLoading(false);

    if (subjectsResult.status === "fulfilled") {
      const catalog = subjectsResult.value.subjects || [];
      const statuses = await Promise.allSettled(
        catalog.map((subject) => CoursesModel.generationStatus(subject.name))
      );
      setGenerations((current) => {
        const next = { ...current };
        statuses.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value.status !== "idle") {
            next[catalog[index].name] = result.value;
          }
        });
        return next;
      });
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        await load();
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  const generatingSubjects = Object.entries(generations)
    .filter(([, state]) => state?.status === "generating")
    .map(([subject]) => subject)
    .join("|");

  useEffect(() => {
    if (!generatingSubjects) return undefined;
    let active = true;
    let timer;
    const poll = async () => {
      const subjectNames = generatingSubjects.split("|").filter(Boolean);
      const results = await Promise.allSettled(
        subjectNames.map((subject) => CoursesModel.generationStatus(subject))
      );
      if (!active) return;
      let completed = false;
      setGenerations((current) => {
        const next = { ...current };
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            next[subjectNames[index]] = result.value;
            if (result.value.status === "complete") completed = true;
          } else {
            next[subjectNames[index]] = {
              status: "error",
              error: result.reason.message,
            };
          }
        });
        return next;
      });
      if (completed) {
        try {
          await loadCourses();
        } catch (requestError) {
          setNotice(requestError.message);
        }
      }
      if (active) timer = window.setTimeout(poll, 2000);
    };
    timer = window.setTimeout(poll, 1000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [generatingSubjects]);

  const generatingModules = Object.entries(moduleGeneration)
    .filter(([, state]) => state?.status === "generating")
    .map(([id]) => id)
    .join("|");

  useEffect(() => {
    if (!generatingModules) return undefined;
    let active = true;
    let timer;
    const poll = async () => {
      const moduleIds = generatingModules.split("|").filter(Boolean);
      const results = await Promise.allSettled(
        moduleIds.map((id) => CoursesModel.moduleStatus(id))
      );
      if (!active) return;
      let ready = false;
      setModuleGeneration((current) => {
        const next = { ...current };
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            next[moduleIds[index]] = result.value;
            if (result.value.status === "ready") ready = true;
          } else {
            next[moduleIds[index]] = {
              status: "failed",
              message: result.reason.message,
            };
          }
        });
        return next;
      });
      if (ready) {
        try {
          await loadCourses();
        } catch (requestError) {
          setNotice(requestError.message);
        }
      }
      if (active) timer = window.setTimeout(poll, 2000);
    };
    timer = window.setTimeout(poll, 1000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [generatingModules]);

  const generateCourse = async (subject) => {
    setNotice("");
    setGenerations((current) => ({
      ...current,
      [subject]: {
        status: "generating",
        stage: "planner",
        stageIndex: 0,
        message: "Starting course generation...",
      },
    }));
    try {
      await CoursesModel.generate(subject);
    } catch (requestError) {
      setGenerations((current) => ({
        ...current,
        [subject]: { status: "error", error: requestError.message },
      }));
    }
  };

  const generateModule = async (moduleId) => {
    setModuleGeneration((current) => ({
      ...current,
      [moduleId]: { status: "generating", message: "Preparing next module..." },
    }));
    try {
      const result = await CoursesModel.generateModule(moduleId);
      setModuleGeneration((current) => ({ ...current, [moduleId]: result }));
      if (result.status !== "generating") await loadCourses();
    } catch (requestError) {
      setModuleGeneration((current) => ({
        ...current,
        [moduleId]: { status: "failed", message: requestError.message },
      }));
      setNotice(requestError.message);
    }
  };

  const markLessonComplete = (completedLessonId) => {
    setCourses((current) =>
      current.map((course) => ({
        ...course,
        modules: (course.modules || []).map((module) => ({
          ...module,
          lessons: (module.lessons || []).map((lesson) =>
            lesson.id === completedLessonId ? { ...lesson, done: true } : lesson
          ),
        })),
      }))
    );
    setNotice("Lesson marked complete.");
  };

  const markAssignmentSubmitted = (submittedAssignmentId) => {
    setCourses((current) =>
      current.map((course) => ({
        ...course,
        modules: (course.modules || []).map((module) => ({
          ...module,
          assignments: (module.assignments || []).map((assignment) =>
            assignment.id === submittedAssignmentId
              ? { ...assignment, status: "submitted" }
              : assignment
          ),
        })),
      }))
    );
    setNotice("Assignment submitted successfully.");
  };

  return (
    <main className="courses-page">
      <div className="courses-shell">
        <header className="courses-topbar">
          <button
            className="courses-brand"
            type="button"
            onClick={() => navigate("/")}
            aria-label="Return to home"
          >
            <img src={chikoroLogo} alt="" aria-hidden="true" />
            <strong>Chikoro AI</strong>
          </button>
          <button
            className="courses-topbar__home"
            type="button"
            onClick={() => navigate("/")}
          >
            <FiArrowLeft aria-hidden="true" /> Back home
          </button>
        </header>

        <div className="courses-content">
          {notice && (
            <div className="courses-notice" role="status">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
          )}
          {loading ? (
            <LoadingBlock />
          ) : error ? (
            <ErrorNotice message={error} onRetry={load} />
          ) : selectedCourse ? (
            <CourseDetail
              course={selectedCourse}
              moduleGeneration={moduleGeneration}
              onBack={() => setSelectedCourseId(null)}
              onOpenLesson={setLessonId}
              onOpenAssignment={setAssignmentId}
              onGenerateModule={generateModule}
            />
          ) : (
            <Dashboard
              subjects={subjects}
              courses={courses}
              generations={generations}
              onGenerate={generateCourse}
              onOpenCourse={setSelectedCourseId}
            />
          )}
        </div>
      </div>

      {lessonId && (
        <LessonDrawer
          lessonId={lessonId}
          onClose={() => setLessonId(null)}
          onCompleted={markLessonComplete}
        />
      )}
      {assignmentId && (
        <AssignmentDrawer
          assignmentId={assignmentId}
          onClose={() => setAssignmentId(null)}
          onSubmitted={markAssignmentSubmitted}
        />
      )}
    </main>
  );
}

export default Courses;
