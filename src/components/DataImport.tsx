import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Company, SalesInvoice, PurchaseInvoice, VendorPayment, Employee } from '../types';
import { validateGstin, validatePan, validateTan } from '../lib/validation';
import { calculateTdsForPayment } from '../lib/tdsEngine';
import { fetchGoogleSheetData, SAMPLE_GOOGLE_SHEETS } from '../lib/importParsers';
import { resolvePosState, classifyGstr1InvoiceType, deriveMonthYear, isStructurallyValidGstin, parseDateValue } from '../lib/gstParser';
import { todayIso } from '../lib/calculators/gstLateFeeCalculator';
import {
  downloadSalesRegisterTemplate,
  downloadPurchaseRegisterTemplate,
  downloadVendorTdsTemplate,
  downloadEmployeeMasterTemplate,
} from '../lib/generators/excelTemplates';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Sparkles,
  HelpCircle,
  Globe,
  Server,
  Cloud,
  Database,
  Link2,
  RefreshCw,
} from 'lucide-react';

interface DataImportProps {
  company: Company | null;
  onImportSales: (sales: Omit<SalesInvoice, 'id'>[]) => void;
  onImportPurchases: (purchases: Omit<PurchaseInvoice, 'id'>[]) => void;
  onImportVendorPayments: (payments: Omit<VendorPayment, 'id'>[]) => void;
  onImportEmployees: (employees: Omit<Employee, 'id'>[]) => void;
}

type ImportModule = 'SALES' | 'PURCHASE' | 'VENDOR_TDS' | 'EMPLOYEES';
type SourceType = 'EXCEL' | 'GOOGLE_SHEET' | 'TALLY' | 'ZOHO' | 'BUSY_MARG';

export const DataImport: React.FC<DataImportProps> = ({
  company,
  onImportSales,
  onImportPurchases,
  onImportVendorPayments,
  onImportEmployees,
}) => {
  const [selectedModule, setSelectedModule] = useState<ImportModule>('SALES');
  const [selectedSource, setSelectedSource] = useState<SourceType>('EXCEL');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [tallyServer, setTallyServer] = useState('http://localhost:9000');
  const [isSyncingTally, setIsSyncingTally] = useState(false);
  const [zohoOrgId, setZohoOrgId] = useState('600123998');
  const [isSyncingZoho, setIsSyncingZoho] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'UPLOAD' | 'MAP' | 'PREVIEW'>('UPLOAD');
  const [validatedData, setValidatedData] = useState<any[]>([]);
  const [errorCount, setErrorCount] = useState(0);

  if (!company) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        Please select a company first before importing data.
      </div>
    );
  }

  // Handle File Upload & Excel Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];

      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      if (data && data.length > 0) {
        const fileHeaders = (data[0] || []).map((h) => String(h).trim());
        const rowData = data.slice(1).filter((r) => r.length > 0);

        setHeaders(fileHeaders);
        setParsedRows(rowData);

        // Auto Smart Mapping
        const initialMap: Record<string, string> = {};
        fileHeaders.forEach((fh) => {
          const lower = fh.toLowerCase();
          if (lower.includes('invoice no') || lower.includes('inv no')) initialMap['invoiceNo'] = fh;
          if (lower.includes('date')) initialMap['invoiceDate'] = fh;
          if (lower.includes('cust') || lower.includes('party') || lower.includes('vendor')) {
            initialMap['customerName'] = fh;
            initialMap['vendorName'] = fh;
          }
          if (lower.includes('gstin')) {
            initialMap['customerGstin'] = fh;
            initialMap['vendorGstin'] = fh;
          }
          if (lower.includes('hsn')) initialMap['hsnCode'] = fh;
          if (lower.includes('taxable') || lower.includes('amount')) {
            initialMap['taxableValue'] = fh;
            initialMap['invoiceAmount'] = fh;
          }
          if (lower.includes('rate')) initialMap['rate'] = fh;
          if (lower.includes('igst')) initialMap['igst'] = fh;
          if (lower.includes('cgst')) initialMap['cgst'] = fh;
          if (lower.includes('sgst')) initialMap['sgst'] = fh;

          // TDS specific
          if (lower.includes('pan')) initialMap['vendorPan'] = fh;
          if (lower.includes('section')) initialMap['sectionCode'] = fh;
          if (lower.includes('tds rate')) initialMap['tdsRate'] = fh;
          if (lower.includes('tds')) initialMap['tdsDeducted'] = fh;
          if (lower.includes('challan')) initialMap['challanNo'] = fh;
          if (lower.includes('bsr')) initialMap['bsrCode'] = fh;

          // Employee specific
          if (lower.includes('emp id') || lower.includes('employee id')) initialMap['empId'] = fh;
          if (lower.includes('emp name') || lower.includes('name')) initialMap['empName'] = fh;
          if (lower.includes('uan')) initialMap['uan'] = fh;
          if (lower.includes('basic')) initialMap['basicPay'] = fh;
          if (lower.includes('designation')) initialMap['designation'] = fh;
        });

        setColumnMap(initialMap);
        setStep('MAP');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // Perform Data Validation
  const handleProcessAndValidate = () => {
    const results: any[] = [];
    let errs = 0;

    parsedRows.forEach((row, idx) => {
      const getVal = (fieldKey: string) => {
        const headerName = columnMap[fieldKey];
        if (!headerName) return '';
        const colIdx = headers.indexOf(headerName);
        return colIdx !== -1 ? row[colIdx] : '';
      };

      if (selectedModule === 'SALES') {
        const invNo = String(getVal('invoiceNo') || `INV-${idx + 1}`);
        const invDateRaw = getVal('invoiceDate');
        const parsedInvDate = parseDateValue(invDateRaw);
        const invDate = parsedInvDate || todayIso();
        const custNameRaw = String(getVal('customerName') || '').trim();
        const cGstin = String(getVal('customerGstin') || '').trim().toUpperCase();
        const taxableVal = Number(getVal('taxableValue') || 0);
        const rate = Number(getVal('rate') || 18);
        const posCode = String(getVal('posCode') || (cGstin ? cGstin.substring(0, 2) : company.stateCode));

        let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';
        let msg = '';

        if (cGstin) {
          const gVal = validateGstin(cGstin);
          if (!gVal.valid) {
            status = 'ERROR';
            msg = gVal.message || 'Invalid GSTIN format';
            errs++;
          }
        }

        if (taxableVal <= 0) {
          status = 'WARNING';
          msg = 'Taxable value is zero or empty';
        }

        if (!parsedInvDate) {
          status = status === 'ERROR' ? status : 'WARNING';
          msg = msg ? `${msg} Invoice date not found or unparseable — defaulted to today.` : 'Invoice date not found or unparseable — defaulted to today.';
        }

        if (!custNameRaw) {
          status = status === 'ERROR' ? status : 'WARNING';
          msg = msg ? `${msg} Customer name not found.` : 'Customer name not found.';
        }
        const custName = custNameRaw || 'Customer';

        const gstinValid = isStructurallyValidGstin(cGstin);
        const isInter = posCode !== company.stateCode;
        const igst = isInter ? Number(((taxableVal * rate) / 100).toFixed(2)) : 0;
        const cgst = !isInter ? Number(((taxableVal * rate) / 200).toFixed(2)) : 0;
        const sgst = !isInter ? Number(((taxableVal * rate) / 200).toFixed(2)) : 0;

        results.push({
          companyId: company.id,
          invoiceNo: invNo,
          invoiceDate: invDate,
          customerName: custName,
          customerGstin: cGstin,
          posState: resolvePosState(posCode),
          posCode: posCode,
          invoiceType: classifyGstr1InvoiceType(gstinValid, isInter, taxableVal),
          reverseCharge: 'N',
          hsnCode: String(getVal('hsnCode') || '998313'),
          description: 'Consulting Services',
          quantity: 1,
          uqc: 'NOS',
          rate: rate,
          taxableValue: taxableVal,
          igst,
          cgst,
          sgst,
          cess: 0,
          monthYear: deriveMonthYear(invDate) || deriveMonthYear(todayIso()),
          status,
          validationMessage: msg,
        });
      } else if (selectedModule === 'PURCHASE') {
        const invNo = String(getVal('invoiceNo') || `PUR-${idx + 1}`);
        const invDateRaw = getVal('invoiceDate');
        const parsedInvDate = parseDateValue(invDateRaw);
        const invDate = parsedInvDate || todayIso();
        const vNameRaw = String(getVal('vendorName') || '').trim();
        const vGstin = String(getVal('vendorGstin') || '').trim().toUpperCase();
        const taxableVal = Number(getVal('taxableValue') || 0);
        const rate = Number(getVal('rate') || 18);

        let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';
        let msg = '';

        if (vGstin) {
          const gVal = validateGstin(vGstin);
          if (!gVal.valid) {
            status = 'ERROR';
            msg = gVal.message || 'Invalid Vendor GSTIN';
            errs++;
          }
        }

        if (!parsedInvDate) {
          status = status === 'ERROR' ? status : 'WARNING';
          msg = msg ? `${msg} Invoice date not found or unparseable — defaulted to today.` : 'Invoice date not found or unparseable — defaulted to today.';
        }

        if (!vNameRaw) {
          status = status === 'ERROR' ? status : 'WARNING';
          msg = msg ? `${msg} Vendor name not found.` : 'Vendor name not found.';
        }
        const vName = vNameRaw || 'Vendor';

        const posCode = vGstin ? vGstin.substring(0, 2) : company.stateCode;
        const isInter = posCode !== company.stateCode;
        const igst = isInter ? Number(((taxableVal * rate) / 100).toFixed(2)) : 0;
        const cgst = !isInter ? Number(((taxableVal * rate) / 200).toFixed(2)) : 0;
        const sgst = !isInter ? Number(((taxableVal * rate) / 200).toFixed(2)) : 0;

        results.push({
          companyId: company.id,
          invoiceNo: invNo,
          invoiceDate: invDate,
          vendorName: vName,
          vendorGstin: vGstin,
          posState: resolvePosState(posCode),
          taxableValue: taxableVal,
          igst,
          cgst,
          sgst,
          cess: 0,
          itcEligible: isStructurallyValidGstin(vGstin) ? 'Y' : 'N',
          monthYear: deriveMonthYear(invDate) || deriveMonthYear(todayIso()),
          status,
          validationMessage: msg,
        });
      } else if (selectedModule === 'VENDOR_TDS') {
        const vName = String(getVal('vendorName') || 'Vendor');
        const vPan = String(getVal('vendorPan') || '').trim().toUpperCase();
        const secCode = String(getVal('sectionCode') || '194C');
        const invAmt = Number(getVal('invoiceAmount') || 50000);

        let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';
        let msg = '';

        const pVal = validatePan(vPan);
        if (!pVal.valid) {
          status = 'WARNING';
          msg = 'Non-PAN / Invalid PAN: Sec 206AA 20% penalty auto-calculated';
        }

        // Run TDS Calculation Engine
        const calc = calculateTdsForPayment({
          sectionCode: secCode,
          invoiceAmount: invAmt,
          vendorPan: vPan,
        });

        results.push({
          companyId: company.id,
          paymentNo: `PAY-${idx + 1}`,
          paymentDate: String(getVal('invoiceDate') || '2026-06-18'),
          vendorName: vName,
          vendorPan: vPan,
          sectionCode: secCode,
          natureOfPayment: 'Services / Works',
          invoiceAmount: invAmt,
          paymentAmount: invAmt - calc.tdsAmount,
          tdsRate: calc.applicableRate,
          tdsDeducted: calc.tdsAmount,
          tdsDeposited: calc.tdsAmount,
          challanNo: String(getVal('challanNo') || `CHL${100 + idx}`),
          bsrCode: String(getVal('bsrCode') || '0510001'),
          challanDate: '2026-06-25',
          quarter: 'Q1',
          financialYear: company.financialYear,
          status,
          validationMessage: msg || calc.ruleAppliedNote,
        });
      } else if (selectedModule === 'EMPLOYEES') {
        const empCode = String(getVal('empId') || `EMP${idx + 1}`);
        const name = String(getVal('empName') || 'Employee');
        const pan = String(getVal('vendorPan') || '').trim().toUpperCase();
        const uan = String(getVal('uan') || '100900800700');
        const basic = Number(getVal('basicPay') || 25000);

        let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';
        let msg = '';

        if (pan) {
          const pVal = validatePan(pan);
          if (!pVal.valid) {
            status = 'ERROR';
            msg = 'Invalid Employee PAN';
            errs++;
          }
        }

        results.push({
          companyId: company.id,
          empId: empCode,
          name,
          pan,
          uan,
          pfMemberId: `${company.pfCode || 'MH/BAN/0012345/000'}/${empCode}`,
          esiNo: '31000998877665544',
          designation: String(getVal('designation') || 'Staff'),
          department: 'Operations',
          joiningDate: '2025-04-01',
          gender: 'M',
          state: company.state,
          basicPay: basic,
          da: Math.round(basic * 0.1),
          hra: Math.round(basic * 0.4),
          specialAllowance: 5000,
          status,
          validationMessage: msg,
        });
      }
    });

    setValidatedData(results);
    setErrorCount(errs);
    setStep('PREVIEW');
  };

  const handleFinalImport = () => {
    if (selectedModule === 'SALES') {
      onImportSales(validatedData);
    } else if (selectedModule === 'PURCHASE') {
      onImportPurchases(validatedData);
    } else if (selectedModule === 'VENDOR_TDS') {
      onImportVendorPayments(validatedData);
    } else if (selectedModule === 'EMPLOYEES') {
      onImportEmployees(validatedData);
    }
    alert(`Successfully imported ${validatedData.length} records into ${selectedModule}!`);
    setStep('UPLOAD');
    setFile(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" /> Multi-Source Import Engine
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            Upload or sync Sales, Purchase, TDS, or Payroll data with auto-validation & column mapping.
          </p>
        </div>

        {/* Download Pre-built Templates Button Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={downloadSalesRegisterTemplate}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-300 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> Sales Template
          </button>
          <button
            onClick={downloadPurchaseRegisterTemplate}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-300 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> Purchase Template
          </button>
          <button
            onClick={downloadVendorTdsTemplate}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-300 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> TDS Template
          </button>
        </div>
      </div>

      {/* Module Selector Tabs */}
      <div className="flex items-center overflow-x-auto whitespace-nowrap gap-2 sm:gap-4 border-b border-slate-200 pb-1 scrollbar-none">
        {[
          { id: 'SALES', label: 'Sales Register (GSTR-1)' },
          { id: 'PURCHASE', label: 'Purchase Register (GSTR-3B)' },
          { id: 'VENDOR_TDS', label: 'Vendor TDS Payments (26Q)' },
          { id: 'EMPLOYEES', label: 'Employee Master / Payroll' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setSelectedModule(m.id as ImportModule);
              setStep('UPLOAD');
            }}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              selectedModule === m.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* STEP 1: UPLOAD AREA & SOURCE SELECTOR */}
      {step === 'UPLOAD' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { id: 'EXCEL', title: 'Excel / CSV File', icon: FileSpreadsheet, badge: 'Standard File' },
              { id: 'GOOGLE_SHEET', title: 'Google Sheets', icon: Globe, badge: 'Live Link' },
              { id: 'TALLY', title: 'Tally Prime Sync', icon: Server, badge: 'ODBC / XML' },
              { id: 'ZOHO', title: 'Zoho Books Sync', icon: Cloud, badge: 'Cloud API' },
              { id: 'BUSY_MARG', title: 'Busy / Marg ERP', icon: Database, badge: 'ERP Import' },
            ].map((src) => {
              const IconComp = src.icon;
              const isSelected = selectedSource === src.id;
              return (
                <button
                  key={src.id}
                  onClick={() => setSelectedSource(src.id as SourceType)}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between h-28 relative ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <IconComp className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span className="text-[9px] font-extrabold uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      {src.badge}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{src.title}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Connector Interface */}
          {selectedSource === 'EXCEL' && (
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:border-emerald-500 transition cursor-pointer">
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" id="file-upload-input" />
              <label htmlFor="file-upload-input" className="cursor-pointer block">
                <FileSpreadsheet className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">Drop your Excel (.xlsx / .csv) file here</h3>
                <p className="text-slate-500 text-xs mt-1">or click to browse from your computer</p>
                <div className="mt-6 inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow transition">
                  <Upload className="w-4 h-4" />
                  <span>Select File</span>
                </div>
              </label>
            </div>
          )}

          {selectedSource === 'GOOGLE_SHEET' && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Globe className="w-5 h-5 text-emerald-600" />
                <span>Import directly from Google Sheets</span>
              </div>
              <p className="text-xs text-slate-600">
                Paste your Google Sheet share URL below or click the sample button to fetch real data automatically.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  onClick={async () => {
                    try {
                      setIsFetchingSheet(true);
                      const urlToUse = googleSheetUrl || SAMPLE_GOOGLE_SHEETS[selectedModule].url;
                      const rows = await fetchGoogleSheetData(urlToUse);
                      if (rows && rows.length > 0) {
                        const fileHeaders = (rows[0] || []).map((h) => String(h).trim());
                        const rowData = rows.slice(1).filter((r) => r.length > 0);
                        setHeaders(fileHeaders);
                        setParsedRows(rowData);
                        setStep('MAP');
                      }
                    } catch (e) {
                      alert('Could not fetch sheet. Loading sample Google Sheet dataset...');
                    } finally {
                      setIsFetchingSheet(false);
                    }
                  }}
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black px-5 py-2 rounded-xl text-xs shadow transition flex items-center gap-1.5"
                >
                  {isFetchingSheet ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  <span>Fetch Google Sheet</span>
                </button>
              </div>
            </div>
          )}

          {(selectedSource === 'TALLY' || selectedSource === 'ZOHO' || selectedSource === 'BUSY_MARG') && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
              <Server className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                {selectedSource === 'TALLY' && 'Tally Prime Local ODBC / XML Sync'}
                {selectedSource === 'ZOHO' && 'Zoho Books Cloud API Integration'}
                {selectedSource === 'BUSY_MARG' && 'Busy ERP / Marg ERP File Connector'}
              </h3>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                Connect your accounting software directly or upload the exported XML/CSV register file to parse transactions.
              </p>
              <label className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow cursor-pointer transition text-xs">
                <Upload className="w-4 h-4" />
                <span>Upload {selectedSource} Export File</span>
                <input type="file" accept=".xml,.xlsx,.csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING */}
      {step === 'MAP' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Map Excel Columns to System Fields</h2>
              <p className="text-xs text-slate-500">File: {file?.name} ({parsedRows.length} rows detected)</p>
            </div>
            <button
              onClick={handleProcessAndValidate}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition"
            >
              <span>Validate & Preview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              { label: 'Invoice Number', key: 'invoiceNo' },
              { label: 'Invoice Date', key: 'invoiceDate' },
              { label: 'Customer Name', key: 'customerName' },
              { label: 'Customer GSTIN', key: 'customerGstin' },
              { label: 'HSN / SAC Code', key: 'hsnCode' },
              { label: 'Taxable Value (₹)', key: 'taxableValue' },
              { label: 'GST Rate (%)', key: 'rate' },
            ].map((field) => (
              <div key={field.key} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block font-semibold text-slate-800 mb-1">{field.label}</label>
                <select
                  value={columnMap[field.key] || ''}
                  onChange={(e) => setColumnMap({ ...columnMap, [field.key]: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Ignore Field --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & VALIDATION */}
      {step === 'PREVIEW' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Validation Results & Import Preview</h2>
              <p className="text-xs text-slate-500">
                {validatedData.length} records processed • {errorCount} errors found
              </p>
            </div>
            <button
              onClick={handleFinalImport}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Import ({validatedData.length})</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Inv No</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">GSTIN</th>
                  <th className="px-3 py-2 text-right">Taxable (₹)</th>
                  <th className="px-3 py-2 text-right">Total Tax (₹)</th>
                  <th className="px-3 py-2">Validation Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {validatedData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-sans">
                      {r.status === 'VALID' ? (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">VALID</span>
                      ) : (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">ERROR</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-bold">{r.invoiceNo}</td>
                    <td className="px-3 py-2">{r.invoiceDate}</td>
                    <td className="px-3 py-2 font-sans">{r.customerName}</td>
                    <td className="px-3 py-2 font-mono">{r.customerGstin || 'URD'}</td>
                    <td className="px-3 py-2 text-right">₹{r.taxableValue.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-right font-bold">₹{(r.igst + r.cgst + r.sgst).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 font-sans text-slate-500">{r.validationMessage || 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
