/**
 * Validation Helpers for Indian Statutory Compliance
 */

// GSTIN Regex: 2 digits state code, 10 char PAN, 1 entity char, 1 Z, 1 check digit
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// PAN Regex: 5 letters, 4 numbers, 1 letter
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// TAN Regex: 4 letters, 5 numbers, 1 letter
export const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;

// Pincode Regex: 6 digits
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

// UAN Regex: 12 digits
export const UAN_REGEX = /^[0-9]{12}$/;

// ESI Code: 17 digits
export const ESI_CODE_REGEX = /^[0-9]{17}$/;

// State Code Mapping
export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
};

export function validateGstin(gstin: string): { valid: boolean; message?: string; stateCode?: string; stateName?: string } {
  if (!gstin) return { valid: false, message: 'GSTIN is required' };
  const clean = gstin.trim().toUpperCase();
  if (!GSTIN_REGEX.test(clean)) {
    return { valid: false, message: 'Invalid GSTIN format (e.g., 27AAAAA0000A1Z5)' };
  }
  const stateCode = clean.substring(0, 2);
  const stateName = STATE_CODES[stateCode];
  if (!stateName) {
    return { valid: false, message: `Invalid state code ${stateCode} in GSTIN` };
  }
  return { valid: true, stateCode, stateName };
}

export function validatePan(pan: string): { valid: boolean; message?: string } {
  if (!pan) return { valid: false, message: 'PAN is required' };
  const clean = pan.trim().toUpperCase();
  if (!PAN_REGEX.test(clean)) {
    return { valid: false, message: 'Invalid PAN format (e.g., ABCDE1234F)' };
  }
  return { valid: true };
}

export function validateTan(tan: string): { valid: boolean; message?: string } {
  if (!tan) return { valid: false, message: 'TAN is required' };
  const clean = tan.trim().toUpperCase();
  if (!TAN_REGEX.test(clean)) {
    return { valid: false, message: 'Invalid TAN format (e.g., MUMB12345A)' };
  }
  return { valid: true };
}

export function validateUan(uan: string): { valid: boolean; message?: string } {
  if (!uan) return { valid: false, message: 'UAN is required' };
  const clean = uan.trim();
  if (!UAN_REGEX.test(clean)) {
    return { valid: false, message: 'UAN must be 12 digits' };
  }
  return { valid: true };
}

export function getStateCodeFromGstin(gstin?: string): string {
  if (!gstin || gstin.length < 2) return '27'; // default MH
  return gstin.substring(0, 2);
}

export function getStateNameFromCode(code: string): string {
  return STATE_CODES[code] || 'Maharashtra';
}
