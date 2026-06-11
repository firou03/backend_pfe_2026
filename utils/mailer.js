const nodemailer = require("nodemailer");

/** Envoi des emails de vérification — Gmail par défaut (vraies boîtes mail) */
function createVerificationTransporter() {
  const useMailtrap =
    process.env.USE_MAILTRAP_FOR_VERIFICATION === "true" &&
    process.env.MAILTRAP_USER &&
    process.env.MAILTRAP_PASS;

  if (useMailtrap) {
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io",
      port: Number(process.env.MAILTRAP_PORT || 2525),
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS?.replace(/\s/g, ""),
    },
  });
}

function getVerificationFromAddress() {
  if (
    process.env.USE_MAILTRAP_FOR_VERIFICATION === "true" &&
    process.env.MAILTRAP_USER
  ) {
    return '"TransportTN" <no-reply@transporttn.com>';
  }
  return process.env.EMAIL_USER;
}

module.exports = { createVerificationTransporter, getVerificationFromAddress };
