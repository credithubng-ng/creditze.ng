// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone number validation (Nigerian format)
export const isValidPhone = (phone) => {
  // Remove non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Should be 10 or 11 digits (without country code) or 13 digits (with 234)
  return cleaned.length === 10 || cleaned.length === 11 || (cleaned.length === 13 && cleaned.startsWith('234'));
};

// BVN validation (11 digits)
export const isValidBVN = (bvn) => {
  const cleaned = bvn.replace(/\D/g, '');
  return cleaned.length === 11;
};

// NIN validation (11 digits)
export const isValidNIN = (nin) => {
  const cleaned = nin.replace(/\D/g, '');
  return cleaned.length === 11;
};

// Account number validation (10 digits - Nigerian banks)
export const isValidAccountNumber = (accountNumber) => {
  const cleaned = accountNumber.replace(/\D/g, '');
  return cleaned.length === 10;
};

// Amount validation
export const isValidAmount = (amount, min = 0, max = Infinity) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > min && num <= max;
};

// Required field validation
export const isRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

// Loan amount validation based on type
export const validateLoanAmount = (amount, loanType, creditLimit) => {
  const num = parseFloat(amount);
  
  if (isNaN(num) || num <= 0) {
    return 'Please enter a valid amount';
  }
  
  if (loanType === 'urgent_10k') {
    const urgent50kLimit = Math.min(Math.max(creditLimit || 50000, 50000), 50000);
    if (num > urgent50kLimit) {
      return `Amount cannot exceed the Urgent ₦50,000 limit`;
    }
    if (num < 1000) {
      return 'Minimum loan amount is ₦1,000';
    }
  } else if (loanType === 'tier1_personal') {
    if (num < 50000) {
      return 'Minimum Tier-1 loan amount is ₦50,000';
    }
    if (num > 5000000) {
      return 'Maximum Tier-1 loan amount is ₦5,000,000';
    }
  }
  
  return null;
};
