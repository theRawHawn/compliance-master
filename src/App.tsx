import React, { useState, useEffect } from 'react';
import { Company, Employee, SalesInvoice, PurchaseInvoice, VendorPayment, PayrollRun, GeneratedFile, User } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { CompanyManagement } from './components/CompanyManagement';
import { CompanyProfile } from './components/CompanyProfile';
import { LoginPage } from './components/LoginPage';
import { EmployeeMaster } from './components/EmployeeMaster';
import { DataImport } from './components/DataImport';
import { GstModule } from './components/GstModule';
import { TdsModule } from './components/TdsModule';
import { PayrollModule } from './components/PayrollModule';
import { ErpSyncModule } from './components/ErpSyncModule';
import { DownloadCenter } from './components/DownloadCenter';
import { ReconciliationModule } from './components/ReconciliationModule';
import { TaxRulesConfig } from './components/TaxRulesConfig';
import { EmployeePortal } from './components/EmployeePortal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedFy, setSelectedFy] = useState<string>('2026-27');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleNavigate = (tab: string, subTab?: string) => {
    setActiveTab(tab);
    setActiveSubTab(subTab);
  };

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sales, setSales] = useState<SalesInvoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [payroll, setPayroll] = useState<PayrollRun | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);

  const [loading, setLoading] = useState(true);

  // Helper utilities for browser storage
  const getStorage = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Storage read error:', e);
    }
    return fallback;
  };

  const setStorage = <T,>(key: string, data: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  };

  const mergeById = <T extends { id: string }>(primary: T[], secondary: T[]): T[] => {
    const map = new Map<string, T>();
    primary.forEach((item) => map.set(item.id, item));
    secondary.forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  };

  // Initial Load from API & Browser Local Storage
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load User
      const userRes = await fetch('/api/auth/me').catch(() => null);
      if (userRes?.ok) {
        const uData = await userRes.json();
        setUser(uData.user);
      }

      // Load Companies
      const localComp = getStorage<Company[]>('cm_companies', []);
      const compRes = await fetch('/api/companies').catch(() => null);
      if (compRes?.ok) {
        const cData: Company[] = await compRes.json();
        const merged = mergeById(cData, localComp);
        setCompanies(merged);
        if (merged.length > 0 && !selectedCompany) {
          setSelectedCompany(merged[0]);
        }
      } else if (localComp.length > 0) {
        setCompanies(localComp);
        if (!selectedCompany) setSelectedCompany(localComp[0]);
      }

      // Load Employees
      const localEmp = getStorage<Employee[]>('cm_employees', []);
      const empRes = await fetch('/api/employees').catch(() => null);
      if (empRes?.ok) {
        const eData = await empRes.json();
        const merged = mergeById(eData, localEmp);
        setEmployees(merged);
      } else if (localEmp.length > 0) {
        setEmployees(localEmp);
      }

      // Load Sales
      const localSales = getStorage<SalesInvoice[]>('cm_sales', []);
      const salesRes = await fetch('/api/sales').catch(() => null);
      if (salesRes?.ok) {
        const sData = await salesRes.json();
        const merged = mergeById(sData, localSales);
        setSales(merged);
      } else if (localSales.length > 0) {
        setSales(localSales);
      }

      // Load Purchases
      const localPurchases = getStorage<PurchaseInvoice[]>('cm_purchases', []);
      const purRes = await fetch('/api/purchases').catch(() => null);
      if (purRes?.ok) {
        const pData = await purRes.json();
        const merged = mergeById(pData, localPurchases);
        setPurchases(merged);
      } else if (localPurchases.length > 0) {
        setPurchases(localPurchases);
      }

      // Load Vendor Payments
      const localVp = getStorage<VendorPayment[]>('cm_vendor_payments', []);
      const vpRes = await fetch('/api/vendor-payments').catch(() => null);
      if (vpRes?.ok) {
        const vData = await vpRes.json();
        const merged = mergeById(vData, localVp);
        setVendorPayments(merged);
      } else if (localVp.length > 0) {
        setVendorPayments(localVp);
      }

      // Load Payroll
      const prRes = await fetch('/api/payroll').catch(() => null);
      if (prRes?.ok) {
        const prData = await prRes.json();
        if (prData && prData.length > 0) setPayroll(prData[0]);
      }

      // Load Generated Files
      const localFiles = getStorage<GeneratedFile[]>('cm_files', []);
      const filesRes = await fetch('/api/files').catch(() => null);
      if (filesRes?.ok) {
        const fData = await filesRes.json();
        const merged = mergeById(fData, localFiles);
        setGeneratedFiles(merged);
      } else if (localFiles.length > 0) {
        setGeneratedFiles(localFiles);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setUser(null);
  };

  // Handle Demo Reset
  const handleRestoreDemo = async () => {
    if (confirm('Reset demo company and transaction dataset?')) {
      localStorage.removeItem('cm_companies');
      localStorage.removeItem('cm_sales');
      localStorage.removeItem('cm_purchases');
      localStorage.removeItem('cm_vendor_payments');
      localStorage.removeItem('cm_employees');
      localStorage.removeItem('cm_files');
      try {
        await fetch('/api/demo/seed', { method: 'POST' });
      } catch (e) {
        console.error(e);
      }
      await loadInitialData();
    }
  };

  // Create Company Handler
  const handleCreateCompany = async (cData: Omit<Company, 'id' | 'userId' | 'createdAt'>) => {
    const newC: Company = {
      ...cData,
      id: `COMP-${Date.now()}`,
      userId: user?.id || 'USER-001',
      createdAt: new Date().toISOString(),
    };
    const updated = [...companies, newC];
    setCompanies(updated);
    setSelectedCompany(newC);
    setStorage('cm_companies', updated);

    fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cData),
    }).catch((e) => console.warn('Sync warning:', e));
  };

  const handleUpdateCompany = async (id: string, data: Partial<Company>) => {
    const updated = companies.map((c) => (c.id === id ? { ...c, ...data } : c));
    setCompanies(updated);
    if (selectedCompany?.id === id) {
      setSelectedCompany({ ...selectedCompany, ...data });
    }
    setStorage('cm_companies', updated);

    fetch(`/api/companies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((e) => console.warn('Sync warning:', e));
  };

  const handleDeleteCompany = async (id: string) => {
    const remaining = companies.filter((c) => c.id !== id);
    setCompanies(remaining);
    if (selectedCompany?.id === id && remaining.length > 0) {
      setSelectedCompany(remaining[0]);
    }
    setStorage('cm_companies', remaining);

    fetch(`/api/companies/${id}`, { method: 'DELETE' }).catch((e) => console.warn('Sync warning:', e));
  };

  // Create Employee Handler
  const handleCreateEmployee = async (empData: Omit<Employee, 'id'>) => {
    const newE: Employee = {
      ...empData,
      id: `EMP-${Date.now()}`,
    };
    const updated = [...employees, newE];
    setEmployees(updated);
    setStorage('cm_employees', updated);

    fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empData),
    }).catch((e) => console.warn('Sync warning:', e));
  };

  const handleUpdateEmployee = async (id: string, data: Partial<Employee>) => {
    const updated = employees.map((e) => (e.id === id ? { ...e, ...data } : e));
    setEmployees(updated);
    setStorage('cm_employees', updated);

    fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((e) => console.warn('Sync warning:', e));
  };

  const handleDeleteEmployee = async (id: string) => {
    const remaining = employees.filter((e) => e.id !== id);
    setEmployees(remaining);
    setStorage('cm_employees', remaining);

    fetch(`/api/employees/${id}`, { method: 'DELETE' }).catch((e) => console.warn('Sync warning:', e));
  };

  // Vendor Payment Handlers
  const handleCreateVendorPayment = async (payData: Omit<VendorPayment, 'id'>) => {
    const newP: VendorPayment = {
      ...payData,
      id: `VP-${Date.now()}`,
    };
    const updated = [...vendorPayments, newP];
    setVendorPayments(updated);
    setStorage('cm_vendor_payments', updated);

    fetch('/api/vendor-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payData),
    }).catch((e) => console.warn('Sync warning:', e));
  };

  const handleUpdateVendorPayment = async (id: string, data: Partial<VendorPayment>) => {
    const updated = vendorPayments.map((p) => (p.id === id ? { ...p, ...data } : p));
    setVendorPayments(updated);
    setStorage('cm_vendor_payments', updated);

    fetch(`/api/vendor-payments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((e) => console.warn('Sync warning:', e));
  };

  const handleDeleteVendorPayment = async (id: string) => {
    const remaining = vendorPayments.filter((p) => p.id !== id);
    setVendorPayments(remaining);
    setStorage('cm_vendor_payments', remaining);

    fetch(`/api/vendor-payments/${id}`, { method: 'DELETE' }).catch((e) => console.warn('Sync warning:', e));
  };

  // Bulk Import Handlers with Browser Storage Support
  const handleImportSales = async (salesList: Omit<SalesInvoice, 'id'>[]) => {
    const items: SalesInvoice[] = salesList.map((s, idx) => ({
      ...s,
      id: (s as any).id || `SALE-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
    }));

    const updated = [...sales, ...items];
    setSales(updated);
    setStorage('cm_sales', updated);

    fetch('/api/sales/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    }).catch((e) => console.warn('Sync warning:', e));

    setActiveTab('gst');
    setActiveSubTab('SALES');
  };

  const handleImportPurchases = async (purList: Omit<PurchaseInvoice, 'id'>[]) => {
    const items: PurchaseInvoice[] = purList.map((p, idx) => ({
      ...p,
      id: (p as any).id || `PUR-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
    }));

    const updated = [...purchases, ...items];
    setPurchases(updated);
    setStorage('cm_purchases', updated);

    fetch('/api/purchases/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    }).catch((e) => console.warn('Sync warning:', e));

    setActiveTab('gst');
    setActiveSubTab('PURCHASE');
  };

  const handleUpdateSaleClassification = (id: string, updates: Partial<Pick<SalesInvoice, 'invoiceType' | 'reverseCharge'>>) => {
    const updated = sales.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setSales(updated);
    setStorage('cm_sales', updated);

    fetch(`/api/sales/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch((e) => console.warn('Sync warning:', e));
  };

  const handleUpdatePurchaseClassification = (id: string, updates: Partial<Pick<PurchaseInvoice, 'itcEligible' | 'reverseCharge'>>) => {
    const updated = purchases.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setPurchases(updated);
    setStorage('cm_purchases', updated);

    fetch(`/api/purchases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch((e) => console.warn('Sync warning:', e));
  };

  const handleImportVendorPayments = async (vpList: Omit<VendorPayment, 'id'>[]) => {
    const items: VendorPayment[] = vpList.map((p, idx) => ({
      ...p,
      id: (p as any).id || `VP-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
    }));

    const updated = [...vendorPayments, ...items];
    setVendorPayments(updated);
    setStorage('cm_vendor_payments', updated);

    fetch('/api/vendor-payments/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    }).catch((e) => console.warn('Sync warning:', e));

    setActiveTab('tds');
  };

  const handleImportEmployees = async (empList: Omit<Employee, 'id'>[]) => {
    const items: Employee[] = empList.map((e, idx) => ({
      ...e,
      id: (e as any).id || `EMP-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
    }));

    const updated = [...employees, ...items];
    setEmployees(updated);
    setStorage('cm_employees', updated);

    fetch('/api/employees/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    }).catch((e) => console.warn('Sync warning:', e));

    setActiveTab('employee');
  };

  // Trigger File Generator
  const handleGenerateFile = async (fileType: string) => {
    if (!selectedCompany) return;
    try {
      const companySales = sales.filter((s) => s.companyId === selectedCompany.id);
      const companyPurchases = purchases.filter((p) => p.companyId === selectedCompany.id);
      const periods = new Set<string>();
      companySales.forEach((s) => s.monthYear && periods.add(s.monthYear));
      companyPurchases.forEach((p) => p.monthYear && periods.add(p.monthYear));
      const sortedPeriods = Array.from(periods).sort();
      const now = new Date();
      const fallbackPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthYearOrQuarter = sortedPeriods[sortedPeriods.length - 1] || fallbackPeriod;

      const res = await fetch('/api/files/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          fileType,
          monthYearOrQuarter,
        }),
      });

      if (res.ok) {
        const fileObj: GeneratedFile = await res.json();
        const updated = [fileObj, ...generatedFiles];
        setGeneratedFiles(updated);
        setStorage('cm_files', updated);
        setActiveTab('download');
      }
    } catch (err) {
      console.error('File generation error:', err);
    }
  };

  if (!user && !loading) {
    return (
      <LoginPage
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          loadInitialData();
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        activeSubTab={activeSubTab}
        onNavigate={handleNavigate}
        selectedCompany={selectedCompany}
        companies={companies}
        onSelectCompany={(c) => setSelectedCompany(c)}
        selectedFy={selectedFy}
        onSelectFy={(fy) => setSelectedFy(fy)}
        user={user}
        onRestoreDemo={handleRestoreDemo}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        mobileOpen={isMobileSidebarOpen}
        setMobileOpen={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          user={user}
          companies={companies}
          selectedCompany={selectedCompany}
          onSelectCompany={(c) => setSelectedCompany(c)}
          selectedFy={selectedFy}
          onSelectFy={(fy) => setSelectedFy(fy)}
          activeTab={activeTab}
          activeSubTab={activeSubTab}
          onNavigate={handleNavigate}
          onRestoreDemo={handleRestoreDemo}
          onLogout={handleLogout}
          setMobileOpen={setIsMobileSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <Dashboard
              company={selectedCompany}
              sales={sales}
              purchases={purchases}
              vendorPayments={vendorPayments}
              payroll={payroll}
              generatedFiles={generatedFiles}
              onNavigate={(t) => handleNavigate(t)}
              onGenerateFile={handleGenerateFile}
            />
          )}

          {activeTab === 'import' && (
            <DataImport
              company={selectedCompany}
              onImportSales={handleImportSales}
              onImportPurchases={handleImportPurchases}
              onImportVendorPayments={handleImportVendorPayments}
              onImportEmployees={handleImportEmployees}
            />
          )}

          {activeTab === 'gst' && (
            <GstModule
              company={selectedCompany}
              sales={sales}
              purchases={purchases}
              onGenerateFile={handleGenerateFile}
              onImportSales={handleImportSales}
              onImportPurchases={handleImportPurchases}
              onUpdateSaleClassification={handleUpdateSaleClassification}
              onUpdatePurchaseClassification={handleUpdatePurchaseClassification}
              initialSubTab={activeSubTab}
            />
          )}

          {activeTab === 'tds' && (
            <TdsModule
              company={selectedCompany}
              vendorPayments={vendorPayments}
              payroll={payroll}
              onGenerateFile={handleGenerateFile}
              onCreateVendorPayment={handleCreateVendorPayment}
              onUpdateVendorPayment={handleUpdateVendorPayment}
              onDeleteVendorPayment={handleDeleteVendorPayment}
              onImportVendorPayments={handleImportVendorPayments}
            />
          )}

          {activeTab === 'payroll' && (
            <PayrollModule
              company={selectedCompany}
              payroll={payroll}
              onGenerateFile={handleGenerateFile}
              onImportEmployees={handleImportEmployees}
              initialSubTab={activeSubTab}
            />
          )}

          {activeTab === 'employee_portal' && (
            <EmployeePortal
              company={selectedCompany}
              employees={employees}
              payroll={payroll}
              initialSubTab={activeSubTab}
              onNavigateTab={handleNavigate}
            />
          )}

          {activeTab === 'erp_sync' && (
            <ErpSyncModule
              company={selectedCompany}
              salesInvoices={sales}
              purchaseInvoices={purchases}
              vendorPayments={vendorPayments}
              payroll={payroll}
              initialSubTab={activeSubTab}
            />
          )}

          {activeTab === 'recon' && (
            <ReconciliationModule
              company={selectedCompany}
              purchases={purchases}
              generatedFiles={generatedFiles}
              onNavigateTab={(t) => handleNavigate(t)}
              initialSubTab={activeSubTab}
            />
          )}

          {activeTab === 'download' && (
            <DownloadCenter company={selectedCompany} files={generatedFiles} />
          )}

          {(activeTab === 'company_profile' || activeTab === 'company') && (
            <CompanyProfile
              company={selectedCompany}
              onUpdateCompany={handleUpdateCompany}
              currentUser={user}
              companies={companies}
              onSelectCompany={(c) => setSelectedCompany(c)}
              onCreateCompany={handleCreateCompany}
              onDeleteCompany={handleDeleteCompany}
            />
          )}

          {activeTab === 'employee' && (
            <EmployeeMaster
              company={selectedCompany}
              employees={employees}
              onCreateEmployee={handleCreateEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onImportEmployees={handleImportEmployees}
            />
          )}

          {activeTab === 'rules' && <TaxRulesConfig />}
        </main>
      </div>
    </div>
  );
}
