import { OAuth2Client } from "google-auth-library";

export function getGoogleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || "").trim();
}

export function isGoogleAuthConfigured() {
  return Boolean(getGoogleClientId());
}

export function getGoogleAuthPublicConfig() {
  const clientId = getGoogleClientId();
  return {
    googleConfigured: Boolean(clientId),
    googleClientId: clientId || null,
    frontendUrl: (process.env.FRONTEND_URL || "").trim() || null,
  };
}

export async function verifyGoogleCredential(credential) {
  const clientId = getGoogleClientId();
  if (!clientId) {
    const err = new Error("Google login is not configured on the server.");
    err.code = "SERVER_NOT_CONFIGURED";
    throw err;
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });

  return ticket.getPayload();
}

export function mapGoogleVerifyError(err) {
  if (err.code === "SERVER_NOT_CONFIGURED") {
    return {
      status: 500,
      message: err.message + " Add GOOGLE_CLIENT_ID on Render and redeploy.",
    };
  }

  const msg = String(err.message || "");
  const audienceIssue =
    msg.includes("audience") ||
    msg.includes("recipient") ||
    msg.includes("Wrong number of segments");

  return {
    status: 401,
    message: audienceIssue
      ? "Google sign-in failed. Server Client ID does not match frontend — set the same GOOGLE_CLIENT_ID on Render and VITE_GOOGLE_CLIENT_ID on Vercel."
      : "Google sign-in failed.",
    error: msg,
  };
}
