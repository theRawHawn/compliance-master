/**
 * India Tax Rules Engine Configuration (2025-26 & 2026-27)
 */

export interface TdsSectionRule {
  code: string;
  name: string;
  rateIndividual: number; // %
  rateOthers: number; // %
  thresholdSingle: number; // Single transaction threshold
  thresholdAnnual: number; // Annual aggregate threshold
}

export const TDS_SECTIONS: Record<string, TdsSectionRule> = {
  '194C': {
    code: '194C',
    name: 'Payments to Contractors / Sub-contractors',
    rateIndividual: 1,
    rateOthers: 2,
    thresholdSingle: 50000,
    thresholdAnnual: 150000,
  },
  '194J(a)': {
    code: '194J(a)',
    name: 'Fees for Technical Services / Call Centre / Royalty for Films',
    rateIndividual: 2,
    rateOthers: 2,
    thresholdSingle: 50000,
    thresholdAnnual: 50000,
  },
  '194J(b)': {
    code: '194J(b)',
    name: 'Fees for Professional Services / Director Fees / Non-Compete',
    rateIndividual: 10,
    rateOthers: 10,
    thresholdSingle: 50000,
    thresholdAnnual: 50000,
  },
  '194J': {
    code: '194J',
    name: 'Fees for Professional or Technical Services (General)',
    rateIndividual: 10,
    rateOthers: 10,
    thresholdSingle: 50000,
    thresholdAnnual: 50000,
  },
  '194H': {
    code: '194H',
    name: 'Commission or Brokerage (Reduced 2% rate)',
    rateIndividual: 2,
    rateOthers: 2,
    thresholdSingle: 50000,
    thresholdAnnual: 50000,
  },
  '194I(a)': {
    code: '194I(a)',
    name: 'Rent for Plant & Machinery / Equipment',
    rateIndividual: 2,
    rateOthers: 2,
    thresholdSingle: 300000,
    thresholdAnnual: 300000,
  },
  '194I(b)': {
    code: '194I(b)',
    name: 'Rent for Land / Building / Furniture & Fitting',
    rateIndividual: 10,
    rateOthers: 10,
    thresholdSingle: 300000,
    thresholdAnnual: 300000,
  },
  '194I': {
    code: '194I',
    name: 'Rent for Land, Building or Furniture (General)',
    rateIndividual: 10,
    rateOthers: 10,
    thresholdSingle: 300000,
    thresholdAnnual: 300000,
  },
  '194IB': {
    code: '194IB',
    name: 'Payment of Rent by Individual or HUF not covered under Audit',
    rateIndividual: 2,
    rateOthers: 2,
    thresholdSingle: 50000,
    thresholdAnnual: 600000,
  },
  '194M': {
    code: '194M',
    name: 'Payments for Contract / Professional Fees by Individual/HUF > 50L',
    rateIndividual: 2,
    rateOthers: 2,
    thresholdSingle: 5000000,
    thresholdAnnual: 5000000,
  },
  '194Q': {
    code: '194Q',
    name: 'Deduction of Tax on Purchase of Goods (> 50 Lakhs)',
    rateIndividual: 0.1,
    rateOthers: 0.1,
    thresholdSingle: 5000000,
    thresholdAnnual: 5000000,
  },
  '194R': {
    code: '194R',
    name: 'Benefit or Perquisite in respect of Business or Profession',
    rateIndividual: 10,
    rateOthers: 10,
    thresholdSingle: 50000,
    thresholdAnnual: 50000,
  },
  '194O': {
    code: '194O',
    name: 'Payment by E-Commerce Operator to Participant (0.1% Rate)',
    rateIndividual: 0.1,
    rateOthers: 0.1,
    thresholdSingle: 500000,
    thresholdAnnual: 500000,
  },
  '194A': {
    code: '194A',
    name: 'Interest other than Interest on Securities',
    rateIndividual: 10,
    rateOthers: 10,
    thresholdSingle: 50000,
    thresholdAnnual: 50000,
  },
};

export const PF_RULES = {
  employeeRate: 12, // 12% of basic+DA
  employerRate: 12, // 12% total
  epsRate: 8.33, // 8.33% goes to Pension Fund
  epfEmployerRate: 3.67, // 12 - 8.33 = 3.67%
  wageCeiling: 15000, // Maximum wage limit for mandatory EPS (₹15,000)
  maxEpsContribution: 1250, // 8.33% of 15000
  edliRate: 0.5, // 0.5%
  adminRate: 0.5, // 0.5% (Min ₹500)
};

export const ESI_RULES = {
  employeeRate: 0.75, // 0.75%
  employerRate: 3.25, // 3.25%
  grossWageCeiling: 21000, // Eligible if monthly gross <= 21000
};

export interface PtSlab {
  minWage: number;
  maxWage: number;
  taxAmount: number; // Monthly tax
}

export const PROFESSIONAL_TAX_SLABS: Record<string, PtSlab[]> = {
  Maharashtra: [
    { minWage: 0, maxWage: 7500, taxAmount: 0 },
    { minWage: 7501, maxWage: 10000, taxAmount: 175 },
    { minWage: 10001, maxWage: 9999999, taxAmount: 200 }, // ₹300 in Feb
  ],
  Karnataka: [
    { minWage: 0, maxWage: 24999, taxAmount: 0 },
    { minWage: 25000, maxWage: 9999999, taxAmount: 200 },
  ],
  Gujarat: [
    { minWage: 0, maxWage: 5999, taxAmount: 0 },
    { minWage: 6000, maxWage: 8999, taxAmount: 80 },
    { minWage: 9000, maxWage: 11999, taxAmount: 150 },
    { minWage: 12000, maxWage: 9999999, taxAmount: 200 },
  ],
  'West Bengal': [
    { minWage: 0, maxWage: 10000, taxAmount: 0 },
    { minWage: 10001, maxWage: 15000, taxAmount: 110 },
    { minWage: 15001, maxWage: 25000, taxAmount: 130 },
    { minWage: 25001, maxWage: 40000, taxAmount: 150 },
    { minWage: 40001, maxWage: 9999999, taxAmount: 200 },
  ],
  'Tamil Nadu': [
    { minWage: 0, maxWage: 21000, taxAmount: 0 },
    { minWage: 21001, maxWage: 30000, taxAmount: 100 },
    { minWage: 30001, maxWage: 45000, taxAmount: 235 },
    { minWage: 45001, maxWage: 60000, taxAmount: 510 },
    { minWage: 60001, maxWage: 75000, taxAmount: 760 },
    { minWage: 75001, maxWage: 9999999, taxAmount: 1095 },
  ],
  Telangana: [
    { minWage: 0, maxWage: 15000, taxAmount: 0 },
    { minWage: 15001, maxWage: 20000, taxAmount: 150 },
    { minWage: 20001, maxWage: 9999999, taxAmount: 200 },
  ],
};

export function calculatePt(grossSalary: number, state: string, gender: 'M' | 'F' | 'O' = 'M', month: number = 1): number {
  const slabs = PROFESSIONAL_TAX_SLABS[state] || PROFESSIONAL_TAX_SLABS['Maharashtra'];
  // Women in MH exempted below ₹10,000
  if (state === 'Maharashtra' && gender === 'F' && grossSalary <= 10000) {
    return 0;
  }
  for (const slab of slabs) {
    if (grossSalary >= slab.minWage && grossSalary <= slab.maxWage) {
      let tax = slab.taxAmount;
      // In MH, February PT is ₹300 for > ₹10,000 bracket
      if (state === 'Maharashtra' && month === 2 && tax === 200) {
        tax = 300;
      }
      return tax;
    }
  }
  return 0;
}
