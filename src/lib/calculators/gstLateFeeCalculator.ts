/**
 * Statutory GST Late Fees, Interest & Penalty Calculator Engine
 * Compliant with CGST Act Section 47 (Late Fees) and Section 50(1) (Interest)
 */

import { Company, SalesInvoice, PurchaseInvoice } from '../../types';

export type TurnoverSlab = 'UNDER_1.5CR' | '1.5CR_TO_5CR' | 'ABOVE_5CR';

export interface InvoiceDelayNotice {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  taxableValue: number;
  totalTax: number;
  daysDelayedFromInvoice: number;
  estimatedInterestShare: number;
  statusNotice: string;
}

export interface GstLateFeeInterestResult {
  monthYear: string;
  gstr1DueDate: string;
  gstr3bDueDate: string;
  actualFilingDate: string;
  daysDelayedGstr1: number;
  daysDelayedGstr3b: number;
  isNilReturn: boolean;
  outwardTax: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };
  eligibleItc: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };
  netCashLiability: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };
  gstr1LateFee: {
    cgst: number;
    sgst: number;
    total: number;
    uncappedTotal: number;
    isCapped: boolean;
    capLimit: number;
  };
  gstr3bLateFee: {
    cgst: number;
    sgst: number;
    total: number;
    uncappedTotal: number;
    isCapped: boolean;
    capLimit: number;
  };
  interestSection50: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
    ratePercent: number;
  };
  invoiceDelayNotices: InvoiceDelayNotice[];
  totalPenaltiesAndInterest: number;
  grandTotalCashPayable: number;
  statutoryNotes: string[];
}

/**
 * Rule 88A cross-utilization order for ITC set-off against output tax liability:
 * IGST credit must be fully exhausted first — against IGST liability, then CGST, then SGST —
 * before any CGST or SGST credit is utilized. CGST credit may only additionally offset IGST
 * liability (never SGST), and SGST credit may only additionally offset IGST liability (never
 * CGST). Cess credit is ring-fenced and only offsets Cess liability.
 */
export function computeItcSetoff(
  outward: { igst: number; cgst: number; sgst: number; cess: number },
  itc: { igst: number; cgst: number; sgst: number; cess: number }
): { igst: number; cgst: number; sgst: number; cess: number } {
  const setoffIgstAgainstIgst = Math.min(itc.igst, outward.igst);
  let remItcIgst = itc.igst - setoffIgstAgainstIgst;
  let remOutIgst = outward.igst - setoffIgstAgainstIgst;

  const setoffIgstAgainstCgst = Math.min(remItcIgst, outward.cgst);
  remItcIgst -= setoffIgstAgainstCgst;
  let remOutCgst = outward.cgst - setoffIgstAgainstCgst;

  const setoffIgstAgainstSgst = Math.min(remItcIgst, outward.sgst);
  remItcIgst -= setoffIgstAgainstSgst;
  let remOutSgst = outward.sgst - setoffIgstAgainstSgst;

  remOutCgst = Math.max(0, remOutCgst - Math.min(itc.cgst, remOutCgst));
  remOutSgst = Math.max(0, remOutSgst - Math.min(itc.sgst, remOutSgst));
  const remOutCess = Math.max(0, outward.cess - Math.min(itc.cess, outward.cess));

  return { igst: remOutIgst, cgst: remOutCgst, sgst: remOutSgst, cess: remOutCess };
}

// QRMP GSTR-3B due date depends on state category (Notification No. 82/2020-CT): Category X
// states/UTs file by the 22nd, Category Y by the 24th, of the month following the quarter.
const QRMP_CATEGORY_X_STATE_CODES = new Set([
  '22', // Chhattisgarh
  '23', // Madhya Pradesh
  '24', // Gujarat
  '25', '26', // Daman & Diu / Dadra & Nagar Haveli and Daman & Diu
  '27', // Maharashtra
  '29', // Karnataka
  '30', // Goa
  '31', // Lakshadweep
  '32', // Kerala
  '33', // Tamil Nadu
  '34', // Puducherry
  '35', // Andaman & Nicobar Islands
  '36', // Telangana
  '37', // Andhra Pradesh
]);

function quarterFilingMonth(year: number, month: number): { filingYear: number; filingMonth: number } {
  // month is 1-based; a QRMP quarter is Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec, and the return for
  // the whole quarter is due in the month immediately after it ends.
  const quarterEndMonth = Math.ceil(month / 3) * 3; // 3, 6, 9, or 12
  let filingMonth = quarterEndMonth + 1;
  let filingYear = year;
  if (filingMonth > 12) {
    filingMonth = 1;
    filingYear += 1;
  }
  return { filingYear, filingMonth };
}

/**
 * Calculates official GST due dates for GSTR-1 and GSTR-3B for a month/year (YYYY-MM).
 * Monthly filers: GSTR-1 due the 11th, GSTR-3B due the 20th, of the following month.
 * QRMP filers: GSTR-1 due the 13th of the month after the quarter; GSTR-3B due the 22nd
 * (Category X states) or 24th (Category Y states) of the month after the quarter.
 */
export function getGstDueDates(monthYear: string, gstFilingFrequency: 'MONTHLY' | 'QRMP' = 'MONTHLY', stateCode = '') {
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    return { gstr1DueDate: `${y}-${m}-11`, gstr3bDueDate: `${y}-${m}-20` };
  }

  const [yearStr, monthStr] = monthYear.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-based month

  if (gstFilingFrequency === 'QRMP') {
    const { filingYear, filingMonth } = quarterFilingMonth(year, month);
    const filingMStr = String(filingMonth).padStart(2, '0');
    const gstr3bDay = QRMP_CATEGORY_X_STATE_CODES.has(stateCode) ? '22' : '24';
    return {
      gstr1DueDate: `${filingYear}-${filingMStr}-13`,
      gstr3bDueDate: `${filingYear}-${filingMStr}-${gstr3bDay}`,
    };
  }

  // Next month calculation
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const nextMStr = nextMonth < 10 ? `0${nextMonth}` : `${nextMonth}`;
  const gstr1DueDate = `${nextYear}-${nextMStr}-11`;
  const gstr3bDueDate = `${nextYear}-${nextMStr}-20`;

  return { gstr1DueDate, gstr3bDueDate };
}

/**
 * Computes difference in days between two ISO YYYY-MM-DD date strings
 */
export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - start.getTime();
    if (isNaN(diffTime)) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Main GST Late Fee & Interest Engine
 */
export function previousMonthYear(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function calculateGstLateFeeAndInterest(
  company: Company,
  sales: SalesInvoice[],
  purchases: PurchaseInvoice[],
  monthYear: string = previousMonthYear(),
  actualFilingDate: string = todayIso(),
  turnoverSlab: TurnoverSlab = '1.5CR_TO_5CR'
): GstLateFeeInterestResult {
  const { gstr1DueDate, gstr3bDueDate } = getGstDueDates(monthYear, company.gstFilingFrequency || 'MONTHLY', company.stateCode);

  // Filter to the actual return period: the caller may reasonably pass the company's entire
  // invoice history rather than pre-filtering it, and summing every invoice ever recorded as if
  // it belonged to a single month's return would overstate outward tax, ITC, late fees, and
  // interest by however many extra months of data got included.
  const periodSales = sales.filter((s) => !s.monthYear || s.monthYear === monthYear);
  const periodPurchases = purchases.filter((p) => !p.monthYear || p.monthYear === monthYear);

  // Compute Days Delayed
  const daysDelayedGstr1 = calculateDaysBetween(gstr1DueDate, actualFilingDate);
  const daysDelayedGstr3b = calculateDaysBetween(gstr3bDueDate, actualFilingDate);

  // Outward Tax Summary
  let outIgst = 0, outCgst = 0, outSgst = 0, outCess = 0;
  periodSales.forEach((s) => {
    outIgst += s.igst;
    outCgst += s.cgst;
    outSgst += s.sgst;
    outCess += s.cess || 0;
  });
  const totalOutwardTax = outIgst + outCgst + outSgst + outCess;

  // ITC Summary
  let itcIgst = 0, itcCgst = 0, itcSgst = 0, itcCess = 0;
  periodPurchases.forEach((p) => {
    if (p.itcEligible === 'Y') {
      itcIgst += p.igst;
      itcCgst += p.cgst;
      itcSgst += p.sgst;
      itcCess += p.cess || 0;
    }
  });

  // Net Cash Liability after Rule 88A cross-utilization of ITC (IGST credit first against IGST,
  // then CGST, then SGST; CGST credit only additionally against IGST; SGST credit only
  // additionally against IGST) — not simple independent per-head netting, which would overstate
  // liability (and therefore interest) whenever IGST credit could offset CGST/SGST output tax.
  const netLiability = computeItcSetoff(
    { igst: outIgst, cgst: outCgst, sgst: outSgst, cess: outCess },
    { igst: itcIgst, cgst: itcCgst, sgst: itcSgst, cess: itcCess }
  );
  const netIgst = netLiability.igst;
  const netCgst = netLiability.cgst;
  const netSgst = netLiability.sgst;
  const netCess = netLiability.cess;
  const netTotalCash = netIgst + netCgst + netSgst + netCess;

  const isNilReturn = totalOutwardTax === 0;

  // -------------------------------------------------------------
  // 1. CGST Act Section 47 Late Fee Calculation
  // Daily rate: ₹50/day (₹25 CGST + ₹25 SGST) or ₹20/day for Nil return
  // -------------------------------------------------------------
  const dailyFeeRatePerTax = isNilReturn ? 10 : 25; // per tax head (CGST & SGST)
  const dailyFeeTotal = dailyFeeRatePerTax * 2; // total daily late fee

  // Statutory Late Fee Cap Determination (Notification No. 19/2021-CT & 20/2021-CT)
  let capLimitTotal = 10000;
  if (isNilReturn) {
    capLimitTotal = 500; // ₹250 CGST + ₹250 SGST
  } else if (turnoverSlab === 'UNDER_1.5CR') {
    capLimitTotal = 2000; // ₹1,000 CGST + ₹1,000 SGST
  } else if (turnoverSlab === '1.5CR_TO_5CR') {
    capLimitTotal = 5000; // ₹2,500 CGST + ₹2,500 SGST
  } else {
    capLimitTotal = 10000; // ₹5,000 CGST + ₹5,000 SGST
  }

  const capLimitPerTax = capLimitTotal / 2;

  // GSTR-1 Late Fee
  const gstr1Uncapped = daysDelayedGstr1 * dailyFeeTotal;
  const gstr1ActualTotal = Math.min(gstr1Uncapped, capLimitTotal);
  const gstr1LateFee = {
    cgst: gstr1ActualTotal / 2,
    sgst: gstr1ActualTotal / 2,
    total: gstr1ActualTotal,
    uncappedTotal: gstr1Uncapped,
    isCapped: gstr1Uncapped > capLimitTotal,
    capLimit: capLimitTotal,
  };

  // GSTR-3B Late Fee
  const gstr3bUncapped = daysDelayedGstr3b * dailyFeeTotal;
  const gstr3bActualTotal = Math.min(gstr3bUncapped, capLimitTotal);
  const gstr3bLateFee = {
    cgst: gstr3bActualTotal / 2,
    sgst: gstr3bActualTotal / 2,
    total: gstr3bActualTotal,
    uncappedTotal: gstr3bUncapped,
    isCapped: gstr3bUncapped > capLimitTotal,
    capLimit: capLimitTotal,
  };

  // -------------------------------------------------------------
  // 2. CGST Act Section 50(1) Interest Calculation
  // 18% p.a. on Net Cash Liability for days delayed
  // -------------------------------------------------------------
  const ratePercent = 18;
  const interestFactor = (ratePercent / 100) * (daysDelayedGstr3b / 365);

  const interestIgst = Math.round(netIgst * interestFactor);
  const interestCgst = Math.round(netCgst * interestFactor);
  const interestSgst = Math.round(netSgst * interestFactor);
  const interestCess = Math.round(netCess * interestFactor);
  const interestTotal = interestIgst + interestCgst + interestSgst + interestCess;

  const interestSection50 = {
    igst: interestIgst,
    cgst: interestCgst,
    sgst: interestSgst,
    cess: interestCess,
    total: interestTotal,
    ratePercent,
  };

  // -------------------------------------------------------------
  // 3. Invoice-level Delayed Date Audit
  // -------------------------------------------------------------
  const invoiceDelayNotices: InvoiceDelayNotice[] = [];
  periodSales.forEach((s) => {
    const invDaysDelay = calculateDaysBetween(gstr3bDueDate, actualFilingDate);
    const sTax = s.igst + s.cgst + s.sgst + (s.cess || 0);
    const estInterestShare = netTotalCash > 0 ? Math.round((sTax / totalOutwardTax) * interestTotal) : 0;

    let statusNotice = 'On-time Filing Expected';
    if (invDaysDelay > 0) {
      statusNotice = `Delayed by ${invDaysDelay} days after ${gstr3bDueDate}`;
    }

    invoiceDelayNotices.push({
      invoiceNo: s.invoiceNo,
      invoiceDate: s.invoiceDate,
      customerName: s.customerName,
      taxableValue: s.taxableValue,
      totalTax: sTax,
      daysDelayedFromInvoice: invDaysDelay,
      estimatedInterestShare: estInterestShare,
      statusNotice,
    });
  });

  const totalPenaltiesAndInterest = gstr3bLateFee.total + interestSection50.total;
  const grandTotalCashPayable = netTotalCash + totalPenaltiesAndInterest;

  const statutoryNotes: string[] = [
    `Section 47 CGST Act: Daily late fee charged @ ₹${dailyFeeTotal}/day (₹${dailyFeeRatePerTax} CGST + ₹${dailyFeeRatePerTax} SGST).`,
    `Late fee capped at ₹${capLimitTotal.toLocaleString('en-IN')} (₹${capLimitPerTax.toLocaleString('en-IN')} CGST + ₹${capLimitPerTax.toLocaleString('en-IN')} SGST) as per turnover slab ${turnoverSlab.replace('_', ' ')}.`,
    `Section 50(1) CGST Act: Statutory interest @ 18% p.a. calculated strictly on Net Cash Tax Liability (₹${netTotalCash.toLocaleString('en-IN')}) for ${daysDelayedGstr3b} days of delay.`,
    `CBIC Circular F.No. CBIC-20/01/08/2019-GST (18 Sep 2020) & Rule 88B of the CGST Rules: interest under Section 50(1) (as amended by Section 100, Finance (No.2) Act, 2019) applies only to the net cash tax liability, i.e. output tax after adjusting eligible Input Tax Credit.`,
  ];

  return {
    monthYear,
    gstr1DueDate,
    gstr3bDueDate,
    actualFilingDate,
    daysDelayedGstr1,
    daysDelayedGstr3b,
    isNilReturn,
    outwardTax: {
      igst: outIgst,
      cgst: outCgst,
      sgst: outSgst,
      cess: outCess,
      total: totalOutwardTax,
    },
    eligibleItc: {
      igst: itcIgst,
      cgst: itcCgst,
      sgst: itcSgst,
      cess: itcCess,
      total: itcIgst + itcCgst + itcSgst + itcCess,
    },
    netCashLiability: {
      igst: netIgst,
      cgst: netCgst,
      sgst: netSgst,
      cess: netCess,
      total: netTotalCash,
    },
    gstr1LateFee,
    gstr3bLateFee,
    interestSection50,
    invoiceDelayNotices,
    totalPenaltiesAndInterest,
    grandTotalCashPayable,
    statutoryNotes,
  };
}
