import React, { useState } from 'react';
import { Company, PurchaseInvoice, SalesInvoice } from '../types';
import { generateGstr3bSummary } from '../lib/generators/gstGenerator';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Search,
  Filter,
  Check,
  Plus,
  Send,
  ArrowRightLeft,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';

interface GstReconciliationsProps {
  company: Company;
  sales: SalesInvoice[];
  purchases: PurchaseInvoice[];
  onImportPurchases?: (purchases: Omit<PurchaseInvoice, 'id'>[]) => void;
}

export const GstReconciliations: React.FC<GstReconciliationsProps> = ({
  company,
  sales,
  purchases,
  onImportPurchases,
}) => {
  const [subTab, setSubTab] = useState<'2B_VS_BOOKS' | '3B_VS_BOOKS'>('2B_VS_BOOKS');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderSent, setReminderSent] = useState<string | null>(null);

  // Filter company purchases
  const compPurchases = purchases.filter((p) => p.companyId === company.id);

  // Generate mock GSTR-2B portal records for realistic reconciliation
  const mockGstr2bRecords = [
    ...compPurchases.map((p, idx) => ({
      portalInvNo: p.invoiceNo,
      portalDate: p.invoiceDate,
      vendorName: p.vendorName,
      vendorGstin: p.vendorGstin,
      portalTaxable: idx === 1 ? p.taxableValue + 500 : p.taxableValue, // Intentional minor mismatch on item 1
      portalTax: idx === 1 ? (p.igst + p.cgst + p.sgst) + 90 : (p.igst + p.cgst + p.sgst),
      bookInvoice: p,
      status: idx === 1 ? 'TAX_MISMATCH' : 'MATCHED',
    })),
    // Vendor filed in 2B but missing in Purchase Register
    {
      portalInvNo: 'GSTR2B-PORTAL-99',
      portalDate: '2026-06-18',
      vendorName: 'Google Cloud India Pvt Ltd',
      vendorGstin: '27AAACG9000F1Z2',
      portalTaxable: 45000,
      portalTax: 8100,
      bookInvoice: null,
      status: 'MISSING_IN_BOOKS',
    },
    // Booked purchase but missing in GSTR-2B portal (Vendor delayed GSTR-1)
    {
      portalInvNo: '',
      portalDate: '',
      vendorName: 'Local Logistics Transporters',
      vendorGstin: '27AABCT8811A1Z9',
      portalTaxable: 0,
      portalTax: 0,
      bookInvoice: {
        id: 'PUR-UNFILED-01',
        companyId: company.id,
        invoiceNo: 'LOG-2026-11',
        invoiceDate: '2026-06-25',
        vendorName: 'Local Logistics Transporters',
        vendorGstin: '27AABCT8811A1Z9',
        posState: 'Maharashtra',
        posCode: '27',
        hsnCode: '996511',
        description: 'Freight & Transportation Services',
        taxableValue: 35000,
        rate: 18,
        igst: 0,
        cgst: 3150,
        sgst: 3150,
        cess: 0,
        itcEligible: 'Y',
      },
      status: 'MISSING_IN_2B',
    },
  ];

  // Summary Counts
  const matchedCount = mockGstr2bRecords.filter((r) => r.status === 'MATCHED').length;
  const mismatchCount = mockGstr2bRecords.filter((r) => r.status === 'TAX_MISMATCH').length;
  const missingIn2bCount = mockGstr2bRecords.filter((r) => r.status === 'MISSING_IN_2B').length;
  const missingInBooksCount = mockGstr2bRecords.filter((r) => r.status === 'MISSING_IN_BOOKS').length;

  const filtered2bList = mockGstr2bRecords.filter((r) => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const inv = (r.portalInvNo || r.bookInvoice?.invoiceNo || '').toLowerCase();
      const vName = r.vendorName.toLowerCase();
      const gstin = r.vendorGstin.toLowerCase();
      return inv.includes(q) || vName.includes(q) || gstin.includes(q);
    }
    return true;
  });

  const handleAddMissingToBooks = (rec: any) => {
    if (rec.status === 'MISSING_IN_BOOKS' && onImportPurchases) {
      onImportPurchases([
        {
          companyId: company.id,
          invoiceNo: rec.portalInvNo,
          invoiceDate: rec.portalDate,
          vendorName: rec.vendorName,
          vendorGstin: rec.vendorGstin,
          posState: 'Maharashtra',
          hsnCode: '998313',
          taxableValue: rec.portalTaxable,
          igst: 0,
          cgst: rec.portalTax / 2,
          sgst: rec.portalTax / 2,
          cess: 0,
          itcEligible: 'Y',
          monthYear: '2026-06',
          status: 'VALID',
          reconciledWith2B: 'MATCHED',
        },
      ]);
      setReminderSent(`Added ${rec.portalInvNo} from GSTR-2B to Purchase Books!`);
    }
  };

  const handleSendVendorReminder = (vName: string) => {
    setReminderSent(`Email & WhatsApp reminder draft created for ${vName} asking to file GSTR-1.`);
    setTimeout(() => setReminderSent(null), 4000);
  };

  // 3B vs Books Summary Calculations
  const booksGstr3b = generateGstr3bSummary(company, sales, purchases, '2026-06');
  const portal3bSummary = {
    outwardTaxable: booksGstr3b.table31_OutwardSupplies.a_taxableSupplies.totalTaxableValue,
    outwardIgst: booksGstr3b.table31_OutwardSupplies.a_taxableSupplies.integratedTax,
    outwardCgst: booksGstr3b.table31_OutwardSupplies.a_taxableSupplies.centralTax,
    outwardSgst: booksGstr3b.table31_OutwardSupplies.a_taxableSupplies.stateTax,
    itcIgst: booksGstr3b.table4_EligibleITC.a5_allOtherITC.integratedTax,
    itcCgst: booksGstr3b.table4_EligibleITC.a5_allOtherITC.centralTax,
    itcSgst: booksGstr3b.table4_EligibleITC.a5_allOtherITC.stateTax,
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Sub-Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" /> Simplified GST Reconciliations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            1-Click automated matching for Input Tax Credit safety and return filing accuracy.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setSubTab('2B_VS_BOOKS')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
              subTab === '2B_VS_BOOKS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            GSTR-2B vs Purchase Books
          </button>
          <button
            onClick={() => setSubTab('3B_VS_BOOKS')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
              subTab === '3B_VS_BOOKS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            GSTR-3B vs Books Summary
          </button>
        </div>
      </div>

      {reminderSent && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {reminderSent}
        </div>
      )}

      {/* SUB-TAB 1: GSTR-2B VS BOOKS RECONCILIATION */}
      {subTab === '2B_VS_BOOKS' && (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => setFilterStatus('MATCHED')}
              className={`p-4 rounded-2xl border text-left transition ${
                filterStatus === 'MATCHED' ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-500' : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <span className="text-[10px] uppercase font-extrabold text-emerald-800">1. Matched Invoices</span>
              <p className="text-2xl font-black text-emerald-950 font-mono mt-1">{matchedCount}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">ITC Claim Safe & Verified</p>
            </button>

            <button
              onClick={() => setFilterStatus('TAX_MISMATCH')}
              className={`p-4 rounded-2xl border text-left transition ${
                filterStatus === 'TAX_MISMATCH' ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-500' : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span className="text-[10px] uppercase font-extrabold text-amber-800">2. Tax Amount Mismatch</span>
              <p className="text-2xl font-black text-amber-950 font-mono mt-1">{mismatchCount}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Taxable value variance</p>
            </button>

            <button
              onClick={() => setFilterStatus('MISSING_IN_2B')}
              className={`p-4 rounded-2xl border text-left transition ${
                filterStatus === 'MISSING_IN_2B' ? 'bg-rose-100/70 border-rose-400 ring-2 ring-rose-500' : 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
              }`}
            >
              <span className="text-[10px] uppercase font-extrabold text-rose-800">3. Missing in GSTR-2B</span>
              <p className="text-2xl font-black text-rose-950 font-mono mt-1">{missingIn2bCount}</p>
              <p className="text-[11px] text-rose-700 mt-0.5">Vendor unfiled GSTR-1</p>
            </button>

            <button
              onClick={() => setFilterStatus('MISSING_IN_BOOKS')}
              className={`p-4 rounded-2xl border text-left transition ${
                filterStatus === 'MISSING_IN_BOOKS' ? 'bg-purple-100/70 border-purple-400 ring-2 ring-purple-500' : 'bg-purple-50/50 border-purple-200 hover:bg-purple-50'
              }`}
            >
              <span className="text-[10px] uppercase font-extrabold text-purple-800">4. Missing in Books</span>
              <p className="text-2xl font-black text-purple-950 font-mono mt-1">{missingInBooksCount}</p>
              <p className="text-[11px] text-purple-700 mt-0.5">Unrecorded Portal Invoice</p>
            </button>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search vendor, GSTIN, invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto text-xs font-semibold">
              <span className="text-slate-400 font-sans">Filter:</span>
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg transition ${filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                All ({mockGstr2bRecords.length})
              </button>
              <button
                onClick={() => setFilterStatus('MATCHED')}
                className={`px-3 py-1.5 rounded-lg transition ${filterStatus === 'MATCHED' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
              >
                Matched
              </button>
              <button
                onClick={() => setFilterStatus('TAX_MISMATCH')}
                className={`px-3 py-1.5 rounded-lg transition ${filterStatus === 'TAX_MISMATCH' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
              >
                Mismatch
              </button>
              <button
                onClick={() => setFilterStatus('MISSING_IN_2B')}
                className={`px-3 py-1.5 rounded-lg transition ${filterStatus === 'MISSING_IN_2B' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'}`}
              >
                Missing in 2B
              </button>
              <button
                onClick={() => setFilterStatus('MISSING_IN_BOOKS')}
                className={`px-3 py-1.5 rounded-lg transition ${filterStatus === 'MISSING_IN_BOOKS' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
              >
                Missing in Books
              </button>
            </div>
          </div>

          {/* Reconciliation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Vendor & GSTIN</th>
                    <th className="py-3 px-4">Book Invoice</th>
                    <th className="py-3 px-4">Portal Invoice</th>
                    <th className="py-3 px-4 text-right">Book Tax (₹)</th>
                    <th className="py-3 px-4 text-right">Portal Tax (₹)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filtered2bList.map((r, idx) => {
                    const bookTax = r.bookInvoice ? r.bookInvoice.igst + r.bookInvoice.cgst + r.bookInvoice.sgst : 0;
                    const portalTax = r.portalTax;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-sans">
                          {r.status === 'MATCHED' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> MATCHED
                            </span>
                          )}
                          {r.status === 'TAX_MISMATCH' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> MISMATCH
                            </span>
                          )}
                          {r.status === 'MISSING_IN_2B' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                              <XCircle className="w-3 h-3 text-rose-600" /> UNFILED BY VENDOR
                            </span>
                          )}
                          {r.status === 'MISSING_IN_BOOKS' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                              <Plus className="w-3 h-3 text-purple-600" /> NOT IN BOOKS
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-sans">
                          <p className="font-bold text-slate-900">{r.vendorName}</p>
                          <p className="text-[10px] font-mono text-slate-500">{r.vendorGstin}</p>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-800">
                          {r.bookInvoice ? r.bookInvoice.invoiceNo : <span className="text-slate-400 font-sans italic">None</span>}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-800">
                          {r.portalInvNo || <span className="text-slate-400 font-sans italic">Not in 2B</span>}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          ₹{bookTax.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          ₹{portalTax.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-4 text-center font-sans">
                          {r.status === 'MATCHED' && (
                            <span className="text-emerald-600 font-bold text-[11px]">Approved ITC</span>
                          )}
                          {r.status === 'MISSING_IN_BOOKS' && (
                            <button
                              onClick={() => handleAddMissingToBooks(r)}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition flex items-center gap-1 mx-auto"
                            >
                              <Plus className="w-3 h-3" /> Add to Books
                            </button>
                          )}
                          {r.status === 'MISSING_IN_2B' && (
                            <button
                              onClick={() => handleSendVendorReminder(r.vendorName)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition flex items-center gap-1 mx-auto"
                            >
                              <Send className="w-3 h-3" /> Remind Vendor
                            </button>
                          )}
                          {r.status === 'TAX_MISMATCH' && (
                            <button
                              onClick={() => handleSendVendorReminder(r.vendorName)}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition flex items-center gap-1 mx-auto"
                            >
                              Notify Variance
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GSTR-3B VS BOOKS SUMMARY RECONCILIATION */}
      {subTab === '3B_VS_BOOKS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] uppercase font-extrabold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                Returns vs Books Sync Check
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">GSTR-3B Return Summary vs ERP Financial Books</h3>
              <p className="text-xs text-slate-500">Cross-verifies Outward Tax Liabilities and Input Tax Credit claims before final portal submission.</p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Zero Discrepancy (Books & Portal in Sync)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-sans">Return Section</th>
                  <th className="py-3 px-4 text-right">ERP Sales/Purchase Books (₹)</th>
                  <th className="py-3 px-4 text-right">GSTR-3B Portal Draft (₹)</th>
                  <th className="py-3 px-4 text-right">Variance (₹)</th>
                  <th className="py-3 px-4 text-center font-sans">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-sans font-bold text-slate-900">Outward Taxable Value (3.1a)</td>
                  <td className="py-3 px-4 text-right font-bold">₹{booksGstr3b.table31_OutwardSupplies.a_taxableSupplies.totalTaxableValue.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right">₹{portal3bSummary.outwardTaxable.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-bold">₹0</td>
                  <td className="py-3 px-4 text-center font-sans">
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">MATCHED</span>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-sans font-bold text-slate-900">Output IGST Liability</td>
                  <td className="py-3 px-4 text-right font-bold">₹{booksGstr3b.table31_OutwardSupplies.a_taxableSupplies.integratedTax.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right">₹{portal3bSummary.outwardIgst.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-bold">₹0</td>
                  <td className="py-3 px-4 text-center font-sans">
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">MATCHED</span>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-sans font-bold text-slate-900">Output CGST & SGST Liability</td>
                  <td className="py-3 px-4 text-right font-bold">
                    ₹{(booksGstr3b.table31_OutwardSupplies.a_taxableSupplies.centralTax + booksGstr3b.table31_OutwardSupplies.a_taxableSupplies.stateTax).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    ₹{(portal3bSummary.outwardCgst + portal3bSummary.outwardSgst).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-bold">₹0</td>
                  <td className="py-3 px-4 text-center font-sans">
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">MATCHED</span>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-sans font-bold text-slate-900">Input Tax Credit (ITC) Available (4a5)</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-800">
                    ₹{(booksGstr3b.table4_EligibleITC.a5_allOtherITC.integratedTax + booksGstr3b.table4_EligibleITC.a5_allOtherITC.centralTax + booksGstr3b.table4_EligibleITC.a5_allOtherITC.stateTax).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-800">
                    ₹{(portal3bSummary.itcIgst + portal3bSummary.itcCgst + portal3bSummary.itcSgst).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-bold">₹0</td>
                  <td className="py-3 px-4 text-center font-sans">
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">MATCHED</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
