type AuthFailure = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusText?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function registrationErrorDetails(error: unknown) {
  const failure = (error && typeof error === "object" ? error : {}) as AuthFailure;
  const code = text(failure.code).toUpperCase();
  const message = text(failure.message);
  const statusText = text(failure.statusText);
  const status = typeof failure.status === "number" ? failure.status : 0;
  return { code, message, status, statusText };
}

export function registrationErrorMessage(error: unknown) {
  const { code, message, status, statusText } = registrationErrorDetails(error);
  const value = `${code} ${message} ${statusText}`.toLowerCase();

  if (
    code === "USER_ALREADY_EXISTS" ||
    code === "EMAIL_EXISTS" ||
    value.includes("already") ||
    value.includes("exist")
  )
    return "An account already uses this email address. Sign in or use account recovery.";

  if (
    status === 429 ||
    code.includes("RATE_LIMIT") ||
    value.includes("rate limit") ||
    value.includes("too many")
  )
    return "Too many registration attempts were made. Wait 10 minutes, then try again with a freshly completed security check.";

  if (code === "FEATURE_NOT_SUPPORTED")
    return "Email registration is not enabled in the account service configuration. Please contact support@enuguproperties.com.";

  if (
    value.includes("origin") ||
    value.includes("callback") ||
    value.includes("redirect") ||
    value.includes("trusted domain")
  )
    return "The confirmation-link address was rejected by the account service. Please contact support@enuguproperties.com.";

  if (code.includes("EMAIL") || value.includes("email"))
    return "Enter a valid email address that you can open to confirm your account.";

  if (code.includes("PASSWORD") || value.includes("password"))
    return "Choose a password containing at least 12 characters.";

  if (
    status >= 500 ||
    code === "INTERNAL_ERROR" ||
    code.startsWith("NETWORK_") ||
    code === "FAILED_TO_CREATE_USER" ||
    code === "FAILED_TO_CREATE_SESSION"
  )
    return "The account service could not save this registration. Please wait a few minutes and try again. If it repeats, contact support@enuguproperties.com.";

  if (code && /^[A-Z0-9_-]{1,80}$/.test(code))
    return `The account service rejected this registration (${code}). Please contact support@enuguproperties.com if it repeats.`;

  return "The account service rejected this registration. Please wait a few minutes and try again, or contact support@enuguproperties.com.";
}
