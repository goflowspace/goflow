import { z } from "zod";

export const feedbackSchema = z.object({
  body: z.object({
    text: z.string()
      .min(1, 'Feedback text is required')
      .max(5000, 'Feedback must not exceed 5000 characters')
      .trim(),
    projectId: z.string()
      .optional(),
    clientVersion: z.string()
      .optional()
  })
});
