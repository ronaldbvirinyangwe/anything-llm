import React, { useState, useEffect } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { t } from "i18next";
import paths from "@/utils/paths";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Validation state
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // Check requirements whenever password changes
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

  // Helper component for requirement bullets
  const Requirement = ({ met, text }) => (
    <div className="flex items-center gap-x-2 transition-all duration-300">
      <div
        className={`w-2 h-2 rounded-full ${
          met ? "bg-green-500" : "bg-theme-text-secondary opacity-50"
        }`}
      />
      <span
        className={`text-[10px] md:text-xs ${
          met ? "text-green-400" : "text-theme-text-secondary"
        }`}
      >
        {text}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col justify-center items-center md:justify-end md:items-end p-6 md:p-12 bg-theme-bg-primary">
      <form
        onSubmit={handleRegister}
        className="flex flex-col justify-center items-center relative rounded-2xl bg-theme-bg-secondary md:shadow-[0_4px_14px_rgba(0,0,0,0.25)] md:px-12 py-12 -mt-4 md:mt-0 w-screen md:w-fit"
      >
        {/* Title */}
        <div className="flex items-start justify-between pt-11 pb-9 rounded-t">
          <div className="flex flex-col items-center gap-y-2">
            <h3 className="text-4xl md:text-2xl font-bold bg-gradient-to-r from-[#75D6FF] via-[#FFFFFF] to-[#75D6FF] bg-clip-text text-transparent text-center">
              {t("register.title", "Create Your Account")}
            </h3>
            <p className="text-sm text-theme-text-secondary text-center md:max-w-[300px] px-4 md:px-0">
              {t("register.subtitle", "Join our learning community today.")}
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="w-full px-4 md:px-12">
          <div className="w-full flex flex-col gap-y-4">
            <div className="w-screen md:w-full md:px-0 px-6">
              <input
                type="text"
                placeholder={t("register.username", "Username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder focus:outline-primary-button active:outline-primary-button outline-none text-sm rounded-md p-2.5 w-full h-[48px] md:w-[300px] md:h-[34px]"
              />
            </div>

            <div className="w-screen md:w-full md:px-0 px-6">
              <input
                type="password"
                placeholder={t("register.password", "Password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder focus:outline-primary-button active:outline-primary-button outline-none text-sm rounded-md p-2.5 w-full h-[48px] md:w-[300px] md:h-[34px]"
              />
              
              {/* Password Requirements UI */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3 px-1">
                <Requirement met={requirements.length} text="8+ Characters" />
                <Requirement met={requirements.uppercase} text="Uppercase" />
                <Requirement met={requirements.lowercase} text="Lowercase" />
                <Requirement met={requirements.number} text="Number" />
                <Requirement met={requirements.special} text="Special Char" />
              </div>
            </div>

            <div className="w-screen md:w-full md:px-0 px-6">
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
        <div className="flex items-center md:p-12 px-10 mt-12 md:mt-0 space-x-2 border-gray-600 w-full flex-col gap-y-8">
          <button
            type="submit"
            disabled={loading || (!isPasswordValid && password.length > 0)}
            className="md:text-primary-button md:bg-transparent text-dark-text text-sm font-bold focus:ring-4 focus:outline-none rounded-md border-[1.5px] border-primary-button md:h-[34px] h-[48px] md:hover:text-white md:hover:bg-primary-button bg-primary-button focus:z-10 w-full md:w-[300px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="text-sm text-white mt-4">
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
  );
}