import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  ClockCounterClockwise,
  Lightning,
  Target,
  X,
} from "@phosphor-icons/react";
import ReviewModel from "@/models/review";
import chikoroLogo from "@/media/logo/logo.jpg";
import "./review.css";

const MILESTONES = ["Tomorrow", "3 days", "7 days", "14 days", "30 days"];

export default function ReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filters = {
    subject: searchParams.get("subject") || "",
    topic: searchParams.get("topic") || "",
  };
  const [data, setData] = useState(null);
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    ReviewModel.today(filters)
      .then((response) => {
        setData(response);
        setItems(response.items || []);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const item = items[index] || null;
  const submit = async () => {
    if (!selected || !item) return;
    setSaving(true);
    setError("");
    try {
      const response = await ReviewModel.attempt(item.id, selected);
      setResult(
        response.queued
          ? { queued: true }
          : {
              correct: response.attempt.correct,
              correctOption: response.correctOption,
              explanation: response.explanation,
              stepAfter: response.attempt.stepAfter,
              disposition: response.attempt.disposition,
            }
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    setCompleted((value) => value + 1);
    setSelected("");
    setResult(null);
    setIndex((value) => value + 1);
  };

  const finished = started && index >= items.length;
  return (
    <main className="review-page">
      <header className="review-topbar">
        <button
          className="review-brand"
          type="button"
          onClick={() => navigate("/")}
        >
          <img src={chikoroLogo} alt="" />
          <strong>Chikoro AI</strong>
        </button>
        <button
          className="review-back"
          type="button"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={17} /> Today
        </button>
      </header>
      <div className="review-shell">
        {error && (
          <div className="review-error" role="alert">
            {error}
          </div>
        )}
        {!data && !error && (
          <div className="review-loading">
            <Brain size={34} />
            <span>Loading your review queue...</span>
          </div>
        )}
        {data && !started && (
          <section className="review-intro">
            <div className="review-intro__copy">
              <span className="review-kicker">
                <ClockCounterClockwise size={16} /> Mastery recovery
              </span>
              <h1>
                Remember it
                <br />
                when it matters.
              </h1>
              <p>
                Short reviews return at carefully spaced intervals. Correct
                answers move farther apart; mistakes return tomorrow.
              </p>
              <div className="review-milestones">
                {MILESTONES.map((label, milestone) => (
                  <span
                    key={label}
                    className={milestone < 1 ? "is-active" : ""}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <button
                type="button"
                disabled={!items.length}
                onClick={() => setStarted(true)}
              >
                {items.length
                  ? `Start ${items.length} review${items.length === 1 ? "" : "s"}`
                  : "Nothing due today"}{" "}
                <ArrowRight size={18} />
              </button>
            </div>
            <div className="review-intro__stats">
              <article>
                <strong>{data.summary.due}</strong>
                <span>due now</span>
              </article>
              <article>
                <strong>{data.summary.mastered}</strong>
                <span>recovered</span>
              </article>
              <article>
                <strong>
                  {data.summary.retentionPercent === null
                    ? "--"
                    : `${data.summary.retentionPercent}%`}
                </strong>
                <span>delayed recall</span>
              </article>
            </div>
          </section>
        )}
        {started && item && !finished && (
          <section className="review-session">
            <header>
              <div>
                <span>{item.subject}</span>
                <strong>{item.topic}</strong>
              </div>
              <small>
                {index + 1} / {items.length}
              </small>
            </header>
            <div className="review-progress">
              <span
                style={{
                  width: `${((index + (result ? 1 : 0)) / items.length) * 100}%`,
                }}
              />
            </div>
            <article className="review-question">
              <span className="review-kicker">Memory check</span>
              <h1>{item.prompt}</h1>
              <div className="review-options">
                {(item.options || []).map((option) => {
                  const reveal = result && !result.queued;
                  const correct = reveal && option.id === result.correctOption;
                  const wrong =
                    reveal && selected === option.id && !result.correct;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={Boolean(result)}
                      className={`${selected === option.id ? "is-selected" : ""} ${correct ? "is-correct" : ""} ${wrong ? "is-wrong" : ""}`}
                      onClick={() => setSelected(option.id)}
                    >
                      <span>{option.id}</span>
                      {option.text}
                      {correct && <Check size={17} />}
                      {wrong && <X size={17} />}
                    </button>
                  );
                })}
              </div>
              {result ? (
                <div
                  className={`review-feedback ${result.correct ? "is-correct" : result.queued ? "is-queued" : "is-wrong"}`}
                >
                  {result.queued ? (
                    <Lightning size={22} />
                  ) : result.correct ? (
                    <Check size={22} />
                  ) : (
                    <Target size={22} />
                  )}
                  <div>
                    <strong>
                      {result.queued
                        ? "Saved offline"
                        : result.correct
                          ? "Memory strengthened"
                          : "We will bring this back tomorrow"}
                    </strong>
                    <p>
                      {result.queued
                        ? "Your answer will be checked when you reconnect."
                        : result.explanation}
                    </p>
                  </div>
                  <button type="button" onClick={next}>
                    Next <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <button
                  className="review-submit"
                  type="button"
                  disabled={!selected || saving}
                  onClick={submit}
                >
                  {saving ? "Checking..." : "Check answer"}
                </button>
              )}
            </article>
          </section>
        )}
        {finished && (
          <section className="review-finished">
            <span>
              <Check size={32} />
            </span>
            <p className="review-kicker">Session complete</p>
            <h1>You showed up for your memory.</h1>
            <p>
              {completed} review{completed === 1 ? "" : "s"} completed. We will
              bring each topic back at the right time.
            </p>
            <button type="button" onClick={() => navigate("/")}>
              Return to Today
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
