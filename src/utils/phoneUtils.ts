export const formatPhoneNumber = (value: string, countryCode: string): string => {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '');
  
  // Se for Brasil (+55), aplica máscara específica
  if (countryCode === '+55') {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }
  
  // Se for Portugal (+351), aplica máscara comum (9 dígitos: 9xx xxx xxx)
  if (countryCode === '+351') {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  }

  // Para outros países, apenas limita caracteres ou deixa limpo
  return digits.slice(0, 15);
};

export const cleanPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '');
};
