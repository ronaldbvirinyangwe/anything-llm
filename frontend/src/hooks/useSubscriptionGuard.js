// src/hooks/useSubscriptionGuard.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AUTH_USER } from "@/utils/constants";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.chikoro-ai.com/api"

/**
 * Hook to protect routes that require an active subscription
 * Automatically redirects to payment page if subscription is not paid
 * 
 * @param {boolean} requiresSubscription - Whether this route requires an active subscription
 * @returns {Object} - { isLoading, hasAccess, subscriptionStatus, subscriptionExpiry }
 */
export function useSubscriptionGuard(requiresSubscription = true) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(null);

  useEffect(() => {
    if (!requiresSubscription) {
      setIsLoading(false);
      setHasAccess(true);
      return;
    }

    const checkSubscription = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const storedUser = JSON.parse(localStorage.getItem(AUTH_USER) || "null");

        if (!token || !storedUser?.id) {
          console.log("⚠️ No auth token or user - redirecting to login");
          navigate("/login", { replace: true });
          return;
        }

        // Fetch student subscription status
        const response = await fetch(`${API_BASE}/system/student/${storedUser.id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            console.log("⚠️ Student profile not found - redirecting to enrol");
            navigate("/enrol", { replace: true });
            return;
          }
          throw new Error("Failed to fetch subscription status");
        }

        const { success, student } = await response.json();

        if (!success || !student) {
          console.log("⚠️ Invalid response - redirecting to enrol");
          navigate("/enrol", { replace: true });
          return;
        }

        const status = student.subscription_status;
        const expiry = student.subscription_expiration_date 
          ? new Date(student.subscription_expiration_date)
          : null;

        setSubscriptionStatus(status);
        setSubscriptionExpiry(expiry);

        // Check if subscription is valid
        const isPaid = status === "paid";
        const isNotExpired = expiry && expiry > new Date();
        const hasValidSubscription = isPaid && isNotExpired;

        console.log("🔍 Subscription check:", {
          status,
          expiry,
          isPaid,
          isNotExpired,
          hasValidSubscription,
        });

        if (!hasValidSubscription) {
          console.log("⚠️ No valid subscription - redirecting to payment");
          navigate("/payment", { 
            replace: true,
            state: { 
              reason: status === "pending" 
                ? "Your payment is still pending. Please complete your payment."
                : "You need an active subscription to access this feature."
            }
          });
          return;
        }

        // User has valid subscription
        setHasAccess(true);
        setIsLoading(false);

      } catch (error) {
        console.error("❌ Subscription check error:", error);
        // On error, redirect to payment page
        navigate("/payment", { 
          replace: true,
          state: { reason: "Unable to verify subscription. Please try again." }
        });
      }
    };

    checkSubscription();
  }, [requiresSubscription, navigate]);

  return {
    isLoading,
    hasAccess,
    subscriptionStatus,
    subscriptionExpiry,
  };
}