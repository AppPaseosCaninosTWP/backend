const defined_prices = {
  '30': 5000,
  '60': 10000,
};

function calculate_payment_amount({ duration, num_pets, num_days }) {
  const base_price = defined_prices[duration];
  if (!base_price) throw new Error("Duración inválida para tarifas");
  return base_price * num_pets * num_days;
}

//

module.exports = {
  calculate_payment_amount,
  defined_prices,
};