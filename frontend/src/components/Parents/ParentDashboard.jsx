import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useUser from "@/hooks/useUser"; // Import the useUser hook
import LinkChildForm from "./LinkParent";
import "./parent-dashboard.css";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user } = useUser(); // Use the hook
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [parentProfile, setParentProfile] = useState(null);
  const [showLinkForm, setShowLinkForm] = useState(false);

  const accessToken = localStorage.getItem("chikoroai_authToken");
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";

  // 🧾 Fetch parent profile by user ID
  useEffect(() => {
    if (!accessToken || !user?.id) {
      navigate("/login");
      return;
    }

    const fetchParentProfile = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/system/profile/${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          console.error("Profile fetch failed:", res.status);
          setError("Failed to load parent profile");
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.success && data.profile) {
          console.log("✅ Parent profile fetched:", data.profile);
          setParentProfile(data.profile);
          // Now fetch children using the parent profile ID
          fetchChildren(data.profile.id);
        } else {
          console.warn("Unexpected profile response:", data);
          setError("Could not load parent profile");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching parent profile:", err);
        setError("Failed to load parent profile");
        setLoading(false);
      }
    };

    fetchParentProfile();
  }, [accessToken, user, navigate, API_BASE]);

  // Fetch children for this parent
  const fetchChildren = async (parentUserId) => {
    try {
      const res = await fetch(
        `${API_BASE}/system/parent/my-children/${parentUserId}`,
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      const data = await res.json();
      
      if (data.success) {
        console.log("✅ Children fetched:", data.children);
        setChildren(data.children);
      } else {
        setError(data.error || "Could not fetch children.");
      }
    } catch (err) {
      console.error("Error fetching children:", err);
      setError("Failed to fetch children records.");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSuccess = (newLink) => {
    console.log("✅ Child linked successfully:", newLink);
    // Add the newly linked child to the list
    setChildren([...children, {
      id: newLink.student.id,
      name: newLink.student.name,
      grade: newLink.student.grade,
      linkId: newLink.id,
    }]);
    setShowLinkForm(false);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-xl font-medium text-gray-700">Loading dashboard...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded shadow max-w-md text-center">
          <div className="text-red-600 text-3xl mb-2">⚠️</div>
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Login
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            👨‍👩‍👧‍👦 Parent Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Welcome{parentProfile?.name ? `, ${parentProfile.name}` : ""}! Track your children's learning progress and achievements.
          </p>
        </header>

        {/* Button to show link form */}
        <button
          onClick={() => setShowLinkForm(!showLinkForm)}
          className="mb-6 px-6 py-3 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition"
        >
          {showLinkForm ? "Cancel" : "+ Link New Child"}
        </button>

        {/* Link form - Only show when parentProfile is loaded */}
        {showLinkForm && parentProfile && (
          <div className="mb-6">
            <LinkChildForm 
             parentId={parentProfile.user_id}
              onSuccess={handleLinkSuccess}
            />
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.length === 0 ? (
            <div className="col-span-2 bg-white shadow rounded-xl p-8 text-center text-lg text-gray-700">
              No linked children yet. Click "Link New Child" above to get started.
            </div>
          ) : (
            children.map(child => (
              <div key={child.id} className="bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    {child.name}
                  </h2>
                  <p className="text-md text-gray-600 mb-4">
                    Grade/Level: {child.grade}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <Link
                    to={`/parent/reports/${child.id}`}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
                  >
                    View Report
                  </Link>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}