/**
 * User-friendly error messages for common failures.
 * Translates technical errors into plain English.
 */

export function getFriendlyErrorMessage(error: string | null): string {
  if (!error) return '';

  const errorLower = error.toLowerCase();

  // Authentication errors
  if (errorLower.includes('invalid login credentials')) {
    return 'Email or password is incorrect. Please try again.';
  }
  if (errorLower.includes('email not confirmed')) {
    return 'Please check your email for a confirmation link. (Or ask support if you missed it.)';
  }
  if (errorLower.includes('user already registered')) {
    return 'That email is already in use. Try signing in instead, or use a different email.';
  }
  if (errorLower.includes('password')) {
    return 'Password must be at least 6 characters.';
  }
  if (errorLower.includes('email')) {
    return 'Please enter a valid email address.';
  }

  // Database errors
  if (errorLower.includes('unique violation')) {
    return 'This item already exists. Please try something different.';
  }
  if (errorLower.includes('foreign key violation')) {
    return 'Something went wrong. Please refresh and try again.';
  }
  if (errorLower.includes('not found')) {
    return 'This item doesn\'t exist or was deleted. Please refresh.';
  }

  // Payment errors
  if (errorLower.includes('payment')) {
    return 'Payment failed. Please check your card details and try again.';
  }
  if (errorLower.includes('stripe')) {
    return 'There was an issue processing your payment. Please try again in a moment.';
  }

  // Network errors
  if (errorLower.includes('network') || errorLower.includes('timeout')) {
    return 'Connection issue. Please check your internet and try again.';
  }
  if (errorLower.includes('cannot find')) {
    return 'Connection issue. Please try again.';
  }

  // File/photo errors
  if (errorLower.includes('file') || errorLower.includes('upload')) {
    return 'File upload failed. Try a smaller image or check your connection.';
  }

  // Default: show original but make it friendlier
  return `Something went wrong: ${error}. Please refresh and try again.`;
}

/**
 * Validation error messages
 */
export const validationMessages = {
  required: 'This field is required.',
  email: 'Please enter a valid email address.',
  password: 'Password must be at least 6 characters.',
  passwordMismatch: 'Passwords don\'t match.',
  phone: 'Please enter a valid phone number.',
  number: 'Please enter a valid number.',
  positiveNumber: 'Must be greater than 0.',
  maxLength: (max: number) => `Maximum ${max} characters.`,
  minLength: (min: number) => `Minimum ${min} characters.`,
};

/**
 * Field-specific validation
 */
export function validateEmail(email: string): string | null {
  if (!email) return validationMessages.required;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return validationMessages.email;
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return validationMessages.required;
  if (password.length < 6) return validationMessages.password;
  return null;
}

export function validateStationSelected(station: string | null): string | null {
  if (!station) return 'Please select a station.';
  return null;
}
