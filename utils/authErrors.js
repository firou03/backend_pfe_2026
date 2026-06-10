/** Formate une ValidationError Mongoose en message lisible (français) */
function formatValidationError(err) {
  if (!err?.errors) return err?.message || "Données invalides.";

  const messages = Object.values(err.errors).map((e) => {
    const path = e.path || "";
    if (path === "password") {
      return "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.";
    }
    if (path === "email") {
      if (e.kind === "regexp") return "Adresse email invalide.";
      if (e.kind === "required") return "L'email est obligatoire.";
    }
    if (path === "name" && e.kind === "required") return "Le nom est obligatoire.";
    return e.message;
  });

  return [...new Set(messages)].join(" ");
}

function isDuplicateKeyError(err) {
  return err?.code === 11000 || /E11000 duplicate key/.test(String(err?.message));
}

function duplicateKeyMessage(err) {
  const key = String(err?.message || "");
  if (key.includes("email")) return "Un compte existe déjà avec cet email.";
  return "Cette valeur est déjà utilisée.";
}

module.exports = {
  formatValidationError,
  isDuplicateKeyError,
  duplicateKeyMessage,
};
