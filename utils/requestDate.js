const TransportRequest = require("../models/transportRequest.model");
const {
  TRANSPORT_REQUEST_STATUS,
  LEGACY_ACCEPTED_STATUS,
} = require("../constants/transportRequestStatus");

const EXPIRABLE_STATUSES = [
  TRANSPORT_REQUEST_STATUS.PENDING,
  TRANSPORT_REQUEST_STATUS.ACCEPTED_BY_TRANSPORTER,
  TRANSPORT_REQUEST_STATUS.CONFIRMED,
  LEGACY_ACCEPTED_STATUS,
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
  await TransportRequest.updateMany(
    {
      status: { $in: EXPIRABLE_STATUSES },
      date: { $lt: today },
    },
    { status: TRANSPORT_REQUEST_STATUS.EXPIRED }
  );
}

module.exports = {
  startOfToday,
  isPastRequestDate,
  expirePastRequests,
  expirePastPendingRequests: expirePastRequests,
};
