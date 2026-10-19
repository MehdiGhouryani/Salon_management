/**
  * Iranian Mobile Phone Normalization & Validation Utility
  * Canonicalizes all common Iranian phone input formats into strict E.164 and National formats.
  */

const PERSIAN_ARABIC_DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export interface NormalizedPhoneResult {
  isValid: boolean;
  e164: string;
  national: string;
  error?: string;
}

/**
  * Converts Persian/Arabic digits to ASCII digits and removes formatting artifacts
  */
export function cleanPhoneInput(input: string): string {
  if (!input) return '';
  let cleaned = '';
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (PERSIAN_ARABIC_DIGIT_MAP[char] !== undefined) {
      cleaned += PERSIAN_ARABIC_DIGIT_MAP[char];
    } else if (/[0-9+]/.test(char)) {
      cleaned += char;
    }
  }
  return cleaned;
}

/**
  * Validates and normalizes Iranian mobile numbers
  * Supported input formats:
  *   09123456789
  *   +989123456789
  *   00989123456789
  *   9123456789
  *   ۰۹۱۲۳۴۵۶۷۸۹
  * 
  * Returns:
  *   e164: +989123456789
  *   national: 09123456789
  */
export function normalizeIranianPhone(rawInput: string): NormalizedPhoneResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      isValid: false,
      e164: '',
      national: '',
      error: 'شماره موبایل وارد نشده است.',
    };
  }

  const cleaned = cleanPhoneInput(rawInput.trim());

  let digitsOnly = cleaned;
  if (digitsOnly.startsWith('+')) {
    digitsOnly = digitsOnly.substring(1);
  }

  let mobileWithoutPrefix = '';

  if (digitsOnly.startsWith('00989') && digitsOnly.length === 14) {
    mobileWithoutPrefix = digitsOnly.substring(4); // 9...
  } else if (digitsOnly.startsWith('989') && digitsOnly.length === 12) {
    mobileWithoutPrefix = digitsOnly.substring(2); // 9...
  } else if (digitsOnly.startsWith('09') && digitsOnly.length === 11) {
    mobileWithoutPrefix = digitsOnly.substring(1); // 9...
  } else if (digitsOnly.startsWith('9') && digitsOnly.length === 10) {
    mobileWithoutPrefix = digitsOnly; // 9...
  } else {
    return {
      isValid: false,
      e164: '',
      national: '',
      error: 'فرمت شماره موبایل نامعتبر است. نمونه صحیح: ۰۹۱۲۳۴۵۶۷۸۹',
    };
  }

  // Iranian mobile numbers must start with 9 and have exactly 10 digits (9xx xxx xxxx)
  // Second digit must be valid operator prefix: 0, 1, 2, 3, 4, 9, etc.
  if (!/^9[0-9]{9}$/.test(mobileWithoutPrefix)) {
    return {
      isValid: false,
      e164: '',
      national: '',
      error: 'شماره وارد شده یک شماره موبایل معتبر در شبکه مخابراتی ایران نیست.',
    };
  }

  return {
    isValid: true,
    e164: `+98${mobileWithoutPrefix}`,
    national: `0${mobileWithoutPrefix}`,
  };
}
