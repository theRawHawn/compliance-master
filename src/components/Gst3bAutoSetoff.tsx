import React, { useState, useMemo } from 'react';
import { Company, SalesInvoice, PurchaseInvoice } from '../types';
import { generateGstr3bSummary } from '../lib/generators/gstGenerator';
import { calculateGstLateFeeAndInterest, TurnoverSlab, previousMonthYear, todayIso } from '../lib/calculators/gstLateFeeCalculator';
import {
  Scale,
  Wallet,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Calculator,
  RefreshCw,
  FileCheck2,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Percent,
  FileText
} from 'lucide-react';

function addDaysToIsoDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

interface Gst3bAutoSetoffProps {
  company: Company;
  sales: SalesInvoice[];
  purchases: PurchaseInvoice[];
  onGenerateFile: (fileType: string) => void;
}

export const Gst3bAutoSetoff: React.FC<Gst3bAutoSetoffProps> = ({
  company,
  sales,
  purchases,
  onGenerateFile,
}) => {
  // Default the return period to the most recent month actually present in the data, since
  // hardcoding a fixed period regardless of what was uploaded would silently show a blank/wrong
  // return whenever the data doesn't happen to fall in that one hardcoded month.
  const availableMonthYears = useMemo(() => {
    const months = new Set<string>();
    sales.forEach((s) => s.monthYear && months.add(s.monthYear));
    purchases.forEach((p) => p.monthYear && months.add(p.monthYear));
    return Array.from(months).sort().reverse();
  }, [sales, purchases]);

  const [monthYear, setMonthYear] = useState<string>(availableMonthYears[0] || previousMonthYear());
  // Configurable state for Filing Date & Turnover Slab for late fee calculations
  const [actualFilingDate, setActualFilingDate] = useState<string>(todayIso());
  const [turnoverSlab, setTurnoverSlab] = useState<TurnoverSlab>('1.5CR_TO_5CR');

  // Compute late fee & interest engine results
  const lateFeeResult = calculateGstLateFeeAndInterest(
    company,
    sales,
    purchases,
    monthYear,
    actualFilingDate,
    turnoverSlab
  );

  const summary = generateGstr3bSummary(company, sales, purchases, monthYear, actualFilingDate, turnoverSlab);

  // Table 3.1 Gross Output Tax Liability
  const outIgst = summary.table31_OutwardSupplies.a_taxableSupplies.integratedTax;
  const outCgst = summary.table31_OutwardSupplies.a_taxableSupplies.centralTax;
  const outSgst = summary.table31_OutwardSupplies.a_taxableSupplies.stateTax;
  const outCess = summary.table31_OutwardSupplies.a_taxableSupplies.cess;

  // Table 4 Input Tax Credit Available
  const itcIgst = summary.table4_EligibleITC.a5_allOtherITC.integratedTax;
  const itcCgst = summary.table4_EligibleITC.a5_allOtherITC.centralTax;
  const itcSgst = summary.table4_EligibleITC.a5_allOtherITC.stateTax;
  const itcCess = summary.table4_EligibleITC.a5_allOtherITC.cess;

  // Electronic Cash Ledger Balance state
  const [cashLedger, setCashLedger] = useState({
    igst: 2000,
    cgst: 3500,
    sgst: 3500,
    cess: 0,
  });

  // Rule 88A ITC Set-off Calculation Engine
  // 1. IGST ITC first against IGST liability
  const setoff_igst_against_igst = Math.min(itcIgst, outIgst);
  let remItcIgst = itcIgst - setoff_igst_against_igst;
  let remOutIgst = outIgst - setoff_igst_against_igst;

  // Remaining IGST ITC set off against CGST, then SGST
  const setoff_igst_against_cgst = Math.min(remItcIgst, outCgst);
  remItcIgst -= setoff_igst_against_cgst;
  let remOutCgst = outCgst - setoff_igst_against_cgst;

  const setoff_igst_against_sgst = Math.min(remItcIgst, outSgst);
  remItcIgst -= setoff_igst_against_sgst;
  let remOutSgst = outSgst - setoff_igst_against_sgst;

  // 2. CGST ITC set off against CGST liability
  const setoff_cgst_against_cgst = Math.min(itcCgst, remOutCgst);
  remOutCgst -= setoff_cgst_against_cgst;

  // 3. SGST ITC set off against SGST liability
  const setoff_sgst_against_sgst = Math.min(itcSgst, remOutSgst);
  remOutSgst -= setoff_sgst_against_sgst;

  // 4. Cess set off
  const setoff_cess = Math.min(itcCess, outCess);
  const remOutCess = outCess - setoff_cess;

  // Net Tax Liability after ITC Set-Off (regular portion only)
  const netLiability = {
    igst: remOutIgst,
    cgst: remOutCgst,
    sgst: remOutSgst,
    cess: remOutCess,
  };

  // Electronic Cash Ledger Set-Off against Net Liability
  const cashUsedIgst = Math.min(cashLedger.igst, netLiability.igst);
  const cashUsedCgst = Math.min(cashLedger.cgst, netLiability.cgst);
  const cashUsedSgst = Math.min(cashLedger.sgst, netLiability.sgst);
  const cashUsedCess = Math.min(cashLedger.cess, netLiability.cess);

  // Final Net Cash Payable via PMT-06 Challan (Tax alone)
  const finalPayableIgst = Math.max(0, netLiability.igst - cashUsedIgst);
  const finalPayableCgst = Math.max(0, netLiability.cgst - cashUsedCgst);
  const finalPayableSgst = Math.max(0, netLiability.sgst - cashUsedSgst);
  const finalPayableCess = Math.max(0, netLiability.cess - cashUsedCess);

  const totalTaxCashChallan = finalPayableIgst + finalPayableCgst + finalPayableSgst + finalPayableCess;

  // Mandatory cash-only RCM liability (Table 3.1(d)) -- cannot be reduced by ITC/credit ledger
  // regardless of balance, but genuinely available cash ledger balance can still be used to pay
  // it. Applied after the regular allocation above so the same cash ledger rupee is never
  // counted toward both.
  const rcmCash = lateFeeResult.reverseChargeCashRequired;
  const rcmCashUsedIgst = Math.min(Math.max(0, cashLedger.igst - cashUsedIgst), rcmCash.igst);
  const rcmCashUsedCgst = Math.min(Math.max(0, cashLedger.cgst - cashUsedCgst), rcmCash.cgst);
  const rcmCashUsedSgst = Math.min(Math.max(0, cashLedger.sgst - cashUsedSgst), rcmCash.sgst);
  const rcmCashUsedCess = Math.min(Math.max(0, cashLedger.cess - cashUsedCess), rcmCash.cess);
  const rcmFinalPayableIgst = Math.max(0, rcmCash.igst - rcmCashUsedIgst);
  const rcmFinalPayableCgst = Math.max(0, rcmCash.cgst - rcmCashUsedCgst);
  const rcmFinalPayableSgst = Math.max(0, rcmCash.sgst - rcmCashUsedSgst);
  const rcmFinalPayableCess = Math.max(0, rcmCash.cess - rcmCashUsedCess);
  const rcmTotalTaxCashChallan = rcmFinalPayableIgst + rcmFinalPayableCgst + rcmFinalPayableSgst + rcmFinalPayableCess;

  // Total Cash Requirement including Late Fees and Interest
  const totalLateFeesAndInterest = lateFeeResult.totalPenaltiesAndInterest;
  const grandTotalCashChallan = totalTaxCashChallan + rcmTotalTaxCashChallan + totalLateFeesAndInterest;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Rule 88A Statutory Set-off & Sec 47/50 Engine
            </span>
            <span className="text-slate-500 text-xs font-semibold">Period: {monthYear ? new Date(`${monthYear}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'No period selected'}</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-600" />
            GSTR-3B Tax Set-Off, Late Fees & Interest Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-utilize Input Tax Credit (ITC), calculate statutory late fees (Sec 47) and interest @ 18% p.a. (Sec 50(1)).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onGenerateFile('GSTR3B_EXCEL')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download 3B Excel (With Late Fees)</span>
          </button>
        </div>
      </div>

      {/* Interactive Late Fee & Interest Calculator Controls */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-orange-500/10 p-6 rounded-2xl border border-amber-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-amber-200/80 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
              Interactive Compliance Simulator
            </span>
            <h3 className="text-base font-black text-slate-900 mt-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> Notice & Late Payment Date Simulation
            </h3>
            <p className="text-xs text-slate-600">
              Select intended filing date to automatically compute Section 47 daily late fees and Section 50(1) interest.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => setActualFilingDate(lateFeeResult.gstr3bDueDate)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                actualFilingDate === lateFeeResult.gstr3bDueDate ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              On-Time ({formatDisplayDate(lateFeeResult.gstr3bDueDate)})
            </button>
            <button
              onClick={() => setActualFilingDate(addDaysToIsoDate(lateFeeResult.gstr3bDueDate, 16))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                actualFilingDate === addDaysToIsoDate(lateFeeResult.gstr3bDueDate, 16) ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              16 Days Late
            </button>
            <button
              onClick={() => setActualFilingDate(addDaysToIsoDate(lateFeeResult.gstr3bDueDate, 31))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                actualFilingDate === addDaysToIsoDate(lateFeeResult.gstr3bDueDate, 31) ? 'bg-orange-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              31 Days Late
            </button>
            <button
              onClick={() => setActualFilingDate(addDaysToIsoDate(lateFeeResult.gstr3bDueDate, 62))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                actualFilingDate === addDaysToIsoDate(lateFeeResult.gstr3bDueDate, 62) ? 'bg-red-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              62 Days Late
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Return Period
            </label>
            <input
              type="month"
              value={monthYear}
              onChange={(e) => e.target.value && setMonthYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono text-xs text-slate-900 font-bold focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {availableMonthYears.length > 0
                ? `Data available for: ${availableMonthYears.join(', ')}`
                : 'No dated invoices found — showing an empty period'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-700" /> Intended / Actual Filing Date
            </label>
            <input
              type="date"
              value={actualFilingDate}
              onChange={(e) => setActualFilingDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono text-xs text-slate-900 font-bold focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">GSTR-3B Statutory Due Date: <span className="font-bold text-slate-800">{formatDisplayDate(lateFeeResult.gstr3bDueDate)}</span></p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Annual Aggregate Turnover Slab
            </label>
            <select
              value={turnoverSlab}
              onChange={(e) => setTurnoverSlab(e.target.value as TurnoverSlab)}
              className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs text-slate-900 font-bold focus:ring-2 focus:ring-amber-500"
            >
              <option value="UNDER_1.5CR">Up to ₹1.5 Crore (Max Cap ₹2,000)</option>
              <option value="1.5CR_TO_5CR">₹1.5 Crore to ₹5 Crore (Max Cap ₹5,000)</option>
              <option value="ABOVE_5CR">Above ₹5 Crore (Max Cap ₹10,000)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Determines Section 47 maximum statutory capping limit</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Delay Impact Analysis</span>
            <div className="flex justify-between items-baseline mt-1">
              <span className="text-xs text-slate-600 font-medium">Days Delayed:</span>
              <span className="text-base font-black font-mono text-amber-900">
                {lateFeeResult.daysDelayedGstr3b} Days
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-600 font-medium">Sec 50(1) Interest Rate:</span>
              <span className="text-xs font-black text-amber-900 font-mono">18% p.a.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grand Final Cash Payable Highlight Card */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-purple-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-950/80 border border-amber-800/60 px-3 py-1 rounded-full">
            Total PMT-06 Cash Payable (Net Tax + Interest + Late Fees)
          </span>
          <p className="text-3xl sm:text-4xl font-black text-white font-mono mt-3">
            ₹{grandTotalCashChallan.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-300 mt-1">
            Net Regular Tax (₹{totalTaxCashChallan.toLocaleString('en-IN')}) + RCM Cash (₹{rcmTotalTaxCashChallan.toLocaleString('en-IN')}) + Late Fee (₹{lateFeeResult.gstr3bLateFee.total.toLocaleString('en-IN')}) + Sec 50(1) Interest (₹{lateFeeResult.interestSection50.total.toLocaleString('en-IN')})
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs w-full lg:w-auto">
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-center">
            <span className="text-[10px] text-slate-300 uppercase font-bold">Net Regular Tax</span>
            <p className="text-lg font-black text-white font-mono mt-0.5">₹{totalTaxCashChallan.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-center">
            <span className="text-[10px] text-sky-300 uppercase font-bold">RCM Cash Only</span>
            <p className="text-lg font-black text-sky-300 font-mono mt-0.5">₹{rcmTotalTaxCashChallan.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-center">
            <span className="text-[10px] text-amber-300 uppercase font-bold">Sec 47 Late Fee</span>
            <p className="text-lg font-black text-amber-300 font-mono mt-0.5">₹{lateFeeResult.gstr3bLateFee.total.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-center">
            <span className="text-[10px] text-amber-300 uppercase font-bold">Sec 50(1) Interest</span>
            <p className="text-lg font-black text-amber-300 font-mono mt-0.5">₹{lateFeeResult.interestSection50.total.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Table 5.1 Interest and Late Fee Payable (Official GSTR-3B Format) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Table 5.1: Interest and Late Fee Payable (GSTR-3B Official)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Calculated automatically as per CGST Act Section 47 & Section 50(1)</p>
          </div>
          <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full">
            Auto-Computed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-sans">Description</th>
                <th className="py-3 px-4 text-right">Integrated Tax (₹)</th>
                <th className="py-3 px-4 text-right">Central Tax (₹)</th>
                <th className="py-3 px-4 text-right">State/UT Tax (₹)</th>
                <th className="py-3 px-4 text-right">Cess (₹)</th>
                <th className="py-3 px-4 text-right text-slate-900 font-sans">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                  1. Interest Payable (Sec 50(1) @ 18% p.a. on Net Cash)
                </td>
                <td className="py-3 px-4 text-right">₹{lateFeeResult.interestSection50.igst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right">₹{lateFeeResult.interestSection50.cgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right">₹{lateFeeResult.interestSection50.sgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right">₹{lateFeeResult.interestSection50.cess.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-bold text-amber-900">₹{lateFeeResult.interestSection50.total.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                  2. Late Fee Payable (Sec 47 - {lateFeeResult.daysDelayedGstr3b} Days Delayed)
                </td>
                <td className="py-3 px-4 text-right text-slate-400">-</td>
                <td className="py-3 px-4 text-right">₹{lateFeeResult.gstr3bLateFee.cgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right">₹{lateFeeResult.gstr3bLateFee.sgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-slate-400">-</td>
                <td className="py-3 px-4 text-right font-bold text-amber-900">₹{lateFeeResult.gstr3bLateFee.total.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-amber-50 border-t border-amber-200 text-slate-900 font-black text-xs">
                <td className="py-3 px-4 font-sans">TOTAL INTEREST & LATE FEES PAYABLE</td>
                <td className="py-3 px-4 text-right font-mono">₹{lateFeeResult.interestSection50.igst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-mono">₹{(lateFeeResult.interestSection50.cgst + lateFeeResult.gstr3bLateFee.cgst).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-mono">₹{(lateFeeResult.interestSection50.sgst + lateFeeResult.gstr3bLateFee.sgst).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-mono">₹{lateFeeResult.interestSection50.cess.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-amber-950 font-mono text-sm">₹{totalLateFeesAndInterest.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Statutory Notes Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600" /> Statutory Legal Compliance Notes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1">
            {lateFeeResult.statutoryNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Step 1 & 2: Output Liability vs Input Tax Credit Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Table 3.1 Outward Liability */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-600" /> Table 3.1: Gross Outward Tax Liability
            </h3>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">From Sales Register</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs text-center font-mono">
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-sans font-semibold text-slate-500">IGST</p>
              <p className="font-bold text-slate-900 mt-1">₹{outIgst.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-sans font-semibold text-slate-500">CGST</p>
              <p className="font-bold text-slate-900 mt-1">₹{outCgst.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-sans font-semibold text-slate-500">SGST</p>
              <p className="font-bold text-slate-900 mt-1">₹{outSgst.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-sans font-semibold text-slate-500">Cess</p>
              <p className="font-bold text-slate-900 mt-1">₹{outCess.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Table 4 Eligible Input Tax Credit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" /> Table 4: Eligible Input Tax Credit (ITC)
            </h3>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">From GSTR-2B Inward</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs text-center font-mono">
            <div className="p-2.5 bg-emerald-50/60 rounded-xl">
              <p className="text-[10px] font-sans font-semibold text-emerald-800">IGST ITC</p>
              <p className="font-bold text-emerald-950 mt-1">₹{itcIgst.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2.5 bg-emerald-50/60 rounded-xl">
              <p className="text-[10px] font-sans font-semibold text-emerald-800">CGST ITC</p>
              <p className="font-bold text-emerald-950 mt-1">₹{itcCgst.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2.5 bg-emerald-50/60 rounded-xl">
              <p className="text-[10px] font-sans font-semibold text-emerald-800">SGST ITC</p>
              <p className="font-bold text-emerald-950 mt-1">₹{itcSgst.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2.5 bg-emerald-50/60 rounded-xl">
              <p className="text-[10px] font-sans font-semibold text-emerald-800">Cess ITC</p>
              <p className="font-bold text-emerald-950 mt-1">₹{itcCess.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Interactive Electronic Cash Ledger Inputs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-600" /> Available Balance in GST Electronic Cash Ledger
            </h3>
            <p className="text-xs text-slate-500">Enter cash balance available on GST portal before computing net PMT-06 challan</p>
          </div>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
            Editable Portal Cash Balances
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">IGST Cash Ledger (₹)</label>
            <input
              type="number"
              value={cashLedger.igst}
              onChange={(e) => setCashLedger({ ...cashLedger, igst: Number(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">CGST Cash Ledger (₹)</label>
            <input
              type="number"
              value={cashLedger.cgst}
              onChange={(e) => setCashLedger({ ...cashLedger, cgst: Number(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">SGST Cash Ledger (₹)</label>
            <input
              type="number"
              value={cashLedger.sgst}
              onChange={(e) => setCashLedger({ ...cashLedger, sgst: Number(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cess Cash Ledger (₹)</label>
            <input
              type="number"
              value={cashLedger.cess}
              onChange={(e) => setCashLedger({ ...cashLedger, cess: Number(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Step 4: Full Statutory Set-off Computation Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Rule 88A Consolidated Set-Off & Cash Ledger Utilization Table
          </h3>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded">
            Auto Set-Off Applied
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-sans">Tax Description</th>
                <th className="py-3 px-4 text-right">Gross Output Tax (₹)</th>
                <th className="py-3 px-4 text-right">ITC Set-Off (₹)</th>
                <th className="py-3 px-4 text-right">Net Tax Liability (₹)</th>
                <th className="py-3 px-4 text-right">Cash Ledger Used (₹)</th>
                <th className="py-3 px-4 text-right text-purple-900 font-sans">Final PMT-06 Cash Payable (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-sans font-bold text-slate-900">Integrated Tax (IGST)</td>
                <td className="py-3 px-4 text-right">₹{outIgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-emerald-700 font-bold">-₹{setoff_igst_against_igst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-bold">₹{remOutIgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-purple-700 font-bold">-₹{cashUsedIgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-black text-purple-950 font-sans">₹{finalPayableIgst.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-sans font-bold text-slate-900">Central Tax (CGST)</td>
                <td className="py-3 px-4 text-right">₹{outCgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-emerald-700 font-bold">-₹{(setoff_igst_against_cgst + setoff_cgst_against_cgst).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-bold">₹{remOutCgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-purple-700 font-bold">-₹{cashUsedCgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-black text-purple-950 font-sans">₹{finalPayableCgst.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-sans font-bold text-slate-900">State Tax (SGST)</td>
                <td className="py-3 px-4 text-right">₹{outSgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-emerald-700 font-bold">-₹{(setoff_igst_against_sgst + setoff_sgst_against_sgst).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-bold">₹{remOutSgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-purple-700 font-bold">-₹{cashUsedSgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-black text-purple-950 font-sans">₹{finalPayableSgst.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-sans font-bold text-slate-900">Compensation Cess</td>
                <td className="py-3 px-4 text-right">₹{outCess.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-emerald-700 font-bold">-₹{setoff_cess.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-bold">₹{remOutCess.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-purple-700 font-bold">-₹{cashUsedCess.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-black text-purple-950 font-sans">₹{finalPayableCess.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-sky-50 bg-sky-50/40">
                <td className="py-3 px-4 font-sans font-bold text-sky-900">
                  Reverse Charge (RCM) — Cash Only
                  <span className="block text-[10px] font-normal text-sky-700">Table 3.1(d) — cannot be reduced by ITC, regardless of balance</span>
                </td>
                <td className="py-3 px-4 text-right">₹{rcmCash.total.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-slate-400 font-bold">N/A</td>
                <td className="py-3 px-4 text-right font-bold">₹{rcmCash.total.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-purple-700 font-bold">-₹{(rcmCashUsedIgst + rcmCashUsedCgst + rcmCashUsedSgst + rcmCashUsedCess).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-black text-purple-950 font-sans">₹{rcmTotalTaxCashChallan.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-black text-sm">
                <td className="py-3 px-4 font-sans">TOTAL CASH PAYABLE</td>
                <td className="py-3 px-4 text-right">₹{(outIgst + outCgst + outSgst + outCess + rcmCash.total).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-emerald-400">-₹{(setoff_igst_against_igst + setoff_igst_against_cgst + setoff_igst_against_sgst + setoff_cgst_against_cgst + setoff_sgst_against_sgst + setoff_cess).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right">₹{(remOutIgst + remOutCgst + remOutSgst + remOutCess + rcmCash.total).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-purple-300">-₹{(cashUsedIgst + cashUsedCgst + cashUsedSgst + cashUsedCess + rcmCashUsedIgst + rcmCashUsedCgst + rcmCashUsedSgst + rcmCashUsedCess).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-amber-400 font-mono text-base">₹{(totalTaxCashChallan + rcmTotalTaxCashChallan).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Invoice Date Level Delayed Notice Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Invoice Date Level Late Payment & Delay Audit
            </h3>
            <p className="text-[11px] text-slate-500">Auditing sales register invoice dates against period due date ({lateFeeResult.gstr3bDueDate})</p>
          </div>
          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
            {lateFeeResult.invoiceDelayNotices.length} Invoices Inspected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-sans">Inv No</th>
                <th className="py-3 px-4 font-sans">Inv Date</th>
                <th className="py-3 px-4 font-sans">Customer</th>
                <th className="py-3 px-4 text-right">Taxable (₹)</th>
                <th className="py-3 px-4 text-right">Total Tax (₹)</th>
                <th className="py-3 px-4 text-right">Days Delayed</th>
                <th className="py-3 px-4 text-right">Est. Sec 50 Interest (₹)</th>
                <th className="py-3 px-4 font-sans">Filing Status Notice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {lateFeeResult.invoiceDelayNotices.map((inv, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 font-sans">{inv.invoiceNo}</td>
                  <td className="py-3 px-4 text-slate-600">{inv.invoiceDate}</td>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-800">{inv.customerName}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">₹{inv.taxableValue.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-800">₹{inv.totalTax.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-bold">
                    <span className={inv.daysDelayedFromInvoice > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                      {inv.daysDelayedFromInvoice} days
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-amber-900">₹{inv.estimatedInterestShare.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 font-sans">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                      inv.daysDelayedFromInvoice > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {inv.statusNotice}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

