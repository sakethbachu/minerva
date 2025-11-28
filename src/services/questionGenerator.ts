import { Question } from "../types/question.types.js";

const PYTHON_SERVICE_URL = "http://localhost:8000/api/generate-questions";

interface PythonServiceResponse {
  success: boolean;
  questions?: Question[];
  error?: string;
}

export async function generateQuestions(
  userQuery: string,
  numQuestions: number = 3,
  numAnswers: number = 3
): Promise<Question[]> {
  // Call Python service - Python handles retry logic
  const response = await fetch(PYTHON_SERVICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userQuery,
      numQuestions,
      numAnswers,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      errorData.error || `Python service returned ${response.status}: ${response.statusText}`
    );
  }

  const data = (await response.json()) as PythonServiceResponse;

  if (data.success && data.questions) {
    return data.questions;
  } else {
    throw new Error(data.error || "Python service returned unsuccessful response");
  }
}
