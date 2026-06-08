/**
 * User-friendly error messages for common failures.
 * Translates technical errors into plain English with actionable hints.
 */

export interface FriendlyError {
  message: string;
  hint?: string;
  action?: string;
}

export function getFriendlyErrorMessage(error: string | null): FriendlyError {
  if (!error) return { message: '' };

  const errorLower = error.toLowerCase();

  // Authentication errors
  if (errorLower.includes('invalid login credentials')) {
    return {
      message: 'Email or password is incorrect.',
      hint: 'Check your caps lock and try again.',
      action: 'Forgot password? Reset it here.',
    };
  }
  if (errorLower.includes('email rate limit')) {
    return {
      message: 'Too many signup attempts with this email.',
      hint: 'Try signing up with a different email address, or wait 15-30 minutes before trying again.',
      action: 'Use a different email to sign up now',
    };
  }
  if (errorLower.includes('email not confirmed')) {
    return {
      message: 'Your email hasn\'t been verified yet.',
      hint: 'Check your inbox (and spam folder) for a confirmation link.',
      action: 'Didn\'t get the email? Request a new one.',
    };
  }
  if (errorLower.includes('user already registered')) {
    return {
      message: 'That email is already registered.',
      hint: 'Try signing in instead, or use a different email.',
    };
  }
  if (errorLower.includes('password')) {
    return {
      message: 'Password must be at least 6 characters.',
      hint: 'Make it something you\'ll remember.',
    };
  }

  // Booking/Job/Bid errors
  if (errorLower.includes('job is no longer open')) {
    return {
      message: 'This job is no longer available.',
      hint: 'Another carrier may have been accepted. Try posting a new job.',
      action: 'View active jobs',
    };
  }
  if (errorLower.includes('job not found')) {
    return {
      message: 'This job doesn\'t exist anymore.',
      hint: 'It may have been cancelled or completed.',
      action: 'Refresh the page',
    };
  }
  if (errorLower.includes('bid not found')) {
    return {
      message: 'This bid is no longer available.',
      hint: 'It may have been withdrawn or expired.',
    };
  }
  if (errorLower.includes('journey not found')) {
    return {
      message: 'This journey doesn\'t exist anymore.',
      hint: 'It may have been cancelled or completed.',
    };
  }
  if (errorLower.includes('not your journey') || errorLower.includes('this is not your')) {
    return {
      message: 'You don\'t have permission to use this.',
      hint: 'Make sure you\'re logged in as the right person.',
    };
  }
  if (errorLower.includes('only the sender')) {
    return {
      message: 'Only the job poster can make this decision.',
    };
  }
  if (errorLower.includes('not available') || errorLower.includes('no longer')) {
    return {
      message: 'This item is no longer available.',
      hint: 'Refresh the page to see the latest updates.',
      action: 'Refresh page',
    };
  }

  // Payment errors
  if (errorLower.includes('payment failed')) {
    return {
      message: 'Payment failed.',
      hint: 'Check your card details, expiry date, and billing address. Try a different card if available.',
    };
  }
  if (errorLower.includes('stripe') || errorLower.includes('card declined')) {
    return {
      message: 'There was an issue processing your payment.',
      hint: 'Your card may have been declined. Check with your bank or try a different card.',
      action: 'Try again',
    };
  }

  // Network errors
  if (errorLower.includes('network') || errorLower.includes('timeout') || errorLower.includes('econnrefused')) {
    return {
      message: 'Connection issue.',
      hint: 'Check your internet connection and try again.',
    };
  }
  if (errorLower.includes('cannot find') || errorLower.includes('enotfound')) {
    return {
      message: 'Couldn\'t connect to the server.',
      hint: 'Check your internet and try again.',
    };
  }

  // File/photo errors
  if (errorLower.includes('file') || errorLower.includes('upload')) {
    return {
      message: 'File upload failed.',
      hint: 'Try a smaller or different image (JPG/PNG, <5MB).',
    };
  }
  if (errorLower.includes('too large')) {
    return {
      message: 'File is too large.',
      hint: 'Maximum file size is 5MB. Compress your image and try again.',
    };
  }

  // Database errors
  if (errorLower.includes('unique violation')) {
    return {
      message: 'This item already exists.',
      hint: 'Try again with different details.',
    };
  }
  if (errorLower.includes('foreign key violation') || errorLower.includes('violates')) {
    return {
      message: 'Something went wrong with your request.',
      hint: 'Refresh the page and try again.',
    };
  }

  // Default: show original but make it friendlier
  return {
    message: 'Something went wrong.',
    hint: 'Refresh the page and try again. If the problem persists, contact support.',
  };
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
