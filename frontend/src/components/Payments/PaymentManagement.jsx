import React, { useState, useEffect } from "react";
import { MagnifyingGlass, CheckCircle } from "@phosphor-icons/react";
import showToast from "@/utils/toast";
import axios from "axios"; 
import System from "@/models/system";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getSubscriptionStatus = (status, expirationDate) => {
  if (status !== "paid" || !expirationDate) {
    return { label: status || "inactive", color: "yellow" };
  }

  const now = new Date();
  const expiry = new Date(expirationDate);
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (expiry < now) {
    return { label: "expired", color: "red", daysLeft: 0 };
  } else if (daysLeft <= 7) {
    return { label: "expiring soon", color: "orange", daysLeft };
  } else {
    return { label: "active", color: "green", daysLeft };
  }
};

export default function PaymentManagement() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);


  

 

  const fetchStudents = async () => {
  try {
    const token = localStorage.getItem("chikoroai_authToken");
    const res = await axios.get("https://api.chikoro-ai.com/api/system/students", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data.success) {
      setStudents(res.data.students || []);
      setFilteredStudents(res.data.students || []);
    }
  } catch (error) {
    showToast("Error loading students", "error");
  } finally {
    setLoading(false);
  }
};

 useEffect(() => {
    fetchStudents();
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query === "") {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(
        (student) =>
          student.name?.toLowerCase().includes(query.toLowerCase()) ||
          student.email?.toLowerCase().includes(query.toLowerCase()) ||
          student.id?.toString().includes(query)
      );
      setFilteredStudents(filtered);
    }
  };

  const handleRecordPayment = async (formData) => {
  setSubmitting(true);
  try {
    const token = localStorage.getItem("chikoroai_authToken");
    const res = await axios.post(
      `https://api.chikoro-ai.com/api/payments/cash/${selectedStudent.id}`,
      formData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (res.data.success) {
      showToast("Cash payment recorded successfully", "success");
      setSelectedStudent(null);
      fetchStudents();
    }
  } catch (error) {
    showToast("Error recording payment", "error");
  } finally {
    setSubmitting(false);
  }
};



  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-theme-text-secondary">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-secondary flex">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
              Record Cash Payment
            </h1>
            <p className="text-theme-text-secondary text-sm">
              Search for a student and record their cash payment
            </p>
          </div>

          {!selectedStudent ? (
            <StudentSearchTable
              students={filteredStudents}
              searchQuery={searchQuery}
              onSearch={handleSearch}
              onSelectStudent={setSelectedStudent}
            />
          ) : (
            <CashPaymentForm
              student={selectedStudent}
              onSubmit={handleRecordPayment}
              onCancel={() => setSelectedStudent(null)}
              submitting={submitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StudentSearchTable({ students, searchQuery, onSearch, onSelectStudent }) {
  return (
    <div className="bg-theme-bg-sidebar rounded-[16px] border-2 border-theme-sidebar-border p-6">
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-secondary h-5 w-5"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name, email, or ID..."
            className="w-full pl-10 pr-4 py-3 bg-theme-action-menu-bg border border-theme-sidebar-border rounded-lg text-theme-text-primary placeholder-theme-text-secondary focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-theme-sidebar-border">
              <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                ID
              </th>
              <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                Name
              </th>
              <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                Email
              </th>
              <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                Status
              </th>
              <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                Expires
              </th>
              <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="text-center py-8 text-theme-text-secondary"
                >
                  No students found
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const subStatus = getSubscriptionStatus(
                  student.subscription_status,
                  student.subscription_expiration_date
                );
                
                return (
                  <tr
                    key={student.id}
                    className="border-b border-theme-sidebar-border hover:bg-theme-action-menu-item-hover transition-colors"
                  >
                    <td className="py-3 px-4 text-theme-text-primary">
                      {student.id}
                    </td>
                    <td className="py-3 px-4 text-theme-text-primary">
                      {student.name || "N/A"}
                    </td>
                    <td className="py-3 px-4 text-theme-text-primary">
                      {student.email || "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          subStatus.color === "green"
                            ? "bg-green-500/20 text-green-400"
                            : subStatus.color === "orange"
                            ? "bg-orange-500/20 text-orange-400"
                            : subStatus.color === "red"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {subStatus.label}
                        {subStatus.daysLeft > 0 && ` (${subStatus.daysLeft}d)`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-theme-text-primary text-sm">
                      {formatDate(student.subscription_expiration_date)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onSelectStudent(student)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function CashPaymentForm({ student, onSubmit, onCancel, submitting }) {
  const [amount, setAmount] = useState("");
  const [plan, setPlan] = useState(student.school ? "school basic" : "premium");
  const [duration, setDuration] = useState(30); // Default 30 days
  const [notes, setNotes] = useState("");

  const subStatus = getSubscriptionStatus(
    student.subscription_status,
    student.subscription_expiration_date
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }
    if (!duration || parseInt(duration) <= 0) {
      showToast("Please enter a valid duration", "error");
      return;
    }
    onSubmit({ 
      amount: parseFloat(amount), 
      plan, 
      duration: parseInt(duration),  // Include duration
      notes 
    });
  };

  return (
    <div className="bg-theme-bg-sidebar rounded-[16px] border-2 border-theme-sidebar-border p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-theme-text-primary mb-2">
          Record Payment for {student.name}
        </h2>
        <p className="text-theme-text-secondary text-sm mb-2">
          Student ID: {student.id} | Email: {student.email || "N/A"}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-theme-text-secondary">Current Status:</span>
          <span
            className={`px-2 py-1 rounded text-xs ${
              subStatus.color === "green"
                ? "bg-green-500/20 text-green-400"
                : subStatus.color === "red"
                ? "bg-red-500/20 text-red-400"
                : "bg-yellow-500/20 text-yellow-400"
            }`}
          >
            {subStatus.label}
          </span>
          {student.subscription_expiration_date && (
            <span className="text-theme-text-secondary">
              (Expires: {formatDate(student.subscription_expiration_date)})
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-theme-text-secondary text-sm font-medium mb-2">
            Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 bg-theme-action-menu-bg border border-theme-sidebar-border rounded-lg text-theme-text-primary focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-theme-text-secondary text-sm font-medium mb-2">
            Subscription Plan
          </label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full px-4 py-3 bg-theme-action-menu-bg border border-theme-sidebar-border rounded-lg text-theme-text-primary focus:outline-none focus:border-blue-500"
          >
            <option value="school basic">School Basic</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        <div>
          <label className="block text-theme-text-secondary text-sm font-medium mb-2">
            Subscription Duration (Days)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="flex-1 px-4 py-3 bg-theme-action-menu-bg border border-theme-sidebar-border rounded-lg text-theme-text-primary focus:outline-none focus:border-blue-500"
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDuration(7)}
                className="px-3 py-2 bg-theme-action-menu-bg hover:bg-theme-action-menu-item-hover border border-theme-sidebar-border text-theme-text-primary rounded-lg text-sm"
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => setDuration(30)}
                className="px-3 py-2 bg-theme-action-menu-bg hover:bg-theme-action-menu-item-hover border border-theme-sidebar-border text-theme-text-primary rounded-lg text-sm"
              >
                30d
              </button>
              <button
                type="button"
                onClick={() => setDuration(365)}
                className="px-3 py-2 bg-theme-action-menu-bg hover:bg-theme-action-menu-item-hover border border-theme-sidebar-border text-theme-text-primary rounded-lg text-sm"
              >
                1yr
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-theme-text-secondary text-sm font-medium mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            className="w-full px-4 py-3 bg-theme-action-menu-bg border border-theme-sidebar-border rounded-lg text-theme-text-primary focus:outline-none focus:border-blue-500"
            placeholder="Add any notes about this payment..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              "Recording..."
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Record Payment
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-6 py-3 bg-theme-action-menu-bg hover:bg-theme-action-menu-item-hover border border-theme-sidebar-border text-theme-text-primary rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

