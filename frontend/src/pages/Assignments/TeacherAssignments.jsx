import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  ClipboardText,
  Eye,
  GraduationCap,
  PaperPlaneTilt,
  Plus,
  Users,
  X,
} from "@phosphor-icons/react";
import Assignments from "@/models/assignments";
import chikoroLogo from "@/media/logo/logo.jpg";
import "./assignments.css";

const emptyForm = {
  title: "",
  description: "",
  subject: "",
  maxPoints: 20,
  dueAt: "",
  audienceKeys: [],
  submissionModes: ["text", "link"],
  publish: true,
};

function Status({ value }) {
  return (
    <span className={`assignment-status assignment-status--${value}`}>
      {String(value || "assigned").replaceAll("_", " ")}
    </span>
  );
}

function CreateAssignment({ audiences, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const toggleAudience = (key) =>
    update(
      "audienceKeys",
      form.audienceKeys.includes(key)
        ? form.audienceKeys.filter((item) => item !== key)
        : [...form.audienceKeys, key]
    );
  const toggleMode = (mode) =>
    update(
      "submissionModes",
      form.submissionModes.includes(mode)
        ? form.submissionModes.filter((item) => item !== mode)
        : [...form.submissionModes, mode]
    );
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await Assignments.create({
        ...form,
        maxPoints: Number(form.maxPoints),
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      });
      onCreated();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="assignment-overlay"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        className="assignment-modal"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-assignment-title"
      >
        <header>
          <div>
            <span>New assignment</span>
            <h2 id="create-assignment-title">Set meaningful work</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="assignment-form-grid">
          <label className="is-wide">
            Title
            <input
              required
              minLength={3}
              maxLength={160}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Algebra practice"
            />
          </label>
          <label>
            Subject
            <input
              required
              maxLength={100}
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              placeholder="Mathematics"
            />
          </label>
          <label>
            Points
            <input
              required
              type="number"
              min="1"
              max="1000"
              value={form.maxPoints}
              onChange={(e) => update("maxPoints", e.target.value)}
            />
          </label>
          <label className="is-wide">
            Due date
            <input
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => update("dueAt", e.target.value)}
            />
          </label>
          <label className="is-wide">
            Instructions
            <textarea
              rows={5}
              maxLength={5000}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Explain what students need to complete..."
            />
          </label>
        </div>
        <fieldset>
          <legend>Assign to</legend>
          <div className="assignment-audiences">
            {audiences.map((audience) => (
              <label key={audience.key}>
                <input
                  type="checkbox"
                  checked={form.audienceKeys.includes(audience.key)}
                  onChange={() => toggleAudience(audience.key)}
                />
                <span>
                  <strong>{audience.name}</strong>
                  <small>
                    {audience.subject} · {audience.students.length} students
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Students can submit</legend>
          <div className="assignment-mode-row">
            {[
              ["text", "Written response"],
              ["link", "Link to work"],
            ].map(([mode, label]) => (
              <label key={mode}>
                <input
                  type="checkbox"
                  checked={form.submissionModes.includes(mode)}
                  onChange={() => toggleMode(mode)}
                />{" "}
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="assignment-publish-toggle">
          <input
            type="checkbox"
            checked={form.publish}
            onChange={(e) => update("publish", e.target.checked)}
          />
          <span>
            <strong>Publish now</strong>
            <small>Students receive it immediately</small>
          </span>
        </label>
        {error && (
          <p className="assignment-error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="assignment-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="assignment-primary"
            disabled={
              saving ||
              !form.audienceKeys.length ||
              !form.submissionModes.length
            }
          >
            {saving
              ? "Saving..."
              : form.publish
                ? "Publish assignment"
                : "Save draft"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function GradeModal({ assignment, submission, onClose, onSaved }) {
  const [score, setScore] = useState(submission.scorePoints ?? "");
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [status, setStatus] = useState("returned");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await Assignments.grade(assignment.id, submission.student.id, {
        scorePoints: Number(score),
        feedback,
        status,
      });
      onSaved();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="assignment-overlay">
      <form
        className="assignment-modal assignment-grade-modal"
        onSubmit={save}
        role="dialog"
        aria-modal="true"
      >
        <header>
          <div>
            <span>Grade submission</span>
            <h2>{submission.student.name}</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="assignment-submission-preview">
          <Status value={submission.status} />
          {submission.submissionText ? (
            <p>{submission.submissionText}</p>
          ) : (
            <p className="is-muted">No written response.</p>
          )}
          {submission.submissionLink && (
            <a
              href={submission.submissionLink}
              target="_blank"
              rel="noreferrer"
            >
              Open submitted work
            </a>
          )}
        </div>
        <div className="assignment-form-grid">
          <label>
            Score out of {assignment.maxPoints}
            <input
              required
              type="number"
              min="0"
              max={assignment.maxPoints}
              step="0.5"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </label>
          <label>
            Return as
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="returned">Graded</option>
              <option value="needs_revision">Needs revision</option>
            </select>
          </label>
          <label className="is-wide">
            Feedback
            <textarea
              rows={5}
              maxLength={5000}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Specific, actionable feedback..."
            />
          </label>
        </div>
        {error && <p className="assignment-error">{error}</p>}
        <footer>
          <button
            type="button"
            className="assignment-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="assignment-primary" disabled={saving}>
            {saving ? "Saving..." : "Return to student"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default function TeacherAssignments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("assignments");
  const [audiences, setAudiences] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [gradeTarget, setGradeTarget] = useState(null);
  const [gradebook, setGradebook] = useState(null);
  const [gradebookKey, setGradebookKey] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [audienceData, assignmentData] = await Promise.all([
        Assignments.audiences(),
        Assignments.teacherList(),
      ]);
      setAudiences(audienceData.audiences);
      setAssignments(assignmentData.assignments);
      if (!gradebookKey && audienceData.audiences[0])
        setGradebookKey(audienceData.audiences[0].key);
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
    if (tab === "gradebook" && gradebookKey)
      Assignments.gradebook(gradebookKey)
        .then(setGradebook)
        .catch((requestError) => setError(requestError.message));
  }, [tab, gradebookKey]);
  const openAssignment = async (id) => {
    try {
      setSelected(await Assignments.submissions(id));
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const refreshSelected = async () => {
    if (selected)
      setSelected(await Assignments.submissions(selected.assignment.id));
    await load();
    setGradeTarget(null);
  };
  const publish = async (id) => {
    try {
      await Assignments.publish(id);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <main className="assignments-page">
      <header className="assignments-topbar">
        <button className="assignments-brand" onClick={() => navigate("/")}>
          <img src={chikoroLogo} alt="" />
          <strong>Chikoro AI</strong>
        </button>
        <button className="assignments-home" onClick={() => navigate("/")}>
          <ArrowLeft size={18} /> Teacher dashboard
        </button>
      </header>
      <div className="assignments-shell">
        <section className="assignments-heading">
          <div>
            <span className="assignments-kicker">
              <GraduationCap size={17} /> Classroom workflow
            </span>
            <h1>Assignments & Gradebook</h1>
            <p>
              Set work, follow every learner, and return useful feedback from
              one place.
            </p>
          </div>
          <button
            className="assignment-primary"
            onClick={() => setCreating(true)}
          >
            <Plus size={18} /> Create assignment
          </button>
        </section>
        <div className="assignments-tabs">
          <button
            className={tab === "assignments" ? "is-active" : ""}
            onClick={() => setTab("assignments")}
          >
            <ClipboardText size={18} /> Assignments
          </button>
          <button
            className={tab === "gradebook" ? "is-active" : ""}
            onClick={() => setTab("gradebook")}
          >
            <GraduationCap size={18} /> Gradebook
          </button>
        </div>
        {error && <p className="assignment-error">{error}</p>}
        {loading ? (
          <div className="assignment-state">Loading classroom work...</div>
        ) : tab === "assignments" ? (
          <section className="teacher-assignment-layout">
            <div className="teacher-assignment-list">
              {assignments.length ? (
                assignments.map((item) => (
                  <article
                    key={item.id}
                    className={
                      selected?.assignment.id === item.id ? "is-selected" : ""
                    }
                  >
                    <div className="teacher-assignment-card__top">
                      <Status value={item.status} />
                      <span>{item.subject}</span>
                    </div>
                    <h2>{item.title}</h2>
                    <p>
                      <Calendar size={15} />{" "}
                      {item.dueAt
                        ? new Date(item.dueAt).toLocaleString()
                        : "No due date"}
                    </p>
                    <div className="teacher-assignment-stats">
                      <span>
                        <Users size={15} /> {item.recipients} assigned
                      </span>
                      <span>
                        <PaperPlaneTilt size={15} /> {item.submitted} submitted
                      </span>
                      <span>
                        <CheckCircle size={15} /> {item.graded} graded
                      </span>
                    </div>
                    <footer>
                      <button onClick={() => openAssignment(item.id)}>
                        <Eye size={16} /> View submissions
                      </button>
                      {item.status === "draft" && (
                        <button
                          className="is-publish"
                          onClick={() => publish(item.id)}
                        >
                          Publish
                        </button>
                      )}
                    </footer>
                  </article>
                ))
              ) : (
                <div className="assignment-state">
                  <ClipboardText size={30} />
                  <strong>No assignments yet</strong>
                  <p>Create focused work for one of your classes.</p>
                </div>
              )}
            </div>
            {selected && (
              <aside className="teacher-submission-panel">
                <header>
                  <div>
                    <span>{selected.assignment.subject}</span>
                    <h2>{selected.assignment.title}</h2>
                    <p>
                      {selected.assignment.submitted}/
                      {selected.assignment.recipients} submitted ·{" "}
                      {selected.assignment.graded} graded
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)}>
                    <X size={19} />
                  </button>
                </header>
                <div>
                  {selected.submissions.map((submission) => (
                    <article key={submission.id}>
                      <div>
                        <strong>{submission.student.name}</strong>
                        <small>{submission.student.grade}</small>
                      </div>
                      <Status value={submission.status} />
                      <span>
                        {submission.scorePoints === null
                          ? "--"
                          : `${submission.scorePoints}/${selected.assignment.maxPoints}`}
                      </span>
                      <button
                        disabled={!submission.submittedAt}
                        onClick={() => setGradeTarget(submission)}
                      >
                        {submission.gradedAt ? "Review grade" : "Grade"}
                      </button>
                    </article>
                  ))}
                </div>
              </aside>
            )}
          </section>
        ) : (
          <section className="gradebook-section">
            <div className="gradebook-toolbar">
              <label>
                Class
                <select
                  value={gradebookKey}
                  onChange={(e) => setGradebookKey(e.target.value)}
                >
                  {audiences.map((audience) => (
                    <option key={audience.key} value={audience.key}>
                      {audience.name}
                    </option>
                  ))}
                </select>
              </label>
              {gradebook && (
                <span>
                  {gradebook.audience.subject} · {gradebook.students.length}{" "}
                  students
                </span>
              )}
            </div>
            {gradebook ? (
              <div className="gradebook-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      {gradebook.assignments.map((assignment) => (
                        <th key={assignment.id}>
                          {assignment.title}
                          <small>/{assignment.maxPoints}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gradebook.students.map((student) => (
                      <tr key={student.id}>
                        <th>
                          {student.name}
                          <small>{student.grade}</small>
                        </th>
                        {gradebook.assignments.map((assignment) => {
                          const cell =
                            gradebook.cells[student.id]?.[assignment.id];
                          return (
                            <td key={assignment.id}>
                              {cell ? (
                                <>
                                  <strong>{cell.scorePoints ?? "--"}</strong>
                                  <Status value={cell.status} />
                                </>
                              ) : (
                                "--"
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!gradebook.assignments.length && (
                  <div className="assignment-state">
                    No published assignments for this class yet.
                  </div>
                )}
              </div>
            ) : (
              <div className="assignment-state">
                Choose a class to load its gradebook.
              </div>
            )}
          </section>
        )}
      </div>
      {creating && (
        <CreateAssignment
          audiences={audiences}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      {gradeTarget && (
        <GradeModal
          assignment={selected.assignment}
          submission={gradeTarget}
          onClose={() => setGradeTarget(null)}
          onSaved={refreshSelected}
        />
      )}
    </main>
  );
}
