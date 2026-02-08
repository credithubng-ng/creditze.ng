// Loan Status Constants
export const LOAN_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  DISBURSED: 'disbursed',
  REPAID: 'repaid',
  OVERDUE: 'overdue',
  DEFAULTED: 'defaulted',
  REJECTED: 'rejected'
};

// Loan Type Constants
export const LOAN_TYPES = {
  URGENT_10K: 'urgent_10k',
  TIER1_PERSONAL: 'tier1_personal'
};

// KYC Status Constants
export const KYC_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

// Dispute Status Constants
export const DISPUTE_STATUS = {
  OPEN: 'open',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated'
};

// Collection Status Constants
export const COLLECTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  REVERSED: 'reversed'
};

// Status Badge Styles
export const STATUS_BADGE_STYLES = {
  [LOAN_STATUS.PENDING]: 'bg-yellow-100 text-yellow-700',
  [LOAN_STATUS.UNDER_REVIEW]: 'bg-blue-100 text-blue-700',
  [LOAN_STATUS.APPROVED]: 'bg-blue-100 text-blue-700',
  [LOAN_STATUS.DISBURSED]: 'bg-emerald-100 text-emerald-700',
  [LOAN_STATUS.REPAID]: 'bg-green-100 text-green-700',
  [LOAN_STATUS.OVERDUE]: 'bg-orange-100 text-orange-700',
  [LOAN_STATUS.DEFAULTED]: 'bg-red-100 text-red-700',
  [LOAN_STATUS.REJECTED]: 'bg-gray-100 text-gray-700'
};

// API Response Messages
export const API_MESSAGES = {
  UNAUTHORIZED: 'You must be logged in to perform this action',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later',
  VALIDATION_ERROR: 'Please check your input and try again'
};

// Default Configuration Values
export const DEFAULT_CONFIG = {
  URGENT_LOAN_AMOUNT: 10000,
  URGENT_LOAN_INTEREST: 15,
  URGENT_LOAN_TENURE: 30,
  CREDIT_SEARCH_FEE: 850,
  MIN_AUTO_APPROVAL_SCORE: 60
};