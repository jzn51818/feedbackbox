// src/app/admin/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";

interface Feedback {
  id: string;
  name: string;
  email: string;
  message: string;
  category: "BUG" | "FEATURE" | "GENERAL" | "OTHER";
  status: "NEW" | "REVIEWED" | "RESOLVED";
  createdAt: string;
}

interface ApiResponse {
  data: Feedback[];
  meta: {
    cacheHit: boolean;
    count: number;
  };
}

type SortField = "createdAt" | "category" | "status";
type SortDirection = "asc" | "desc";

const CATEGORY_STYLES: Record<string, string> = {
  BUG: "bg-red-50 text-red-700 ring-red-600/20",
  FEATURE: "bg-purple-50 text-purple-700 ring-purple-600/20",
  GENERAL: "bg-blue-50 text-blue-700 ring-blue-600/20",
  OTHER: "bg-gray-50 text-gray-700 ring-gray-600/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  BUG: "Bug",
  FEATURE: "Feature",
  GENERAL: "General",
  OTHER: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  REVIEWED: "bg-blue-50 text-blue-700 ring-blue-600/20",
  RESOLVED: "bg-green-50 text-green-700 ring-green-600/20",
};

const AUTO_REFRESH_INTERVAL = 30_000; // 30 seconds

export default function AdminPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch("/api/feedback", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json: ApiResponse = await res.json();

      setFeedbackList(json.data);
      setCacheHit(json.meta.cacheHit);
      setLastRefresh(new Date());
      setError("");
    } catch (err) {
      setError("Failed to load feedback. Check your connection.");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchFeedback, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchFeedback]);

  // Sort feedback
  const sortedFeedback = [...feedbackList].sort((a, b) => {
    let comparison = 0;
    if (sortField === "createdAt") {
      comparison =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      comparison = a[sortField].localeCompare(b[sortField]);
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <span className="text-gray-300 ml-1">&#8597;</span>;
    return (
      <span className="text-indigo-600 ml-1">
        {sortDirection === "asc" ? "\u2191" : "\u2193"}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-gray-500">Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Feedback Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {feedbackList.length} submission
            {feedbackList.length !== 1 ? "s" : ""} total
          </p>
        </div>

        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          {/* Cache indicator */}
          {cacheHit !== null && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                cacheHit
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  cacheHit ? "bg-green-500" : "bg-amber-500"
                }`}
              />
              {cacheHit ? "Cache HIT" : "Cache MISS"}
            </span>
          )}

          {/* Last refresh */}
          {lastRefresh && (
            <span className="text-xs text-gray-400">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}

          {/* Manual refresh button */}
          <button
            onClick={fetchFeedback}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {feedbackList.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            No feedback yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Submissions will appear here once users start sharing feedback.
          </p>
        </div>
      )}

      {/* Feedback table */}
      {feedbackList.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Submitter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => handleSort("category")}
                  >
                    Category
                    <SortIcon field="category" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => handleSort("status")}
                  >
                    Status
                    <SortIcon field="status" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => handleSort("createdAt")}
                  >
                    Date
                    <SortIcon field="createdAt" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedFeedback.map((fb) => (
                  <tr
                    key={fb.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {fb.name}
                      </div>
                      <div className="text-sm text-gray-500">{fb.email}</div>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {fb.message}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`badge ring-1 ring-inset ${
                          CATEGORY_STYLES[fb.category]
                        }`}
                      >
                        {CATEGORY_LABELS[fb.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`badge ring-1 ring-inset ${
                          STATUS_STYLES[fb.status]
                        }`}
                      >
                        {fb.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(fb.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Auto-refreshes every 30 seconds
            </p>
            <p className="text-xs text-gray-400">
              Showing {sortedFeedback.length} of {feedbackList.length} entries
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
