import React, { useState } from 'react';
import { Company, VendorPayment, PayrollRun } from '../types';
import { TDS_SECTIONS } from '../lib/taxRules';
import { calculateTdsForPayment } from '../lib/tdsEngine';
import { validatePan } from '../lib/validation';
import { ImportModal } from './ImportModal';
import {
  FileCode2,
  Download,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  X,
  Upload,
} from 'lucide-react';

interface TdsModuleProps {
  company: Company | null;
  vendorPayments: VendorPayment[];
  payroll: PayrollRun | null;
  onGenerateFile: (fileType: string) => void;
  onCreateVendorPayment?: (payment: Omit<VendorPayment, 'id'>) => void;
  onUpdateVendorPayment?: (id: string, payment: Partial<VendorPayment>) => void;
  onDeleteVendorPayment?: (id: string) => void;
  onImportVendorPayments?: (payments: Omit<VendorPayment, 'id'>[]) => void;
}

export const TdsModule: React.FC<TdsModuleProps> = ({
  company,
  vendorPayments,
  payroll,
  onGenerateFile,
  onCreateVendorPayment,
  onUpdateVendorPayment,
  onDeleteVendorPayment,
  onImportVendorPayments,
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // TDS Interactive Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(100000);
  const [calcSection, setCalcSection] = useState<string>('194J');
  const [calcPan, setCalcPan] = useState<string>('ABCDE1234F');
  const [calcIsIndividual, setCalcIsIndividual] = useState<boolean>(true);

  // Form State for Payment Modal
  const [formPayNo, setFormPayNo] = useState('');
  const [formPayDate, setFormPayDate] = useState('2026-06-18');
  const [formVendorName, setFormVendorName] = useState('');
  const [formVendorPan, setFormVendorPan] = useState('');
  const [formSection, setFormSection] = useState('194C');
  const [formInvoiceAmt, setFormInvoiceAmt] = useState<number>(50000);
  const [formBsr, setFormBsr] = useState('0510001');
  const [formChallanNo, setFormChallanNo] = useState('CHL901');
  const [formChallanDate, setFormChallanDate] = useState('2026-06-25');

  if (!company) {
    return <div className="p-8 text-center text-slate-500">Please select a company to view TDS module.</div>;
  }

  const compPayments = vendorPayments.filter((v) => v.companyId === company.id);
  const filteredPayments =
    selectedSection === 'ALL' ? compPayments : compPayments.filter((p) => p.sectionCode === selectedSection);

  const totalPayment = filteredPayments.reduce((acc, p) => acc + p.invoiceAmount, 0);
  const totalTdsDeducted = filteredPayments.reduce((acc, p) => acc + p.tdsDeducted, 0);

  // Live calculation for calculator widget
  const calcResult = calculateTdsForPayment({
    sectionCode: calcSection,
    invoiceAmount: calcAmount,
    vendorPan: calcPan,
    isIndividualOrHuf: calcIsIndividual,
  });

  // Calculate live TDS for modal
  const modalCalcResult = calculateTdsForPayment({
    sectionCode: formSection,
    invoiceAmount: formInvoiceAmt,
    vendorPan: formVendorPan,
  });

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormPayNo(`PAY-${Date.now().toString().slice(-4)}`);
    setFormPayDate('2026-06-18');
    setFormVendorName('');
    setFormVendorPan('');
    setFormSection('194C');
    setFormInvoiceAmt(50000);
    setFormBsr('0510001');
    setFormChallanNo(`CHL${Math.floor(100 + Math.random() * 900)}`);
    setFormChallanDate('2026-06-25');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: VendorPayment) => {
    setEditingId(p.id);
    setFormPayNo(p.paymentNo);
    setFormPayDate(p.paymentDate);
    setFormVendorName(p.vendorName);
    setFormVendorPan(p.vendorPan);
    setFormSection(p.sectionCode);
    setFormInvoiceAmt(p.invoiceAmount);
    setFormBsr(p.bsrCode || '0510001');
    setFormChallanNo(p.challanNo || 'CHL901');
    setFormChallanDate(p.challanDate || p.paymentDate);
    setIsModalOpen(true);
  };

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    const payData: Omit<VendorPayment, 'id'> = {
      companyId: company.id,
      paymentNo: formPayNo,
      paymentDate: formPayDate,
      vendorName: formVendorName,
      vendorPan: formVendorPan.toUpperCase(),
      sectionCode: formSection,
      natureOfPayment: TDS_SECTIONS[formSection]?.name || 'Services / Works',
      invoiceAmount: formInvoiceAmt,
      paymentAmount: formInvoiceAmt - modalCalcResult.tdsAmount,
      tdsRate: modalCalcResult.applicableRate,
      tdsDeducted: modalCalcResult.tdsAmount,
      tdsDeposited: modalCalcResult.tdsAmount,
      bsrCode: formBsr,
      challanNo: formChallanNo,
      challanDate: formChallanDate,
      quarter: 'Q1',
      financialYear: company.financialYear,
    };

    if (editingId && onUpdateVendorPayment) {
      onUpdateVendorPayment(editingId, payData);
    } else if (onCreateVendorPayment) {
      onCreateVendorPayment(payData);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetModule="VENDOR_TDS"
        company={company}
        onImportVendorPayments={onImportVendorPayments}
      />

      {/* Top Banner & Generation Toolbar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileCode2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 shrink-0" /> TDS Statutory Engine & FVU Generator
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            Form 26Q (Non-Salary), Form 24Q (Salary), Form 27A Control Chart & CSV Annexures
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
            <span>Import TDS Data</span>
          </button>

          <button
            onClick={() => onGenerateFile('TDS_26Q_FVU')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Form 26Q FVU</span>
          </button>
          <button
            onClick={() => onGenerateFile('TDS_26Q_CSV')}
            className="bg-purple-100 text-purple-800 hover:bg-purple-200 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>26Q CSV</span>
          </button>
          <button
            onClick={() => onGenerateFile('TDS_24Q_FVU')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Form 24Q FVU</span>
          </button>
          <button
            onClick={() => onGenerateFile('FORM_27A_TXT')}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Form 27A</span>
          </button>
        </div>
      </div>

      {/* TDS Rules & Calculator Tool Card */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-purple-400" />
          <h3 className="font-extrabold text-base tracking-wide">Interactive TDS Section Calculator & Sec 206AA Threshold Checker</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Section Code</label>
            <select
              value={calcSection}
              onChange={(e) => setCalcSection(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-400"
            >
              {Object.keys(TDS_SECTIONS).map((sec) => (
                <option key={sec} value={sec}>
                  Sec {sec} - {TDS_SECTIONS[sec].name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Invoice Amount (₹)</label>
            <input
              type="number"
              value={calcAmount}
              onChange={(e) => setCalcAmount(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Vendor PAN</label>
            <input
              type="text"
              value={calcPan}
              onChange={(e) => setCalcPan(e.target.value.toUpperCase())}
              placeholder="e.g. ABCDE1234F"
              className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Deductee Entity Type</label>
            <select
              value={calcIsIndividual ? 'IND' : 'OTH'}
              onChange={(e) => setCalcIsIndividual(e.target.value === 'IND')}
              className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-400"
            >
              <option value="IND">Individual / HUF</option>
              <option value="OTH">Company / Firm / Others</option>
            </select>
          </div>
        </div>

        {/* Calculation Summary Box */}
        <div className="mt-4 bg-purple-950/60 p-4 rounded-xl border border-purple-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-purple-200">{calcResult.sectionName}</span>
              {calcResult.isPenalized206AA ? (
                <span className="bg-red-500/30 border border-red-500/50 text-red-200 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Sec 206AA Penal 20%
                </span>
              ) : (
                <span className="bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Standard Rate
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">{calcResult.ruleAppliedNote}</p>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Applicable Rate</span>
              <span className="text-xl font-extrabold text-purple-300 font-mono">{calcResult.applicableRate}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">TDS Amount</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                ₹{calcResult.tdsAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Vendor Invoices</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">₹{totalPayment.toLocaleString('en-IN')}</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 shadow-sm">
          <p className="text-xs text-purple-800 font-medium">TDS Deducted (Form 26Q)</p>
          <p className="text-xl font-extrabold text-purple-900 mt-1">₹{totalTdsDeducted.toLocaleString('en-IN')}</p>
        </div>
        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Salary TDS (Form 24Q)</p>
          <p className="text-xl font-extrabold text-emerald-400 mt-1">
            ₹{(payroll?.totalTds || 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Vendor Payment Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-900 text-sm">Vendor Payment Register (Form 26Q)</h2>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setSelectedSection('ALL')}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] font-bold ${
                  selectedSection === 'ALL'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({compPayments.length})
              </button>
              {Object.keys(TDS_SECTIONS).map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSection(sec)}
                  className={`px-2 py-1 rounded-lg transition text-[11px] font-semibold ${
                    selectedSection === sec
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Sec {sec}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Vendor Payment
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3">Pay No</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor Name</th>
                <th className="px-4 py-3">Vendor PAN</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3 text-right">Invoice Amt (₹)</th>
                <th className="px-4 py-3 text-right">Rate (%)</th>
                <th className="px-4 py-3 text-right">TDS (₹)</th>
                <th className="px-4 py-3">Challan & BSR</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{p.paymentNo}</td>
                  <td className="px-4 py-3">{p.paymentDate}</td>
                  <td className="px-4 py-3 font-sans font-semibold text-slate-800">{p.vendorName}</td>
                  <td className="px-4 py-3">{p.vendorPan}</td>
                  <td className="px-4 py-3 font-sans">
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                      {p.sectionCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">₹{p.invoiceAmount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right">{p.tdsRate}%</td>
                  <td className="px-4 py-3 text-right font-bold text-purple-700">
                    ₹{p.tdsDeducted.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-sans text-slate-600 text-[11px]">
                    {p.challanNo || 'CHL901'} ({p.bsrCode || '0510001'})
                  </td>
                  <td className="px-4 py-3 text-right font-sans space-x-1">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1 text-slate-400 hover:text-purple-600 transition"
                      title="Edit Payment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteVendorPayment && (
                      <button
                        onClick={() => onDeleteVendorPayment(p.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition"
                        title="Delete Payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingId ? 'Edit Vendor Payment' : 'Add Vendor Payment'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment / Voucher No</label>
                  <input
                    type="text"
                    required
                    value={formPayNo}
                    onChange={(e) => setFormPayNo(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-lg font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={formPayDate}
                    onChange={(e) => setFormPayDate(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    required
                    value={formVendorName}
                    onChange={(e) => setFormVendorName(e.target.value)}
                    placeholder="e.g. Acme Tech Solutions"
                    className="w-full border border-slate-300 p-2 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Vendor PAN</label>
                  <input
                    type="text"
                    required
                    value={formVendorPan}
                    onChange={(e) => setFormVendorPan(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full border border-slate-300 p-2 rounded-lg font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">TDS Section</label>
                  <select
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-lg focus:border-purple-500 focus:outline-none"
                  >
                    {Object.keys(TDS_SECTIONS).map((sec) => (
                      <option key={sec} value={sec}>
                        Sec {sec} - {TDS_SECTIONS[sec].name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Invoice Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={formInvoiceAmt}
                    onChange={(e) => setFormInvoiceAmt(Number(e.target.value))}
                    className="w-full border border-slate-300 p-2 rounded-lg font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Calculated TDS Banner */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-purple-800 font-bold block uppercase">
                    Auto-Calculated TDS ({modalCalcResult.applicableRate}%)
                  </span>
                  <span className="text-xs text-purple-600">{modalCalcResult.ruleAppliedNote}</span>
                </div>
                <span className="text-lg font-black text-purple-900 font-mono">
                  ₹{modalCalcResult.tdsAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">BSR Code</label>
                  <input
                    type="text"
                    value={formBsr}
                    onChange={(e) => setFormBsr(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-lg font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Challan No</label>
                  <input
                    type="text"
                    value={formChallanNo}
                    onChange={(e) => setFormChallanNo(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-lg font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Challan Date</label>
                  <input
                    type="date"
                    value={formChallanDate}
                    onChange={(e) => setFormChallanDate(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow"
                >
                  Save Payment Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
