import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarBlank,
  ChatCircleDots,
  CheckCircle,
  ClipboardText,
  Clock,
  Compass,
  Lightning,
  MapTrifold,
  Sparkle,
  Target,
} from "@phosphor-icons/react";
import StudentTodayModel from "@/models/studentToday";
import Workspace from "@/models/workspace";
import "./today.css";

const ACTION_ICONS = {
  assignment: ClipboardText,
  study_plan: CalendarBlank,
  weak_area: Lightning,
  mastery: Target,
  lesson: BookOpen,
  review: Target,
};

const STATUS_LABELS = {
  assigned: "To do",
  missing: "Overdue",
  needs_revision: "Revise",
  submitted: "Submitted",
  late: "Submitted late",
  graded: "Graded",
  graded_late: "Graded late",
};

function firstName(name) {
  return String(name || "Student")
    .trim()
    .split(/\s+/)[0];
}

function dueLabel(value) {
  if (!value) return "No due date";
  const due = new Date(value);
  const today = new Date();
  const sameDay = due.toDateString() === today.toDateString();
  return sameDay
    ? `Today, ${due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : due.toLocaleDateString([], { month: "short", day: "numeric" });
}

function DashboardSkeleton() {
  return (
    <div className="today-skeleton" role="status" aria-label="Loading today">
      <span />
      <div>
        <span />
        <span />
      </div>
      <div>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function PrimaryAction({ action, onOpen }) {
  if (!action) {
    return (
      <article className="today-primary today-primary--clear">
        <span className="today-primary__icon">
          <CheckCircle size={26} />
        </span>
        <div>
          <span className="today-label">You are caught up</span>
          <h2>Choose what you want to explore.</h2>
          <p>
            No urgent work is waiting. Continue a course or ask your tutor
            something new.
          </p>
        </div>
      </article>
    );
  }
  const Icon = ACTION_ICONS[action.kind] || Compass;
  return (
    <article className={`today-primary today-primary--${action.kind}`}>
      <div className="today-primary__topline">
        <span>
          <Sparkle size={15} /> Best next move
        </span>
        <small>{action.eyebrow}</small>
      </div>
      <div className="today-primary__body">
        <span className="today-primary__icon">
          <Icon size={28} />
        </span>
        <div>
          <h2>{action.title}</h2>
          <p>{action.detail}</p>
        </div>
      </div>
      <button type="button" onClick={() => onOpen(action.link)}>
        Start now <ArrowRight size={18} weight="bold" />
      </button>
    </article>
  );
}

function AssignmentAgenda({ assignments, onOpen }) {
  const actionable = assignments.filter((item) =>
    ["assigned", "missing", "needs_revision"].includes(item.status)
  );
  return (
    <section className="today-panel today-agenda">
      <header className="today-panel__heading">
        <div>
          <span className="today-label">Your agenda</span>
          <h2>Work that needs attention</h2>
        </div>
        <button type="button" onClick={() => onOpen("/student/assignments")}>
          View all
        </button>
      </header>
      <div className="today-agenda__list">
        {actionable.slice(0, 4).map((assignment, index) => (
          <button
            type="button"
            className="today-agenda__item"
            onClick={() => onOpen(assignment.link)}
            key={assignment.id}
          >
            <span className="today-agenda__number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="today-agenda__copy">
              <small>
                {assignment.subject} · {assignment.teacherName}
              </small>
              <strong>{assignment.title}</strong>
            </span>
            <span className={`today-status today-status--${assignment.status}`}>
              {STATUS_LABELS[assignment.status] || assignment.status}
            </span>
            <span className="today-agenda__due">
              <Clock size={14} /> {dueLabel(assignment.dueAt)}
            </span>
            <ArrowRight className="today-agenda__arrow" size={17} />
          </button>
        ))}
        {!actionable.length && (
          <div className="today-empty-row">
            <CheckCircle size={24} />
            <div>
              <strong>No assignments waiting</strong>
              <span>Your agenda is clear for now.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function StudentToday() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tutorLink, setTutorLink] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await StudentTodayModel.get();
      setData(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    Workspace.all()
      .then((workspaces) => {
        if (workspaces?.[0]?.slug)
          setTutorLink(`/workspace/${workspaces[0].slug}`);
      })
      .catch(() => {});
  }, []);

  const open = (link) => link && navigate(link);
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <main className="today-page">
      <div className="today-gridlines" aria-hidden="true" />
      <div className="today-shell">
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <section className="today-error">
            <Compass size={34} />
            <h1>Your day is still taking shape.</h1>
            <p>{error}</p>
            <button type="button" onClick={load}>
              Try again
            </button>
          </section>
        ) : (
          <>
            {data.offlineSource === "cache" && (
              <div className="today-offline" role="status">
                Showing your last saved daily brief. Changes will refresh when
                you reconnect.
              </div>
            )}
            <header className="today-hero">
              <div>
                <span className="today-date">{formattedDate}</span>
                <h1>Good day, {firstName(data.student.name)}.</h1>
                <p>
                  One clear move at a time. Here is where your learning stands
                  today.
                </p>
              </div>
              <div className="today-hero__actions">
                {tutorLink && (
                  <button type="button" onClick={() => open(tutorLink)}>
                    <ChatCircleDots size={18} /> Ask your tutor
                  </button>
                )}
                <span>
                  {data.student.curriculum} · {data.student.grade}
                </span>
              </div>
            </header>

            <section className="today-overview">
              <PrimaryAction action={data.primaryAction} onOpen={open} />
              <div className="today-snapshot" aria-label="Today snapshot">
                <article>
                  <strong>{data.summary.openAssignments}</strong>
                  <span>open assignments</span>
                </article>
                <article>
                  <strong>{data.summary.dueToday}</strong>
                  <span>due today</span>
                </article>
                <article>
                  <strong>{data.summary.reviewDue || 0}</strong>
                  <span>memory reviews due</span>
                </article>
                <article>
                  <strong>{data.summary.unreadNotifications}</strong>
                  <span>new updates</span>
                </article>
              </div>
            </section>

            <div className="today-layout">
              <div className="today-main-column">
                <AssignmentAgenda
                  assignments={data.assignments}
                  onOpen={open}
                />
                <section
                  className="today-shortcuts"
                  aria-label="Learning shortcuts"
                >
                  <button type="button" onClick={() => open("/courses")}>
                    <BookOpen size={20} />
                    <span>
                      <strong>Courses</strong>
                      <small>Read and continue lessons</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => open("/student/mastery")}
                  >
                    <MapTrifold size={20} />
                    <span>
                      <strong>Mastery map</strong>
                      <small>See assessed strengths</small>
                    </span>
                  </button>
                  <button type="button" onClick={() => open("/student/review")}>
                    <Target size={20} />
                    <span>
                      <strong>Review</strong>
                      <small>Strengthen your memory</small>
                    </span>
                  </button>
                  <button type="button" onClick={() => open("/quiz")}>
                    <Lightning size={20} />
                    <span>
                      <strong>Practice quiz</strong>
                      <small>Test what you know</small>
                    </span>
                  </button>
                </section>
              </div>

              <aside className="today-rail">
                {data.studyPlan?.activeSession && (
                  <section className="today-rail-card today-rail-card--plan">
                    <span className="today-label">Scheduled today</span>
                    <CalendarBlank size={22} />
                    <h3>{data.studyPlan.activeSession.topic}</h3>
                    <p>{data.studyPlan.subject} study plan</p>
                    <button
                      type="button"
                      onClick={() => open(data.studyPlan.link)}
                    >
                      Open plan <ArrowRight size={15} />
                    </button>
                  </section>
                )}
                {data.masteryRecommendation && (
                  <section className="today-rail-card">
                    <span className="today-label">Focus area</span>
                    <div className="today-score">
                      <strong>
                        {data.masteryRecommendation.masteryPercent}%
                      </strong>
                      <span>assessed mastery</span>
                    </div>
                    <h3>{data.masteryRecommendation.title}</h3>
                    <p>{data.masteryRecommendation.subject}</p>
                    <button
                      type="button"
                      onClick={() => open(data.masteryRecommendation.link)}
                    >
                      View evidence <ArrowRight size={15} />
                    </button>
                  </section>
                )}
                {data.nextLesson && (
                  <section className="today-rail-card">
                    <span className="today-label">Continue learning</span>
                    <BookOpen size={22} />
                    <h3>{data.nextLesson.lessonTitle}</h3>
                    <p>
                      {data.nextLesson.subject} ·{" "}
                      {data.nextLesson.durationMin
                        ? `${data.nextLesson.durationMin} min`
                        : "Self-paced"}
                    </p>
                    <button
                      type="button"
                      onClick={() => open(data.nextLesson.link)}
                    >
                      Open lesson <ArrowRight size={15} />
                    </button>
                  </section>
                )}
                {!!data.unreadNotifications.length && (
                  <section className="today-updates">
                    <header>
                      <Bell size={18} />
                      <strong>Latest updates</strong>
                    </header>
                    {data.unreadNotifications.slice(0, 3).map((notice) => (
                      <button
                        type="button"
                        key={notice.id}
                        onClick={() => open(notice.link)}
                      >
                        {notice.message}
                      </button>
                    ))}
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
