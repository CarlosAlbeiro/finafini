/**
 * Utilidades de matemática financiera para el cálculo de préstamos con Tasa Efectiva Anual (E.A.)
 */

export interface LoanFinancials {
  principal: number;
  monthlyRate: number;
  monthlyRatePercentage: number;
  installmentAmount: number;
  totalPayable: number;
  totalInterest: number;
}

export function calculateFinancials(
  principalInput: number | string,
  interestRateEAInput: number | string,
  installmentsCountInput: number | string
): LoanFinancials {
  const P = Math.max(0, parseFloat(String(principalInput)) || 0);
  const ea = Math.max(0, parseFloat(String(interestRateEAInput)) || 0);
  const n = Math.max(1, parseInt(String(installmentsCountInput), 10) || 1);

  if (P === 0 || n === 0) {
    return {
      principal: 0,
      monthlyRate: 0,
      monthlyRatePercentage: 0,
      installmentAmount: 0,
      totalPayable: 0,
      totalInterest: 0
    };
  }

  if (ea === 0) {
    const installment = P / n;
    return {
      principal: P,
      monthlyRate: 0,
      monthlyRatePercentage: 0,
      installmentAmount: Math.round(installment * 100) / 100,
      totalPayable: P,
      totalInterest: 0
    };
  }

  // Tasa Efectiva Mensual i = (1 + EA/100)^(1/12) - 1
  const i = Math.pow(1 + ea / 100, 1 / 12) - 1;

  // Cuota mensual fija PMT = P * [ i(1+i)^n / ((1+i)^n - 1) ]
  const pow = Math.pow(1 + i, n);
  const installmentAmount = P * ((i * pow) / (pow - 1));
  const totalPayable = installmentAmount * n;
  const totalInterest = totalPayable - P;

  return {
    principal: P,
    monthlyRate: i,
    monthlyRatePercentage: Math.round(i * 100 * 1000) / 1000,
    installmentAmount: Math.round(installmentAmount * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100
  };
}
