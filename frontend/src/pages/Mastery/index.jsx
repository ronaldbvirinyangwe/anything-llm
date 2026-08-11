import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CaretDown,
  CheckCircle,
  Compass,
  MapTrifold,
  Target,
} from "@phosphor-icons/react";
import chikoroLogo from "@/media/logo/logo.jpg";
import Mastery from "@/models/mastery";
import "./mastery.css";

const STATUS = {
  mastered: {
    label: "Mastered",
    description: "Strong evidence across assessments",
  },
  proficient: {
    label: "Proficient",
    description: "Secure, with room to strengthen",
  },
  developing: { label: "Developing", description: "Needs more practice" },
  not_assessed: {
    label: "Not assessed",
    description: "No scored evidence yet",
  },
};

function Progress({ value, label, kind = "mastery" }) {
  const percent = value ?? 0;
  return (
    <div
      className={`mastery-progress mastery-progress--${kind}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={percent}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

function SummaryCard({ icon, value, label, detail }) {
  return (
    <article className="mastery-summary-card">
      <span className="mastery-summary-card__icon">{icon}</span>
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </article>
  );
}

function TopicRow({ topic }) {
  const status = STATUS[topic.status] || STATUS.not_assessed;
  return (
    <li className="mastery-topic">
      <div className="mastery-topic__heading">
        <div>
          <strong>{topic.title}</strong>
          <span className={`mastery-status mastery-status--${topic.status}`}>
            {status.label}
          </span>
        </div>
        <b>
          {topic.masteryPercent === null ? "--" : `${topic.masteryPercent}%`}
        </b>
      </div>
      <Progress
        value={topic.masteryPercent}
        label={`${topic.title} assessed mastery`}
      />
      <div className="mastery-topic__evidence">
        <span>
          {topic.assessmentCount} scored assessment
          {topic.assessmentCount === 1 ? "" : "s"}
        </span>
        {topic.totalLessons > 0 && (
          <span>
            {topic.completedLessons}/{topic.totalLessons} lessons complete
          </span>
        )}
        {topic.recovered && <span>Mastered through spaced review</span>}
        {!topic.recovered && topic.recoveryStep > 0 && (
          <span>{topic.recoveryStep}/6 delayed checks complete</span>
        )}
      </div>
    </li>
  );
}

function SubjectRow({ subject, expanded, onToggle, onBuildCourse }) {
  const status = STATUS[subject.status] || STATUS.not_assessed;
  return (
    <article className={`mastery-subject ${expanded ? "is-open" : ""}`}>
      <button
        type="button"
        className="mastery-subject__toggle"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="mastery-subject__icon" aria-hidden="true">
          {subject.icon}
        </span>
        <span className="mastery-subject__identity">
          <strong>{subject.name}</strong>
          <small>{status.description}</small>
        </span>
        <span className={`mastery-status mastery-status--${subject.status}`}>
          {status.label}
        </span>
        <span className="mastery-subject__score">
          <b>
            {subject.masteryPercent === null
              ? "--"
              : `${subject.masteryPercent}%`}
          </b>
          <small>mastery</small>
        </span>
        <CaretDown className="mastery-subject__caret" size={20} />
      </button>

      {expanded && (
        <div className="mastery-subject__details">
          <div className="mastery-subject__meters">
            <div>
              <span>Assessed mastery</span>
              <b>
                {subject.masteryPercent === null
                  ? "Not assessed"
                  : `${subject.masteryPercent}%`}
              </b>
              <Progress
                value={subject.masteryPercent}
                label={`${subject.name} assessed mastery`}
              />
            </div>
            <div>
              <span>Course coverage</span>
              <b>
                {subject.totalLessons
                  ? `${subject.coveragePercent}%`
                  : "No course yet"}
              </b>
              <Progress
                value={subject.coveragePercent}
                label={`${subject.name} course coverage`}
                kind="coverage"
              />
            </div>
          </div>

          {subject.topics.length ? (
            <ul className="mastery-topic-list">
              {subject.topics.map((topic) => (
                <TopicRow key={topic.title} topic={topic} />
              ))}
            </ul>
          ) : (
            <div className="mastery-topic-empty">
              <BookOpen size={24} />
              <div>
                <strong>No topic evidence yet</strong>
                <p>
                  Build this course or complete an assessment to begin mapping
                  your progress.
                </p>
              </div>
              <button type="button" onClick={onBuildCourse}>
                Explore course
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function MasteryMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    setLoading(true);
    setError("");
    Mastery.get()
      .then((result) => {
        setData(result);
        const active = result.subjects.find(
          (subject) => subject.assessmentCount > 0 || subject.totalLessons > 0
        );
        const requestedSubject = searchParams.get("subject");
        setExpanded(
          result.subjects.some((subject) => subject.name === requestedSubject)
            ? requestedSubject
            : active?.name || null
        );
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const subjects = (data?.subjects || []).filter((subject) => {
    if (filter === "all") return true;
    if (filter === "active")
      return subject.assessmentCount > 0 || subject.totalLessons > 0;
    return subject.status === filter;
  });

  return (
    <main className="mastery-page">
      <header className="mastery-topbar">
        <button
          type="button"
          className="mastery-brand"
          onClick={() => navigate("/")}
        >
          <img src={chikoroLogo} alt="" />
          <strong>Chikoro AI</strong>
        </button>
        <button
          type="button"
          className="mastery-home"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={18} /> Back home
        </button>
      </header>

      <div className="mastery-shell">
        {loading ? (
          <div className="mastery-state" role="status">
            <span className="mastery-loader" />
            <strong>Building your mastery map...</strong>
          </div>
        ) : error ? (
          <div className="mastery-state mastery-state--error">
            <Target size={32} />
            <strong>We could not load your progress</strong>
            <p>{error}</p>
            <button type="button" onClick={load}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <section className="mastery-hero">
              <div>
                <span className="mastery-kicker">
                  <MapTrifold size={16} /> Syllabus mastery
                </span>
                <h1>
                  See what you know.
                  <br />
                  Know what to do next.
                </h1>
                <p>
                  Your map grows from scored assessments and completed lessons
                  across your learning journey.
                </p>
                <span className="mastery-profile">
                  {data.profile.curriculum} · {data.profile.grade}
                </span>
              </div>
              <div
                className="mastery-hero__ring"
                style={{ "--value": data.summary.averageMastery || 0 }}
              >
                <strong>
                  {data.summary.averageMastery === null
                    ? "--"
                    : `${data.summary.averageMastery}%`}
                </strong>
                <span>assessed mastery</span>
              </div>
            </section>

            <section className="mastery-summary" aria-label="Mastery summary">
              <SummaryCard
                icon={<Target size={22} />}
                value={
                  data.summary.averageMastery === null
                    ? "--"
                    : `${data.summary.averageMastery}%`
                }
                label="Average mastery"
                detail="Scored evidence only"
              />
              <SummaryCard
                icon={<BookOpen size={22} />}
                value={`${data.summary.coveragePercent}%`}
                label="Course coverage"
                detail="Lessons completed"
              />
              <SummaryCard
                icon={<Compass size={22} />}
                value={`${data.summary.assessedSubjects}/${data.summary.totalSubjects}`}
                label="Subjects assessed"
                detail="Across your catalogue"
              />
              <SummaryCard
                icon={<CheckCircle size={22} />}
                value={data.summary.masteredSubjects}
                label="Subjects mastered"
                detail="Repeated strong evidence"
              />
            </section>

            <aside className="mastery-evidence-note">
              <Target size={21} />
              <p>
                <strong>How this works:</strong> quiz scores provide mastery
                evidence. Lesson completion shows coverage, but never counts as
                proof that you have mastered a topic.
              </p>
            </aside>

            {data.recommendedTopic && (
              <section className="mastery-next">
                <div>
                  <span>Recommended next step</span>
                  <h2>{data.recommendedTopic.title}</h2>
                  <p>
                    {data.recommendedTopic.subject} · Strengthen this topic next
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/student/review?subject=${encodeURIComponent(data.recommendedTopic.subject)}&topic=${encodeURIComponent(data.recommendedTopic.title)}`
                    )
                  }
                >
                  Review this topic <Target size={18} />
                </button>
              </section>
            )}

            <section className="mastery-catalog">
              <div className="mastery-catalog__heading">
                <div>
                  <span className="mastery-kicker">Your subjects</span>
                  <h2>Mastery by subject</h2>
                </div>
                <div className="mastery-filters" aria-label="Filter subjects">
                  {[
                    ["all", "All"],
                    ["active", "In progress"],
                    ["developing", "Developing"],
                    ["mastered", "Mastered"],
                    ["not_assessed", "Not assessed"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={filter === value ? "is-active" : ""}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mastery-subject-list">
                {subjects.map((subject) => (
                  <SubjectRow
                    key={subject.name}
                    subject={subject}
                    expanded={expanded === subject.name}
                    onToggle={() =>
                      setExpanded(
                        expanded === subject.name ? null : subject.name
                      )
                    }
                    onBuildCourse={() => navigate("/courses")}
                  />
                ))}
              </div>
              {!subjects.length && (
                <div className="mastery-filter-empty">
                  No subjects match this filter yet.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
