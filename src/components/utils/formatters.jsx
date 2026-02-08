// Format currency to Nigerian Naira
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '₦0';
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// Format phone number
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  // Remove non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Add country code if not present
  if (!cleaned.startsWith('234')) {
    return `+234${cleaned}`;
  }
  return `+${cleaned}`;
};

// Format date to readable string
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  });
};

// Format date and time
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Calculate days between dates
export const daysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check if date is past
export const isPastDate = (dateString) => {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Format loan type display name
export const formatLoanType = (loanType) => {
  const types = {
    'urgent_10k': 'Urgent Loan',
    'tier1_personal': 'Tier-1 Personal Loan'
  };
  return types[loanType] || loanType;
};

// Format status for display
export const formatStatus = (status) => {
  if (!status) return '';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};