import React, { useRef, useState } from 'react';
import { Company, SalesInvoice, PurchaseInvoice } from '../types';
import { generateGstr3bSummary } from '../lib/generators/gstGenerator';
import { GstDocumentParser } from './GstDocumentParser';
import { Gst3bAutoSetoff } from './Gst3bAutoSetoff';
import { GstReconciliations } from './GstReconciliations';
import {
  FileText,
  Download,
  Upload,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

interface GstModuleProps {
  company: Company | null;
  sales: SalesInvoice[];
  purchases: PurchaseInvoice[];
  onGenerateFile: (fileType: string) => void;
  onImportSales?: (sales: Omit<SalesInvoice, 'id'>[]) => void;
  onImportPurchases?: (purchases: Omit<PurchaseInvoice, 'id'>[]) => void;
  initialSubTab?: string;
}

export const GstModule: React.FC<GstModuleProps> = ({
  company,
  sales,
  purchases,
  onGenerateFile,
  onImportSales,
  onImportPurchases,
  initialSubTab,
}) => {
  const [activeTab, setActiveTab] = useState<'PARSER' | 'SALES' | 'PURCHASE' | 'GSTR3B' | 'RECON'>(
    (initialSubTab as any) || 'PARSER'
  );

  React.useEffect(() => {
    if (initialSubTab && ['PARSER', 'SALES', 'PURCHASE', 'GSTR3B', 'RECON'].includes(initialSubTab)) {
      setActiveTab(initialSubTab as any);
    }
  }, [initialSubTab]);

  const [searchSales, setSearchSales] = useState('');
  const [searchPurchases, setSearchPurchases] = useState('');
  const parserSectionRef = useRef<HTMLDivElement | null>(null);

  const handleOpenParser = () => {
    setActiveTab('PARSER');
    setTimeout(() => {
      parserSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  if (!company) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Please select a company to manage GST compliance.</div>;
  }

  const compSales = sales.filter((s) => s.companyId === company.id);
  const compPurchases = purchases.filter((p) => p.companyId === company.id);

  // Compute key GST KPI summary metrics
  const totalOutwardTaxable = compSales.reduce((a, b) => a + b.taxableValue, 0);
  const totalOutwardTax = compSales.reduce((a, b) => a + b.igst + b.cgst + b.sgst, 0);

  const totalInwardTaxable = compPurchases.reduce((a, b) => a + b.taxableValue, 0);
  const totalEligibleItc = compPurchases.reduce((a, b) => a + (b.itcEligible === 'Y' ? b.igst + b.cgst + b.sgst : 0), 0);

  const netEstimatedPayable = Math.max(0, totalOutwardTax - totalEligibleItc);

  const filteredSales = compSales.filter((s) => {
    if (!searchSales) return true;
    const q = searchSales.toLowerCase();
    return (
      s.invoiceNo.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      (s.customerGstin && s.customerGstin.toLowerCase().includes(q))
    );
  });

  const filteredPurchases = compPurchases.filter((p) => {
    if (!searchPurchases) return true;
    const q = searchPurchases.toLowerCase();
    return (
      p.invoiceNo.toLowerCase().includes(q) ||
      p.vendorName.toLowerCase().includes(q) ||
      p.vendorGstin.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              GSTIN: {company.gstin}
            </span>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Return Period: June 2026
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            <FileText className="w-6 h-6 text-blue-600 shrink-0" /> GST Compliance Workspace
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            GSTR-1 JSON Generator, PDF/Excel Invoice Parser, GSTR-3B Auto Set-off Engine & Reconciliations
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={handleOpenParser}
            className="bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
            title="Upload and parse PDF / Excel invoices"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Upload & Parse Invoices</span>
          </button>

          <button
            onClick={() => onGenerateFile('GSTR1_JSON')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
            title="GST Portal Official Offline Tool Format"
          >
            <Download className="w-3.5 h-3.5" />
            <span>GSTR-1 JSON</span>
          </button>

          <button
            onClick={() => onGenerateFile('GSTR1_REGISTER_CSV')}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
            title="Complete Sales Register CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Sales CSV</span>
          </button>

          <button
            onClick={() => onGenerateFile('GSTR3B_EXCEL')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>3B Excel</span>
          </button>
        </div>
      </div>

      {/* Executive Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" /> Outward Tax (GSTR-1)
          </span>
          <p className="text-xl font-black text-slate-900 font-mono">₹{totalOutwardTax.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-500">Taxable: ₹{totalOutwardTaxable.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" /> Available ITC (GSTR-2B)
          </span>
          <p className="text-xl font-black text-emerald-950 font-mono">₹{totalEligibleItc.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-emerald-700">Inward Taxable: ₹{totalInwardTaxable.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/30 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-purple-800 tracking-wider flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-purple-600" /> Net Cash Tax (GSTR-3B)
          </span>
          <p className="text-xl font-black text-purple-950 font-mono">₹{netEstimatedPayable.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-purple-700">Before cash ledger credit</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Reconciliation Health
          </span>
          <p className="text-xl font-black text-emerald-700 font-mono">100% In Sync</p>
          <p className="text-[11px] text-slate-500">Books & GSTR-2B matched</p>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center overflow-x-auto whitespace-nowrap gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold scrollbar-none border border-slate-200">
        <button
          onClick={handleOpenParser}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition shrink-0 ${
            activeTab === 'PARSER' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-4 h-4" /> 1. Upload & Parse Invoices
        </button>

        <button
          onClick={() => setActiveTab('SALES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition shrink-0 ${
            activeTab === 'SALES' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" /> 2. Sales Register (GSTR-1) [{compSales.length}]
        </button>

        <button
          onClick={() => setActiveTab('PURCHASE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition shrink-0 ${
            activeTab === 'PURCHASE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> 3. Purchases & GSTR-2B [{compPurchases.length}]
        </button>

        <button
          onClick={() => setActiveTab('GSTR3B')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition shrink-0 ${
            activeTab === 'GSTR3B' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4" /> 4. GSTR-3B Auto Set-off & Cash Ledger
        </button>

        <button
          onClick={() => setActiveTab('RECON')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition shrink-0 ${
            activeTab === 'RECON' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" /> 5. Reconciliations (2B & 3B)
        </button>
      </div>

      {/* TAB 1: DOCUMENT PARSER & UPLOAD */}
      {activeTab === 'PARSER' && (
        <div ref={parserSectionRef}>
          <GstDocumentParser
            company={company}
            onImportSales={onImportSales}
            onImportPurchases={onImportPurchases}
          />
        </div>
      )}

      {/* TAB 2: SALES REGISTER (GSTR-1) */}
      {activeTab === 'SALES' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search sales invoice, customer, GSTIN..."
                value={searchSales}
                onChange={(e) => setSearchSales(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredSales.length} of {compSales.length} Invoices
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="px-4 py-3">Inv No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">GSTIN</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">HSN</th>
                    <th className="px-4 py-3 text-right">Taxable (₹)</th>
                    <th className="px-4 py-3 text-right">IGST (₹)</th>
                    <th className="px-4 py-3 text-right">CGST (₹)</th>
                    <th className="px-4 py-3 text-right">SGST (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{s.invoiceNo}</td>
                      <td className="px-4 py-3 text-slate-600">{s.invoiceDate}</td>
                      <td className="px-4 py-3 font-sans font-semibold text-slate-800">{s.customerName}</td>
                      <td className="px-4 py-3">{s.customerGstin || 'URD'}</td>
                      <td className="px-4 py-3 font-sans">
                        <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {s.invoiceType}
                        </span>
                      </td>
                      <td className="px-4 py-3">{s.hsnCode}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">₹{s.taxableValue.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-slate-600">₹{s.igst.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-slate-600">₹{s.cgst.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-slate-600">₹{s.sgst.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PURCHASE REGISTER & GSTR-2B */}
      {activeTab === 'PURCHASE' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search purchase invoice, vendor, GSTIN..."
                value={searchPurchases}
                onChange={(e) => setSearchPurchases(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredPurchases.length} of {compPurchases.length} Inward Records
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="px-4 py-3">Inv No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Vendor Name</th>
                    <th className="px-4 py-3">Vendor GSTIN</th>
                    <th className="px-4 py-3">ITC Status</th>
                    <th className="px-4 py-3 text-right">Taxable (₹)</th>
                    <th className="px-4 py-3 text-right">Total Tax / ITC (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredPurchases.map((p) => {
                    const totalTax = p.igst + p.cgst + p.sgst + p.cess;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{p.invoiceNo}</td>
                        <td className="px-4 py-3 text-slate-600">{p.invoiceDate}</td>
                        <td className="px-4 py-3 font-sans font-semibold text-slate-800">{p.vendorName}</td>
                        <td className="px-4 py-3">{p.vendorGstin}</td>
                        <td className="px-4 py-3 font-sans">
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            ELIGIBLE
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">₹{p.taxableValue.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">₹{totalTax.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GSTR-3B AUTO SET-OFF & CASH LEDGER */}
      {activeTab === 'GSTR3B' && (
        <Gst3bAutoSetoff
          company={company}
          sales={sales}
          purchases={purchases}
          onGenerateFile={onGenerateFile}
        />
      )}

      {/* TAB 5: RECONCILIATIONS */}
      {activeTab === 'RECON' && (
        <GstReconciliations
          company={company}
          sales={sales}
          purchases={purchases}
          onImportPurchases={onImportPurchases}
        />
      )}
    </div>
  );
};
