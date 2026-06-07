export function computePaymentSplit(total, cashPercent) {

  const pct = Number(cashPercent);

  if (!Number.isInteger(pct) || pct < 1 || pct > 99) {

    return null;

  }



  const cashAmount = Math.round(total * pct) / 100;

  const cardAmount = Math.round((total - cashAmount) * 100) / 100;



  return {

    cashPercent: pct,

    cardPercent: 100 - pct,

    cashAmount,

    cardAmount,

  };

}



export function resolvePaymentMethod(requestedMethod, paymentSettings) {

  const method = requestedMethod || (paymentSettings.mode === "stripe" ? "stripe" : "cod");

  const allowed =

    paymentSettings.mode === "stripe" ? ["cod", "stripe", "split"] : ["cod"];



  if (!allowed.includes(method)) {

    return { error: `Payment method "${method}" is not available.` };

  }



  return { method };

}


