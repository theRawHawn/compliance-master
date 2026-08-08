/**
 * Compliance Master Data Types
 */

export type UserRole = 'CA_FIRM' | 'SME_ACCOUNTANT' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  firmName?: string;
}

export interface Company {
  id: string;
  userId: string;
  legalName: string;
  tradeName?: string;
  entityType?: string; // Private Limited, LLP, Partnership, Sole Proprietorship
  gstin: string;
  pan: string;
  tan: string;
  state: string;
  stateCode: string; // e.g., '27' for Maharashtra
  gstUser?: string;
  gstFilingFrequency?: 'MONTHLY' | 'QRMP';
  eInvoicingEnabled?: boolean;
  eWayBillUser?: string;
  pfCode?: string; // e.g., 'MH/BAN/0012345/000'
  pfExtension?: string;
  esiCode?: string; // e.g., '31000123450000101'
  ptState?: string; // e.g., 'Maharashtra'
  ptRegistrationNo?: string;
  lwfRegistrationNo?: string;
  address: string;
  city: string;
  pincode: string;
  contactPerson: string;
  email: string;
  mobile: string;
  financialYear: string; // e.g., '2025-26' or '2026-27'
  bankName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankBranch?: string;
  cmsClientCode?: string;
  authorizedSignatoryName?: string;
  authorizedSignatoryDesignation?: string;
  authorizedSignatoryPan?: string;
  authorizedSignatoryDin?: string;
  dscSerialNo?: string;
  dscExpiryDate?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  empId: string;
  name: string;
  pan: string;
  uan: string;
  pfMemberId: string;
  esiNo?: string;
  designation: string;
  department: string;
  joiningDate: string;
  gender: 'M' | 'F' | 'O';
  state: string;
  basicPay: number;
  da: number;
  hra: number;
  specialAllowance: number;
  ptExempt?: boolean;
}

export type InvoiceType = 'B2B' | 'B2CL' | 'B2CS' | 'CDNR' | 'EXPORT' | 'NIL_EXEMPT';

export interface SalesInvoice {
  id: string;
  companyId: string;
  invoiceNo: string;
  invoiceDate: string; // YYYY-MM-DD
  customerName: string;
  customerGstin?: string;
  posState: string;
  posCode: string;
  invoiceType: InvoiceType;
  reverseCharge: 'Y' | 'N';
  hsnCode: string;
  description: string;
  quantity: number;
  uqc: string; // e.g. 'NOS', 'KGS'
  rate: number; // GST rate percentage e.g. 18
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  monthYear: string; // YYYY-MM
  status: 'VALID' | 'WARNING' | 'ERROR';
  validationMessage?: string;
}

export interface PurchaseInvoice {
  id: string;
  companyId: string;
  invoiceNo: string;
  invoiceDate: string;
  vendorName: string;
  vendorGstin: string;
  posState: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  itcEligible: 'Y' | 'N';
  /** 'Y' if this purchase is liable to reverse charge (GSTR-3B Table 3.1(d)) -- e.g. legal
   *  services from an advocate, GTA freight, security services from a non-body-corporate,
   *  sponsorship, import of services. RCM liability must be paid via cash ledger only and
   *  cannot be offset by existing ITC (Section 16 / Rule 85), so this is tracked and computed
   *  separately from regular ITC eligibility. Defaults to 'N' when absent. */
  reverseCharge?: 'Y' | 'N';
  hsnCode?: string;
  monthYear: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  reconciledWith2B?: 'MATCHED' | 'MISMATCH' | 'NOT_IN_2B';
}

export interface VendorPayment {
  id: string;
  companyId: string;
  paymentNo: string;
  paymentDate: string;
  vendorName: string;
  vendorPan: string;
  sectionCode: string; // '194C' | '194J' | '194H' | '194I' | '194Q' | '194R'
  natureOfPayment: string;
  invoiceAmount: number;
  paymentAmount: number;
  tdsRate: number;
  tdsDeducted: number;
  tdsDeposited: number;
  challanNo?: string;
  bsrCode?: string;
  challanDate?: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  financialYear: string;
}

export interface PayrollLine {
  id: string;
  employeeId: string;
  empName: string;
  pan: string;
  uan: string;
  pfMemberId: string;
  esiNo?: string;
  daysWorked: number;
  grossSalary: number;
  basicSalary: number;
  pfWage: number;
  esiWage: number;
  pfEmployee: number; // 12%
  pfEmployer: number; // 3.67%
  epsEmployer: number; // 8.33%
  edliEmployer: number; // 0.5%
  adminCharges: number; // 0.5%
  esiEmployee: number; // 0.75%
  esiEmployer: number; // 3.25%
  pt: number;
  tds: number;
  netSalary: number;
}

export interface PayrollRun {
  id: string;
  companyId: string;
  monthYear: string; // YYYY-MM
  totalEmployees: number;
  totalGrossSalary: number;
  totalPfEmp: number;
  totalPfEmpr: number;
  totalEsiEmp: number;
  totalEsiEmpr: number;
  totalPt: number;
  totalTds: number;
  lines: PayrollLine[];
  status: 'CALCULATED' | 'FILE_READY';
}

export interface TaxRule {
  id: string;
  category: 'GST' | 'TDS' | 'PF' | 'ESI' | 'PT';
  name: string;
  value: string | number;
  description: string;
}

export interface GeneratedFile {
  id: string;
  companyId: string;
  module: 'GST' | 'TDS' | 'PAYROLL';
  fileType:
    | 'GSTR1_JSON'
    | 'GSTR1_REGISTER_CSV'
    | 'GSTR1_B2B_CSV'
    | 'GSTR1_B2CS_CSV'
    | 'GSTR1_HSN_CSV'
    | 'GSTR3B_EXCEL'
    | 'TDS_24Q_FVU'
    | 'TDS_24Q_CSV'
    | 'TDS_26Q_FVU'
    | 'TDS_26Q_CSV'
    | 'FORM_27A_TXT'
    | 'PF_ECR_TXT'
    | 'ESI_CSV'
    | 'PT_SUMMARY';
  fileName: string;
  fileContent: string;
  monthYearOrQuarter: string;
  createdAt: string;
  recordCount: number;
  fileSizeKb: number;
}

export interface DueDateItem {
  id: string;
  returnName: string;
  period: string;
  dueDate: string;
  module: 'GST' | 'TDS' | 'PAYROLL';
  status: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';
}

export interface ErpConfig {
  tallyHost: string;
  tallyPort: number;
  tallyCompany: string;
  zohoOrgId: string;
  zohoClientId: string;
  zohoClientSecret: string;
  zohoRefreshToken: string;
  zohoDomain: 'com' | 'in';
  salesLedger: string;
  purchaseLedger: string;
  cgstLedger: string;
  sgstLedger: string;
  igstLedger: string;
  tdsPayableLedger: string;
  salaryExpenseLedger: string;
  pfPayableLedger: string;
  esiPayableLedger: string;
  ptPayableLedger: string;
  bankAccountLedger: string;
}

export interface ErpSyncLog {
  id: string;
  companyId: string;
  target: 'TALLY' | 'ZOHO_BOOKS';
  module: 'GST_SALES' | 'GST_PURCHASE' | 'TDS_VOUCHER' | 'PAYROLL';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  recordsSynced: number;
  message: string;
  timestamp: string;
  payloadSnippet?: string;
}

export interface BankPayoutBatch {
  id: string;
  companyId: string;
  bankName: 'HDFC_CMS' | 'ICICI_CIB' | 'SBI_BULK';
  monthYear: string;
  totalEmployees: number;
  totalAmount: number;
  fileContent: string;
  fileName: string;
  createdAt: string;
}

/**
 * Employee Portal Self-Service Data Types
 */

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  punchIn: string; // e.g. "09:15 AM"
  punchOut?: string; // e.g. "06:30 PM"
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEK_OFF';
  workMode: 'IN_OFFICE' | 'WFH' | 'ON_SITE';
  location: string;
  notes?: string;
  totalHours?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  empName: string;
  leaveType: 'CASUAL' | 'SICK' | 'PRIVILEGE' | 'MATERNITY' | 'PATERNITY' | 'COMP_OFF' | 'UNPAID';
  startDate: string;
  endDate: string;
  daysCount: number;
  halfDay: boolean;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  appliedOn: string;
  managerRemarks?: string;
}

export interface LeaveBalance {
  casualLeave: { total: number; used: number; balance: number };
  sickLeave: { total: number; used: number; balance: number };
  privilegeLeave: { total: number; used: number; balance: number };
  compOff: { total: number; used: number; balance: number };
}

export interface CompanyHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  day: string;
  name: string;
  type: 'MANDATORY' | 'OPTIONAL' | 'REGIONAL';
  description: string;
}

export interface ReimbursementClaim {
  id: string;
  employeeId: string;
  claimNumber: string;
  category: 'TRAVEL' | 'MEALS' | 'INTERNET_MOBILE' | 'MEDICAL' | 'CLIENT_ENTERTAINMENT' | 'OFFICE_SUPPLIES' | 'CERTIFICATION';
  amount: number;
  expenseDate: string;
  merchant: string;
  description: string;
  receiptName?: string;
  receiptDataUrl?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  submittedOn: string;
  approvedAmount?: number;
  remarks?: string;
}

export interface EmployeeTaxDeclaration {
  id: string;
  employeeId: string;
  financialYear: string;
  chosenRegime: 'OLD' | 'NEW';
  section80C: {
    ppf: number;
    elss: number;
    epf: number;
    lifeInsurance: number;
    tuitionFees: number;
    homeLoanPrincipal: number;
    total: number;
  };
  section80D: {
    selfInsurance: number;
    parentsInsurance: number;
    preventiveCheckup: number;
    total: number;
  };
  section24b: {
    homeLoanInterest: number;
  };
  hraExemption: {
    rentPaidMonthly: number;
    annualRent: number;
    landlordPan: string;
    landlordName: string;
    cityType: 'METRO' | 'NON_METRO';
  };
  otherDeductions: {
    nps80CCD1B: number;
    lta: number;
    phoneInternet: number;
  };
  submittedOn: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REVISION_NEEDED';
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  documentName: string;
  category: 'IDENTITY' | 'ACADEMIC' | 'PREVIOUS_EMPLOYMENT' | 'BANK_DETAILS' | 'TAX_INVESTMENT_PROOF' | 'OTHER';
  fileName: string;
  fileSizeKb: number;
  fileDataUrl?: string;
  uploadedAt: string;
  issueDate?: string;
  expiryDate?: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REVISION_NEEDED';
  comments?: string;
}


