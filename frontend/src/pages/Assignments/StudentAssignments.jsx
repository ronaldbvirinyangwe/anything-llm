import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ClipboardText,
  LinkSimple,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import Assignments from "@/models/assignments";
import chikoroLogo from "@/media/logo/logo.jpg";
import "./assignments.css";

function Status({ value }) {
  return (
    <span className={`assignment-status assignment-status--${value}`}>
      {String(value || "assigned").replaceAll("_", " ")}
    </span>
  );
}

export default function StudentAssignments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const open = async (id) => {
    try {
      const result = await Assignments.studentDetail(id);
      setSelected(result.assignment);
      setText(result.assignment.submissionText || "");
      setLink(result.assignment.submissionLink || "");
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const load = async () => {
    setLoading(true);
    try {
      const result = await Assignments.studentList();
      setAssignments(result.assignments);
      if (result.offlineSource === "cache") {
        setNotice("Showing assignments saved on this device.");
      }
      const focus = Number(searchParams.get("focus"));
      if (focus) await open(focus);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const onSettled = (event) => {
      const settlement = event.detail;
      if (settlement?.kind !== "student-assignment-submission") return;
      const studentStatus = settlement.success ? "submitted" : "sync_failed";
      setAssignments((current) =>
        current.map((assignment) =>
          String(assignment.id) === String(settlement.resourceId)
            ? { ...assignment, studentStatus, pendingSync: false }
            : assignment
        )
      );
      setSelected((current) =>
        current && String(current.id) === String(settlement.resourceId)
          ? { ...current, studentStatus, pendingSync: false }
          : current
      );
    };
    window.addEventListener("chikoro:sync-settled", onSettled);
    return () => window.removeEventListener("chikoro:sync-settled", onSettled);
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        submissionText: text,
        submissionLink: link,
      };
      const result = await Assignments.submit(selected.id, payload);
      if (result.queued) {
        const optimistic = {
          ...selected,
          ...payload,
          submittedAt: new Date().toISOString(),
          studentStatus: "submitted",
          pendingSync: true,
        };
        setSelected(optimistic);
        setAssignments((current) =>
          current.map((assignment) =>
            assignment.id === selected.id
              ? { ...assignment, studentStatus: "submitted", pendingSync: true }
              : assignment
          )
        );
        setNotice("Submission saved. It will sync when you reconnect.");
      } else {
        setNotice("Assignment submitted successfully.");
        await open(selected.id);
        await load();
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };
  const visible = assignments.filter(
    (item) =>
      filter === "all" ||
      (filter === "open"
        ? ["assigned", "missing", "needs_revision", "sync_failed"].includes(
            item.studentStatus
          )
        : filter === "submitted"
          ? ["submitted", "late"].includes(item.studentStatus)
          : ["graded", "graded_late"].includes(item.studentStatus))
  );
  const canEditSubmission =
    selected && !["graded", "graded_late"].includes(selected.studentStatus);
  return (
    <main className="assignments-page">
      <header className="assignments-topbar">
        <button className="assignments-brand" onClick={() => navigate("/")}>
          <img src={chikoroLogo} alt="" />
          <strong>Chikoro AI</strong>
        </button>
        <button className="assignments-home" onClick={() => navigate("/")}>
          <ArrowLeft size={18} /> Back home
        </button>
      </header>
      <div className="assignments-shell">
        <section className="assignments-heading">
          <div>
            <span className="assignments-kicker">
              <ClipboardText size={17} /> My assignments
            </span>
            <h1>Know what is due.</h1>
            <p>
              Complete classwork, submit it, and keep teacher feedback in one
              place.
            </p>
          </div>
        </section>
        <div className="student-assignment-filters">
          {[
            ["open", "To do"],
            ["submitted", "Submitted"],
            ["graded", "Graded"],
            ["all", "All"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "is-active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {notice && <p className="assignment-notice">{notice}</p>}
        {error && <p className="assignment-error">{error}</p>}
        {loading ? (
          <div className="assignment-state">Loading your assignments...</div>
        ) : (
          <div className="student-assignment-grid">
            {visible.map((item) => (
              <button key={item.id} onClick={() => open(item.id)}>
                <div>
                  <span>{item.subject}</span>
                  <Status value={item.studentStatus} />
                  {item.pendingSync && <small>Waiting to sync</small>}
                </div>
                <h2>{item.title}</h2>
                <p>{item.teacherName}</p>
                <footer>
                  <span>
                    <Calendar size={15} />{" "}
                    {item.dueAt
                      ? new Date(item.dueAt).toLocaleString()
                      : "No due date"}
                  </span>
                  <strong>
                    {item.scorePoints === null
                      ? `${item.maxPoints} pts`
                      : `${item.scorePoints}/${item.maxPoints}`}
                  </strong>
                </footer>
              </button>
            ))}
            {!visible.length && (
              <div className="assignment-state">
                <CheckCircle size={32} />
                <strong>Nothing here right now</strong>
                <p>Your work will appear here when a teacher assigns it.</p>
              </div>
            )}
          </div>
        )}
      </div>
      {selected && (
        <div
          className="assignment-overlay"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setSelected(null)
          }
        >
          <section
            className="assignment-modal student-assignment-detail"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>
                  {selected.subject} · {selected.teacherName}
                </span>
                <h2>{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)}>
                <X size={20} />
              </button>
            </header>
            <div className="student-assignment-meta">
              <Status value={selected.studentStatus} />
              {selected.pendingSync && <span>Waiting to sync</span>}
              <span>
                <Calendar size={16} />{" "}
                {selected.dueAt
                  ? new Date(selected.dueAt).toLocaleString()
                  : "No due date"}
              </span>
              <span>{selected.maxPoints} points</span>
            </div>
            {selected.description && (
              <div className="student-assignment-instructions">
                <h3>Instructions</h3>
                <p>{selected.description}</p>
              </div>
            )}
            {selected.feedback && (
              <aside className="student-assignment-feedback">
                <span>Teacher feedback</span>
                <p>{selected.feedback}</p>
                {selected.scorePoints !== null && (
                  <strong>
                    {selected.scorePoints}/{selected.maxPoints}
                  </strong>
                )}
              </aside>
            )}
            <form onSubmit={submit} className="student-submission-form">
              {!canEditSubmission && (
                <p className="assignment-locked">
                  This work has been graded. Your submission is now read-only.
                </p>
              )}
              <fieldset disabled={!canEditSubmission}>
                {selected.submissionModes.includes("text") && (
                  <label>
                    Written response
                    <textarea
                      rows={8}
                      maxLength={10000}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Write your response here..."
                    />
                  </label>
                )}
                {selected.submissionModes.includes("link") && (
                  <label>
                    Link to your work
                    <div>
                      <LinkSimple size={18} />
                      <input
                        type="url"
                        maxLength={2000}
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </label>
                )}
                <button
                  className="assignment-primary"
                  disabled={
                    !canEditSubmission ||
                    saving ||
                    (!text.trim() && !link.trim())
                  }
                >
                  <PaperPlaneTilt size={18} />{" "}
                  {saving
                    ? "Submitting..."
                    : selected.submittedAt
                      ? "Update submission"
                      : "Submit assignment"}
                </button>
              </fieldset>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
