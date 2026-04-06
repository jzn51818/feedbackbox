// src/app/page.tsx
"use client";

import { useState } from "react";

type FormStatus = "idle" | "submitting" | "success" | "error";

interface FormErrors {
  name?: string[];
  email?: string[];
  message?: string[];
  category?: string[];
}

const CATEGORIES = [
  { value: "", label: "Select a category..." },
  { value: "BUG", label: "Bug Report" },
  { value: "FEATURE", label: "Feature Request" },
  { value: "GENERAL", label: "General Feedback" },
  { value: "OTHER", label: "Other" },
] as const;

export default function HomePage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    category: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateClient = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = ["Name is required"];
    if (!formData.email.trim()) newErrors.email = ["Email is required"];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = ["Please enter a valid email"];
    if (!formData.message.trim()) newErrors.message = ["Message is required"];
    else if (formData.message.trim().length < 10)
      newErrors.message = ["Message must be at least 10 characters"];
    if (!formData.category) newErrors.category = ["Please select a category"];

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError("");

    if (!validateClient()) return;

    setStatus("submitting");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setErrors(data.details);
        }
        setServerError(data.error || "Something went wrong");
        setStatus("error");
        return;
      }

      setStatus("success");
      setFormData({ name: "", email: "", message: "", category: "" });

      // Reset success message after 5 seconds
      setTimeout(() => setStatus("idle"), 5000);
    } catch {
      setServerError(
        "Network error. Please check your connection and try again."
      );
      setStatus("error");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Share Your Feedback
          </h1>
          <p className="text-gray-600">
            Help us improve. Report a bug, suggest a feature, or just say hi.
          </p>
        </div>

        {/* Success Message */}
        {status === "success" && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">
                  Thank you! Your feedback has been submitted.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {status === "error" && serverError && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">
                  {serverError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5"
        >
          {/* Name */}
          <div>
            <label htmlFor="name" className="form-label">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Jane Smith"
              className={`form-input ${
                errors.name
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                  : ""
              }`}
              disabled={status === "submitting"}
            />
            {errors.name && <p className="form-error">{errors.name[0]}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              className={`form-input ${
                errors.email
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                  : ""
              }`}
              disabled={status === "submitting"}
            />
            {errors.email && <p className="form-error">{errors.email[0]}</p>}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="form-label">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`form-input ${
                errors.category
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                  : ""
              }`}
              disabled={status === "submitting"}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="form-error">{errors.category[0]}</p>
            )}
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="form-label">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us what's on your mind... (at least 10 characters)"
              rows={5}
              className={`form-input resize-none ${
                errors.message
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                  : ""
              }`}
              disabled={status === "submitting"}
            />
            <div className="flex justify-between mt-1">
              {errors.message ? (
                <p className="form-error">{errors.message[0]}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400">
                {formData.message.length}/5000
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium text-sm hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {status === "submitting" ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
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
                Submitting...
              </span>
            ) : (
              "Submit Feedback"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Your feedback is stored securely and reviewed by our team.
        </p>
      </div>
    </div>
  );
}
