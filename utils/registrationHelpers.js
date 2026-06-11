const { assignAndSendVerificationEmail } = require("./emailVerification");

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.verificationToken;
  delete obj.resetPasswordToken;
  return obj;
}

async function sendVerificationAfterRegister(user, res, successStatus = 201) {
  try {
    await assignAndSendVerificationEmail(user);
    return res.status(successStatus).json({
      message: "Compte créé. Vérifiez votre email pour activer votre compte.",
      needsVerification: true,
      user: sanitizeUser(user),
      data: sanitizeUser(user),
    });
  } catch (emailError) {
    console.error("Verification email error:", emailError);
    return res.status(successStatus).json({
      message:
        "Compte créé. L'envoi de l'email a échoué — renvoyez la vérification depuis la page de connexion.",
      needsVerification: true,
      user: sanitizeUser(user),
      data: sanitizeUser(user),
    });
  }
}

async function handleExistingUnverifiedUser(existing, res) {
  try {
    await assignAndSendVerificationEmail(existing);
    return res.status(200).json({
      message:
        "Un compte existe déjà avec cet email mais n'est pas vérifié. Un nouvel email de vérification a été envoyé.",
      needsVerification: true,
    });
  } catch (emailError) {
    console.error("Resend verification on register error:", emailError);
    return res.status(500).json({
      message: "Erreur lors de l'envoi de l'email de vérification. Réessayez plus tard.",
    });
  }
}

module.exports = {
  sanitizeUser,
  sendVerificationAfterRegister,
  handleExistingUnverifiedUser,
};
