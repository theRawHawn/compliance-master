import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import {
  Company,
  Employee,
  SalesInvoice,
  PurchaseInvoice,
  VendorPayment,
  PayrollRun,
  GeneratedFile,
  User,
} from './src/types.js';

import {
  DEMO_COMPANY,
  DEMO_EMPLOYEES,
  DEMO_SALES,
  DEMO_PURCHASES,
  DEMO_VENDOR_PAYMENTS,
  DEMO_PAYROLL_RUN,
} from './src/data/sampleData.js';

import {
  INITIAL_LEAVE_BALANCES,
  SAMPLE_COMPANY_HOLIDAYS,
  SAMPLE_ATTENDANCE_LOGS,
  SAMPLE_LEAVE_REQUESTS,
  SAMPLE_REIMBURSEMENTS,
  SAMPLE_TAX_DECLARATION,
  SAMPLE_DOCUMENTS,
} from './src/data/sampleEmployeePortalData.js';

import {
  generateGstr1Json,
  generateGstr1SalesRegisterCsv,
  generateGstr1B2bCsv,
  generateGstr1B2csCsv,
  generateGstr1HsnCsv,
  generateGstr3bExcel,
} from './src/lib/generators/gstGenerator.js';
import {
  generateTds26qFvu,
  generateTds26qCsv,
  generateTds24qFvu,
  generateTds24qCsv,
  generateForm27aTxt,
} from './src/lib/generators/tdsGenerator.js';
import { generatePfEcrTxt, generateEsiCsv, generatePtSummaryCsv } from './src/lib/generators/pfEsiGenerator.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-Memory Storage
let users: User[] = [
  {
    id: 'USER-001',
    email: 'rohankulkarnirk66@gmail.com',
    name: 'CA Rohan Kulkarni',
    role: 'CA_FIRM',
    firmName: 'Kulkarni & Associates CA Firm',
  },
];

let currentUser: User | null = users[0];

let companies: Company[] = [DEMO_COMPANY];
let employees: Employee[] = [...DEMO_EMPLOYEES];
let salesInvoices: SalesInvoice[] = [...DEMO_SALES];
let purchaseInvoices: PurchaseInvoice[] = [...DEMO_PURCHASES];
let vendorPayments: VendorPayment[] = [...DEMO_VENDOR_PAYMENTS];
let payrollRuns: PayrollRun[] = [DEMO_PAYROLL_RUN];
let generatedFiles: GeneratedFile[] = [];

// Employee Portal In-Memory Storage
let attendanceLogs = [...SAMPLE_ATTENDANCE_LOGS];
let leaveRequests = [...SAMPLE_LEAVE_REQUESTS];
let leaveBalances = { ...INITIAL_LEAVE_BALANCES };
let companyHolidays = [...SAMPLE_COMPANY_HOLIDAYS];
let reimbursements = [...SAMPLE_REIMBURSEMENTS];
let taxDeclarations: Record<string, any> = { 'EMP-001': SAMPLE_TAX_DECLARATION };
let employeeDocuments = [...SAMPLE_DOCUMENTS];

// ================= API ENDPOINTS ================= //

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Compliance Master', timestamp: new Date().toISOString() });
});

// Auth Endpoints
app.get('/api/auth/me', (req, res) => {
  res.json({ user: currentUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = {
      id: `USER-${Date.now()}`,
      email,
      name: email.split('@')[0],
      role: 'CA_FIRM',
      firmName: 'Accounting Firm',
    };
    users.push(user);
  }
  currentUser = user;
  res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  currentUser = null;
  res.json({ success: true });
});

// Companies CRUD
app.get('/api/companies', (req, res) => {
  res.json(companies);
});

app.post('/api/companies', (req, res) => {
  const data = req.body;
  const newCompany: Company = {
    ...data,
    id: `COMP-${Date.now()}`,
    userId: currentUser?.id || 'USER-001',
    createdAt: new Date().toISOString(),
  };
  companies.push(newCompany);
  res.status(201).json(newCompany);
});

app.put('/api/companies/:id', (req, res) => {
  const { id } = req.params;
  const idx = companies.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Company not found' });
  companies[idx] = { ...companies[idx], ...req.body };
  res.json(companies[idx]);
});

app.delete('/api/companies/:id', (req, res) => {
  const { id } = req.params;
  companies = companies.filter((c) => c.id !== id);
  res.json({ success: true });
});

// Seed Demo Data Endpoint
app.post('/api/demo/seed', (req, res) => {
  companies = [DEMO_COMPANY];
  employees = [...DEMO_EMPLOYEES];
  salesInvoices = [...DEMO_SALES];
  purchaseInvoices = [...DEMO_PURCHASES];
  vendorPayments = [...DEMO_VENDOR_PAYMENTS];
  payrollRuns = [DEMO_PAYROLL_RUN];
  generatedFiles = [];
  res.json({ success: true, message: 'Demo company dataset restored successfully!' });
});

// Employees CRUD
app.get('/api/employees', (req, res) => {
  const { companyId } = req.query;
  const list = companyId ? employees.filter((e) => e.companyId === companyId) : employees;
  res.json(list);
});

app.post('/api/employees', (req, res) => {
  const newEmp: Employee = {
    ...req.body,
    id: `EMP-${Date.now()}`,
  };
  employees.push(newEmp);
  res.status(201).json(newEmp);
});

app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const idx = employees.findIndex((e) => e.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Employee not found' });
  employees[idx] = { ...employees[idx], ...req.body };
  res.json(employees[idx]);
});

app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  employees = employees.filter((e) => e.id !== id);
  res.json({ success: true });
});

app.post('/api/employees/bulk', (req, res) => {
  const items: Employee[] = req.body.map((e: any, idx: number) => ({
    ...e,
    id: `EMP-${Date.now()}-${idx}`,
  }));
  employees.push(...items);
  res.json({ count: items.length });
});

// Sales Invoices CRUD
app.get('/api/sales', (req, res) => {
  const { companyId } = req.query;
  const list = companyId ? salesInvoices.filter((s) => s.companyId === companyId) : salesInvoices;
  res.json(list);
});

app.post('/api/sales', (req, res) => {
  const newSale: SalesInvoice = {
    ...req.body,
    id: `SALE-${Date.now()}`,
  };
  salesInvoices.push(newSale);
  res.status(201).json(newSale);
});

app.post('/api/sales/bulk', (req, res) => {
  const items: SalesInvoice[] = req.body.map((s: any, idx: number) => ({
    ...s,
    id: `SALE-${Date.now()}-${idx}`,
  }));
  salesInvoices.push(...items);
  res.json({ count: items.length });
});

// Purchase Invoices CRUD
app.get('/api/purchases', (req, res) => {
  const { companyId } = req.query;
  const list = companyId ? purchaseInvoices.filter((p) => p.companyId === companyId) : purchaseInvoices;
  res.json(list);
});

app.post('/api/purchases/bulk', (req, res) => {
  const items: PurchaseInvoice[] = req.body.map((p: any, idx: number) => ({
    ...p,
    id: `PUR-${Date.now()}-${idx}`,
  }));
  purchaseInvoices.push(...items);
  res.json({ count: items.length });
});

// Vendor Payments (TDS) CRUD
app.get('/api/vendor-payments', (req, res) => {
  const { companyId } = req.query;
  const list = companyId ? vendorPayments.filter((p) => p.companyId === companyId) : vendorPayments;
  res.json(list);
});

app.post('/api/vendor-payments', (req, res) => {
  const newPay: VendorPayment = {
    ...req.body,
    id: `PAY-${Date.now()}`,
  };
  vendorPayments.push(newPay);
  res.status(201).json(newPay);
});

app.put('/api/vendor-payments/:id', (req, res) => {
  const { id } = req.params;
  const idx = vendorPayments.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Vendor payment not found' });
  vendorPayments[idx] = { ...vendorPayments[idx], ...req.body };
  res.json(vendorPayments[idx]);
});

app.delete('/api/vendor-payments/:id', (req, res) => {
  const { id } = req.params;
  vendorPayments = vendorPayments.filter((p) => p.id !== id);
  res.json({ success: true });
});

app.post('/api/vendor-payments/bulk', (req, res) => {
  const items: VendorPayment[] = req.body.map((vp: any, idx: number) => ({
    ...vp,
    id: `PAY-${Date.now()}-${idx}`,
  }));
  vendorPayments.push(...items);
  res.json({ count: items.length });
});

// Payroll Runs
app.get('/api/payroll', (req, res) => {
  const { companyId } = req.query;
  const list = companyId ? payrollRuns.filter((p) => p.companyId === companyId) : payrollRuns;
  res.json(list);
});

// File Generation Router
function deriveFallbackPeriod(records: Array<{ monthYear?: string }>): string {
  const periods = records.map((r) => r.monthYear).filter((m): m is string => !!m).sort();
  if (periods.length > 0) return periods[periods.length - 1];
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

app.post('/api/files/generate', (req, res) => {
  const { companyId, fileType, monthYearOrQuarter } = req.body;
  const company = companies.find((c) => c.id === companyId);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  let file: GeneratedFile;

  if (fileType === 'GSTR1_JSON') {
    const compSales = salesInvoices.filter((s) => s.companyId === companyId);
    file = generateGstr1Json(company, compSales, monthYearOrQuarter || deriveFallbackPeriod(compSales));
  } else if (fileType === 'GSTR1_REGISTER_CSV') {
    const compSales = salesInvoices.filter((s) => s.companyId === companyId);
    file = generateGstr1SalesRegisterCsv(company, compSales, monthYearOrQuarter || deriveFallbackPeriod(compSales));
  } else if (fileType === 'GSTR1_B2B_CSV') {
    const compSales = salesInvoices.filter((s) => s.companyId === companyId);
    file = generateGstr1B2bCsv(company, compSales, monthYearOrQuarter || deriveFallbackPeriod(compSales));
  } else if (fileType === 'GSTR1_B2CS_CSV') {
    const compSales = salesInvoices.filter((s) => s.companyId === companyId);
    file = generateGstr1B2csCsv(company, compSales, monthYearOrQuarter || deriveFallbackPeriod(compSales));
  } else if (fileType === 'GSTR1_HSN_CSV') {
    const compSales = salesInvoices.filter((s) => s.companyId === companyId);
    file = generateGstr1HsnCsv(company, compSales, monthYearOrQuarter || deriveFallbackPeriod(compSales));
  } else if (fileType === 'GSTR3B_EXCEL') {
    const compSales = salesInvoices.filter((s) => s.companyId === companyId);
    const compPurchases = purchaseInvoices.filter((p) => p.companyId === companyId);
    file = generateGstr3bExcel(company, compSales, compPurchases, monthYearOrQuarter || deriveFallbackPeriod([...compSales, ...compPurchases]));
  } else if (fileType === 'TDS_26Q_FVU') {
    const compPayments = vendorPayments.filter((v) => v.companyId === companyId);
    file = generateTds26qFvu(company, compPayments, 'Q1', company.financialYear);
  } else if (fileType === 'TDS_26Q_CSV') {
    const compPayments = vendorPayments.filter((v) => v.companyId === companyId);
    file = generateTds26qCsv(company, compPayments, 'Q1', company.financialYear);
  } else if (fileType === 'TDS_24Q_FVU') {
    const pr = payrollRuns.find((p) => p.companyId === companyId) || DEMO_PAYROLL_RUN;
    file = generateTds24qFvu(company, pr, 'Q1', company.financialYear);
  } else if (fileType === 'TDS_24Q_CSV') {
    const pr = payrollRuns.find((p) => p.companyId === companyId) || DEMO_PAYROLL_RUN;
    file = generateTds24qCsv(company, pr, 'Q1', company.financialYear);
  } else if (fileType === 'FORM_27A_TXT') {
    const compPayments = vendorPayments.filter((v) => v.companyId === companyId);
    file = generateForm27aTxt(company, '26Q', compPayments, 'Q1', company.financialYear);
  } else if (fileType === 'PF_ECR_TXT') {
    const pr = payrollRuns.find((p) => p.companyId === companyId) || DEMO_PAYROLL_RUN;
    file = generatePfEcrTxt(company, pr);
  } else if (fileType === 'ESI_CSV') {
    const pr = payrollRuns.find((p) => p.companyId === companyId) || DEMO_PAYROLL_RUN;
    file = generateEsiCsv(company, pr);
  } else if (fileType === 'PT_SUMMARY') {
    const pr = payrollRuns.find((p) => p.companyId === companyId) || DEMO_PAYROLL_RUN;
    file = generatePtSummaryCsv(company, pr);
  } else {
    return res.status(400).json({ error: 'Unsupported file type' });
  }

  generatedFiles.unshift(file);
  res.json(file);
});

app.get('/api/files', (req, res) => {
  const { companyId } = req.query;
  const list = companyId ? generatedFiles.filter((f) => f.companyId === companyId) : generatedFiles;
  res.json(list);
});

// ================= EMPLOYEE PORTAL API ENDPOINTS ================= //

// 1. Attendance API
app.get('/api/employee-portal/attendance', (req, res) => {
  const empId = (req.query.employeeId as string) || 'EMP-001';
  const logs = attendanceLogs.filter((a) => a.employeeId === empId);
  res.json(logs);
});

app.post('/api/employee-portal/attendance/punch', (req, res) => {
  const { employeeId, type, workMode, location, notes } = req.body;
  const empId = employeeId || 'EMP-001';
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  let existing = attendanceLogs.find((a) => a.employeeId === empId && a.date === todayStr);

  if (type === 'PUNCH_IN') {
    if (existing) {
      existing.punchIn = nowTime;
      existing.workMode = workMode || 'IN_OFFICE';
      existing.location = location || 'Office';
      existing.notes = notes || existing.notes;
    } else {
      existing = {
        id: `ATT-${Date.now()}`,
        employeeId: empId,
        date: todayStr,
        punchIn: nowTime,
        status: 'PRESENT',
        workMode: workMode || 'IN_OFFICE',
        location: location || 'Headquarters Office',
        notes: notes || 'Punched in via Employee Portal',
        totalHours: '0h 0m',
      };
      attendanceLogs.unshift(existing);
    }
  } else if (type === 'PUNCH_OUT') {
    if (existing) {
      existing.punchOut = nowTime;
      existing.totalHours = '8h 45m';
    } else {
      existing = {
        id: `ATT-${Date.now()}`,
        employeeId: empId,
        date: todayStr,
        punchIn: '09:15 AM',
        punchOut: nowTime,
        status: 'PRESENT',
        workMode: workMode || 'IN_OFFICE',
        location: location || 'Headquarters Office',
        notes: notes || 'Punched out via Employee Portal',
        totalHours: '8h 45m',
      };
      attendanceLogs.unshift(existing);
    }
  }
  res.json(existing);
});

// 2. Leave Application API
app.get('/api/employee-portal/leaves', (req, res) => {
  const empId = (req.query.employeeId as string) || 'EMP-001';
  const requests = leaveRequests.filter((l) => l.employeeId === empId);
  const balances = leaveBalances[empId] || {
    casualLeave: { total: 12, used: 2, balance: 10 },
    sickLeave: { total: 10, used: 1, balance: 9 },
    privilegeLeave: { total: 15, used: 3, balance: 12 },
    compOff: { total: 2, used: 0, balance: 2 },
  };
  res.json({ requests, balances });
});

app.post('/api/employee-portal/leaves/apply', (req, res) => {
  const { employeeId, empName, leaveType, startDate, endDate, daysCount, halfDay, reason } = req.body;
  const empId = employeeId || 'EMP-001';

  const newReq = {
    id: `LV-${Date.now()}`,
    employeeId: empId,
    empName: empName || 'Aarav Sharma',
    leaveType: leaveType || 'CASUAL',
    startDate,
    endDate,
    daysCount: daysCount || 1,
    halfDay: !!halfDay,
    reason,
    status: 'PENDING' as const,
    appliedOn: new Date().toISOString().split('T')[0],
    managerRemarks: 'Under review by reporting manager',
  };

  leaveRequests.unshift(newReq);
  res.status(201).json(newReq);
});

app.put('/api/employee-portal/leaves/:id/cancel', (req, res) => {
  const { id } = req.params;
  const match = leaveRequests.find((l) => l.id === id);
  if (match) {
    match.status = 'CANCELLED';
    match.managerRemarks = 'Cancelled by employee';
    return res.json(match);
  }
  res.status(404).json({ error: 'Leave request not found' });
});

// 3. Holidays API
app.get('/api/employee-portal/holidays', (req, res) => {
  res.json(companyHolidays);
});

// 4. Reimbursements API
app.get('/api/employee-portal/reimbursements', (req, res) => {
  const empId = (req.query.employeeId as string) || 'EMP-001';
  const claims = reimbursements.filter((r) => r.employeeId === empId);
  res.json(claims);
});

app.post('/api/employee-portal/reimbursements/claim', (req, res) => {
  const { employeeId, category, amount, expenseDate, merchant, description, receiptName, receiptDataUrl } = req.body;
  const empId = employeeId || 'EMP-001';

  const newClaim = {
    id: `REIMB-${Date.now()}`,
    employeeId: empId,
    claimNumber: `CLM/2026/${Math.floor(100 + Math.random() * 900)}`,
    category,
    amount: Number(amount),
    expenseDate,
    merchant,
    description,
    receiptName: receiptName || 'Receipt_Proof.pdf',
    receiptDataUrl,
    status: 'SUBMITTED' as const,
    submittedOn: new Date().toISOString().split('T')[0],
    remarks: 'Submitted for Finance approval',
  };

  reimbursements.unshift(newClaim);
  res.status(201).json(newClaim);
});

// 5. Tax Deductions API
app.get('/api/employee-portal/tax-declarations', (req, res) => {
  const empId = (req.query.employeeId as string) || 'EMP-001';
  const dec = taxDeclarations[empId] || SAMPLE_TAX_DECLARATION;
  res.json(dec);
});

app.post('/api/employee-portal/tax-declarations/update', (req, res) => {
  const { employeeId, declaration } = req.body;
  const empId = employeeId || 'EMP-001';
  taxDeclarations[empId] = {
    ...declaration,
    employeeId: empId,
    submittedOn: new Date().toISOString().split('T')[0],
    verificationStatus: 'PENDING',
  };
  res.json(taxDeclarations[empId]);
});

// 6. Documents API
app.get('/api/employee-portal/documents', (req, res) => {
  const empId = (req.query.employeeId as string) || 'EMP-001';
  const docs = employeeDocuments.filter((d) => d.employeeId === empId);
  res.json(docs);
});

app.post('/api/employee-portal/documents/upload', (req, res) => {
  const { employeeId, documentName, category, fileName, fileSizeKb, fileDataUrl, issueDate, expiryDate } = req.body;
  const empId = employeeId || 'EMP-001';

  const newDoc = {
    id: `DOC-${Date.now()}`,
    employeeId: empId,
    documentName,
    category,
    fileName: fileName || 'Document.pdf',
    fileSizeKb: fileSizeKb || 512,
    fileDataUrl,
    uploadedAt: new Date().toISOString().split('T')[0],
    issueDate,
    expiryDate,
    verificationStatus: 'PENDING' as const,
    comments: 'Pending HR verification',
  };

  employeeDocuments.unshift(newDoc);
  res.status(201).json(newDoc);
});

app.delete('/api/employee-portal/documents/:id', (req, res) => {
  const { id } = req.params;
  employeeDocuments = employeeDocuments.filter((d) => d.id !== id);
  res.json({ success: true });
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Compliance Master] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
