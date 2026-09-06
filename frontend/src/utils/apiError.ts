import axios from "axios";

type ValidationIssue = {
  loc?: unknown[];
  msg?: string;
};

export function getApiErrorMessage(error: unknown, fallback = "The request could not be completed."): string {
  if (!axios.isAxiosError(error)) return fallback;
  const detail: unknown = error.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((value) => {
      const issue = value as ValidationIssue;
      const rawField = Array.isArray(issue.loc) ? issue.loc.at(-1) : undefined;
      const field = typeof rawField === "string" ? rawField.replaceAll("_", " ") : "field";
      return `${field}: ${issue.msg || "Invalid value"}`;
    });
    if (messages.length) return messages.join(" · ");
  }
  if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string") return detail.message;
  return fallback;
}

