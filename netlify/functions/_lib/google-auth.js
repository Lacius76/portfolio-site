/**
 * Shared Google OAuth helpers for Netlify Functions (no SDK).
 * Never log tokens or client secrets.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    const err = new Error(`Missing required environment variable: ${name}`);
    err.code = "ENV_MISSING";
    throw err;
  }
  return String(value).trim();
}

/**
 * Exchange refresh token for a short-lived access token.
 */
async function getAccessToken() {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  const refreshToken = requireEnv("GOOGLE_REFRESH_TOKEN");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const err = new Error("Google OAuth token refresh failed");
    err.code = "TOKEN_REFRESH_FAILED";
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  if (!data.access_token) {
    const err = new Error("Google OAuth response missing access_token");
    err.code = "TOKEN_REFRESH_FAILED";
    throw err;
  }

  return data.access_token;
}

module.exports = {
  requireEnv,
  getAccessToken,
};
