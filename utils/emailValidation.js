const EMAIL_FORMAT =
  /^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "yopmail.com",
  "throwaway.email",
  "fakeinbox.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
]);

const BLOCKED_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "test.test",
  "localhost",
  "invalid.com",
  "fake.com",
  "email.com",
]);

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function getEmailDomain(email) {
  const parts = normalizeEmail(email).split("@");
  return parts.length === 2 ? parts[1] : "";
}

function validateRegistrationEmail(email) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return { ok: false, email: normalized, message: "L'email est obligatoire." };
  }

  if (!EMAIL_FORMAT.test(normalized)) {
    return {
      ok: false,
      email: normalized,
      message: "Adresse email invalide. Utilisez un email réel (ex: nom@gmail.com).",
    };
  }

  const [localPart, domain] = normalized.split("@");

  if (localPart.length < 2) {
    return {
      ok: false,
      email: normalized,
      message: "Adresse email invalide.",
    };
  }

  if (BLOCKED_DOMAINS.has(domain) || DISPOSABLE_DOMAINS.has(domain)) {
    return {
      ok: false,
      email: normalized,
      message: "Les emails temporaires ou fictifs ne sont pas autorisés. Utilisez une vraie adresse email.",
    };
  }

  const tld = domain.split(".").pop();
  if (!tld || tld.length < 2) {
    return {
      ok: false,
      email: normalized,
      message: "Domaine email invalide.",
    };
  }

  if (/^(test|fake|temp|demo|noreply|no-reply)([._-]|$)/i.test(localPart)) {
    return {
      ok: false,
      email: normalized,
      message: "Cette adresse email semble fictive. Utilisez votre vraie adresse email.",
    };
  }

  return { ok: true, email: normalized, message: null };
}

module.exports = {
  normalizeEmail,
  getEmailDomain,
  validateRegistrationEmail,
};
