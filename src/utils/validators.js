const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value).trim())
}

/**
 * Foundation-level password strength check. This intentionally does not
 * try to be a full policy engine — just enough to stop obviously weak
 * master passwords, since this password also protects the encryption keys.
 */
export function validatePassword(value) {
  if (!value || value.length < 10) {
    return 'Use at least 10 characters — this password also protects your encryption keys.'
  }
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value)) {
    return 'Mix uppercase and lowercase letters.'
  }
  if (!/[0-9]/.test(value)) {
    return 'Include at least one number.'
  }
  return null
}

export function passwordsMatch(password, confirmation) {
  return password.length > 0 && password === confirmation
}
