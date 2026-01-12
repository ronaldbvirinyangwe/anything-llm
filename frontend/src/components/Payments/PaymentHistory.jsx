import React, { useState, useEffect } from "react";
import { CurrencyDollar, MagnifyingGlass } from "@phosphor-icons/react";
import showToast from "@/utils/toast";
import axios from "axios";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

 const fetchPaymentHistory = async () => {
  try {
    const token = localStorage.getItem("chikoroai_authToken");
    const res = await axios.get("https://api.chikoro-ai.com/api/payments/history", {
      headers: { Authorization: `Bearer ${token}` },  // ← Add this
    });
    if (res.data.success) {
      setPayments(res.data.payments || []);
      setFilteredPayments(res.data.payments || []);
    }
  } catch (error) {
    showToast("Error loading payment history", "error");
    console.error(error);
  } finally {
    setLoading(false);
  }
};


  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query === "") {
      setFilteredPayments(payments);
    } else {
      const filtered = payments.filter(
        (payment) =>
          payment.student_name?.toLowerCase().includes(query.toLowerCase()) ||
          payment.payment_method?.toLowerCase().includes(query.toLowerCase()) ||
          payment.notes?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPayments(filtered);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-theme-text-secondary">Loading payment history...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-secondary flex">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
              Payment History
            </h1>
            <p className="text-theme-text-secondary text-sm">
              View all recorded cash payments
            </p>
          </div>

          <div className="bg-theme-bg-sidebar rounded-[16px] border-2 border-theme-sidebar-border p-6">
            <div className="mb-4">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-secondary h-5 w-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search payments..."
                  className="w-full pl-10 pr-4 py-3 bg-theme-action-menu-bg border border-theme-sidebar-border rounded-lg text-theme-text-primary placeholder-theme-text-secondary focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-theme-sidebar-border">
                    <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                      Student
                    </th>
                    <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                      Method
                    </th>
                    <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                      Recorded By
                    </th>
                    <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-8 text-theme-text-secondary"
                      >
                        No payments found
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-theme-sidebar-border hover:bg-theme-action-menu-item-hover transition-colors"
                      >
                        <td className="py-3 px-4 text-theme-text-primary text-sm">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-theme-text-primary">
                          {payment.student_name}
                        </td>
                        <td className="py-3 px-4 text-theme-text-primary font-medium">
                          ${payment.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                            {payment.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-theme-text-primary text-sm">
                          {payment.recorded_by_name}
                        </td>
                        <td className="py-3 px-4 text-theme-text-secondary text-sm">
                          {payment.notes || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
