import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle,
  Clock,
  MapTrifold,
  Target,
  X,
} from "@phosphor-icons/react";
import chikoroLogo from "@/media/logo/logo.jpg";
import {
  MascotWithBubble,
  MASCOT_EXPRESSIONS,
  getQuizExpression,
} from "@/components/ChikoroMascot";
import Diagnostics from "@/models/diagnostics";
import "./diagnostic.css";

function ScoreRing({ value }) {
  return (
    <div className="diagnostic-score-ring" style={{ "--score": value }}>
      <strong>{value}%</strong>
      <span>baseline score</span>
    </div>
  );
}

function Setup({
  data,
  selected,
  setSelected,
  onStart,
  starting,
  error,
  onResume,
}) {
  return (
    <>
      <section className="diagnostic-hero">
        <div>
          <span className="diagnostic-kicker">
            <Target size={16} /> Diagnostic assessment
          </span>
          <h1>Find your starting point.</h1>
          <p>
            A short, low-stakes assessment reveals which topics are secure and
            which ones deserve your attention next.
          </p>
          <span className="diagnostic-profile">
            {data.profile.curriculum} · {data.profile.grade}
          </span>
        </div>
        <MascotWithBubble
          expression={MASCOT_EXPRESSIONS.quizzing}
          size={126}
          message="This is a starting point, not a final grade. Answer what you can."
          bubblePosition="top"
        />
      </section>

      <section className="diagnostic-start-card">
        <div className="diagnostic-start-card__intro">
          <span>Step 1</span>
          <h2>Choose a subject</h2>
          <p>
            Chikoro will create 12 questions across four important topic areas.
          </p>
        </div>
        <div className="diagnostic-subject-grid">
          {data.subjects.map((subject) => (
            <button
              type="button"
              key={subject.id}
              className={selected === subject.name ? "is-selected" : ""}
              onClick={() => setSelected(subject.name)}
            >
              <span>{subject.icon}</span>
              <strong>{subject.name}</strong>
              {selected === subject.name && (
                <CheckCircle weight="fill" size={18} />
              )}
            </button>
          ))}
        </div>
        <div className="diagnostic-overview">
          <span>
            <Target size={18} /> 4 topic areas
          </span>
          <span>
            <BookOpen size={18} /> 12 questions
          </span>
          <span>
            <Clock size={18} /> About 15 minutes
          </span>
        </div>
        {error && (
          <p className="diagnostic-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="diagnostic-primary"
          disabled={!selected || starting}
          onClick={onStart}
        >
          {starting ? "Preparing assessment..." : "Start diagnostic"}
          {!starting && <ArrowRight size={18} />}
        </button>
      </section>

      {data.assessments.length > 0 && (
        <section className="diagnostic-history">
          <div>
            <span className="diagnostic-kicker">Recent activity</span>
            <h2>Your diagnostics</h2>
          </div>
          <div className="diagnostic-history__list">
            {data.assessments.map((assessment) => (
              <button
                key={assessment.id}
                type="button"
                onClick={() => onResume(assessment)}
              >
                <span>
                  {assessment.status === "submitted" ? (
                    <CheckCircle size={21} />
                  ) : (
                    <Clock size={21} />
                  )}
                </span>
                <div>
                  <strong>{assessment.subject}</strong>
                  <small>
                    {assessment.status === "submitted"
                      ? `${assessment.report?.overallScore ?? 0}% · View results`
                      : "Continue assessment"}
                  </small>
                </div>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Assessment({
  assessment,
  answers,
  setAnswers,
  index,
  setIndex,
  onSubmit,
  submitting,
  onExit,
  error,
}) {
  const question = assessment.questions[index];
  const answered = Object.keys(answers).length;
  const selectAnswer = (optionId) =>
    setAnswers((current) => ({ ...current, [question.id]: optionId }));

  return (
    <section className="diagnostic-assessment">
      <header className="diagnostic-assessment__header">
        <button type="button" onClick={onExit} aria-label="Exit diagnostic">
          <X size={20} />
        </button>
        <div>
          <span>{assessment.subject}</span>
          <strong>
            Question {index + 1} of {assessment.questionCount}
          </strong>
        </div>
        <span>
          {answered}/{assessment.questionCount} answered
        </span>
      </header>
      <Progress value={((index + 1) / assessment.questionCount) * 100} />

      <div className="diagnostic-assessment__layout">
        <nav
          className="diagnostic-question-nav"
          aria-label="Diagnostic questions"
        >
          {assessment.questions.map((item, questionIndex) => (
            <button
              type="button"
              key={item.id}
              className={`${questionIndex === index ? "is-current" : ""} ${answers[item.id] ? "is-answered" : ""}`}
              onClick={() => setIndex(questionIndex)}
              aria-label={`Question ${questionIndex + 1}${answers[item.id] ? ", answered" : ""}`}
            >
              {answers[item.id] ? <Check size={14} /> : questionIndex + 1}
            </button>
          ))}
        </nav>

        <article className="diagnostic-question">
          <div className="diagnostic-question__meta">
            <span>{question.topic}</span>
            <small>{question.difficulty}</small>
          </div>
          <h2>{question.prompt}</h2>
          <div className="diagnostic-options">
            {question.options.map((option) => (
              <button
                type="button"
                key={option.id}
                className={
                  answers[question.id] === option.id ? "is-selected" : ""
                }
                onClick={() => selectAnswer(option.id)}
              >
                <span>{option.id}</span>
                <strong>{option.text}</strong>
                {answers[question.id] === option.id && (
                  <CheckCircle weight="fill" size={20} />
                )}
              </button>
            ))}
          </div>

          <footer>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              <ArrowLeft size={18} /> Previous
            </button>
            {index < assessment.questionCount - 1 ? (
              <button
                type="button"
                className="is-primary"
                onClick={() => setIndex(index + 1)}
              >
                Next <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                className="is-primary"
                disabled={submitting}
                onClick={onSubmit}
              >
                {submitting ? "Analysing..." : "Finish diagnostic"}
              </button>
            )}
          </footer>
          {index === assessment.questionCount - 1 &&
            answered < assessment.questionCount && (
              <p className="diagnostic-skip-note">
                Unanswered questions will be counted as gaps. You can return to
                them using the question numbers.
              </p>
            )}
          {error && (
            <p className="diagnostic-error" role="alert">
              {error}
            </p>
          )}
        </article>
      </div>
    </section>
  );
}

function Progress({ value }) {
  return (
    <div
      className="diagnostic-progress"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function Results({ assessment, onNew, navigate }) {
  const report = assessment.report;
  return (
    <section className="diagnostic-results">
      <div className="diagnostic-results__hero">
        <MascotWithBubble
          expression={getQuizExpression(report.overallScore)}
          size={126}
          message="This result shows where to begin. Every topic can improve with focused practice."
          bubblePosition="top"
        />
        <ScoreRing value={report.overallScore} />
        <div>
          <span className="diagnostic-kicker">Diagnostic complete</span>
          <h1>Your learning baseline</h1>
          <p>
            {report.correct} of {report.total} questions correct across{" "}
            {report.topics.length} topic areas.
          </p>
        </div>
      </div>

      <div className="diagnostic-result-grid">
        {report.topics.map((topic) => (
          <article
            key={topic.name}
            className={
              topic.score >= 70
                ? "is-strong"
                : topic.score < 60
                  ? "is-priority"
                  : ""
            }
          >
            <div>
              <span>{topic.name}</span>
              <strong>{topic.score}%</strong>
            </div>
            <Progress value={topic.score} />
            <small>
              {topic.correct}/{topic.total} correct ·{" "}
              {topic.score >= 70
                ? "Strength"
                : topic.score < 60
                  ? "Priority area"
                  : "Developing"}
            </small>
          </article>
        ))}
      </div>

      {report.recommendedTopic && (
        <aside className="diagnostic-recommendation">
          <Target size={28} />
          <div>
            <span>Start here</span>
            <h2>{report.recommendedTopic}</h2>
            <p>
              Focus your next study session on this topic, then reassess to
              measure improvement.
            </p>
          </div>
          <button type="button" onClick={() => navigate("/courses")}>
            Find a course <ArrowRight size={17} />
          </button>
        </aside>
      )}

      <section className="diagnostic-review">
        <h2>Question review</h2>
        {report.questions.map((question, index) => (
          <details key={question.questionId}>
            <summary>
              <span className={question.isCorrect ? "is-correct" : "is-wrong"}>
                {question.isCorrect ? <Check size={15} /> : <X size={15} />}
              </span>
              <strong>
                {index + 1}. {question.prompt}
              </strong>
              <small>{question.topic}</small>
            </summary>
            <div>
              <p>
                <b>Your answer:</b> {question.selectedOption || "Not answered"}
              </p>
              <p>
                <b>Correct answer:</b> {question.correctOption}
              </p>
              <p>{question.explanation}</p>
            </div>
          </details>
        ))}
      </section>

      <div className="diagnostic-result-actions">
        {report.questions.some(({ isCorrect }) => !isCorrect) && (
          <button
            type="button"
            className="diagnostic-primary"
            onClick={() =>
              navigate(
                `/student/review?subject=${encodeURIComponent(assessment.subject)}`
              )
            }
          >
            <Target size={19} /> Start memory review
          </button>
        )}
        <button
          type="button"
          className="diagnostic-primary"
          onClick={() => navigate("/student/mastery")}
        >
          <MapTrifold size={19} /> View mastery map
        </button>
        <button type="button" className="diagnostic-secondary" onClick={onNew}>
          Take another diagnostic
        </button>
      </div>
    </section>
  );
}

export default function DiagnosticAssessment() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [selected, setSelected] = useState("");
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    Diagnostics.list()
      .then(setData)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const start = async () => {
    setStarting(true);
    setError("");
    try {
      const result = await Diagnostics.create(selected);
      setAssessment(result.assessment);
      setAnswers({});
      setIndex(0);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setStarting(false);
    }
  };
  const resume = (item) => {
    setAssessment(item);
    setAnswers({});
    setIndex(0);
  };
  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payload = Object.entries(answers).map(([questionId, optionId]) => ({
        questionId,
        optionId,
      }));
      const result = await Diagnostics.submit(assessment.id, payload);
      setAssessment(result.assessment);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };
  const reset = () => {
    setAssessment(null);
    setSelected("");
    setAnswers({});
    load();
  };

  return (
    <main className="diagnostic-page">
      <header className="diagnostic-topbar">
        <button
          type="button"
          className="diagnostic-brand"
          onClick={() => navigate("/")}
        >
          <img src={chikoroLogo} alt="" />
          <strong>Chikoro AI</strong>
        </button>
        <button
          type="button"
          className="diagnostic-home"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={18} /> Back home
        </button>
      </header>
      <div className="diagnostic-shell">
        {loading ? (
          <div className="diagnostic-state">
            <span className="diagnostic-loader" />
            <strong>Loading your learning profile...</strong>
          </div>
        ) : error && !data ? (
          <div className="diagnostic-state">
            <Target size={32} />
            <strong>Unable to load diagnostics</strong>
            <p>{error}</p>
            <button type="button" onClick={load}>
              Try again
            </button>
          </div>
        ) : assessment?.status === "submitted" ? (
          <Results assessment={assessment} onNew={reset} navigate={navigate} />
        ) : assessment?.status === "ready" ? (
          <Assessment
            assessment={assessment}
            answers={answers}
            setAnswers={setAnswers}
            index={index}
            setIndex={setIndex}
            onSubmit={submit}
            submitting={submitting}
            onExit={() => setAssessment(null)}
            error={error}
          />
        ) : (
          <Setup
            data={data}
            selected={selected}
            setSelected={setSelected}
            onStart={start}
            starting={starting}
            error={error}
            onResume={resume}
          />
        )}
      </div>
    </main>
  );
}
