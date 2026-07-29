import { TDS_SECTIONS, TdsSectionRule } from './taxRules';
import { validatePan } from './validation';

export interface CalculateTdsParams {
  sectionCode: string;
  invoiceAmount: number;
  cumulativeAmountBefore?: number;
  vendorPan: string;
  isIndividualOrHuf?: boolean;
  hasLowerDeductionCert?: boolean;
  lowerDeductionRate?: number;
}

export interface CalculateTdsResult {
  sectionCode: string;
  sectionName: string;
  applicableRate: number; // %
  tdsAmount: number;
  taxableBase: number;
  thresholdExceeded: boolean;
  isPenalized206AA: boolean; // 20% due to non-PAN/invalid PAN
  ruleAppliedNote: string;
}

export function calculateTdsForPayment(params: CalculateTdsParams): CalculateTdsResult {
  const {
    sectionCode,
    invoiceAmount,
    cumulativeAmountBefore = 0,
    vendorPan,
    isIndividualOrHuf = true,
    hasLowerDeductionCert = false,
    lowerDeductionRate = 0,
  } = params;

  const rule: TdsSectionRule | undefined = TDS_SECTIONS[sectionCode];
  const secName = rule ? rule.name : `Section ${sectionCode}`;

  // 1. Validate PAN for Section 206AA (Higher TDS rate of 20% for No-PAN / Invalid PAN)
  const panValidation = validatePan(vendorPan || '');
  const isValidPan = panValidation.valid;

  if (!isValidPan) {
    const rate = 20;
    const tds = Number(((invoiceAmount * rate) / 100).toFixed(2));
    return {
      sectionCode,
      sectionName: secName,
      applicableRate: rate,
      tdsAmount: tds,
      taxableBase: invoiceAmount,
      thresholdExceeded: true,
      isPenalized206AA: true,
      ruleAppliedNote: 'Section 206AA applied: Invalid or Missing PAN incurs mandatory 20% TDS.',
    };
  }

  // 2. Lower Deduction Certificate Check
  if (hasLowerDeductionCert && typeof lowerDeductionRate === 'number') {
    const rate = lowerDeductionRate;
    const tds = Number(((invoiceAmount * rate) / 100).toFixed(2));
    return {
      sectionCode,
      sectionName: secName,
      applicableRate: rate,
      tdsAmount: tds,
      taxableBase: invoiceAmount,
      thresholdExceeded: true,
      isPenalized206AA: false,
      ruleAppliedNote: `Lower Deduction Certificate applied: ${rate}% rate.`,
    };
  }

  if (!rule) {
    // Default fallback rate 10%
    const rate = 10;
    const tds = Number(((invoiceAmount * rate) / 100).toFixed(2));
    return {
      sectionCode,
      sectionName: secName,
      applicableRate: rate,
      tdsAmount: tds,
      taxableBase: invoiceAmount,
      thresholdExceeded: true,
      isPenalized206AA: false,
      ruleAppliedNote: 'Standard 10% TDS rate applied.',
    };
  }

  // 3. Threshold check (Single transaction vs Cumulative annual)
  const cumulativeTotal = cumulativeAmountBefore + invoiceAmount;
  const singleExceeded = invoiceAmount >= rule.thresholdSingle;
  const annualExceeded = cumulativeTotal >= rule.thresholdAnnual;

  if (!singleExceeded && !annualExceeded) {
    return {
      sectionCode,
      sectionName: secName,
      applicableRate: 0,
      tdsAmount: 0,
      taxableBase: invoiceAmount,
      thresholdExceeded: false,
      isPenalized206AA: false,
      ruleAppliedNote: `Exempt: Invoice ₹${invoiceAmount.toLocaleString()} is below single limit (₹${rule.thresholdSingle.toLocaleString()}) and annual limit (₹${rule.thresholdAnnual.toLocaleString()}).`,
    };
  }

  // Determine standard rate based on deductee type
  const baseRate = isIndividualOrHuf ? rule.rateIndividual : rule.rateOthers;
  const tds = Number(((invoiceAmount * baseRate) / 100).toFixed(2));

  let note = `Standard Sec ${sectionCode} rate (${baseRate}%) applied.`;
  if (annualExceeded && !singleExceeded) {
    note += ` Annual aggregate limit ₹${rule.thresholdAnnual.toLocaleString()} exceeded.`;
  }

  return {
    sectionCode,
    sectionName: secName,
    applicableRate: baseRate,
    tdsAmount: tds,
    taxableBase: invoiceAmount,
    thresholdExceeded: true,
    isPenalized206AA: false,
    ruleAppliedNote: note,
  };
}
