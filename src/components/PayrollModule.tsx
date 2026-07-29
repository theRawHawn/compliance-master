import React, { useState } from 'react';
import { Company, PayrollRun, PayrollLine, Employee } from '../types';
import { PF_RULES, ESI_RULES, PROFESSIONAL_TAX_SLABS, calculatePt } from '../lib/taxRules';
import { generateBankPayoutFile } from '../lib/erpSyncEngine';
import { ImportModal } from './ImportModal';
import {
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Users,
  FileText,
  Calculator,
  Eye,
  X,
  Printer,
  CheckCircle2,
  Building2,
  CreditCard,
  PieChart,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Upload,
} from 'lucide-react';

interface PayrollModuleProps {
  company: Company | null;
  payroll: PayrollRun | null;
  onGenerateFile: (fileType: string) => void;
  onImportEmployees?: (employees: Omit<Employee, 'id'>[]) => void;
  initialSubTab?: string;
}

export const PayrollModule: React.FC<PayrollModuleProps> = ({
  company,
  payroll,
  onGenerateFile,
  onImportEmployees,
  initialSubTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'REGISTER' | 'BANK_CMS' | 'CHALLAN' | 'TAX_ESTIMATOR'>(
    (initialSubTab as any) || 'REGISTER'
  );

  React.useEffect(() => {
    if (initialSubTab && ['REGISTER', 'BANK_CMS', 'CHALLAN', 'TAX_ESTIMATOR'].includes(initialSubTab)) {
      setActiveSubTab(initialSubTab as any);
    }
  }, [initialSubTab]);
  const [selectedLineForPayslip, setSelectedLineForPayslip] = useState<PayrollLine | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Calculator state
  const [calcBasic, setCalcBasic] = useState<number>(30000);
  const [calcGross, setCalcGross] = useState<number>(60000);
  const [calcGender, setCalcGender] = useState<'M' | 'F'>('M');
  const [calcState, setCalcState] = useState<string>(company?.state || 'Maharashtra');

  // Tax Estimator state for Form 16 ESS
  const [taxAnnualGross, setTaxAnnualGross] = useState<number>(1200000);
  const [tax80c, setTax80c] = useState<number>(150000);
  const [tax80d, setTax80d] = useState<number>(25000);
  const [taxHraExemption, setTaxHraExemption] = useState<number>(120000);

  if (!company) {
    return <div className="p-8 text-center text-slate-500">Please select a company.</div>;
  }

  if (!payroll) {
    return <div className="p-8 text-center text-slate-500">No payroll data calculated yet.</div>;
  }

  // Live Statutory Calculation for Calculator Widget
  const calcPfWage = calcBasic;
  const calcPfEmp = Math.round(calcPfWage * (PF_RULES.employeeRate / 100));
  const calcEpsWage = Math.min(calcPfWage, PF_RULES.wageCeiling);
  const calcEpsEmpr = Math.min(Math.round(calcEpsWage * (PF_RULES.epsRate / 100)), PF_RULES.maxEpsContribution);
  const calcEpfEmprDiff = calcPfEmp - calcEpsEmpr;

  const isEsiEligible = calcGross <= ESI_RULES.grossWageCeiling;
  const calcEsiEmp = isEsiEligible ? Math.round(calcGross * (ESI_RULES.employeeRate / 100)) : 0;
  const calcEsiEmpr = isEsiEligible ? Math.round(calcGross * (ESI_RULES.employerRate / 100)) : 0;

  const calcPtAmt = calculatePt(calcGross, calcState, calcGender, 6);

  // Bank CMS Download
  const handleDownloadBankCms = (bankFormat: 'HDFC_CMS' | 'ICICI_CIB' | 'SBI_BULK') => {
    const payout = generateBankPayoutFile(company, payroll, bankFormat);
    const blob = new Blob([payout.fileContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = payout.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Statutory EPFO Challan Breakdown (A/c 1, 2, 10, 21, 22)
  const epfAc1_Emp = payroll.totalPfEmp; // Employee 12%
  const epfAc10_Eps = payroll.lines.reduce((a, c) => a + c.epsEmployer, 0); // EPS 8.33%
  const epfAc1_EmprDiff = payroll.lines.reduce((a, c) => a + c.pfEmployer, 0); // Employer EPF Diff 3.67%
  const epfAc2_Admin = Math.round(payroll.lines.reduce((a, c) => a + c.pfWage, 0) * 0.005); // Admin Charges 0.5% (Min ₹500)
  const epfAc21_Edli = Math.round(payroll.lines.reduce((a, c) => a + Math.min(c.pfWage, 15000), 0) * 0.005); // EDLI 0.5%
  const epfAc22_EdliAdmin = 0; // EDLI Admin waived
  const totalEpfoChallan = epfAc1_Emp + epfAc10_Eps + epfAc1_EmprDiff + epfAc2_Admin + epfAc21_Edli;

  // Form 16 Tax Estimator calculations (Old vs New Tax Regime FY 2026-27 u/s 115BAC)
  const stdDeductionOld = 50000;
  const stdDeductionNew = 75000; // Updated Standard deduction under New Regime

  // Old Regime Taxable Income
  const oldTaxable = Math.max(0, taxAnnualGross - stdDeductionOld - tax80c - tax80d - taxHraExemption);
  let oldTax = 0;
  if (oldTaxable > 1000000) {
    oldTax = 112500 + (oldTaxable - 1000000) * 0.3;
  } else if (oldTaxable > 500000) {
    oldTax = 12500 + (oldTaxable - 500000) * 0.2;
  } else if (oldTaxable > 250000) {
    oldTax = (oldTaxable - 250000) * 0.05;
  }
  if (oldTaxable <= 500000) oldTax = 0; // Section 87A rebate
  oldTax = Math.round(oldTax * 1.04); // Cess 4%

  // New Regime Taxable Income
  const newTaxable = Math.max(0, taxAnnualGross - stdDeductionNew);
  let newTax = 0;
  if (newTaxable > 1500000) {
    newTax = 150000 + (newTaxable - 1500000) * 0.3;
  } else if (newTaxable > 1200000) {
    newTax = 90000 + (newTaxable - 1200000) * 0.2;
  } else if (newTaxable > 900000) {
    newTax = 45000 + (newTaxable - 900000) * 0.15;
  } else if (newTaxable > 600000) {
    newTax = 15000 + (newTaxable - 600000) * 0.1;
  } else if (newTaxable > 300000) {
    newTax = (newTaxable - 300000) * 0.05;
  }
  if (newTaxable <= 700000) newTax = 0; // Section 87A rebate under New Regime
  newTax = Math.round(newTax * 1.04);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetModule="EMPLOYEES"
        company={company}
        onImportEmployees={onImportEmployees}
      />

      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" /> Payroll & Statutory Compliance Suite
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            EPFO PF ECR v2.0, ESIC Monthly Returns, Bank Direct Payout CMS & Form 16 Tax Estimator
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Quick Import Launcher Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black px-3 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
            title="Import via Google Sheets, Excel, Tally, or Zoho"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Import Payroll Data</span>
          </button>

          <button
            onClick={() => onGenerateFile('PF_ECR_TXT')}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PF ECR File</span>
          </button>
          <button
            onClick={() => onGenerateFile('ESI_CSV')}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ESI Return</span>
          </button>
          <button
            onClick={() => onGenerateFile('PT_SUMMARY')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>PT Summary</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center overflow-x-auto whitespace-nowrap gap-2 border-b border-slate-200 pb-2 scrollbar-none">
        <button
          onClick={() => setActiveSubTab('REGISTER')}
          className={`px-3 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'REGISTER'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Payroll Register & Payslips</span>
        </button>

        <button
          onClick={() => setActiveSubTab('BANK_CMS')}
          className={`px-3 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'BANK_CMS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Direct Bank Payout CMS</span>
        </button>

        <button
          onClick={() => setActiveSubTab('CHALLAN')}
          className={`px-3 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'CHALLAN'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>EPFO / ESIC Challans</span>
        </button>

        <button
          onClick={() => setActiveSubTab('TAX_ESTIMATOR')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
            activeSubTab === 'TAX_ESTIMATOR'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Form 16 Tax Estimator (Old vs New)</span>
        </button>
      </div>

      {/* REGISTER TAB */}
      {activeSubTab === 'REGISTER' && (
        <div className="space-y-6">
          {/* Statutory Rules & Calculator Widget */}
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h3 className="font-extrabold text-base tracking-wide">
                Interactive Statutory Contribution Engine (PF / ESI / State PT Slabs)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Basic Salary (₹)</label>
                <input
                  type="number"
                  value={calcBasic}
                  onChange={(e) => setCalcBasic(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Gross Salary (₹)</label>
                <input
                  type="number"
                  value={calcGross}
                  onChange={(e) => setCalcGross(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">PT State</label>
                <select
                  value={calcState}
                  onChange={(e) => setCalcState(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-400"
                >
                  {Object.keys(PROFESSIONAL_TAX_SLABS).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Gender</label>
                <select
                  value={calcGender}
                  onChange={(e) => setCalcGender(e.target.value as 'M' | 'F')}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-400"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
            </div>

            {/* Calculated Breakdown Display */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-amber-900/40 p-3 rounded-xl border border-amber-500/30">
                <span className="text-[10px] text-amber-300 uppercase block font-bold">PF Employee (12%)</span>
                <span className="text-lg font-extrabold font-mono text-amber-200">₹{calcPfEmp.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Wage Base: ₹{calcPfWage.toLocaleString('en-IN')}</span>
              </div>

              <div className="bg-amber-900/40 p-3 rounded-xl border border-amber-500/30">
                <span className="text-[10px] text-amber-300 uppercase block font-bold">PF Employer (EPS 8.33% + EPF 3.67%)</span>
                <span className="text-lg font-extrabold font-mono text-amber-200">
                  ₹{calcEpsEmpr} EPS + ₹{calcEpfEmprDiff} EPF
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">EPS Capped at ₹15,000</span>
              </div>

              <div className="bg-teal-900/40 p-3 rounded-xl border border-teal-500/30">
                <span className="text-[10px] text-teal-300 uppercase block font-bold">ESI (0.75% Emp / 3.25% Empr)</span>
                <span className="text-lg font-extrabold font-mono text-teal-200">
                  {isEsiEligible ? `₹${calcEsiEmp} / ₹${calcEsiEmpr}` : 'Exempt (> ₹21k)'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Ceiling: ₹21,000 Gross</span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-300 uppercase block font-bold">Professional Tax ({calcState})</span>
                <span className="text-lg font-extrabold font-mono text-emerald-400">₹{calcPtAmt} / mo</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">State Statutory Slab</span>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500">Gross Payroll</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{payroll.totalGrossSalary.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm">
              <p className="text-xs text-amber-800 font-medium">PF Contribution Total (12%+12%)</p>
              <p className="text-xl font-extrabold text-amber-900 mt-1">
                ₹{(payroll.totalPfEmp + payroll.totalPfEmpr).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 shadow-sm">
              <p className="text-xs text-teal-800 font-medium">ESI Contribution Total (0.75%+3.25%)</p>
              <p className="text-xl font-extrabold text-teal-900 mt-1">
                ₹{(payroll.totalEsiEmp + payroll.totalEsiEmpr).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500">Professional Tax (PT)</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{payroll.totalPt.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Payroll Line Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 text-sm">Monthly Employee Payroll Breakdown ({payroll.monthYear})</h2>
              <span className="text-xs text-slate-500 font-medium">{payroll.lines.length} Employees Processed</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">UAN / Emp ID</th>
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3 text-right">Gross (₹)</th>
                    <th className="px-4 py-3 text-right">PF Wage (₹)</th>
                    <th className="px-4 py-3 text-right">PF Emp (12%)</th>
                    <th className="px-4 py-3 text-right">EPS Empr (8.33%)</th>
                    <th className="px-4 py-3 text-right">ESI (0.75%)</th>
                    <th className="px-4 py-3 text-right">PT (₹)</th>
                    <th className="px-4 py-3 text-right">Net Salary (₹)</th>
                    <th className="px-4 py-3 text-center">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {payroll.lines.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{l.uan}</td>
                      <td className="px-4 py-3 font-sans font-semibold text-slate-800">{l.empName}</td>
                      <td className="px-4 py-3 text-right font-bold">₹{l.grossSalary.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">₹{l.pfWage.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-amber-700 font-bold">₹{l.pfEmployee.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-amber-700">₹{l.epsEmployer.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-teal-700">₹{l.esiEmployee.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">₹{l.pt.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">₹{l.netSalary.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-center font-sans">
                        <button
                          onClick={() => setSelectedLineForPayslip(l)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2.5 py-1 rounded-lg text-[11px] transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-purple-600" /> Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BANK CMS TAB */}
      {activeSubTab === 'BANK_CMS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" /> Bulk Direct Bank Salary Payout Generators
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Generate ready-to-upload encrypted/formatted CMS salary payout files for Indian Banks with 1-click execution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* HDFC CMS */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-3 hover:border-emerald-500 transition">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-blue-900 text-sm">HDFC Bank CMS</span>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">.TXT Format</span>
                </div>
                <p className="text-xs text-slate-600">ENET Corporate NetBanking salary file structure with IFSC validation and batch headers.</p>
                <button
                  onClick={() => handleDownloadBankCms('HDFC_CMS')}
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download HDFC CMS File</span>
                </button>
              </div>

              {/* ICICI CIB */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-3 hover:border-emerald-500 transition">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-amber-900 text-sm">ICICI Bank CIB Bulk</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">.CSV Format</span>
                </div>
                <p className="text-xs text-slate-600">Corporate Internet Banking (CIB) salary payment batch format with remark tracking.</p>
                <button
                  onClick={() => handleDownloadBankCms('ICICI_CIB')}
                  className="w-full bg-amber-800 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>Download ICICI CIB File</span>
                </button>
              </div>

              {/* SBI Corporate */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-3 hover:border-emerald-500 transition">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-emerald-900 text-sm">SBI Corporate Salary</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">.CSV Format</span>
                </div>
                <p className="text-xs text-slate-600">State Bank of India Corporate Bulk Payment file format for direct account credits.</p>
                <button
                  onClick={() => handleDownloadBankCms('SBI_BULK')}
                  className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Download className="w-4 h-4 text-emerald-200" />
                  <span>Download SBI Bulk File</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHALLAN TAB */}
      {activeSubTab === 'CHALLAN' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600" /> Statutory EPFO / ESIC Monthly Challan Computation ({payroll.monthYear})
            </h2>

            {/* EPFO Challan Account Breakup Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-amber-900 text-amber-100 p-3 font-bold flex justify-between items-center">
                <span>EPFO MONTHLY CHALLAN STATEMENT (A/c 1, 2, 10, 21, 22)</span>
                <span className="font-mono text-amber-300 font-extrabold">Total Challan: ₹{totalEpfoChallan.toLocaleString('en-IN')}</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="p-3">EPFO Account Description</th>
                    <th className="p-3 text-center">Account No</th>
                    <th className="p-3 text-right">Contribution Rate</th>
                    <th className="p-3 text-right">Amount Payable (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="p-3 font-sans font-medium text-slate-900">EPF Employee Contribution (12%)</td>
                    <td className="p-3 text-center font-bold">A/c 1</td>
                    <td className="p-3 text-right text-slate-500">12.00%</td>
                    <td className="p-3 text-right font-bold text-amber-700">₹{epfAc1_Emp.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-slate-900">EPS Pension Fund (Employer Share)</td>
                    <td className="p-3 text-center font-bold">A/c 10</td>
                    <td className="p-3 text-right text-slate-500">8.33%</td>
                    <td className="p-3 text-right font-bold text-amber-700">₹{epfAc10_Eps.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-slate-900">EPF Employer Difference Share</td>
                    <td className="p-3 text-center font-bold">A/c 1</td>
                    <td className="p-3 text-right text-slate-500">3.67%</td>
                    <td className="p-3 text-right font-bold text-amber-700">₹{epfAc1_EmprDiff.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-slate-900">PF Administration Charges</td>
                    <td className="p-3 text-center font-bold">A/c 2</td>
                    <td className="p-3 text-right text-slate-500">0.50%</td>
                    <td className="p-3 text-right font-bold text-slate-800">₹{epfAc2_Admin.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-medium text-slate-900">EDLI Contribution</td>
                    <td className="p-3 text-center font-bold">A/c 21</td>
                    <td className="p-3 text-right text-slate-500">0.50%</td>
                    <td className="p-3 text-right font-bold text-slate-800">₹{epfAc21_Edli.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAX ESTIMATOR TAB */}
      {activeSubTab === 'TAX_ESTIMATOR' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-600" /> Form 16 Tax Regime Estimator (Old vs New Regime u/s 115BAC)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Interactive Employee Tax Planning tool to determine the optimal tax regime for Form 16 Part B TDS deduction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Annual Gross Salary (₹)</label>
              <input
                type="number"
                value={taxAnnualGross}
                onChange={(e) => setTaxAnnualGross(Number(e.target.value))}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">80C Deductions (PPF/ELSS/EPF)</label>
              <input
                type="number"
                value={tax80c}
                onChange={(e) => setTax80c(Number(e.target.value))}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">80D Health Insurance</label>
              <input
                type="number"
                value={tax80d}
                onChange={(e) => setTax80d(Number(e.target.value))}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">HRA Exemption (₹)</label>
              <input
                type="number"
                value={taxHraExemption}
                onChange={(e) => setTaxHraExemption(Number(e.target.value))}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Old Regime */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">OLD TAX REGIME</span>
              <p className="text-xs text-slate-300">With 80C, 80D & HRA Exemptions</p>
              <div className="pt-2 text-2xl font-black font-mono text-amber-400">
                ₹{oldTax.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">Tax Payable</span>
              </div>
              <p className="text-[11px] text-slate-400">Taxable Base: ₹{oldTaxable.toLocaleString('en-IN')}</p>
            </div>

            {/* New Regime */}
            <div className="p-5 bg-emerald-950 text-white rounded-2xl border border-emerald-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-emerald-300">NEW TAX REGIME (DEFAULT u/s 115BAC)</span>
                {newTax <= oldTax && (
                  <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">Recommended</span>
                )}
              </div>
              <p className="text-xs text-slate-300">Flat Slabs + ₹75,000 Standard Deduction</p>
              <div className="pt-2 text-2xl font-black font-mono text-emerald-400">
                ₹{newTax.toLocaleString('en-IN')} <span className="text-xs font-normal text-emerald-200">Tax Payable</span>
              </div>
              <p className="text-[11px] text-emerald-300">
                Tax Savings under New Regime: <span className="font-bold">₹{Math.max(0, oldTax - newTax).toLocaleString('en-IN')}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {selectedLineForPayslip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh] border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Salary Slip for {selectedLineForPayslip.empName} ({payroll.monthYear})
                </h3>
              </div>
              <button
                onClick={() => setSelectedLineForPayslip(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-800 font-sans">
              <div className="text-center border-b border-slate-200 pb-4">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">{company.legalName}</h2>
                <p className="text-slate-500">{company.address}, {company.city}, {company.state} - {company.pincode}</p>
                <p className="text-slate-400 text-[11px]">PAN: {company.pan} | TAN: {company.tan} | PF Est: {company.pfCode}</p>
                <div className="mt-2 inline-block bg-slate-100 font-bold px-3 py-1 rounded-lg text-slate-800 uppercase">
                  Pay Slip for the month of {payroll.monthYear}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">Employee Name:</span> <span className="font-bold">{selectedLineForPayslip.empName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Employee ID:</span> <span className="font-bold font-mono">{selectedLineForPayslip.employeeId}</span>
                </div>
                <div>
                  <span className="text-slate-500">UAN:</span> <span className="font-bold font-mono">{selectedLineForPayslip.uan}</span>
                </div>
                <div>
                  <span className="text-slate-500">PAN:</span> <span className="font-bold font-mono">{selectedLineForPayslip.pan}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50 px-3 py-2 font-bold text-emerald-900 border-b border-slate-200 flex justify-between">
                    <span>EARNINGS</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="p-3 space-y-1.5 font-mono">
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>Basic Pay</span>
                      <span>₹{Math.round(selectedLineForPayslip.grossSalary * 0.5).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>House Rent Allowance (HRA)</span>
                      <span>₹{Math.round(selectedLineForPayslip.grossSalary * 0.2).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>Special / Other Allowances</span>
                      <span>₹{Math.round(selectedLineForPayslip.grossSalary * 0.3).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-rose-50 px-3 py-2 font-bold text-rose-900 border-b border-slate-200 flex justify-between">
                    <span>DEDUCTIONS</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="p-3 space-y-1.5 font-mono">
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>Provident Fund (EPF 12%)</span>
                      <span>₹{selectedLineForPayslip.pfEmployee.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>ESI Employee Contribution</span>
                      <span>₹{selectedLineForPayslip.esiEmployee.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-sans text-slate-600">
                      <span>Professional Tax (PT)</span>
                      <span>₹{selectedLineForPayslip.pt.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">NET TAKE-HOME SALARY</span>
                  <span className="text-xs text-emerald-400 font-medium">Direct Bank Transfer Credit</span>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  ₹{selectedLineForPayslip.netSalary.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between items-center">
                <span>Computer generated payslip — no signature required.</span>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1 rounded-lg text-[11px] flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Payslip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
