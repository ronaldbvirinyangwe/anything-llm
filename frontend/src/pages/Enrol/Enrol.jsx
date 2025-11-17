import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import System from "../../models/system";
import { AUTH_TOKEN, AUTH_USER } from "../../utils/constants";

export default function Enrol() {
  const navigate = useNavigate();

  // Local auth state
  const storedUser = JSON.parse(localStorage.getItem(AUTH_USER) || "null");
  const chikoroai_authToken = localStorage.getItem(AUTH_TOKEN);

  // Point directly at your API (same as you did in ChatContainer)
  const API_BASE = import.meta.env.VITE_API_BASE || "";

  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    age: "",
    academicLevel: "",
    curriculum: "",
    grade: "",
    school: "",
  });

  // ✅ Automatically check if profile exists (by userId)
  useEffect(() => {
    const checkProfile = async () => {
      if (!storedUser?.id || !chikoroai_authToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/system/profile/${storedUser.id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${chikoroai_authToken}`,
            "Content-Type": "application/json",
          },
        });

        if (res.status === 404) {
          // No profile yet → proceed with enrol
          setLoading(false);
          return;
        }

        if (!res.ok) {
          // Some other error (401, 500, etc.)
          console.log("Profile lookup failed:", await res.text());
          setLoading(false);
          return;
        }

        const { success, profile } = await res.json();
        if (success && profile) {
          // If profile exists, redirect by role
          const roleFromProfile = profile.role; // merged `{ id, username, role, ...profileFields }`
          if (roleFromProfile === "student") navigate("/payment");
          else if (roleFromProfile === "teacher") navigate("/teacher-dashboard");
          else if (roleFromProfile === "parent") navigate("/parent/dashboard");
          else if (roleFromProfile === "admin") navigate("/admin");
          else navigate("/");

          return;
        }
      } catch (err) {
        console.log("No existing profile found (or fetch error):", err);
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, chikoroai_authToken, storedUser?.id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });

    if (e.target.name === "academicLevel") {
      // reset grade when switching levels
      setForm((prev) => ({ ...prev, grade: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!chikoroai_authToken) {
      setError("Please log in first.");
      return;
    }

    setSubmitting(true);

    let endpoint = "";
    let payload = { name: form.name?.trim() };

    if (role === "student") {
      endpoint = "/api/system/enrol/student";
      payload = {
        ...payload,
        age: form.age,
        academicLevel: form.academicLevel,
        curriculum: form.curriculum,
        grade: form.grade,
      };
    } else if (role === "teacher") {
      endpoint = "/api/system/enrol/teacher";
      payload.school = form.school?.trim();
    } else if (role === "parent") {
      endpoint = "/api/system/enrol/parent";
    }

    try {
      const res = await System.authenticatedFetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${chikoroai_authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.success) {
        // If backend returns a refreshed token, store it
        if (res.token) localStorage.setItem(AUTH_TOKEN, res.token);

        // Persist role locally for UX routing consistency
        if (storedUser) {
          const updated = { ...storedUser, role };
          localStorage.setItem(AUTH_USER, JSON.stringify(updated));
        }

        // Redirect by chosen role
        const rolePath =
          role === "teacher"
            ? "/teacher-dashboard"
            : role === "student"
            ? "/payment"
            : "/parent/dashboard";

        navigate(rolePath);
      } else {
        setError(res.error || "Failed to enrol. Try again.");
      }
    } catch (err) {
      console.error("Enrol error:", err);
      setError("Unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || submitting) {
    return (
      <div className="min-h-screen flex justify-center items-center text-white">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-primary-button mx-auto"></div>
          <p>{submitting ? "Creating your profile..." : "Checking status..."}</p>
        </div>
      </div>
    );
  }

  // 🎓 Dynamic grade options
  const gradeOptions =
    form.academicLevel === "primary"
      ? ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7"]
      : form.academicLevel === "secondary"
      ? ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"]
      : [];

  return (
    <div className="min-h-screen flex flex-col justify-center items-center md:justify-end md:items-end p-6 md:p-12 bg-theme-bg-primary">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col justify-center items-center relative rounded-2xl bg-theme-bg-secondary md:shadow-[0_4px_14px_rgba(0,0,0,0.25)] md:px-12 py-10 w-screen md:w-fit"
      >
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-2xl font-bold bg-gradient-to-r from-[#75D6FF] via-[#FFFFFF] to-[#75D6FF] bg-clip-text text-transparent">
            {role === "student"
              ? "🎓 Student Enrolment"
              : role === "teacher"
              ? "🧑‍🏫 Teacher Enrolment"
              : "👨‍👩‍👧 Parent Enrolment"}
          </h1>
          <p className="text-sm text-theme-text-secondary mt-2">
            Complete your Chikoro AI profile to continue.
          </p>
        </div>

        {/* Role Selector */}
        <div className="flex gap-x-2 mb-6">
          {["student", "teacher", "parent"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`px-4 py-2 rounded-md text-sm font-semibold border transition-all ${
                role === r
                  ? "bg-primary-button text-dark-text border-primary-button"
                  : "border-gray-600 text-white hover:border-primary-button hover:text-primary-button"
              }`}
            >
              {r === "student"
                ? "🎓 Student"
                : r === "teacher"
                ? "🧑‍🏫 Teacher"
                : "👨‍👩‍👧 Parent"}
            </button>
          ))}
        </div>

        {/* Input Fields */}
        <div className="space-y-4 text-white w-full md:w-[300px]">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder rounded-md p-2.5 w-full h-[48px]"
          />

          {role === "teacher" && (
            <input
              type="text"
              name="school"
              placeholder="School Name"
              value={form.school}
              onChange={handleChange}
              required
              className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder rounded-md p-2.5 w-full h-[48px]"
            />
          )}

          {role === "student" && (
            <>
              <input
                type="number"
                name="age"
                placeholder="Age"
                value={form.age}
                onChange={handleChange}
                required
                className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder rounded-md p-2.5 w-full h-[48px]"
              />

              <select
                name="academicLevel"
                value={form.academicLevel}
                onChange={handleChange}
                required
                className="border-none bg-theme-settings-input-bg text-theme-text-primary rounded-md p-2.5 w-full h-[48px]"
              >
                <option value="">Select Academic Level</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>

              <select
                name="curriculum"
                value={form.curriculum}
                onChange={handleChange}
                required
                className="border-none bg-theme-settings-input-bg text-theme-text-primary rounded-md p-2.5 w-full h-[48px]"
              >
                <option value="">Select Curriculum</option>
                <option value="ZIMSEC">ZIMSEC</option>
                <option value="Cambridge">Cambridge</option>
              </select>

              {/* 🎯 Dynamic Grade List */}
              {gradeOptions.length > 0 && (
                <select
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  required
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary rounded-md p-2.5 w-full h-[48px]"
                >
                  <option value="">
                    Select {form.academicLevel === "primary" ? "Grade" : "Form"}
                  </option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-8 md:text-primary-button md:bg-transparent text-dark-text text-sm font-bold focus:ring-4 focus:outline-none rounded-md border-[1.5px] border-primary-button md:h-[34px] h-[48px] md:hover:text-white md:hover:bg-primary-button bg-primary-button focus:z-10 w-full md:w-[300px]"
        >
          {submitting ? "Submitting..." : "Continue →"}
        </button>
      </form>
    </div>
  );
}