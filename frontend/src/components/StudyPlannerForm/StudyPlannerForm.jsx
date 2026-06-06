import { useState, useRef } from "react";

/**
 * StudyPlannerForm - Themed Edition
 * Maps internal styles to your application's CSS variables.
 */

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday",
];

const HOURS_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6];

const SOURCE_OPTIONS = [
  {
    value: "typed",
    label: "I'll type them",
    description: "Enter topics yourself",
    icon: "✏️",
  },
  {
    value: "documents",
    label: "From my documents",
    description: "Pull topics from uploaded notes",
    icon: "📄",
  },
  {
    value: "both",
    label: "Both",
    description: "Documents + extra topics",
    icon: "🔀",
  },
];

const S = {
  card: {
    background: "var(--theme-bg-secondary)",
    border: "1px solid var(--theme-sidebar-border)",
    borderRadius: "12px",
    padding: "1.25rem",
    marginBottom: "12px",
    color: "var(--theme-text-primary)",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--theme-text-primary)",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "var(--theme-settings-input-bg)",
    border: "1px solid var(--theme-sidebar-border)",
    color: "var(--theme-text-primary)",
    padding: "10px",
    borderRadius: "8px",
    outline: "none",
  },
  row: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 500,
    background: "var(--theme-button-code-hover-bg)",
    color: "var(--theme-button-code-hover-text)",
    border: "1px solid var(--theme-sidebar-border)",
    cursor: "default",
    userSelect: "none",
  },
  chipRemove: {
    cursor: "pointer",
    fontSize: "14px",
    opacity: 0.8,
    lineHeight: 1,
    border: "none",
    background: "transparent",
    color: "inherit",
  },
  primaryBtn: {
    padding: "10px 24px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    border: "none",
    background: "var(--theme-button-primary)",
    color: "#ffffff",
    transition: "opacity 0.15s",
  },
  ghostBtn: {
    padding: "10px 20px",
    borderRadius: "8px",
    fontWeight: 500,
    fontSize: "14px",
    cursor: "pointer",
    background: "transparent",
    border: "1px solid var(--theme-sidebar-border)",
    color: "var(--theme-text-secondary)",
    transition: "background 0.15s",
  },
};

function StepIndicator({ current, total = 3 }) {
  const labels = ["Exam details", "Topics", "Schedule"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i + 1 < current;
        const active = i + 1 === current;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", flex: i < total - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  flexShrink: 0,
                  background: done
                    ? "var(--theme-checklist-item-completed-bg)"
                    : active
                    ? "var(--theme-button-primary)"
                    : "var(--theme-bg-chat-input)",
                  color: done
                    ? "var(--theme-checklist-item-completed-text)"
                    : active
                    ? "#ffffff"
                    : "var(--theme-text-secondary)",
                  border: "1px solid var(--theme-sidebar-border)",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: active ? 600 : 400,
                  color: active
                    ? "var(--theme-text-primary)"
                    : "var(--theme-text-secondary)",
                }}
              >
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: done
                    ? "var(--theme-checklist-checkbox-fill)"
                    : "var(--theme-sidebar-border)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepExamDetails({ data, onChange, onNext }) {
  const today = new Date().toISOString().split("T")[0];
  const canProceed = data.examDate && data.examDate >= today;

  return (
    <div>
      <p style={{ fontSize: "14px", color: "var(--theme-text-secondary)", marginBottom: "20px", marginTop: 0 }}>
        Tell me a bit about your upcoming exam.
      </p>

      <div style={{ marginBottom: "16px" }}>
        <label style={S.label}>Subject</label>
        <input
          type="text"
          placeholder="e.g. Biology, Economics..."
          value={data.subject}
          onChange={(e) => onChange("subject", e.target.value)}
          style={S.input}
        />
      </div>

      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Exam date *</label>
          <input
            type="date"
            min={today}
            value={data.examDate}
            onChange={(e) => onChange("examDate", e.target.value)}
            style={S.input}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Start from</label>
          <input
            type="date"
            min={today}
            max={data.examDate || undefined}
            value={data.startDate}
            onChange={(e) => onChange("startDate", e.target.value)}
            style={S.input}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
        <button
          style={{ ...S.primaryBtn, opacity: canProceed ? 1 : 0.4 }}
          disabled={!canProceed}
          onClick={onNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function StepTopics({ data, onChange, onNext, onBack }) {
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef(null);

  const addTopic = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const parts = trimmed.split(",").map((t) => t.trim()).filter(Boolean);
    const existing = new Set(data.topics.map((t) => t.toLowerCase()));
    const toAdd = parts.filter((p) => !existing.has(p.toLowerCase()));
    if (toAdd.length) onChange("topics", [...data.topics, ...toAdd]);
    setInputVal("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTopic(inputVal);
    }
  };

  const removeTopic = (t) => onChange("topics", data.topics.filter((x) => x !== t));

  const canProceed = data.source !== "typed" || data.topics.length > 0;

  return (
    <div>
      <p style={{ fontSize: "14px", color: "var(--theme-text-secondary)", marginBottom: "20px", marginTop: 0 }}>
        Where should the topics come from?
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {SOURCE_OPTIONS.map((opt) => {
          const selected = data.source === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange("source", opt.value)}
              style={{
                padding: "12px 10px",
                borderRadius: "8px",
                border: selected
                  ? "2px solid var(--theme-button-primary)"
                  : "1px solid var(--theme-sidebar-border)",
                background: selected
                  ? "var(--theme-button-code-hover-bg)"
                  : "var(--theme-bg-primary)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "16px", marginBottom: "4px" }}>{opt.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--theme-text-primary)" }}>{opt.label}</div>
              <div style={{ fontSize: "10px", color: "var(--theme-text-secondary)", marginTop: "2px" }}>{opt.description}</div>
            </button>
          );
        })}
      </div>

      {(data.source === "typed" || data.source === "both") && (
        <div style={{ marginBottom: "16px" }}>
          <label style={S.label}>Topics</label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid var(--theme-sidebar-border)",
              background: "var(--theme-settings-input-bg)",
              minHeight: "44px",
            }}
            onClick={() => inputRef.current?.focus()}
          >
            {data.topics.map((t) => (
              <span key={t} style={S.chip}>
                {t}
                <button style={S.chipRemove} onClick={() => removeTopic(t)}>×</button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              placeholder="Add topic..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => inputVal && addTopic(inputVal)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "13px",
                color: "var(--theme-text-primary)",
                flex: "1 1 100px",
              }}
            />
          </div>
        </div>
      )}

      {data.source === "documents" && (
        <div style={{
          padding: "12px",
          borderRadius: "8px",
          background: "var(--theme-checklist-item-bg)",
          color: "var(--theme-checklist-item-text)",
          fontSize: "13px",
          marginBottom: "16px",
        }}>
          Topics will be pulled from your uploaded workspace documents.
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button style={S.ghostBtn} onClick={onBack}>← Back</button>
        <button
          style={{ ...S.primaryBtn, opacity: canProceed ? 1 : 0.4 }}
          disabled={!canProceed}
          onClick={onNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function StepSchedule({ data, onChange, onBack, onSubmit }) {
  const toggleDay = (day) => {
    const next = data.daysOff.includes(day)
      ? data.daysOff.filter((d) => d !== day)
      : [...data.daysOff, day];
    onChange("daysOff", next);
  };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Study hours per day: {data.hoursPerDay}h</label>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {HOURS_OPTIONS.map((h) => (
            <button
              key={h}
              onClick={() => onChange("hoursPerDay", h)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                border: "1px solid var(--theme-sidebar-border)",
                background: data.hoursPerDay === h ? "var(--theme-button-primary)" : "var(--theme-bg-chat-input)",
                color: data.hoursPerDay === h ? "#fff" : "var(--theme-text-primary)",
                cursor: "pointer",
              }}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Days off</label>
        <div style={{ display: "flex", gap: "4px" }}>
          {DAYS_SHORT.map((short, i) => {
            const full = DAYS_FULL[i];
            const isOff = data.daysOff.includes(full);
            return (
              <button
                key={full}
                onClick={() => toggleDay(full)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "6px",
                  fontSize: "11px",
                  border: "1px solid var(--theme-sidebar-border)",
                  background: isOff ? "var(--theme-button-disable-hover-bg)" : "var(--theme-bg-chat-input)",
                  color: isOff ? "var(--theme-button-disable-hover-text)" : "var(--theme-text-secondary)",
                  cursor: "pointer",
                }}
              >
                {short}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ ...S.card, background: "var(--theme-bg-chat-input)", border: "none" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--theme-text-secondary)", marginBottom: "8px" }}>SUMMARY</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <span style={{ fontSize: "10px", color: "var(--theme-text-secondary)" }}>Subject</span>
            <p style={{ fontSize: "12px", fontWeight: 600, margin: 0 }}>{data.subject || "General"}</p>
          </div>
          <div>
            <span style={{ fontSize: "10px", color: "var(--theme-text-secondary)" }}>Exam Date</span>
            <p style={{ fontSize: "12px", fontWeight: 600, margin: 0 }}>{data.examDate}</p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button style={S.ghostBtn} onClick={onBack}>← Back</button>
        <button style={S.primaryBtn} onClick={onSubmit}>Generate Plan</button>
      </div>
    </div>
  );
}

export default function StudyPlannerForm({ prefill = {}, onSubmit }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [data, setData] = useState({
    subject: prefill.subject ?? "",
    examDate: prefill.exam_date ?? "",
    startDate: "",
    source: "typed",
    topics: [],
    hoursPerDay: 2,
    daysOff: [],
  });

  const change = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    const prompt = `Please create a study plan:
- Subject: ${data.subject}
- Date: ${data.examDate}
- Start date: ${data.startDate || ""}
- Topics: ${data.topics.join(", ")}
- Hours/Day: ${data.hoursPerDay}
- Days off: ${data.daysOff.join(", ")}
- Source strategy: ${data.source}`;
    
    setSubmitted(true);
    onSubmit(prompt);
  };

  if (submitted) return null;

  return (
    <div style={{ maxWidth: "450px", width: "100%" }}>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <span>📚</span>
          <span style={{ fontWeight: 700 }}>Study Plan Builder</span>
        </div>
        <StepIndicator current={step} />
        {step === 1 && <StepExamDetails data={data} onChange={change} onNext={() => setStep(2)} />}
        {step === 2 && <StepTopics data={data} onChange={change} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <StepSchedule data={data} onChange={change} onBack={() => setStep(2)} onSubmit={handleSubmit} />}
      </div>
    </div>
  );
}