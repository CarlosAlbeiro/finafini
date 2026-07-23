export type CurrencyCode = 'COP' | 'USD' | 'EUR';

export const formatCurrency = (amount: number | string | undefined | null, currency: CurrencyCode = 'COP'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  
  if (isNaN(num)) return '$ 0';

  switch (currency) {
    case 'COP':
      // Peso Colombiano: sin decimales por defecto
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      }).format(num) + ' COP';

    case 'USD':
      // Dólar Estadounidense
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(num) + ' USD';

    case 'EUR':
      // Euro
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
      }).format(num) + ' EUR';

    default:
      return `$ ${num.toLocaleString()}`;
  }
};

export const currencySymbols: Record<CurrencyCode, string> = {
  COP: '$',
  USD: '$',
  EUR: '€'
};
