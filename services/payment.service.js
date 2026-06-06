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

module.exports = {
  calculatePrice,
  getBillableWeight,
  createTransactionId,
};
