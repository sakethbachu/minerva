import { z } from "zod";

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(5),
  answers: z.array(z.string()).min(2).max(6),
});

export const QuestionsResponseSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(10),
});

export type Question = z.infer<typeof QuestionSchema>;
export type QuestionsResponse = z.infer<typeof QuestionsResponseSchema>;
