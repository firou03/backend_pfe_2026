const TransportRequest = require("../models/transportRequest.model");
const {
  TRANSPORT_REQUEST_STATUS,
  LEGACY_ACCEPTED_STATUS,
} = require("../constants/transportRequestStatus");

/** Ne pas expirer les demandes en attente de confirmation client */
const DATE_EXPIRABLE_STATUSES = [
  TRANSPORT_REQUEST_STATUS.PENDING,
  TRANSPORT_REQUEST_STATUS.CONFIRMED,
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isPastRequestDate(date) {
  if (!date) return true;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < startOfToday();
}

async function expirePastRequests() {
  const today = startOfToday();
  const now = new Date();

  await TransportRequest.updateMany(
    {
      status: { $in: DATE_EXPIRABLE_STATUSES },
      date: { $lt: today },
    },
    { status: TRANSPORT_REQUEST_STATUS.EXPIRED }
  );

  await TransportRequest.updateMany(
    {
      status: {
        $in: [
          TRANSPORT_REQUEST_STATUS.ACCEPTED_BY_TRANSPORTER,
          LEGACY_ACCEPTED_STATUS,
        ],
      },
      expiresAt: { $ne: null, $lt: now },
    },
    {
      status: TRANSPORT_REQUEST_STATUS.CANCELLED,
      cancelledAt: now,
      transporteur: null,
    }
  );
}

module.exports = {
  startOfToday,
  isPastRequestDate,
  expirePastRequests,
  expirePastPendingRequests: expirePastRequests,
};
