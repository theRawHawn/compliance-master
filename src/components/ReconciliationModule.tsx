import React, { useState } from 'react';
import { Company, PurchaseInvoice, GeneratedFile } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileSpreadsheet,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReconciliationModuleProps {
  company: Company | null;
  purchases: PurchaseInvoice[];
  generatedFiles: GeneratedFile[];
  onNavigateTab: (tab: string) => void;
  initialSubTab?: string;
}

interface Gstr2bRecord {
  id: string;
  vendorGstin: string;
  vendorName: string;
  invoiceNo: string;
  invoiceDate: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  filingStatus: 'FILED' | 'NOT_FILED';
  filingDate?: string;
}

export const ReconciliationModule: React.FC<ReconciliationModuleProps> = ({
  company,
  purchases,
  generatedFiles,
  onNavigateTab,
  initialSubTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'RECON' | 'CALENDAR'>(
    (initialSubTab as any) || 'RECON'
  );

  React.useEffect(() => {
    if (initialSubTab && ['RECON', 'CALENDAR'].includes(initialSubTab)) {
      setActiveSubTab(initialSubTab as any);
    }
  }, [initialSubTab]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  if (!company) {
    return <div className="p-8 text-center text-slate-500">Please select a company to view Reconciliation & Compliance.</div>;
  }

  const compPurchases = purchases.filter((p) => p.companyId === company.id);

  // Simulated GSTR-2B Portal Data derived for demonstration
  const mockGstr2bRecords: Gstr2bRecord[] = compPurchases.map((p, idx) => {
    // Introduce a couple of simulated mismatches for audit demonstration
    if (idx === 1) {
      // Amount mismatch
      return {
        id: `2B-${idx}`,
        vendorGstin: p.vendorGstin,
        vendorName: p.vendorName,
        invoiceNo: p.invoiceNo,
        invoiceDate: p.invoiceDate,
        taxableValue: p.taxableValue + 2000,
        igst: p.igst > 0 ? p.igst + 360 : 0,
        cgst: p.cgst > 0 ? p.cgst + 180 : 0,
        sgst: p.sgst > 0 ? p.sgst + 180 : 0,
        filingStatus: 'FILED',
        filingDate: '2026-06-11',
      };
    } else if (idx === 3) {
      // Missing in portal
      return {
        id: `2B-${idx}`,
        vendorGstin: p.vendorGstin,
        vendorName: p.vendorName,
        invoiceNo: `${p.invoiceNo}-PORTAL-DIFF`,
        invoiceDate: p.invoiceDate,
        taxableValue: p.taxableValue,
        igst: p.igst,
        cgst: p.cgst,
        sgst: p.sgst,
        filingStatus: 'NOT_FILED',
      };
    }
    // Fully matched
    return {
      id: `2B-${idx}`,
      vendorGstin: p.vendorGstin,
      vendorName: p.vendorName,
      invoiceNo: p.invoiceNo,
      invoiceDate: p.invoiceDate,
      taxableValue: p.taxableValue,
      igst: p.igst,
      cgst: p.cgst,
      sgst: p.sgst,
      filingStatus: 'FILED',
      filingDate: '2026-06-10',
    };
  });

  // Add one extra record in 2B that is NOT in purchase register
  mockGstr2bRecords.push({
    id: `2B-EXTRA-01`,
    vendorGstin: '27AABCU9988K1ZM',
    vendorName: 'Global Logistics Pvt Ltd',
    invoiceNo: 'GL/2026/089',
    invoiceDate: '2026-06-15',
    taxableValue: 45000,
    igst: 8100,
    cgst: 0,
    sgst: 0,
    filingStatus: 'FILED',
    filingDate: '2026-06-11',
  });

  // Reconciliation Logic
  const reconciliationList = compPurchases.map((pur) => {
    const match2b = mockGstr2bRecords.find(
      (b) => b.vendorGstin === pur.vendorGstin && b.invoiceNo.trim().toLowerCase() === pur.invoiceNo.trim().toLowerCase()
    );

    let matchStatus: 'MATCHED' | 'TAX_MISMATCH' | 'NOT_IN_2B' = 'NOT_IN_2B';
    let difference = 0;
    let note = 'Supplier has not filed GSTR-1. Hold ITC.';

    if (match2b) {
      const purTax = pur.igst + pur.cgst + pur.sgst;
      const bTax = match2b.igst + match2b.cgst + match2b.sgst;
      difference = Math.abs(purTax - bTax);

      if (difference < 1 && Math.abs(pur.taxableValue - match2b.taxableValue) < 1) {
        matchStatus = 'MATCHED';
        note = 'Perfect match with GSTR-2B portal. 100% ITC Eligible.';
      } else {
        matchStatus = 'TAX_MISMATCH';
        note = `Value mismatch. Books Tax: ₹${purTax}, Portal Tax: ₹${bTax}`;
      }
    }

    return {
      purchase: pur,
      gstr2b: match2b,
      matchStatus,
      difference,
      note,
    };
  });

  // Records in 2B not in Purchase Register
  const extraIn2B = mockGstr2bRecords.filter(
    (b) => !compPurchases.some((p) => p.vendorGstin === b.vendorGstin && p.invoiceNo.trim().toLowerCase() === b.invoiceNo.trim().toLowerCase())
  );

  const matchedCount = reconciliationList.filter((r) => r.matchStatus === 'MATCHED').length;
  const mismatchCount = reconciliationList.filter((r) => r.matchStatus === 'TAX_MISMATCH').length;
  const notIn2bCount = reconciliationList.filter((r) => r.matchStatus === 'NOT_IN_2B').length;

  const totalBooksItc = compPurchases.reduce((a, c) => a + c.igst + c.cgst + c.sgst, 0);
  const total2bItc = mockGstr2bRecords.reduce((a, c) => a + c.igst + c.cgst + c.sgst, 0);
  const eligibleMatchedItc = reconciliationList
    .filter((r) => r.matchStatus === 'MATCHED')
    .reduce((a, r) => a + r.purchase.igst + r.purchase.cgst + r.purchase.sgst, 0);

  // Filtered List for Table
  const filteredRecon = reconciliationList.filter((item) => {
    if (filterStatus !== 'ALL' && item.matchStatus !== filterStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.purchase.vendorName.toLowerCase().includes(q) ||
        item.purchase.invoiceNo.toLowerCase().includes(q) ||
        item.purchase.vendorGstin.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Export Reconciliation to CSV
  const handleExportReconCsv = () => {
    const rows: any[][] = [
      ['GSTR-2B vs Purchase Register Audit Reconciliation', company.legalName, `GSTIN: ${company.gstin}`, `FY: ${company.financialYear}`],
      [],
      [
        'S.No',
        'Vendor Name',
        'Vendor GSTIN',
        'Invoice No',
        'Invoice Date',
        'Books Taxable (INR)',
        'Books ITC (INR)',
        '2B Taxable (INR)',
        '2B ITC (INR)',
        'Recon Status',
        'Difference (INR)',
        'Audit Remark',
      ],
    ];

    reconciliationList.forEach((r, idx) => {
      const purTax = r.purchase.igst + r.purchase.cgst + r.purchase.sgst;
      const bTax = r.gstr2b ? r.gstr2b.igst + r.gstr2b.cgst + r.gstr2b.sgst : 0;
      rows.push([
        idx + 1,
        r.purchase.vendorName,
        r.purchase.vendorGstin,
        r.purchase.invoiceNo,
        r.purchase.invoiceDate,
        r.purchase.taxableValue,
        purTax,
        r.gstr2b ? r.gstr2b.taxableValue : 0,
        bTax,
        r.matchStatus,
        r.difference,
        r.note,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${company.gstin}_GSTR2B_Reconciliation_${company.financialYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compliance Calendar Items
  const complianceSchedule = [
    {
      id: 'GST-01',
      title: 'GSTR-1 Outward Supplies Return',
      dueDate: '11th of every month',
      period: 'June (FY 2026-27)',
      module: 'GST',
      status: generatedFiles.some((f) => f.module === 'GST' && f.fileType.includes('GSTR1')) ? 'FILED' : 'DUE_SOON',
      actionTab: 'gst',
      actionText: 'Go to GST Generator',
    },
    {
      id: 'GST-3B',
      title: 'GSTR-3B Summary Return & Tax Payment',
      dueDate: '20th of every month',
      period: 'June (FY 2026-27)',
      module: 'GST',
      status: generatedFiles.some((f) => f.fileType === 'GSTR3B_EXCEL') ? 'FILED' : 'UPCOMING',
      actionTab: 'gst',
      actionText: 'Generate GSTR-3B Excel',
    },
    {
      id: 'TDS-26Q',
      title: 'Form 26Q Non-Salary Quarterly Return',
      dueDate: '31st July',
      period: 'Q1 (Apr - Jun 2026-27)',
      module: 'TDS',
      status: generatedFiles.some((f) => f.fileType === 'TDS_26Q_FVU') ? 'FILED' : 'UPCOMING',
      actionTab: 'tds',
      actionText: 'Generate 26Q FVU',
    },
    {
      id: 'PF-ECR',
      title: 'EPFO Monthly ECR Contribution Deposit',
      dueDate: '15th of every month',
      period: 'June (FY 2026-27)',
      module: 'PAYROLL',
      status: generatedFiles.some((f) => f.fileType === 'PF_ECR_TXT') ? 'FILED' : 'DUE_SOON',
      actionTab: 'payroll',
      actionText: 'Generate PF ECR',
    },
    {
      id: 'ESI-CSV',
      title: 'ESIC Monthly Employee Return',
      dueDate: '15th of every month',
      period: 'June (FY 2026-27)',
      module: 'PAYROLL',
      status: generatedFiles.some((f) => f.fileType === 'ESI_CSV') ? 'FILED' : 'UPCOMING',
      actionTab: 'payroll',
      actionText: 'Generate ESI Return',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" /> Audit Reconciliation
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            GSTR-2B vs Purchase Register ITC Matching Engine & Statutory Return Filing Calendar
          </p>
        </div>

        <div className="flex items-center overflow-x-auto whitespace-nowrap gap-1.5 bg-slate-100 p-1.5 rounded-xl w-full lg:w-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('RECON')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-xs transition shrink-0 ${
              activeSubTab === 'RECON' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            GSTR-2B ITC Matching
          </button>
          <button
            onClick={() => setActiveSubTab('CALENDAR')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-xs transition shrink-0 ${
              activeSubTab === 'CALENDAR' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Statutory Due Dates
          </button>
        </div>
      </div>

      {activeSubTab === 'RECON' ? (
        <>
          {/* Audit Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">Books ITC Claimed</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">₹{totalBooksItc.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{compPurchases.length} Purchase Invoices</span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm">
              <span className="text-xs text-emerald-800 font-medium">Eligible Matched ITC</span>
              <p className="text-xl font-extrabold text-emerald-900 mt-1">₹{eligibleMatchedItc.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-emerald-700 mt-0.5 block font-bold">{matchedCount} Fully Matched</span>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm">
              <span className="text-xs text-amber-800 font-medium">Tax Mismatches</span>
              <p className="text-xl font-extrabold text-amber-900 mt-1">{mismatchCount} Invoices</p>
              <span className="text-[10px] text-amber-700 mt-0.5 block">Review Tax Rates / Value Diff</span>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 shadow-sm">
              <span className="text-xs text-rose-800 font-medium">Pending Supplier Filing (Not in 2B)</span>
              <p className="text-xl font-extrabold text-rose-900 mt-1">{notIn2bCount} Invoices</p>
              <span className="text-[10px] text-rose-700 mt-0.5 block font-bold">Hold ITC until GSTR-1 filed</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Vendor or Invoice..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 w-48 sm:w-60"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-slate-200 text-xs px-3 py-1.5 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="MATCHED">Matched ({matchedCount})</option>
                  <option value="TAX_MISMATCH">Tax Mismatch ({mismatchCount})</option>
                  <option value="NOT_IN_2B">Not in GSTR-2B ({notIn2bCount})</option>
                </select>
              </div>

              <button
                onClick={handleExportReconCsv}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export Audit CSV Report</span>
              </button>
            </div>

            {/* Reconciliation Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">Vendor Details</th>
                    <th className="px-4 py-3">Invoice No & Date</th>
                    <th className="px-4 py-3 text-right">Books Taxable / Tax</th>
                    <th className="px-4 py-3 text-right">Portal 2B Tax</th>
                    <th className="px-4 py-3 text-center">Match Status</th>
                    <th className="px-4 py-3">Audit Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecon.map((item, idx) => {
                    const purTax = item.purchase.igst + item.purchase.cgst + item.purchase.sgst;
                    const bTax = item.gstr2b ? item.gstr2b.igst + item.gstr2b.cgst + item.gstr2b.sgst : 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{item.purchase.vendorName}</p>
                          <p className="text-[10px] font-mono text-slate-500">{item.purchase.vendorGstin}</p>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <p className="font-semibold text-slate-800">{item.purchase.invoiceNo}</p>
                          <p className="text-[10px] text-slate-500">{item.purchase.invoiceDate}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <p className="font-bold">₹{item.purchase.taxableValue.toLocaleString('en-IN')}</p>
                          <p className="text-slate-500 text-[11px]">Tax: ₹{purTax.toLocaleString('en-IN')}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <p className="font-bold text-slate-800">₹{bTax.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.gstr2b ? `Filed ${item.gstr2b.filingDate}` : 'Not Filed'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.matchStatus === 'MATCHED' && (
                            <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Matched
                            </span>
                          )}
                          {item.matchStatus === 'TAX_MISMATCH' && (
                            <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Tax Mismatch
                            </span>
                          )}
                          {item.matchStatus === 'NOT_IN_2B' && (
                            <span className="bg-rose-100 text-rose-800 font-bold text-[10px] px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-600" /> Not in 2B
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-[11px]">{item.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Extra in 2B Notice */}
            {extraIn2B.length > 0 && (
              <div className="p-4 bg-purple-50 border-t border-purple-200 text-xs text-purple-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-purple-950">
                  <Sparkles className="w-4 h-4 text-purple-600" /> Notice: {extraIn2B.length} Invoice(s) found in GSTR-2B Portal but missing in Purchase Books
                </div>
                {extraIn2B.map((ex) => (
                  <div key={ex.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-purple-200 font-mono">
                    <div>
                      <span className="font-bold text-slate-900">{ex.vendorName} ({ex.vendorGstin})</span>
                      <span className="text-slate-500 ml-2">Inv #{ex.invoiceNo}</span>
                    </div>
                    <span className="font-bold text-purple-700">Taxable: ₹{ex.taxableValue.toLocaleString('en-IN')} | Tax: ₹{(ex.igst + ex.cgst + ex.sgst).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Statutory Calendar View */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> Statutory Compliance Return Tracker (FY {company.financialYear})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {complianceSchedule.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:border-slate-300 transition space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase">
                        {item.module}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{item.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{item.period}</p>
                    </div>

                    {item.status === 'FILED' ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Filed
                      </span>
                    ) : item.status === 'DUE_SOON' ? (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Due Soon
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Upcoming
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-medium text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase">Statutory Deadline</span>
                    <span className="font-bold text-slate-900">{item.dueDate}</span>
                  </div>

                  <button
                    onClick={() => onNavigateTab(item.actionTab)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>{item.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
