export const API_URL =
  import.meta.env.VITE_API_URL || "https://resume-ai-back.onrender.com/api";

export const authorizedFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {}
) => {
  return fetch(input, {
    ...init,
    credentials: "include",
  });
};
