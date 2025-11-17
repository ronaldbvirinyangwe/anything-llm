import React, { useState } from "react";

export default function LinkChildForm({ parentId, onSuccess }) {
  const [linkCode, setLinkCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

 const handleSubmit = async (e) => {
  e.preventDefault();
  
  console.log("🚀 Submitting with:", { parentId, linkCode }); // Debug log
  
  if (!parentId) {
    setError("Parent ID is missing");
    return;
  }
  
  if (!linkCode || linkCode.trim() === "") {
    setError("Please enter a link code");
    return;
  }
  
  setLoading(true);
  setError("");

  try {
    const token = localStorage.getItem("chikoroai_authToken");
    const payload = { 
      parentId: Number(parentId),  // Ensure it's a number
      linkCode: linkCode.trim().toUpperCase() 
    };
    
    console.log("📤 Sending payload:", payload); // Debug log
    
    const res = await fetch("http://localhost:3001/api/system/parent/link-child", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("📥 Response:", data); // Debug log
    
    if (data.success) {
      setLinkCode("");
      onSuccess?.(data.link);
    } else {
      setError(data.error || "Failed to link child");
    }
  } catch (err) {
    console.error("❌ Error:", err); // Debug log
    setError("Network error. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        🔗 Link a New Child
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter Link Code
          </label>
          <input
            type="text"
            value={linkCode}
            onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
            placeholder="e.g., ABC12345"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            maxLength={8}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Ask your child's teacher or the student for their link code
          </p>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition"
        >
          {loading ? "Linking..." : "Link Child"}
        </button>
      </form>
    </div>
  );
}