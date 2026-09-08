#!/usr/bin/env node
/**
 * One-time LOCAL Google OAuth setup (refresh token).
 *
 * Does NOT create a public Netlify callback.
 * Does NOT write the refresh token to disk.
 * Prints GOOGLE_REFRESH_TOKEN once to the terminal for Netlify env.
 *
 * ---------------------------------------------------------------
 * GOOGLE CLOUD CONSOLE — add this exact Redirect URI:
 *
 *   http://127.0.0.1:8787/oauth/callback
 *
 * Where:
 *   Google Cloud Console
 *   → APIs & Services
 *   → Credentials
 *   → your OAuth 2.0 Web Client
 *   → Authorized redirect URIs
 *   → Add URI → save
 * ---------------------------------------------------------------
 *
 * Run (from repo root, with .env filled for CLIENT_ID + CLIENT_SECRET):
 *
 *   node scripts/google-oauth-setup.mjs
 *
 * Or pass env inline:
 *
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-oauth-setup.mjs
 */

import http from "node:http";
import { URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PORT = 8787;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth/callback`;
const SCOPE = "https://www.googleapis.com/auth/calendar.freebusy";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Always resolve .env from the repository root (parent of /scripts), not process.cwd(). */
function repoRoot() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, "..");
}

function loadDotEnv() {
  const envPath = path.join(repoRoot(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error(`\nNo .env file found at:\n  ${envPath}\n`);
    return;
  }
  const text = fs.readFileSync(envPath, "utf8");
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env) || process.env[key] === "") {
      process.env[key] = val;
    }
  });
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    const envPath = path.join(repoRoot(), ".env");
    console.error(`\nMissing or empty ${name}.`);
    console.error(`Checked: ${envPath}`);
    console.error(
      `Add a non-empty value on that line (no quotes needed), e.g. ${name}=your-value`
    );
    console.error("See .env.example, or export it in your shell.\n");
    process.exit(1);
  }
  return String(v).trim();
}

loadDotEnv();

const CLIENT_ID = requireEnv("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = requireEnv("GOOGLE_CLIENT_SECRET");

const authPageUrl =
  AUTH_URL +
  "?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  }).toString();

console.log("\n========== Google OAuth setup (local, one-time) ==========\n");
console.log("Redirect URI used by this script (add EXACTLY this in Google Cloud):");
console.log(`\n  ${REDIRECT_URI}\n`);
console.log("Where to add it:");
console.log("  Google Cloud Console → APIs & Services → Credentials");
console.log("  → OAuth 2.0 Client IDs → your Web client");
console.log("  → Authorized redirect URIs → Add URI → Save\n");
console.log("Scope requested (availability only):");
console.log(`  ${SCOPE}\n`);
console.log("Open this URL in your browser (as the calendar owner / test user):\n");
console.log(`  ${authPageUrl}\n`);
console.log("Waiting for Google to redirect back to the local callback…\n");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (url.pathname !== "/oauth/callback") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const err = url.searchParams.get("error");
    if (err) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`OAuth error: ${err}`);
      console.error("Authorization failed:", err);
      server.close();
      process.exit(1);
    }

    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Missing authorization code");
      server.close();
      process.exit(1);
    }

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenJson = await tokenRes.json();

    if (!tokenRes.ok) {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Token exchange failed. Check the terminal.");
      console.error("Token exchange failed. Status:", tokenRes.status);
      server.close();
      process.exit(1);
    }

    const refreshToken = tokenJson.refresh_token;
    if (!refreshToken) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<h1>No refresh_token returned</h1><p>Check the terminal. Try again with prompt=consent (already set). Ensure you are using the same OAuth client.</p>"
      );
      console.error("\nNo refresh_token in response.");
      console.error("Tips: use prompt=consent (already set), revoke prior access, retry as test user.\n");
      server.close();
      process.exit(1);
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h1>Success</h1><p>You can close this tab. Copy <code>GOOGLE_REFRESH_TOKEN</code> from your terminal into Netlify environment variables.</p>"
    );

    console.log("\n========== SUCCESS ==========\n");
    console.log("Add this value in Netlify → Site configuration → Environment variables:\n");
    console.log("  Key:   GOOGLE_REFRESH_TOKEN");
    console.log("  Value:\n");
    console.log(refreshToken);
    console.log("\nAlso set on Netlify (if not already):");
    console.log("  GOOGLE_CLIENT_ID");
    console.log("  GOOGLE_CLIENT_SECRET");
    console.log("  GOOGLE_CALENDAR_ID   (often: primary)");
    console.log("  BOOKING_TZ=Europe/Budapest\n");
    console.log("This script did NOT save the token to a file.\n");

    server.close();
    process.exit(0);
  } catch (_e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Setup error");
    console.error("Setup error");
    server.close();
    process.exit(1);
  }
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`\nPort ${PORT} is already in use.`);
    console.error("Another oauth setup is probably still running.");
    console.error("Fix: close that terminal, or run:\n");
    console.error(`  lsof -tiTCP:${PORT} -sTCP:LISTEN | xargs kill -9\n`);
    console.error("Then run this script again.\n");
    process.exit(1);
  }
  console.error("Server error:", err && err.message ? err.message : err);
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Local callback listening on ${REDIRECT_URI}\n`);
});
