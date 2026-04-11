import React, { useState, useEffect } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { t } from "i18next";
import paths from "@/utils/paths";
import illustration from "@/media/illustrations/register.png";
import useLogo from "@/hooks/useLogo";

export default function Register() {
  const { loginLogo } = useLogo();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    setRequirements({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const isPasswordValid = Object.values(requirements).every(Boolean);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!isPasswordValid)
      return showToast("Password does not meet requirements", "error");

    if (password !== confirm)
      return showToast("Passwords do not match", "error", { clear: true });

    setLoading(true);
    const { success, user, token, error } = await System.registerAccount(
      username,
      password
    );
    setLoading(false);

    if (success && user && token) {
      showToast("Account created successfully!", "success");
      window.location.href = paths.login();
    } else {
      showToast(error || "Registration failed", "error");
    }
  };

  // Requirement row — dot turns green when met
  const Requirement = ({ met, text }) => (
    <div className="flex items-center gap-x-2 transition-all duration-300">
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300 ${
          met ? "bg-green-500" : "bg-theme-text-secondary opacity-40"
        }`}
      />
      <span
        className={`text-[11px] transition-colors duration-300 ${
          met ? "text-green-400" : "text-theme-text-secondary"
        }`}
      >
        {text}
      </span>
    </div>
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full overflow-x-hidden overflow-y-auto md:inset-0 h-full bg-theme-bg-primary flex flex-col md:flex-row items-center justify-center">
      {/* Background glow — same as login */}
      <div
        style={{
          background: `
            radial-gradient(circle at center, transparent 40%, black 100%),
            linear-gradient(180deg, #85ff85ff 0%, #65f26eff 100%)
          `,
          width: "575px",
          filter: "blur(150px)",
          opacity: "0.4",
        }}
        className="absolute left-0 top-0 z-0 h-full w-full"
      />

      {/* Left illustration panel — hidden on mobile, same as login */}
      <div className="hidden md:flex md:w-1/2 md:h-full md:items-center md:justify-center">
        <img
          className="w-full h-full object-contain z-50"
          src={illustration}
          alt="register illustration"
        />
      </div>

      {/* Right form panel */}
      <div className="flex flex-col items-center justify-center h-full w-full md:w-1/2 z-50 relative md:-mt-20 mt-0 bg-theme-bg-secondary md:bg-transparent">
        {/* Logo */}
        <img
          src={loginLogo}
          alt="Logo"
          className="hidden relative md:flex rounded-2xl w-fit m-4 z-30 md:top-12 absolute max-h-[65px]"
          style={{ objectFit: "contain" }}
        />

        <form
          onSubmit={handleRegister}
          className="flex flex-col items-center relative rounded-2xl md:bg-theme-bg-secondary md:shadow-[0_4px_14px_rgba(0,0,0,0.25)] md:px-12 py-12 w-screen md:w-fit"
        >
          {/* Title */}
          <div className="flex flex-col items-center gap-y-2 pt-4 pb-6">
            <h3 className="text-4xl md:text-2xl font-bold bg-gradient-to-r from-[#75D6FF] via-[#FFFFFF] to-[#75D6FF] bg-clip-text text-transparent text-center">
              {t("register.title", "Create Your Account")}
            </h3>
            <p className="text-sm text-theme-text-secondary text-center md:max-w-[300px] px-4 md:px-0">
              {t("register.subtitle", "Join our learning community today.")}
            </p>
          </div>

          {/* ── Upfront instructions box ── */}
          <div className="w-full px-6 md:px-0 mb-5">
            <div className="md:w-[300px] w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 space-y-2">
              {/* Username rule */}
              <div>
                <p className="text-[11px] font-semibold text-theme-text-secondary uppercase tracking-wide mb-1">
                  Username
                </p>
                <p className="text-[11px] text-theme-text-secondary leading-relaxed">
                  Choose any name — letters, numbers, underscores or hyphens are
                  all fine. No spaces.
                </p>
              </div>

              <div className="border-t border-white/10" />

              {/* Password rules — static labels + live dots */}
              <div>
                <p className="text-[11px] font-semibold text-theme-text-secondary uppercase tracking-wide mb-2">
                  Password must include
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <Requirement met={requirements.length}    text="8+ characters"   />
                  <Requirement met={requirements.uppercase} text="Uppercase letter" />
                  <Requirement met={requirements.lowercase} text="Lowercase letter" />
                  <Requirement met={requirements.number}    text="Number (0–9)"     />
                  <Requirement met={requirements.special}   text="Special char (!@#…)" />
                </div>
              </div>
            </div>
          </div>

          {/* Inputs */}
          <div className="w-full px-4 md:px-0">
            <div className="w-full flex flex-col gap-y-4">
              {/* Username */}
              <div className="w-screen md:w-full px-2 md:px-0">
                <input
                  type="text"
                  placeholder={t("register.username", "Username")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder focus:outline-primary-button active:outline-primary-button outline-none text-sm rounded-md p-2.5 w-full h-[48px] md:w-[300px] md:h-[34px]"
                />
              </div>

              {/* Password */}
              <div className="w-screen md:w-full px-2 md:px-0">
                <input
                  type="password"
                  placeholder={t("register.password", "Password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder focus:outline-primary-button active:outline-primary-button outline-none text-sm rounded-md p-2.5 w-full h-[48px] md:w-[300px] md:h-[34px]"
                />
              </div>

              {/* Confirm Password */}
              <div className="w-screen md:w-full px-2 md:px-0">
                <input
                  type="password"
                  placeholder={t("register.confirm", "Confirm Password")}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder focus:outline-primary-button active:outline-primary-button outline-none text-sm rounded-md p-2.5 w-full h-[48px] md:w-[300px] md:h-[34px]"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center md:pt-8 pt-10 px-10 space-x-2 w-full flex-col gap-y-4">
            <button
              type="submit"
              disabled={loading || (!isPasswordValid && password.length > 0)}
              className="md:text-primary-button md:bg-transparent text-dark-text text-sm font-bold focus:ring-4 focus:outline-none rounded-md border-[1.5px] border-primary-button md:h-[34px] h-[48px] md:hover:text-white md:hover:bg-primary-button bg-primary-button focus:z-10 w-full md:w-[300px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <p className="text-sm text-white mt-2">
              Already have an account?{" "}
              <b
                className="text-primary-button hover:underline cursor-pointer"
                onClick={() => (window.location = paths.login())}
              >
                Login
              </b>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}