import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { create } from "zustand";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiBookOpen,
  FiDownload,
  FiSearch,
} from "react-icons/fi";
import "./resourcefinder.css";
import { API_BASE } from "@/utils/constants";

const cleanMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/```markdown\s*([\s\S]*?)```/, "$1")
    .replace(
      /^(Okay,?|Sure,?|Alright,?|Here('s| is)|Here you go)[^.!?\n]*[.!?]\s*/i,
      ""
    )
    .trim();
};

// Zustand store for AI Resource Finder
const useResourceFinderStore = create((set, get) => ({
  formData: {
    subject: "",
    topic: "",
    grade: "",
    curriculum: "ZIMSEC",
    notes: "",
  },
  resources: "",
  isLoading: false,
  error: "",
  setFormField: (field, value) =>
    set((state) => ({
      formData: { ...state.formData, [field]: value },
    })),
  generateResources: async () => {
    const { formData } = get();
    if (!formData.subject || !formData.topic) {
      set({ error: "Please enter both subject and topic." });
      return;
    }

    set({ isLoading: true, error: "", resources: "" });
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("chikoroai_authToken")}`,
      };
      const response = await axios.post(
        `${API_BASE}/system/teacher-tools/resource-finder`,
        formData,
        { headers }
      );

      if (response.data?.resources) {
        const cleaned = cleanMarkdown(response.data.resources);
        set({ resources: cleaned, isLoading: false });
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err) {
      console.error("Error fetching resources:", err);
      const errorMessage =
        err.response?.data?.error ||
        "An error occurred while fetching resources.";
      set({ error: errorMessage, isLoading: false });
    }
  },
  reset: () =>
    set({
      formData: {
        subject: "",
        topic: "",
        grade: "",
        curriculum: "ZIMSEC",
        notes: "",
      },
      resources: "",
      isLoading: false,
      error: "",
    }),
}));

export default function ResourceFinder() {
  const {
    formData,
    resources,
    isLoading,
    error,
    setFormField,
    generateResources,
    reset,
  } = useResourceFinderStore();

  const resourceRef = useRef(null);

  useEffect(() => reset, [reset]);

  const handleSubmit = (e) => {
    e.preventDefault();
    generateResources();
  };

  const saveAsPdf = async () => {
    if (!resourceRef.current) return;
    const element = resourceRef.current;
    element.dataset.pdfMode = "true";
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `${formData.subject}_${formData.topic}_resources_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );
    } finally {
      delete element.dataset.pdfMode;
    }
  };

  return (
    <div className="rf-page">
      <main className="rf-shell">
        <nav className="rf-nav" aria-label="Breadcrumb">
          <Link to="/teacher-dashboard" className="rf-back">
            <FiArrowLeft aria-hidden="true" /> Back to dashboard
          </Link>
        </nav>

        <header className="rf-hero">
          <div className="rf-hero-icon" aria-hidden="true">
            <FiSearch size={25} />
          </div>
          <div>
            <p className="rf-eyebrow">AI teaching tool</p>
            <h1>Resource Finder</h1>
            <p className="rf-hero-description">
              Build a focused list of teaching materials for your subject,
              curriculum and class level.
            </p>
          </div>
        </header>

        <div className="rf-workspace">
          <section
            className="rf-panel rf-form-panel"
            aria-labelledby="rf-brief"
          >
            <div className="rf-panel-heading">
              <h2 id="rf-brief">Search brief</h2>
              <p>Give the AI enough context to make useful recommendations.</p>
            </div>

            <form className="rf-form" onSubmit={handleSubmit}>
              <div className="rf-form-row">
                <div className="rf-field">
                  <label htmlFor="rf-subject">Subject</label>
                  <input
                    id="rf-subject"
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormField("subject", e.target.value)}
                    placeholder="Geography"
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="rf-field">
                  <label htmlFor="rf-grade">
                    Grade <span className="rf-optional">(optional)</span>
                  </label>
                  <input
                    id="rf-grade"
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormField("grade", e.target.value)}
                    placeholder="Form 3"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="rf-field">
                <label htmlFor="rf-topic">Topic or keyword</label>
                <input
                  id="rf-topic"
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormField("topic", e.target.value)}
                  placeholder="Rivers of Africa"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="rf-field">
                <label htmlFor="rf-curriculum">Curriculum</label>
                <select
                  id="rf-curriculum"
                  value={formData.curriculum}
                  onChange={(e) => setFormField("curriculum", e.target.value)}
                >
                  <option value="ZIMSEC">ZIMSEC</option>
                  <option value="Cambridge">Cambridge</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="rf-field">
                <label htmlFor="rf-notes">
                  Teaching notes <span className="rf-optional">(optional)</span>
                </label>
                <textarea
                  id="rf-notes"
                  value={formData.notes}
                  onChange={(e) => setFormField("notes", e.target.value)}
                  rows="4"
                  placeholder="Use Zimbabwean examples and include video resources."
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="rf-button rf-button-primary"
              >
                <FiSearch aria-hidden="true" />
                {isLoading ? "Searching..." : "Find resources"}
              </button>
            </form>
          </section>

          <section
            className="rf-panel rf-output-panel"
            aria-labelledby="rf-results"
          >
            <div className="rf-output-heading">
              <div>
                <h2 id="rf-results">Recommended resources</h2>
                <p>Check every link and recommendation before sharing it.</p>
              </div>
              {resources && !isLoading && (
                <button
                  type="button"
                  onClick={saveAsPdf}
                  className="rf-button rf-button-secondary"
                >
                  <FiDownload aria-hidden="true" /> Save as PDF
                </button>
              )}
            </div>

            <div aria-live="polite">
              {isLoading && (
                <div className="rf-state" role="status">
                  <div className="rf-spinner" aria-hidden="true" />
                  <h3>Searching for teaching materials</h3>
                  <p>
                    Chikoro AI is matching resources to your topic and
                    curriculum.
                  </p>
                </div>
              )}

              {error && !isLoading && (
                <div className="rf-error" role="alert">
                  <FiAlertCircle size={18} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {resources && !isLoading ? (
                <div className="rf-results" ref={resourceRef}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {resources}
                  </ReactMarkdown>
                </div>
              ) : (
                !isLoading &&
                !error && (
                  <div className="rf-state">
                    <div className="rf-state-icon" aria-hidden="true">
                      <FiBookOpen size={24} />
                    </div>
                    <h3>Start with a subject and topic</h3>
                    <p>
                      Your curated list will appear here, ready to review and
                      export.
                    </p>
                  </div>
                )
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
