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
 * Calculates official GST due dates for GSTR-1 and GSTR-3B for a month/year (YYYY-MM)
 */
export function getGstDueDates(monthYear: string) {
  if (!monthYear || !monthYear.includes('-')) {
    return { gstr1DueDate: '2026-07-11', gstr3bDueDate: '2026-07-20' };
  }

  const [yearStr, monthStr] = monthYear.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10); // 1-based month

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
export function calculateGstLateFeeAndInterest(
  company: Company,
  sales: SalesInvoice[],
  purchases: PurchaseInvoice[],
  monthYear: string = '2026-06',
  actualFilingDate: string = '2026-08-15',
  turnoverSlab: TurnoverSlab = '1.5CR_TO_5CR'
): GstLateFeeInterestResult {
  const { gstr1DueDate, gstr3bDueDate } = getGstDueDates(monthYear);

  // Compute Days Delayed
  const daysDelayedGstr1 = calculateDaysBetween(gstr1DueDate, actualFilingDate);
  const daysDelayedGstr3b = calculateDaysBetween(gstr3bDueDate, actualFilingDate);

  // Outward Tax Summary
  let outIgst = 0, outCgst = 0, outSgst = 0, outCess = 0;
  sales.forEach((s) => {
    outIgst += s.igst;
    outCgst += s.cgst;
    outSgst += s.sgst;
    outCess += s.cess || 0;
  });
  const totalOutwardTax = outIgst + outCgst + outSgst + outCess;

  // ITC Summary
  let itcIgst = 0, itcCgst = 0, itcSgst = 0, itcCess = 0;
  purchases.forEach((p) => {
    if (p.itcEligible === 'Y') {
      itcIgst += p.igst;
      itcCgst += p.cgst;
      itcSgst += p.sgst;
      itcCess += p.cess || 0;
    }
  });

  // Net Cash Liability (Outward minus Available ITC)
  const netIgst = Math.max(0, outIgst - itcIgst);
  const netCgst = Math.max(0, outCgst - itcCgst);
  const netSgst = Math.max(0, outSgst - itcSgst);
  const netCess = Math.max(0, outCess - itcCess);
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
  sales.forEach((s) => {
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
    `CBIC Circular No. 64/38/2018-GST: No interest payable on output tax liability set off through eligible Input Tax Credit (ITC).`,
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
