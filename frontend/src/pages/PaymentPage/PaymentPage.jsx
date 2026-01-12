// src/pages/PaymentPage/PaymentPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./PaymentPage.css";
import { AUTH_USER } from "@/utils/constants";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.chikoro-ai.com/api";
const api = axios.create({ baseURL: API_BASE });

const MOBILE_METHOD = "ecocash";
const MAX_POLLING_ATTEMPTS = 8;
const POLL_EVERY_MS = 8000;

export default function PaymentPage() {
  const navigate = useNavigate();
  
  const storedUser = JSON.parse(localStorage.getItem(AUTH_USER) || "null");
  const token = localStorage.getItem("chikoroai_authToken");
  const isAuthenticated = !!token;

  const [studentData, setStudentData] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [instructions, setInstructions] = useState("");
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");

  
  // 1️⃣ Fetch student data using the student endpoint (which handles expiration)
  useEffect(() => {
    const fetchAndValidateStudent = async () => {
    console.log("🔍 Frontend Debug:", {
      storedUser,
      storedUserId: storedUser?.id,
      isAuthenticated
    });

      try {
        // Use student endpoint - it auto-expires and updates status
        const { data } = await api.get(`/system/student/${storedUser.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!data?.success || !data?.student) {
          setPageError("No student profile found. Please complete enrolment.");
          setIsVerifying(false);
          return;
        }

        const student = data.student;
        setStudentData(student);

        // 2️⃣ Check if subscription is active AFTER backend has updated it
        const status = student.subscription_status;
        const expiryDate = student.subscription_expiration_date 
          ? new Date(student.subscription_expiration_date) 
          : null;

        // If paid and not expired, redirect to home
        if (status === "paid" && expiryDate && expiryDate > new Date()) {
          navigate("/", { replace: true });
          return;
        }

        setIsVerifying(false);
      } catch (err) {
        console.error("Student fetch error:", err?.response?.data || err);
        
        if (err?.response?.status === 404) {
          setPageError("Student profile not found. Please complete enrolment.");
        } else {
          setPageError("Could not verify your subscription status.");
        }
        setIsVerifying(false);
      }
    };

    fetchAndValidateStudent();
  }, [isAuthenticated, storedUser?.id, token, navigate]);

  
  // 3️⃣ Handle payment initiation
  const handlePayment = useCallback(async () => {
    setFormError("");

    if (!isAuthenticated) {
      setFormError("Please log in first.");
      return;
    }
    if (!studentData) {
      setFormError("Student profile missing. Please enrol first.");
      return;
    }

    if (paymentMethod === MOBILE_METHOD && !/^(07[7-8])[0-9]{7}$/.test(phoneNumber)) {
      setFormError("Enter a valid Econet number (077xxxxxxx or 078xxxxxxx).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { paymentMethod };
      if (paymentMethod === MOBILE_METHOD) payload.phoneNumber = phoneNumber;

      // Use the student's database ID from the fetched data
      const { data } = await api.post(`/payments/initiate`, payload, {
  headers: { Authorization: `Bearer ${token}` },
});

      if (!data?.success) {
        setFormError(data?.error || "Payment failed to start.");
      } else if (data.redirectUrl) {
        // Card payment - redirect to Paynow
        window.location.href = data.redirectUrl;
      } else {
        // Ecocash - show instructions and poll
        setInstructions(data.instructions || "Approve the payment on your phone.");
        setPollCount(0);
        setIsPolling(true);
      }
    } catch (err) {
      console.error("Payment error:", err?.response?.data || err);
      setFormError(err?.response?.data?.error || "Error starting payment.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isAuthenticated, token, paymentMethod, phoneNumber, studentData]);

  // 4️⃣ Poll payment status
  const pollStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/payments/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (data?.success && data?.status === "paid") {
        setIsPolling(false);
        navigate("/", { replace: true });
      } else {
        setPollCount((c) => c + 1);
      }
    } catch {
      setIsPolling(false);
      setFormError("Could not confirm payment status.");
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!isPolling) return;
    
    if (pollCount >= MAX_POLLING_ATTEMPTS) {
      setIsPolling(false);
      setFormError("Payment timed out. Please check your phone and try again.");
      return;
    }
    
    const intervalId = setInterval(pollStatus, POLL_EVERY_MS);
    return () => clearInterval(intervalId);
  }, [isPolling, pollCount, pollStatus]);

  // 🔄 Loading state
  if (isVerifying) {
    return (
      <div className="spinner-centered">
        <div className="spinner" />
        <p>Verifying subscription status...</p>
      </div>
    );
  }

  // ⚠️ Error state
  if (pageError) {
    return (
      <div className="message-centered">
        <h2>Subscription Required</h2>
        <p className="error-message">{pageError}</p>
        <button 
          className="submit-btn" 
          onClick={() => navigate("/enrol", { replace: true })}
        >
          Go to Enrolment
        </button>
      </div>
    );
  }

  // 📱 Polling state
  if (isPolling) {
    return (
      <div className="message-centered">
        <h2>Check Your Phone</h2>
        <p className="instructions">{instructions}</p>
        <div className="spinner" />
        <p>Waiting for confirmation... ({pollCount}/{MAX_POLLING_ATTEMPTS})</p>
      </div>
    );
  }

  const hasActiveSubscription = 
    studentData?.subscription_status === "paid" && 
    studentData?.subscription_expiration_date &&
    new Date(studentData.subscription_expiration_date) > new Date();
  const isSchoolPricing = !!studentData?.school_id;

  return (
    <div className="page">
      <div className="payment-container">
        <h2>Activate Subscription</h2>

        {hasActiveSubscription && (
          <div className="active-subscription-notice">
            <p>✅ You have an active subscription!</p>
            <p>Expires: {new Date(studentData.subscription_expiration_date).toLocaleDateString()}</p>
            <button 
              className="submit-btn" 
              onClick={() => navigate("/", { replace: true })}
              style={{ marginTop: "10px" }}
            >
              Go to Homepage
            </button>
          </div>
        )}
        
        {/* Plan Preview */}
        <div className="plan-options">
          {isSchoolPricing ? (
            <div className="plan-card selected">
              <h3>School Basic</h3>
              <p className="price">$3 / 30 days</p>
              <p className="hint">Applied via your school profile.</p>
            </div>
          ) : (
            <div className="plan-card selected">
              <h3>Premium</h3>
              <p className="price">$5 / 30 days</p>
              <p className="hint">Individual account subscription.</p>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="method-selector">
          <label>
            <input
              type="radio"
              name="method"
              value={MOBILE_METHOD}
              checked={paymentMethod === MOBILE_METHOD}
              onChange={() => setPaymentMethod(MOBILE_METHOD)}
            />{" "}
            Ecocash
          </label>
        </div>

        {paymentMethod === MOBILE_METHOD && (
          <div className="form-group">
            <label htmlFor="phoneNumber">Mobile Number</label>
            <input
              id="phoneNumber"
              type="tel"
              placeholder="0771234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <small className="help">Format: 077xxxxxxx or 078xxxxxxx</small>
          </div>
        )}

        <button
          className="submit-btn"
          onClick={handlePayment}
          disabled={isSubmitting || isPolling}
        >
          {isSubmitting ? "Processing…" : "Pay and Activate"}
        </button>

        {formError && <p className="error-message">{formError}</p>}
      </div>
    </div>
  );
}