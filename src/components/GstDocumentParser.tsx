import React, { useState } from 'react';
import { Company, SalesInvoice, PurchaseInvoice } from '../types';
import { parseGstFile, getDemoParsedData, ParsedGstDocument } from '../lib/gstParser';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Download,
  Check,
  RefreshCw,
  Plus
} from 'lucide-react';

interface GstDocumentParserProps {
  company: Company;
  onImportSales?: (sales: Omit<SalesInvoice, 'id'>[]) => void;
  onImportPurchases?: (purchases: Omit<PurchaseInvoice, 'id'>[]) => void;
}

export const GstDocumentParser: React.FC<GstDocumentParserProps> = ({
  company,
  onImportSales,
  onImportPurchases,
}) => {
  const [docType, setDocType] = useState<'GSTR1' | 'GSTR2B' | 'GSTR3B'>('GSTR1');
  const [parsing, setParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedGstDocument | null>(null);
  const [importedStatus, setImportedStatus] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setParsing(true);
    setImportedStatus(null);
    setParsedResult(null);

    try {
      const res = await parseGstFile(file, docType, company.id, company.stateCode || '27');
      setParsedResult(res);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setParsedResult({
        docType,
        fileName: file.name,
        totalRecords: 0,
        totalTaxable: 0,
        totalTax: 0,
        salesInvoices: [],
        purchaseInvoices: [],
        errors: [err?.message || 'File parsing failed.'],
      });
    } finally {
      setParsing(false);
      e.target.value = '';
    }
  };

  const handleLoadDemoData = (type: 'GSTR1' | 'GSTR2B' | 'GSTR3B') => {
    setDocType(type);
    setParsing(true);
    setImportedStatus(null);
    setTimeout(() => {
      const demo = getDemoParsedData(type, company.id);
      setParsedResult(demo);
      setParsing(false);
    }, 400);
  };

  const handleApplyImport = () => {
    if (!parsedResult) return;

    if (parsedResult.totalRecords === 0) {
      setImportedStatus('No invoice records were extracted. Please upload a valid sales/purchase invoice file before importing.');
      return;
    }

    if (parsedResult.docType === 'GSTR1' && parsedResult.salesInvoices.length > 0) {
      if (onImportSales) {
        onImportSales(parsedResult.salesInvoices);
        setImportedStatus(`Successfully imported ${parsedResult.salesInvoices.length} Sales Invoices into GSTR-1 Register!`);
      }
    } else if (parsedResult.docType === 'GSTR2B' && parsedResult.purchaseInvoices.length > 0) {
      if (onImportPurchases) {
        onImportPurchases(parsedResult.purchaseInvoices);
        setImportedStatus(`Successfully imported ${parsedResult.purchaseInvoices.length} Purchase Invoices into GSTR-2B / Purchases!`);
      }
    } else if (parsedResult.docType === 'GSTR3B' && parsedResult.gstr3bSummary) {
      setImportedStatus(`GSTR-3B Portal summary auto-applied for set-off calculation!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-blue-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" /> Smart GST Invoice & Return Parser
            </span>
            <h2 className="text-xl font-black mt-2">Upload Excel / PDF / CSV GST Documents</h2>
            <p className="text-slate-300 text-xs mt-1">
              Extract and parse all invoice line items, tax breakdown (IGST/CGST/SGST), customer/vendor GSTINs, and HSN codes automatically.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => { setDocType('GSTR1'); setParsedResult(null); }}
              className={`px-3 py-1.5 rounded-lg transition ${docType === 'GSTR1' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white'}`}
            >
              GSTR-1 Invoices
            </button>
            <button
              onClick={() => { setDocType('GSTR2B'); setParsedResult(null); }}
              className={`px-3 py-1.5 rounded-lg transition ${docType === 'GSTR2B' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white'}`}
            >
              GSTR-2B Portal
            </button>
            <button
              onClick={() => { setDocType('GSTR3B'); setParsedResult(null); }}
              className={`px-3 py-1.5 rounded-lg transition ${docType === 'GSTR3B' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white'}`}
            >
              GSTR-3B Return
            </button>
          </div>
        </div>
      </div>

      {/* Main Upload Dropzone & Sample Loader */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600" />
            Upload File for {docType === 'GSTR1' ? 'GSTR-1 (Outward Sales)' : docType === 'GSTR2B' ? 'GSTR-2B (Inward Purchases)' : 'GSTR-3B Return Summary'}
          </h3>

          <div className="relative border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 rounded-2xl p-8 text-center transition group">
            <input
              type="file"
              onChange={handleFileUpload}
              accept="*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Click or drag and drop your <span className="text-blue-600">.xlsx, .xls, .csv, or .pdf</span> invoice file
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports GST Portal Offline Excel templates, Tally GST Exports, Zoho Books CSV, and PDF tax invoices.
                </p>
              </div>
            </div>
          </div>

          {parsing && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-blue-800 text-xs font-semibold flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              Parsing GST invoice fields, verifying tax totals, and checking GSTIN formats...
            </div>
          )}
        </div>

        {/* Instant Demo File Loader */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" /> 1-Click Sample File Testing
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Want to see how document parsing works instantly without uploading your own file? Click any sample report below:
            </p>

            <div className="space-y-2 mt-4">
              <button
                onClick={() => handleLoadDemoData('GSTR1')}
                className="w-full text-left p-3 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-xs font-bold text-slate-800 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Demo GSTR-1 Sales Register (Excel)
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleLoadDemoData('GSTR2B')}
                className="w-full text-left p-3 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition text-xs font-bold text-slate-800 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Demo GSTR-2B Statement (PDF)
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleLoadDemoData('GSTR3B')}
                className="w-full text-left p-3 rounded-xl bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 transition text-xs font-bold text-slate-800 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" /> Demo GSTR-3B Portal Report
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Note: All parsed records undergo validation for GSTIN 15-digit structure and tax state codes.
          </p>
        </div>
      </div>

      {/* Parsed Results Preview Table & Import Action */}
      {parsedResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                Document Parsed Successfully
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Parsed File: {parsedResult.fileName} ({parsedResult.totalRecords} Records)
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Total Taxable Value: ₹{parsedResult.totalTaxable.toLocaleString('en-IN')} | Total Tax: ₹{parsedResult.totalTax.toLocaleString('en-IN')}
              </p>
            </div>

            <button
              onClick={handleApplyImport}
              disabled={!parsedResult || parsedResult.totalRecords === 0}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition ${
                !parsedResult || parsedResult.totalRecords === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Import Parsed Records to System</span>
            </button>
          </div>

          {parsedResult.errors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-xs font-semibold space-y-2">
              <p className="font-bold">Parser warning / error detected:</p>
              {parsedResult.errors.map((error, idx) => (
                <p key={idx} className="ml-2">• {error}</p>
              ))}
            </div>
          )}

          {parsedResult.totalRecords === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700 text-xs font-semibold">
              No invoices were extracted from this file. Please upload a valid invoice document or try a different format.
            </div>
          )}

          {importedStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {importedStatus}
            </div>
          )}

          {/* Table Preview for Sales / Purchases */}
          {parsedResult.salesInvoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">GSTIN</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {parsedResult.salesInvoices.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.invoiceNo}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.invoiceDate}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{s.customerName}</td>
                      <td className="py-2.5 px-3">{s.customerGstin || 'URD'}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {s.invoiceType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{s.taxableValue.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">₹{s.igst.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">₹{s.cgst.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">₹{s.sgst.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 font-sans">
                        {s.status === 'WARNING' ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded cursor-help"
                            title={s.validationMessage || 'Needs review'}
                          >
                            <AlertCircle className="w-3 h-3" /> Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {parsedResult.purchaseInvoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Vendor Name</th>
                    <th className="py-2.5 px-3">Vendor GSTIN</th>
                    <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {parsedResult.purchaseInvoices.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{p.invoiceNo}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.invoiceDate}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{p.vendorName}</td>
                      <td className="py-2.5 px-3">{p.vendorGstin || 'URD'}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{p.taxableValue.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">₹{p.igst.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">₹{p.cgst.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">₹{p.sgst.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 font-sans">
                        {p.status === 'WARNING' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3" /> Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
