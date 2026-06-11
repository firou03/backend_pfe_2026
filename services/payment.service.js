function calculatePrice(weight) {
  const numericWeight = Number(weight) || 0;
  return numericWeight <= 10 ? 7 : 7 + (numericWeight - 10);
}

function getBillableWeight(weight) {
  return parseFloat(weight) || 0;
}

function createTransactionId() {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function enrichWithPrice(request) {
  const plain = request?.toObject ? request.toObject() : { ...request };
  plain.price = calculatePrice(plain.weight || 0);
  return plain;
}

module.exports = {
  calculatePrice,
  getBillableWeight,
  createTransactionId,
  enrichWithPrice,
};
