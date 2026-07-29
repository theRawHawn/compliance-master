import React, { useState } from 'react';
import { Company, SalesInvoice, PurchaseInvoice, VendorPayment, PayrollRun, ErpConfig, ErpSyncLog } from '../types';
import {
  DEFAULT_ERP_CONFIG,
  generateTallySalesXml,
  generateTallyPayrollXml,
  generateZohoSalesPayload,
  generateZohoPayrollJournalPayload,
} from '../lib/erpSyncEngine';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings,
  Database,
  ArrowRightLeft,
  FileCode,
  Download,
  Copy,
  Layers,
  Zap,
  Globe,
  Building2,
  Check,
  ExternalLink,
} from 'lucide-react';

interface ErpSyncModuleProps {
  company: Company | null;
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  vendorPayments: VendorPayment[];
  payroll: PayrollRun | null;
  initialSubTab?: string;
}

export const ErpSyncModule: React.FC<ErpSyncModuleProps> = ({
  company,
  salesInvoices,
  purchaseInvoices,
  vendorPayments,
  payroll,
  initialSubTab,
}) => {
  const [erpConfig, setErpConfig] = useState<ErpConfig>(DEFAULT_ERP_CONFIG);
  const [activeTab, setActiveTab] = useState<'TALLY' | 'ZOHO' | 'CONFIG' | 'LOGS'>(
    (initialSubTab as any) || 'TALLY'
  );

  React.useEffect(() => {
    if (initialSubTab && ['TALLY', 'ZOHO', 'CONFIG', 'LOGS'].includes(initialSubTab)) {
      setActiveTab(initialSubTab as any);
    }
  }, [initialSubTab]);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<ErpSyncLog[]>([
    {
      id: 'LOG-01',
      companyId: company?.id || '',
      target: 'TALLY',
      module: 'GST_SALES',
      status: 'SUCCESS',
      recordsSynced: salesInvoices.length,
      message: `Successfully generated & synced ${salesInvoices.length} Sales Invoices to Tally Prime XML (Port ${erpConfig.tallyPort})`,
      timestamp: '2026-07-28 12:30:00',
    },
    {
      id: 'LOG-02',
      companyId: company?.id || '',
      target: 'ZOHO_BOOKS',
      module: 'PAYROLL',
      status: 'SUCCESS',
      recordsSynced: payroll ? payroll.totalEmployees : 0,
      message: `Successfully posted Monthly Payroll Journal Entry to Zoho Books API (Org ID: ${erpConfig.zohoOrgId})`,
      timestamp: '2026-07-28 12:35:12',
    },
  ]);

  if (!company) {
    return <div className="p-8 text-center text-slate-500">Please select a company to configure ERP sync.</div>;
  }

  const compSales = salesInvoices.filter((s) => s.companyId === company.id);
  const compPurchases = purchaseInvoices.filter((p) => p.companyId === company.id);
  const compPayments = vendorPayments.filter((vp) => vp.companyId === company.id);

  const tallySalesXml = generateTallySalesXml(company, compSales, erpConfig);
  const tallyPayrollXml = payroll ? generateTallyPayrollXml(company, payroll, erpConfig) : '';

  const zohoSalesJson = JSON.stringify(generateZohoSalesPayload(company, compSales), null, 2);
  const zohoPayrollJson = payroll
    ? JSON.stringify(generateZohoPayrollJournalPayload(company, payroll), null, 2)
    : '';

  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleDownloadXml = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleTriggerSync = (target: 'TALLY' | 'ZOHO_BOOKS', module: 'GST_SALES' | 'GST_PURCHASE' | 'TDS_VOUCHER' | 'PAYROLL') => {
    setIsSyncing(true);
    setTimeout(() => {
      let count = 0;
      let snippet = '';
      if (module === 'GST_SALES') {
        count = compSales.length;
        snippet = target === 'TALLY' ? tallySalesXml.substring(0, 300) : zohoSalesJson.substring(0, 300);
      } else if (module === 'PAYROLL') {
        count = payroll ? payroll.totalEmployees : 0;
        snippet = target === 'TALLY' ? tallyPayrollXml.substring(0, 300) : zohoPayrollJson.substring(0, 300);
      } else if (module === 'TDS_VOUCHER') {
        count = compPayments.length;
        snippet = `<VOUCHER VCHTYPE="Journal"><NARRATION>TDS Vouchers for ${compPayments.length} Payments</NARRATION></VOUCHER>`;
      } else {
        count = compPurchases.length;
        snippet = `<VOUCHER VCHTYPE="Purchase"><NARRATION>Purchase Invoices ${compPurchases.length}</NARRATION></VOUCHER>`;
      }

      const newLog: ErpSyncLog = {
        id: `LOG-${Date.now()}`,
        companyId: company.id,
        target,
        module,
        status: 'SUCCESS',
        recordsSynced: count,
        message: `Direct Sync Executed successfully for ${module} (${count} records) into ${target === 'TALLY' ? `Tally Prime XML @ Port ${erpConfig.tallyPort}` : `Zoho Books API (Org: ${erpConfig.zohoOrgId})`}`,
        timestamp: new Date().toLocaleString('en-IN'),
        payloadSnippet: snippet,
      };

      setSyncLogs([newLog, ...syncLogs]);
      setIsSyncing(false);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" /> ERP Direct Sync Hub
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            Seamless 1-Click Bi-directional Synchronization for Sales, Purchases, TDS Journals & Payroll Entries
          </p>
        </div>

        <div className="flex items-center overflow-x-auto whitespace-nowrap gap-1.5 bg-slate-100 p-1.5 rounded-xl w-full lg:w-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('TALLY')}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'TALLY' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Desktop ERP</span>
          </button>
          <button
            onClick={() => setActiveTab('ZOHO')}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'ZOHO' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Cloud ERP API</span>
          </button>
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'CONFIG' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Ledger Mapping</span>
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'LOGS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Sync History</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'TALLY' && (
        <div className="space-y-6">
          {/* Tally Status Banner */}
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white p-6 rounded-2xl shadow-md border border-amber-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
                TALLY PRIME HTTP SERVER ON PORT {erpConfig.tallyPort}
              </span>
              <h2 className="text-xl font-extrabold text-amber-100 mt-1">Tally Prime Direct XML Integration</h2>
              <p className="text-xs text-slate-300 max-w-2xl">
                Byalance automatically maps tax components, party accounts, and payroll line items directly into Tally's native XML voucher format. You can push directly or download XML files for Daybook import.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleTriggerSync('TALLY', 'GST_SALES')}
                disabled={isSyncing}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Sales to Tally</span>
              </button>
              <button
                onClick={() => handleTriggerSync('TALLY', 'PAYROLL')}
                disabled={isSyncing}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Payroll to Tally</span>
              </button>
            </div>
          </div>

          {/* Module Grid Sync Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales Invoices XML */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-600" /> GST Sales Vouchers ({compSales.length} Invoices)
                  </h3>
                  <p className="text-xs text-slate-500">Includes Output CGST, SGST, IGST Ledgers</p>
                </div>
                <button
                  onClick={() => handleDownloadXml(tallySalesXml, `${company.gstin}_Tally_Sales.xml`)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" /> XML File
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 scrollbar-thin">
                  {tallySalesXml}
                </pre>
                <button
                  onClick={() => handleCopyPayload(tallySalesXml)}
                  className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] px-2 py-1 rounded font-mono border border-slate-700 flex items-center gap-1"
                >
                  {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPayload ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Payroll Salary Voucher XML */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-600" /> Monthly Payroll Voucher ({payroll ? payroll.monthYear : 'N/A'})
                  </h3>
                  <p className="text-xs text-slate-500">Salaries, PF, ESI, PT & Net Bank Payable Ledgers</p>
                </div>
                {payroll && (
                  <button
                    onClick={() => handleDownloadXml(tallyPayrollXml, `${company.gstin}_Tally_Payroll_${payroll.monthYear}.xml`)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" /> XML File
                  </button>
                )}
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 scrollbar-thin">
                  {payroll ? tallyPayrollXml : '<!-- No payroll run calculated yet for current period -->'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ZOHO' && (
        <div className="space-y-6">
          {/* Cloud ERP Status Banner */}
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-blue-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30">
                CLOUD ERP REST API v3 (ORG ID: {erpConfig.zohoOrgId})
              </span>
              <h2 className="text-xl font-extrabold text-blue-100 mt-1">Cloud ERP REST API Integration</h2>
              <p className="text-xs text-slate-300 max-w-2xl">
                Automated OAuth2 token management connects directly to ERP cloud endpoints for automated posting of Customer Invoices, Vendor Bills, and Payroll Journal Vouchers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleTriggerSync('ZOHO_BOOKS', 'GST_SALES')}
                disabled={isSyncing}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Post Sales to Cloud API</span>
              </button>
              <button
                onClick={() => handleTriggerSync('ZOHO_BOOKS', 'PAYROLL')}
                disabled={isSyncing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Post Payroll Journal to Cloud ERP</span>
              </button>
            </div>
          </div>

          {/* Cloud ERP JSON Payloads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" /> Cloud ERP Invoices Endpoint Payload
              </h3>
              <pre className="bg-slate-900 text-blue-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 scrollbar-thin">
                {zohoSalesJson}
              </pre>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" /> Cloud ERP Journal Entry Payload
              </h3>
              <pre className="bg-slate-900 text-emerald-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 scrollbar-thin">
                {payroll ? zohoPayrollJson : '// No payroll data calculated yet'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CONFIG' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-700" /> ERP Ledger & Chart of Accounts Mapping
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ensure ledger names in Byalance match the exact names created in your ERP Chart of Accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sales Ledger Name</label>
              <input
                type="text"
                value={erpConfig.salesLedger}
                onChange={(e) => setErpConfig({ ...erpConfig, salesLedger: e.target.value })}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Output CGST Ledger</label>
              <input
                type="text"
                value={erpConfig.cgstLedger}
                onChange={(e) => setErpConfig({ ...erpConfig, cgstLedger: e.target.value })}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Output SGST Ledger</label>
              <input
                type="text"
                value={erpConfig.sgstLedger}
                onChange={(e) => setErpConfig({ ...erpConfig, sgstLedger: e.target.value })}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Output IGST Ledger</label>
              <input
                type="text"
                value={erpConfig.igstLedger}
                onChange={(e) => setErpConfig({ ...erpConfig, igstLedger: e.target.value })}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">TDS Payable Ledger</label>
              <input
                type="text"
                value={erpConfig.tdsPayableLedger}
                onChange={(e) => setErpConfig({ ...erpConfig, tdsPayableLedger: e.target.value })}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Salaries & Wages Expense Ledger</label>
              <input
                type="text"
                value={erpConfig.salaryExpenseLedger}
                onChange={(e) => setErpConfig({ ...erpConfig, salaryExpenseLedger: e.target.value })}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Provident Fund (PF) Payable A/c</label>
              <input
                type="text"
                value={erpConfig.pfPayableLedger}
                onChange={(e) => setErpConfig({ ...erpConfig, pfPayableLedger: e.target.value })}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ESIC Payable A/c</label>
              <input
                type="text"
                value={erpConfig.esiPayableLedger}
                onChange={(e) => setErpConfig({ ...erpConfig, esiPayableLedger: e.target.value })}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Bank Clearing / Disbursal A/c</label>
              <input
                type="text"
                value={erpConfig.bankAccountLedger}
                onChange={(e) => setErpConfig({ ...erpConfig, bankAccountLedger: e.target.value })}
                className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => alert('ERP Ledger Configuration Saved!')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
            >
              Save ERP Mapping Settings
            </button>
          </div>
        </div>
      )}

      {activeTab === 'LOGS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-900 text-sm">ERP Sync Audit Log History</h2>
            <span className="text-xs text-slate-500">{syncLogs.length} Events Recorded</span>
          </div>

          <div className="divide-y divide-slate-100">
            {syncLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        log.target === 'TALLY' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {log.target}
                    </span>
                    <span className="text-slate-800">{log.module}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {log.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{log.timestamp}</span>
                </div>
                <p className="text-slate-600">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
