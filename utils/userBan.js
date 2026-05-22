/** Clear expired ban and persist if needed */
async function clearExpiredBanIfNeeded(user) {
  if (!user?.isBanned) return false;
  if (!user.bannedUntil || new Date() <= user.bannedUntil) return false;

  user.isBanned = false;
  user.bannedAt = null;
  user.bannedUntil = null;
  user.bannedBy = null;
  await user.save();
  return true;
}

function isUserBanned(user) {
  if (!user?.isBanned) return false;
  if (user.bannedUntil && new Date() > user.bannedUntil) return false;
  return true;
}

function banMessage(user) {
  if (!isUserBanned(user)) return null;
  const until = user.bannedUntil
    ? new Date(user.bannedUntil).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "une durée indéterminée";
  return `Votre compte est suspendu jusqu'au ${until}.`;
}

module.exports = {
  clearExpiredBanIfNeeded,
  isUserBanned,
  banMessage,
};
