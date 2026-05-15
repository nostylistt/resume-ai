import Cookies from "js-cookie";

export const API_URL =
  import.meta.env.VITE_API_URL || "https://resume-ai-back.onrender.com/api";

export const getAuthToken = () => Cookies.get("token");

export const authorizedFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {}
) => {
  const headers = new Headers(init.headers);
  const token = getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
};
