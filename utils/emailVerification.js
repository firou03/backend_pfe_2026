const crypto = require("crypto");
const { createVerificationTransporter, getVerificationFromAddress } = require("./mailer");

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function assignAndSendVerificationEmail(user) {
  const token = generateVerificationToken();
  user.verificationToken = token;
  user.verificationTokenExpires = Date.now() + VERIFICATION_EXPIRY_MS;
  user.isVerified = false;
  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const verifyUrl = `${frontendUrl}/auth/verify/${token}`;

  const transporter = createVerificationTransporter();
  await transporter.sendMail({
    from: getVerificationFromAddress(),
    to: user.email,
    subject: "Vérifiez votre adresse email — TransportTN",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #333;">Bonjour ${user.name || "utilisateur"},</h2>
        <p>Merci de vous être inscrit sur TransportTN. Cliquez sur le bouton ci-dessous pour activer votre compte :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Vérifier mon email</a>
        </div>
        <p>Ce lien expirera dans 24 heures.</p>
        <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
      </div>
    `,
  });

  return token;
}

module.exports = {
  VERIFICATION_EXPIRY_MS,
  generateVerificationToken,
  assignAndSendVerificationEmail,
};
