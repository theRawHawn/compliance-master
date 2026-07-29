import React from 'react';
import { Company, SalesInvoice, PurchaseInvoice, VendorPayment, PayrollRun, GeneratedFile } from '../types';
import { PF_RULES } from '../lib/taxRules';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DashboardProps {
  company: Company | null;
  sales: SalesInvoice[];
  purchases: PurchaseInvoice[];
  vendorPayments: VendorPayment[];
  payroll: PayrollRun | null;
  generatedFiles: GeneratedFile[];
  onNavigate: (tab: string) => void;
  onGenerateFile: (fileType: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  company,
  sales,
  purchases,
  vendorPayments,
  payroll,
  generatedFiles,
  onNavigate,
  onGenerateFile,
}) => {
  if (!company) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">No Company Selected</h2>
        <p className="text-slate-500 mt-2">Please create or select a client company to start generating compliance files.</p>
        <button
          onClick={() => onNavigate('company')}
          className="mt-6 inline-flex items-center px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition"
        >
          Create First Company
        </button>
      </div>
    );
  }

  // Calculate quick metrics
  const totalSalesTaxable = sales.reduce((acc, s) => acc + s.taxableValue, 0);
  const totalSalesTax = sales.reduce((acc, s) => acc + s.igst + s.cgst + s.sgst + s.cess, 0);

  const totalPurchaseTaxable = purchases.reduce((acc, p) => acc + p.taxableValue, 0);
  const totalItcAvailable = purchases
    .filter((p) => p.itcEligible === 'Y')
    .reduce((acc, p) => acc + p.igst + p.cgst + p.sgst + p.cess, 0);

  const netGstPayable = Math.max(0, totalSalesTax - totalItcAvailable);

  const totalVendorTds = vendorPayments.reduce((acc, v) => acc + v.tdsDeducted, 0);
  const totalSalaryTds = payroll ? payroll.totalTds : 0;
  const totalTdsPayable = totalVendorTds + totalSalaryTds;

  const totalPfEmp = payroll ? payroll.totalPfEmp : 0;
  const totalPfEmpr = payroll ? payroll.totalPfEmpr : 0;
  const totalPfWage = payroll ? payroll.lines.reduce((a, c) => a + c.pfWage, 0) : 0;
  const totalPfAdmin = payroll ? Math.round(totalPfWage * (PF_RULES.adminRate / 100)) : 0;
  const totalEdli = payroll ? Math.round(payroll.lines.reduce((a, c) => a + Math.min(c.pfWage, PF_RULES.wageCeiling), 0) * (PF_RULES.edliRate / 100)) : 0;
  const totalPfRemittance = totalPfEmp + totalPfEmpr + totalPfAdmin + totalEdli;

  const totalEsiEmp = payroll ? payroll.totalEsiEmp : 0;
  const totalEsiEmpr = payroll ? payroll.totalEsiEmpr : 0;
  const totalEsicRemittance = totalEsiEmp + totalEsiEmpr;

  const totalPtPayable = payroll ? payroll.totalPt : 0;

  const totalPayrollStatutory = totalPfRemittance + totalEsicRemittance + totalPtPayable;
  const totalGovtPayable = netGstPayable + totalTdsPayable + totalPayrollStatutory;

  // Due Dates for Indian Tax Returns (FY 2026-27)
  const dueDates = [
    { return: 'GSTR-1 (Outward Supplies)', period: 'June (Q1 2026-27)', due: '11th July', status: 'DUE_SOON', module: 'GST' },
    { return: 'GSTR-3B (Summary Return)', period: 'June (Q1 2026-27)', due: '20th July', status: 'UPCOMING', module: 'GST' },
    { return: 'TDS Form 26Q (Non-Salary)', period: 'Q1 (Apr-Jun 2026-27)', due: '31st July', status: 'UPCOMING', module: 'TDS' },
    { return: 'TDS Form 24Q (Salary)', period: 'Q1 (Apr-Jun 2026-27)', due: '31st July', status: 'UPCOMING', module: 'TDS' },
    { return: 'EPFO PF ECR Return', period: 'June (FY 2026-27)', due: '15th July', status: 'DUE_SOON', module: 'PAYROLL' },
    { return: 'ESIC Monthly Return', period: 'June (FY 2026-27)', due: '15th July', status: 'DUE_SOON', module: 'PAYROLL' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Top Welcome & Company Overview Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-blue-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
        <div className="space-y-2.5 sm:space-y-3 w-full lg:w-auto">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-y-1">
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] sm:text-xs font-bold px-2.5 py-0.5 sm:py-1 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Portal-Ready Generator
            </span>
            <span className="text-[11px] sm:text-xs text-blue-900 font-bold bg-blue-50 px-2.5 py-0.5 sm:py-1 rounded-full border border-blue-200">
              FY {company.financialYear}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-blue-950 break-words">
            {company.legalName}
          </h1>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
            <span className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg">
              <strong className="text-blue-950">GSTIN:</strong> <span className="font-mono font-bold text-slate-900">{company.gstin}</span>
            </span>
            <span className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg">
              <strong className="text-blue-950">TAN:</strong> <span className="font-mono font-bold text-slate-900">{company.tan}</span>
            </span>
            <span className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg">
              <strong className="text-blue-950">PAN:</strong> <span className="font-mono font-bold text-slate-900">{company.pan}</span>
            </span>
            <span className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg">
              <strong className="text-blue-950">State:</strong> <span className="font-bold text-slate-900">{company.state} ({company.stateCode})</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <button
            onClick={() => onNavigate('import')}
            className="inline-flex items-center justify-center space-x-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-xs transition text-xs sm:text-sm"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Import Data</span>
          </button>
          <button
            onClick={() => onNavigate('download')}
            className="inline-flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-xs transition text-xs sm:text-sm"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Downloads ({generatedFiles.length})</span>
          </button>
        </div>
      </div>

      {/* Module Status & File Generator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GST Status Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
              GST
            </div>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Generate
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mt-4">GST Compliance</h3>
          <p className="text-xs text-slate-500">GSTR-1 JSON & GSTR-3B Auto-Summary</p>

          <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex justify-between text-slate-600">
              <span>Outward Tax Collected:</span>
              <span className="font-semibold text-slate-900">₹{totalSalesTax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Less Eligible ITC Credit:</span>
              <span className="font-semibold text-emerald-700">-₹{totalItcAvailable.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold bg-blue-50/70 p-2 rounded-lg border border-blue-100">
              <span>Net GST Payable to Govt:</span>
              <span className="text-blue-900 font-extrabold">₹{netGstPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={() => onGenerateFile('GSTR1_JSON')}
              className="w-full flex items-center justify-between text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition"
            >
              <span>Generate GSTR-1 JSON</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('gst')}
              className="w-full text-center text-xs text-slate-600 hover:text-blue-600 py-1 font-medium"
            >
              View Sales & Reconciliation
            </button>
          </div>
        </div>

        {/* TDS Status Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
              TDS
            </div>
            <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Calculated
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mt-4">TDS Statutory Returns</h3>
          <p className="text-xs text-slate-500">Form 26Q (Vendor) & Form 24Q (Salary)</p>

          <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex justify-between text-slate-600">
              <span>Vendor TDS (Form 26Q):</span>
              <span className="font-semibold text-slate-900">₹{totalVendorTds.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Salary TDS (Form 24Q):</span>
              <span className="font-semibold text-slate-900">₹{totalSalaryTds.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold bg-purple-50/70 p-2 rounded-lg border border-purple-100">
              <span>Total TDS Payable to Govt:</span>
              <span className="text-purple-900 font-extrabold">₹{totalTdsPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={() => onGenerateFile('TDS_26Q_FVU')}
              className="w-full flex items-center justify-between text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition"
            >
              <span>Generate Form 26Q FVU</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('tds')}
              className="w-full text-center text-xs text-slate-600 hover:text-purple-600 py-1 font-medium"
            >
              View TDS Register
            </button>
          </div>
        </div>

        {/* Payroll Statutory Status Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
              EPF
            </div>
            <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready for EPFO
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mt-4">Payroll Statutory Returns</h3>
          <p className="text-xs text-slate-500">PF ECR v2.0, ESIC & Professional Tax</p>

          <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex justify-between text-slate-600">
              <span>EPFO PF (Emp + Empr):</span>
              <span className="font-semibold text-slate-900">₹{totalPfRemittance.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>ESIC (Emp + Empr):</span>
              <span className="font-semibold text-slate-900">₹{totalEsicRemittance.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold bg-amber-50/70 p-2 rounded-lg border border-amber-100">
              <span>Total Statutory Remittance:</span>
              <span className="text-amber-900 font-extrabold">₹{totalPayrollStatutory.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={() => onGenerateFile('PF_ECR_TXT')}
              className="w-full flex items-center justify-between text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg transition"
            >
              <span>Generate PF ECR Text File</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('payroll')}
              className="w-full text-center text-xs text-slate-600 hover:text-amber-600 py-1 font-medium"
            >
              View Payroll Breakdown
            </button>
          </div>
        </div>
      </div>

      {/* Comprehensive Executive Summary & Government Statutory Payables Matrix */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" /> Executive Compliance Summary & Government Payables
            </h2>
            <p className="text-xs text-slate-500">Consolidated real-time statutory liabilities payable to the Government of India across all modules</p>
          </div>
          <button
            onClick={() => onNavigate('import')}
            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" /> Launch Data Importer
          </button>
        </div>

        {/* Grand Total Government Payable KPI Highlight Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-full">
              Consolidated Government Statutory Liability
            </span>
            <p className="text-2xl sm:text-3xl font-black text-white mt-2 font-mono">
              ₹{totalGovtPayable.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Net payable amount calculated directly from user-imported sales, purchases, vendor payments, and payroll runs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-blue-900/80 text-blue-200 border border-blue-700/60 px-3 py-1.5 rounded-xl font-medium">
              GST Net: <strong className="text-white">₹{netGstPayable.toLocaleString('en-IN')}</strong>
            </span>
            <span className="bg-purple-900/80 text-purple-200 border border-purple-700/60 px-3 py-1.5 rounded-xl font-medium">
              TDS Total: <strong className="text-white">₹{totalTdsPayable.toLocaleString('en-IN')}</strong>
            </span>
            <span className="bg-amber-900/80 text-amber-200 border border-amber-700/60 px-3 py-1.5 rounded-xl font-medium">
              Payroll Statutory: <strong className="text-white">₹{totalPayrollStatutory.toLocaleString('en-IN')}</strong>
            </span>
          </div>
        </div>

        {/* 5-Column Statutory Component Payable Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          {/* Net GST Card */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
            <span className="text-[10px] uppercase font-extrabold text-blue-800 tracking-wider">Net GST Cash Payable</span>
            <p className="text-xl font-black text-blue-950 font-mono">₹{netGstPayable.toLocaleString('en-IN')}</p>
            <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-blue-200/60">
              <p className="flex justify-between"><span>Output Tax:</span> <strong>₹{totalSalesTax.toLocaleString('en-IN')}</strong></p>
              <p className="flex justify-between text-emerald-700"><span>Less ITC:</span> <strong>-₹{totalItcAvailable.toLocaleString('en-IN')}</strong></p>
            </div>
          </div>

          {/* TDS Vendor 26Q Card */}
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-1">
            <span className="text-[10px] uppercase font-extrabold text-purple-800 tracking-wider">Vendor TDS (Form 26Q)</span>
            <p className="text-xl font-black text-purple-950 font-mono">₹{totalVendorTds.toLocaleString('en-IN')}</p>
            <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-purple-200/60">
              <p className="flex justify-between"><span>Payments:</span> <strong>{vendorPayments.length} Records</strong></p>
              <p className="flex justify-between"><span>Rate Sec 194:</span> <strong>1% - 10%</strong></p>
            </div>
          </div>

          {/* TDS Salary 24Q Card */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-1">
            <span className="text-[10px] uppercase font-extrabold text-indigo-800 tracking-wider">Salary TDS (Form 24Q)</span>
            <p className="text-xl font-black text-indigo-950 font-mono">₹{totalSalaryTds.toLocaleString('en-IN')}</p>
            <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-indigo-200/60">
              <p className="flex justify-between"><span>Employees:</span> <strong>{payroll?.totalEmployees || 0} Staff</strong></p>
              <p className="flex justify-between"><span>Tax Regime:</span> <strong>New/Old</strong></p>
            </div>
          </div>

          {/* EPFO PF Contribution Card */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
            <span className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider">EPFO PF & EDLI Total</span>
            <p className="text-xl font-black text-amber-950 font-mono">₹{totalPfRemittance.toLocaleString('en-IN')}</p>
            <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-amber-200/60">
              <p className="flex justify-between"><span>PF 12% Emp + 12% Empr:</span> <strong>₹{(totalPfEmp + totalPfEmpr).toLocaleString('en-IN')}</strong></p>
              <p className="flex justify-between"><span>EDLI (0.5%) + Admin (0.5%):</span> <strong>₹{(totalEdli + totalPfAdmin).toLocaleString('en-IN')}</strong></p>
            </div>
          </div>

          {/* ESIC & Professional Tax Card */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
            <span className="text-[10px] uppercase font-extrabold text-emerald-800 tracking-wider">ESIC & PT Payable</span>
            <p className="text-xl font-black text-emerald-950 font-mono">₹{(totalEsicRemittance + totalPtPayable).toLocaleString('en-IN')}</p>
            <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-emerald-200/60">
              <p className="flex justify-between"><span>ESIC (4.0%):</span> <strong>₹{totalEsicRemittance.toLocaleString('en-IN')}</strong></p>
              <p className="flex justify-between"><span>PT (State):</span> <strong>₹{totalPtPayable.toLocaleString('en-IN')}</strong></p>
            </div>
          </div>
        </div>

        {/* Detailed Statutory Remittance Breakdown Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Tax Head / Component</th>
                <th className="py-3 px-4">Authority / Portal</th>
                <th className="py-3 px-4">User Source Data</th>
                <th className="py-3 px-4">Calculation Formula / Basis</th>
                <th className="py-3 px-4 text-right">Payable Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-semibold text-blue-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span> GST (GSTR-3B Cash Liability)
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">GST Portal (GSTN)</td>
                <td className="py-3 px-4 text-slate-600">{sales.length} Sales & {purchases.length} Purchase Invoices</td>
                <td className="py-3 px-4 text-slate-600">Output Tax (₹{totalSalesTax.toLocaleString('en-IN')}) - Eligible ITC (₹{totalItcAvailable.toLocaleString('en-IN')})</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{netGstPayable.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-semibold text-purple-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span> Vendor TDS (Form 26Q)
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">Income Tax (TIN-NSDL)</td>
                <td className="py-3 px-4 text-slate-600">{vendorPayments.length} Vendor Payment Vouchers</td>
                <td className="py-3 px-4 text-slate-600">Section 194C/J/H/I/Q Deductions</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{totalVendorTds.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-semibold text-indigo-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Salary TDS (Form 24Q)
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">Income Tax (TIN-NSDL)</td>
                <td className="py-3 px-4 text-slate-600">{payroll?.totalEmployees || 0} Employees Monthly Payroll</td>
                <td className="py-3 px-4 text-slate-600">Section 192 Tax Slabs & Deductions</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{totalSalaryTds.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-semibold text-amber-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span> EPFO Provident Fund & EDLI (ECR)
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">EPFO Portal</td>
                <td className="py-3 px-4 text-slate-600">{payroll?.totalEmployees || 0} UAN Registered Staff</td>
                <td className="py-3 px-4 text-slate-600">12% Emp + 12% Empr + 0.5% Admin (A/c 02) + 0.5% EDLI (A/c 21)</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{totalPfRemittance.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-semibold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span> ESIC Monthly Contribution
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">ESIC Portal</td>
                <td className="py-3 px-4 text-slate-600">{payroll?.lines.filter(l => (l.esiWage || 0) <= 21000).length || 0} Eligible Workers</td>
                <td className="py-3 px-4 text-slate-600">0.75% Employee + 3.25% Employer Contribution</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{totalEsicRemittance.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-600"></span> Professional Tax (PT)
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">{company?.state || 'State'} Tax Dept</td>
                <td className="py-3 px-4 text-slate-600">{payroll?.totalEmployees || 0} Staff Wage Slabs</td>
                <td className="py-3 px-4 text-slate-600">State Statutory PT Slab Deductions</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{totalPtPayable.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 font-black text-slate-900 border-t border-slate-300">
                <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wider text-xs">Total Government Payable Amount:</td>
                <td className="py-3 px-4 text-right font-mono text-sm text-emerald-800">₹{totalGovtPayable.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Compliance Calendar & Recent Generated Files Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Compliance Calendar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Upcoming Compliance Due Dates</h2>
            </div>
            <span className="text-xs font-medium text-slate-500">FY 2026-27</span>
          </div>

          <div className="divide-y divide-slate-100">
            {dueDates.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.return}</p>
                  <p className="text-xs text-slate-500">{item.period}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{item.due}</p>
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                      item.status === 'DUE_SOON'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.status === 'DUE_SOON' ? 'Due Soon' : 'Upcoming'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Generated Portal Files */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Generated Portal Files</h2>
            </div>
            <button
              onClick={() => onNavigate('download')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View All ({generatedFiles.length})
            </button>
          </div>

          {generatedFiles.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No files generated yet</p>
              <p className="text-xs text-slate-500 mt-1">Click any generate button above to generate valid GSTR-1, TDS FVU, or PF ECR files.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {generatedFiles.slice(0, 5).map((f) => (
                <div key={f.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                      {f.fileType.replace(/_/g, ' ')}
                    </span>
                    <p className="text-xs font-mono font-semibold text-slate-900 mt-1">{f.fileName}</p>
                    <p className="text-[11px] text-slate-500">{f.recordCount} Records • {f.fileSizeKb} KB</p>
                  </div>
                  <button
                    onClick={() => onNavigate('download')}
                    className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition text-xs font-semibold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Get
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
