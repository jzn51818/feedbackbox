// src/lib/validation.ts
import { z } from "zod";

export const feedbackSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .trim(),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be 255 characters or less")
    .trim()
    .toLowerCase(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be 5000 characters or less")
    .trim(),
  category: z.enum(["BUG", "FEATURE", "GENERAL", "OTHER"], {
    errorMap: () => ({ message: "Please select a valid category" }),
  }),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

// Type for the full feedback record (from database)
export type FeedbackRecord = FeedbackInput & {
  id: string;
  status: "NEW" | "REVIEWED" | "RESOLVED";
  createdAt: string;
};
