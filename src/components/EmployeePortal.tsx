import React, { useState, useEffect } from 'react';
import {
  Company,
  Employee,
  PayrollRun,
  AttendanceRecord,
  LeaveRequest,
  LeaveBalance,
  CompanyHoliday,
  ReimbursementClaim,
  EmployeeTaxDeclaration,
  EmployeeDocument,
} from '../types';
import {
  Clock,
  Calendar,
  CalendarDays,
  DollarSign,
  Receipt,
  FileCheck2,
  FileText,
  Upload,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  MapPin,
  Briefcase,
  Download,
  Eye,
  Plus,
  Trash2,
  RefreshCw,
  Printer,
  X,
  ShieldCheck,
  Building,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
  Paperclip,
  Check,
} from 'lucide-react';

interface EmployeePortalProps {
  company: Company | null;
  employees: Employee[];
  payroll: PayrollRun | null;
  initialSubTab?: string;
  onNavigateTab?: (tab: string, subTab?: string) => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  company,
  employees,
  payroll,
  initialSubTab,
  onNavigateTab,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('EMP-001');
  const [activeTab, setActiveTab] = useState<
    'ATTENDANCE' | 'LEAVES' | 'HOLIDAYS' | 'MY_PAY' | 'REIMBURSEMENTS' | 'TAX_DEDUCTIONS' | 'DOCUMENTS'
  >((initialSubTab as any) || 'ATTENDANCE');

  React.useEffect(() => {
    if (initialSubTab && ['ATTENDANCE', 'LEAVES', 'HOLIDAYS', 'MY_PAY', 'REIMBURSEMENTS', 'TAX_DEDUCTIONS', 'DOCUMENTS'].includes(initialSubTab)) {
      setActiveTab(initialSubTab as any);
    }
  }, [initialSubTab]);

  const activeEmployee = employees.find((e) => e.id === selectedEmpId) || employees[0] || {
    id: 'EMP-001',
    companyId: company?.id || 'COMP-001',
    empId: 'EMP001',
    name: 'Aarav Sharma',
    pan: 'ABCDE1234F',
    uan: '100987654321',
    pfMemberId: 'MH/BAN/0012345/000/0001',
    designation: 'Senior Software Architect',
    department: 'Engineering',
    joiningDate: '2022-03-01',
    gender: 'M',
    state: 'Maharashtra',
    basicPay: 45000,
    da: 5000,
    hra: 20000,
    specialAllowance: 15000,
  };

  // State Data
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({
    casualLeave: { total: 12, used: 3, balance: 9 },
    sickLeave: { total: 10, used: 1, balance: 9 },
    privilegeLeave: { total: 15, used: 4, balance: 11 },
    compOff: { total: 3, used: 1, balance: 2 },
  });
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementClaim[]>([]);
  const [taxDecl, setTaxDecl] = useState<EmployeeTaxDeclaration | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);

  const [loading, setLoading] = useState(false);

  // Forms Modals / Actions state
  const [isPunching, setIsPunching] = useState(false);
  const [workMode, setWorkMode] = useState<'IN_OFFICE' | 'WFH' | 'ON_SITE'>('IN_OFFICE');
  const [punchLocation, setPunchLocation] = useState('BKC Cyber Heights Office');
  const [punchNotes, setPunchNotes] = useState('');

  // Leave Form
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<'CASUAL' | 'SICK' | 'PRIVILEGE' | 'COMP_OFF'>('CASUAL');
  const [leaveStartDate, setLeaveStartDate] = useState('2026-08-10');
  const [leaveEndDate, setLeaveEndDate] = useState('2026-08-11');
  const [leaveHalfDay, setLeaveHalfDay] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');

  // Reimbursement Form
  const [showReimbModal, setShowReimbModal] = useState(false);
  const [reimbCategory, setReimbCategory] = useState<
    'TRAVEL' | 'MEALS' | 'INTERNET_MOBILE' | 'MEDICAL' | 'CLIENT_ENTERTAINMENT' | 'OFFICE_SUPPLIES' | 'CERTIFICATION'
  >('INTERNET_MOBILE');
  const [reimbAmount, setReimbAmount] = useState<number>(1499);
  const [reimbDate, setReimbDate] = useState('2026-07-28');
  const [reimbMerchant, setReimbMerchant] = useState('');
  const [reimbDesc, setReimbDesc] = useState('');
  const [reimbFile, setReimbFile] = useState<string>('Receipt_July_2026.pdf');

  // Document Upload Form
  const [showDocModal, setShowDocModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<
    'IDENTITY' | 'ACADEMIC' | 'PREVIOUS_EMPLOYMENT' | 'BANK_DETAILS' | 'TAX_INVESTMENT_PROOF' | 'OTHER'
  >('TAX_INVESTMENT_PROOF');
  const [docFileName, setDocFileName] = useState('');

  // Payslip viewer
  const [viewPayslipMonth, setViewPayslipMonth] = useState<string | null>(null);

  // Load Data for Selected Employee
  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      // Attendance
      const attRes = await fetch(`/api/employee-portal/attendance?employeeId=${selectedEmpId}`);
      if (attRes.ok) setAttendanceLogs(await attRes.json());

      // Leaves
      const lveRes = await fetch(`/api/employee-portal/leaves?employeeId=${selectedEmpId}`);
      if (lveRes.ok) {
        const lData = await lveRes.json();
        setLeaveRequests(lData.requests || []);
        if (lData.balances) setLeaveBalance(lData.balances);
      }

      // Holidays
      const holRes = await fetch('/api/employee-portal/holidays');
      if (holRes.ok) setHolidays(await holRes.json());

      // Reimbursements
      const rmbRes = await fetch(`/api/employee-portal/reimbursements?employeeId=${selectedEmpId}`);
      if (rmbRes.ok) setReimbursements(await rmbRes.json());

      // Tax Declaration
      const taxRes = await fetch(`/api/employee-portal/tax-declarations?employeeId=${selectedEmpId}`);
      if (taxRes.ok) setTaxDecl(await taxRes.json());

      // Documents
      const docRes = await fetch(`/api/employee-portal/documents?employeeId=${selectedEmpId}`);
      if (docRes.ok) setDocuments(await docRes.json());
    } catch (err) {
      console.error('Error loading employee portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, [selectedEmpId]);

  // Handle Punch In / Punch Out
  const handlePunch = async (type: 'PUNCH_IN' | 'PUNCH_OUT') => {
    setIsPunching(true);
    try {
      const res = await fetch('/api/employee-portal/attendance/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: activeEmployee.id,
          type,
          workMode,
          location: punchLocation,
          notes: punchNotes,
        }),
      });
      if (res.ok) {
        await loadEmployeeData();
        setPunchNotes('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPunching(false);
    }
  };

  // Handle Leave Apply
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveReason) return;
    try {
      const res = await fetch('/api/employee-portal/leaves/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: activeEmployee.id,
          empName: activeEmployee.name,
          leaveType,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          daysCount: leaveHalfDay ? 0.5 : 1,
          halfDay: leaveHalfDay,
          reason: leaveReason,
        }),
      });
      if (res.ok) {
        setShowLeaveModal(false);
        setLeaveReason('');
        await loadEmployeeData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Cancel Leave
  const handleCancelLeave = async (id: string) => {
    if (confirm('Cancel this pending leave request?')) {
      await fetch(`/api/employee-portal/leaves/${id}/cancel`, { method: 'PUT' });
      await loadEmployeeData();
    }
  };

  // Handle Submit Reimbursement
  const handleClaimReimb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reimbAmount || !reimbMerchant || !reimbDesc) return;
    try {
      const res = await fetch('/api/employee-portal/reimbursements/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: activeEmployee.id,
          category: reimbCategory,
          amount: reimbAmount,
          expenseDate: reimbDate,
          merchant: reimbMerchant,
          description: reimbDesc,
          receiptName: reimbFile || 'Receipt_Proof.pdf',
        }),
      });
      if (res.ok) {
        setShowReimbModal(false);
        setReimbMerchant('');
        setReimbDesc('');
        await loadEmployeeData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Update Tax Declaration
  const handleSaveTaxDecl = async (updated: EmployeeTaxDeclaration) => {
    try {
      const res = await fetch('/api/employee-portal/tax-declarations/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: activeEmployee.id,
          declaration: updated,
        }),
      });
      if (res.ok) {
        setTaxDecl(await res.json());
        alert('Tax savings declaration updated and submitted for HR review!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Document Upload
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName) return;
    try {
      const res = await fetch('/api/employee-portal/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: activeEmployee.id,
          documentName: docName,
          category: docCategory,
          fileName: docFileName || `${docName.replace(/\s+/g, '_')}.pdf`,
          fileSizeKb: Math.floor(400 + Math.random() * 1200),
        }),
      });
      if (res.ok) {
        setShowDocModal(false);
        setDocName('');
        setDocFileName('');
        await loadEmployeeData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Document Delete
  const handleDeleteDoc = async (id: string) => {
    if (confirm('Delete this document?')) {
      await fetch(`/api/employee-portal/documents/${id}`, { method: 'DELETE' });
      await loadEmployeeData();
    }
  };

  // Calculate Employee Gross Salary
  const monthlyGross = activeEmployee.basicPay + activeEmployee.da + activeEmployee.hra + activeEmployee.specialAllowance;
  const annualGross = monthlyGross * 12;

  // Check today's punch state
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPunch = attendanceLogs.find((a) => a.date === todayStr);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* Employee Header & Profile Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#25D366] text-slate-950 font-black flex items-center justify-center text-xl shadow-md shrink-0">
            {activeEmployee.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{activeEmployee.name}</h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                {activeEmployee.empId}
              </span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
              {activeEmployee.designation} • {activeEmployee.department} | Joining Date: {activeEmployee.joiningDate}
            </p>
            <div className="flex items-center space-x-3 mt-1.5 text-[11px] text-slate-400 font-mono">
              <span>PAN: {activeEmployee.pan}</span>
              <span>UAN: {activeEmployee.uan}</span>
              <span>Company: {company?.legalName || 'Apex Digital'}</span>
            </div>
          </div>
        </div>

        {/* Employee Switcher */}
        <div className="flex items-center space-x-2 bg-white/10 p-2 rounded-xl backdrop-blur-xs border border-white/10 w-full md:w-auto shrink-0">
          <User className="w-4 h-4 text-emerald-400 ml-1" />
          <span className="text-xs text-slate-300 font-medium">Viewing as:</span>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-400"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.designation})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Employee Navigation Tabs */}
      <div className="flex items-center overflow-x-auto whitespace-nowrap gap-2 border-b border-slate-200 pb-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'ATTENDANCE'
              ? 'bg-[#25D366] text-slate-950 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Mark Attendance</span>
        </button>

        <button
          onClick={() => setActiveTab('LEAVES')}
          className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'LEAVES'
              ? 'bg-[#25D366] text-slate-950 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Leave Application</span>
        </button>

        <button
          onClick={() => setActiveTab('HOLIDAYS')}
          className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'HOLIDAYS'
              ? 'bg-[#25D366] text-slate-950 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Company Holidays</span>
        </button>

        <button
          onClick={() => setActiveTab('MY_PAY')}
          className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'MY_PAY'
              ? 'bg-[#25D366] text-slate-950 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>My Pay & Slips</span>
        </button>

        <button
          onClick={() => setActiveTab('REIMBURSEMENTS')}
          className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'REIMBURSEMENTS'
              ? 'bg-[#25D366] text-slate-950 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Reimbursements</span>
        </button>

        <button
          onClick={() => setActiveTab('TAX_DEDUCTIONS')}
          className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'TAX_DEDUCTIONS'
              ? 'bg-[#25D366] text-slate-950 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Tax Deductions</span>
        </button>

        <button
          onClick={() => setActiveTab('DOCUMENTS')}
          className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'DOCUMENTS'
              ? 'bg-[#25D366] text-slate-950 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Documents</span>
        </button>
      </div>

      {/* 1. MARK ATTENDANCE */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today Punch Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-bold text-slate-900 text-sm">Today Attendance Punch</h2>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded font-mono">
                  {todayStr}
                </span>
              </div>

              {/* Status Display */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Punch In Time:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {todayPunch?.punchIn || 'Not Punched In Yet'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Punch Out Time:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {todayPunch?.punchOut || 'Not Punched Out'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Work Mode:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {todayPunch?.workMode || workMode}
                  </span>
                </div>
              </div>

              {/* Work Mode & Location Selector */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Work Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setWorkMode('IN_OFFICE');
                        setPunchLocation('BKC Cyber Heights Office');
                      }}
                      className={`py-2 rounded-xl text-[11px] font-bold border transition ${
                        workMode === 'IN_OFFICE'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      In Office
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWorkMode('WFH');
                        setPunchLocation('Home Location (Approved WFH)');
                      }}
                      className={`py-2 rounded-xl text-[11px] font-bold border transition ${
                        workMode === 'WFH'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      WFH
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWorkMode('ON_SITE');
                        setPunchLocation('Client Site / On Duty');
                      }}
                      className={`py-2 rounded-xl text-[11px] font-bold border transition ${
                        workMode === 'ON_SITE'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      On Duty
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Tag</label>
                  <div className="flex items-center space-x-1.5 border border-slate-200 p-2 rounded-xl bg-slate-50">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={punchLocation}
                      onChange={(e) => setPunchLocation(e.target.value)}
                      className="w-full text-xs bg-transparent focus:outline-none text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Daily Task / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Working on API development..."
                    value={punchNotes}
                    onChange={(e) => setPunchNotes(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Punch Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    disabled={isPunching}
                    onClick={() => handlePunch('PUNCH_IN')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Punch IN</span>
                  </button>

                  <button
                    disabled={isPunching}
                    onClick={() => handlePunch('PUNCH_OUT')}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Punch OUT</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance Monthly Log Table & Metrics */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">Monthly Attendance History & Log</h2>
                  <p className="text-xs text-slate-500">July 2026 Attendance Register for {activeEmployee.name}</p>
                </div>
                <div className="flex space-x-2 text-xs">
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg">
                    Present: 22 Days
                  </span>
                  <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-lg">
                    Late: 1 Day
                  </span>
                  <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-lg">
                    Leaves: 1 Day
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Punch In</th>
                      <th className="p-3">Punch Out</th>
                      <th className="p-3">Work Mode</th>
                      <th className="p-3">Total Hours</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {attendanceLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{log.date}</td>
                        <td className="p-3 text-emerald-700 font-bold">{log.punchIn}</td>
                        <td className="p-3 text-rose-700 font-bold">{log.punchOut || '-'}</td>
                        <td className="p-3 font-sans">
                          <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                            {log.workMode}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{log.totalHours || '8h 30m'}</td>
                        <td className="p-3 text-center font-sans">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                              log.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : log.status === 'LATE'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : log.status === 'ON_LEAVE'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LEAVE APPLICATION */}
      {activeTab === 'LEAVES' && (
        <div className="space-y-6">
          {/* Leave Balances Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Casual Leave (CL)</span>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-2xl font-black text-slate-900">{leaveBalance.casualLeave.balance}</span>
                <span className="text-xs text-slate-400 font-medium">of {leaveBalance.casualLeave.total} days</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${(leaveBalance.casualLeave.balance / leaveBalance.casualLeave.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Sick Leave (SL)</span>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-2xl font-black text-slate-900">{leaveBalance.sickLeave.balance}</span>
                <span className="text-xs text-slate-400 font-medium">of {leaveBalance.sickLeave.total} days</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-teal-500 h-full"
                  style={{ width: `${(leaveBalance.sickLeave.balance / leaveBalance.sickLeave.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Privilege Leave (PL)</span>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-2xl font-black text-slate-900">{leaveBalance.privilegeLeave.balance}</span>
                <span className="text-xs text-slate-400 font-medium">of {leaveBalance.privilegeLeave.total} days</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-indigo-500 h-full"
                  style={{ width: `${(leaveBalance.privilegeLeave.balance / leaveBalance.privilegeLeave.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Compensatory Off</span>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-2xl font-black text-slate-900">{leaveBalance.compOff.balance}</span>
                <span className="text-xs text-slate-400 font-medium">of {leaveBalance.compOff.total} days</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: `${(leaveBalance.compOff.balance / leaveBalance.compOff.total) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Leave History & Apply Button */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">My Leave Requests & Applications</h2>
                <p className="text-xs text-slate-500">Track leave application status and manager approvals</p>
              </div>

              <button
                onClick={() => setShowLeaveModal(true)}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Apply New Leave</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Leave Type</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3">Days</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Manager Remarks</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">
                        <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                          {req.leaveType}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{req.startDate}</td>
                      <td className="p-3 font-mono">{req.endDate}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{req.daysCount} d</td>
                      <td className="p-3 max-w-xs truncate text-slate-600">{req.reason}</td>
                      <td className="p-3 max-w-xs truncate text-slate-500">{req.managerRemarks || '-'}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : req.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : req.status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelLeave(req.id)}
                            className="text-rose-600 hover:text-rose-800 text-[11px] font-bold hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. UPCOMING HOLIDAYS */}
      {activeTab === 'HOLIDAYS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" /> Company Holiday Calendar 2026-27
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mandatory National & Regional State Holidays for {company?.legalName || 'Apex Digital'}
                </p>
              </div>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-3 py-1 rounded-xl">
                8 Company Holidays Listed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {holidays.map((hol) => (
                <div
                  key={hol.id}
                  className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 hover:bg-white hover:border-emerald-500 transition shadow-xs flex justify-between items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-sm">{hol.name}</span>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                          hol.type === 'MANDATORY'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {hol.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{hol.description}</p>
                  </div>

                  <div className="text-right shrink-0 ml-4 font-mono">
                    <span className="block font-black text-emerald-700 text-sm">{hol.date}</span>
                    <span className="text-[11px] text-slate-500 font-sans font-medium block">{hol.day}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. MY PAY & PAYSLIPS */}
      {activeTab === 'MY_PAY' && (
        <div className="space-y-6">
          {/* Salary Breakdown Summary */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">Monthly Gross CTC Breakdown</span>
                <h2 className="text-2xl font-black font-mono mt-1">₹{monthlyGross.toLocaleString('en-IN')} / month</h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Annual Cost to Company (CTC)</span>
                <span className="text-lg font-bold text-emerald-300 font-mono">₹{annualGross.toLocaleString('en-IN')} / yr</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="text-slate-300 block text-[10px] uppercase font-sans">Basic Pay</span>
                <span className="text-base font-extrabold text-white">₹{activeEmployee.basicPay.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="text-slate-300 block text-[10px] uppercase font-sans">HRA</span>
                <span className="text-base font-extrabold text-white">₹{activeEmployee.hra.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="text-slate-300 block text-[10px] uppercase font-sans">Special Allowance</span>
                <span className="text-base font-extrabold text-white">₹{activeEmployee.specialAllowance.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="text-slate-300 block text-[10px] uppercase font-sans">DA</span>
                <span className="text-base font-extrabold text-white">₹{activeEmployee.da.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Payslip History List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" /> Monthly Salary Payslips List
            </h2>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Pay Period</th>
                    <th className="p-3 text-right">Gross Salary (₹)</th>
                    <th className="p-3 text-right">PF Deduction (₹)</th>
                    <th className="p-3 text-right">PT Deduction (₹)</th>
                    <th className="p-3 text-right">TDS (₹)</th>
                    <th className="p-3 text-right">Net Take-Home (₹)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {['2026-06', '2026-05', '2026-04'].map((m) => (
                    <tr key={m} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900 font-sans">{m}</td>
                      <td className="p-3 text-right font-bold">₹{monthlyGross.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right text-amber-700">₹{Math.round(activeEmployee.basicPay * 0.12).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹200</td>
                      <td className="p-3 text-right text-rose-700">₹1,250</td>
                      <td className="p-3 text-right font-extrabold text-emerald-700">
                        ₹{(monthlyGross - Math.round(activeEmployee.basicPay * 0.12) - 200 - 1250).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center font-sans">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                          Credited to Bank
                        </span>
                      </td>
                      <td className="p-3 text-center font-sans">
                        <button
                          onClick={() => setViewPayslipMonth(m)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2.5 py-1 rounded-lg text-[11px] transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-purple-600" /> View Payslip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. REIMBURSEMENTS */}
      {activeTab === 'REIMBURSEMENTS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" /> Employee Expense Reimbursement Claims
                </h2>
                <p className="text-xs text-slate-500">Submit expense claims for travel, internet, meals & office supplies</p>
              </div>

              <button
                onClick={() => setShowReimbModal(true)}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Submit Reimbursement Claim</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Claim No</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Merchant</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3">Receipt Attached</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reimbursements.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-mono text-slate-900">{c.claimNumber}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                          {c.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{c.expenseDate}</td>
                      <td className="p-3 font-semibold text-slate-800">{c.merchant}</td>
                      <td className="p-3 text-right font-bold font-mono text-slate-900">₹{c.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-slate-500 font-mono text-[11px] truncate max-w-xs">{c.receiptName || 'Attached.pdf'}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                            c.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : c.status === 'SUBMITTED'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAX DEDUCTIONS */}
      {activeTab === 'TAX_DEDUCTIONS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" /> Income Tax Investment Declaration & Deductions (FY 2026-27)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Declare Section 80C, 80D, HRA & Housing Loan tax savings for Form 16 & TDS computation
                </p>
              </div>

              {taxDecl && (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Declaration Status: {taxDecl.verificationStatus}
                </span>
              )}
            </div>

            {/* Declaration Forms Grid */}
            {taxDecl && (
              <div className="space-y-6 text-xs">
                {/* 80C */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="font-extrabold text-slate-900 text-xs uppercase">Section 80C (Max Limit ₹1,50,000)</span>
                    <span className="font-mono font-bold text-emerald-700">
                      Total Declared: ₹{taxDecl.section80C.total.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">Public Provident Fund (PPF)</label>
                      <input
                        type="number"
                        value={taxDecl.section80C.ppf}
                        onChange={(e) =>
                          setTaxDecl({
                            ...taxDecl,
                            section80C: { ...taxDecl.section80C, ppf: Number(e.target.value) },
                          })
                        }
                        className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">ELSS Tax Saving Mutual Funds</label>
                      <input
                        type="number"
                        value={taxDecl.section80C.elss}
                        onChange={(e) =>
                          setTaxDecl({
                            ...taxDecl,
                            section80C: { ...taxDecl.section80C, elss: Number(e.target.value) },
                          })
                        }
                        className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Life Insurance Premium (LIC)</label>
                      <input
                        type="number"
                        value={taxDecl.section80C.lifeInsurance}
                        onChange={(e) =>
                          setTaxDecl({
                            ...taxDecl,
                            section80C: { ...taxDecl.section80C, lifeInsurance: Number(e.target.value) },
                          })
                        }
                        className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Employee PF Contribution</label>
                      <input
                        type="number"
                        readOnly
                        value={taxDecl.section80C.epf}
                        className="w-full bg-slate-100 border border-slate-200 p-2 rounded-lg font-mono text-slate-500"
                      />
                    </div>
                  </div>
                </div>

                {/* HRA */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="font-extrabold text-slate-900 text-xs uppercase">House Rent Allowance (HRA Exemption)</span>
                    <span className="font-mono font-bold text-purple-700">
                      Annual Rent: ₹{taxDecl.hraExemption.annualRent.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">Monthly Rent Paid (₹)</label>
                      <input
                        type="number"
                        value={taxDecl.hraExemption.rentPaidMonthly}
                        onChange={(e) =>
                          setTaxDecl({
                            ...taxDecl,
                            hraExemption: {
                              ...taxDecl.hraExemption,
                              rentPaidMonthly: Number(e.target.value),
                              annualRent: Number(e.target.value) * 12,
                            },
                          })
                        }
                        className="w-full border border-slate-200 p-2 rounded-lg font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Landlord PAN (Mandatory if &gt; ₹1L)</label>
                      <input
                        type="text"
                        value={taxDecl.hraExemption.landlordPan}
                        onChange={(e) =>
                          setTaxDecl({
                            ...taxDecl,
                            hraExemption: { ...taxDecl.hraExemption, landlordPan: e.target.value },
                          })
                        }
                        className="w-full border border-slate-200 p-2 rounded-lg font-mono uppercase focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Landlord Full Name</label>
                      <input
                        type="text"
                        value={taxDecl.hraExemption.landlordName}
                        onChange={(e) =>
                          setTaxDecl({
                            ...taxDecl,
                            hraExemption: { ...taxDecl.hraExemption, landlordName: e.target.value },
                          })
                        }
                        className="w-full border border-slate-200 p-2 rounded-lg focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">City Metro Status</label>
                      <select
                        value={taxDecl.hraExemption.cityType}
                        onChange={(e) =>
                          setTaxDecl({
                            ...taxDecl,
                            hraExemption: { ...taxDecl.hraExemption, cityType: e.target.value as any },
                          })
                        }
                        className="w-full border border-slate-200 p-2 rounded-lg focus:outline-none focus:border-purple-500"
                      >
                        <option value="METRO">Metro (50% Basic)</option>
                        <option value="NON_METRO">Non-Metro (40% Basic)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleSaveTaxDecl(taxDecl)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs shadow transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Submit Tax Declaration for Form 16</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. UPLOAD DOCUMENTS */}
      {activeTab === 'DOCUMENTS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-600" /> Employee Document Vault & Proof Uploads
                </h2>
                <p className="text-xs text-slate-500">Upload Aadhaar, PAN, degree certificates, rent agreements & bank proofs</p>
              </div>

              <button
                onClick={() => setShowDocModal(true)}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Upload New Document</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-slate-200 rounded-2xl p-4 bg-slate-50 hover:bg-white hover:border-emerald-500 transition shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-extrabold text-slate-900 text-xs block">{doc.documentName}</span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{doc.category}</span>
                    </div>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                        doc.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {doc.verificationStatus}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 font-mono">
                    <span className="truncate max-w-[150px]">{doc.fileName}</span>
                    <span>{doc.fileSizeKb} KB</span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-slate-400">Uploaded {doc.uploadedAt}</span>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APPLY LEAVE */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Apply for Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="CASUAL">Casual Leave (CL)</option>
                  <option value="SICK">Sick Leave (SL)</option>
                  <option value="PRIVILEGE">Privilege Leave (PL)</option>
                  <option value="COMP_OFF">Compensatory Off</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="halfDay"
                  checked={leaveHalfDay}
                  onChange={(e) => setLeaveHalfDay(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="halfDay" className="font-medium text-slate-700">
                  Half-Day Leave
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  placeholder="Explain reason for leave request..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-100 text-slate-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-black bg-[#25D366] text-slate-950 text-xs shadow-xs"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLAIM REIMBURSEMENT */}
      {showReimbModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Submit Reimbursement Claim</h3>
              <button onClick={() => setShowReimbModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClaimReimb} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={reimbCategory}
                  onChange={(e) => setReimbCategory(e.target.value as any)}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="INTERNET_MOBILE">Internet / Mobile Broadband</option>
                  <option value="TRAVEL">Travel & Conveyance</option>
                  <option value="MEALS">Meals & Food</option>
                  <option value="CLIENT_ENTERTAINMENT">Client Entertainment</option>
                  <option value="MEDICAL">Medical Allowance</option>
                  <option value="OFFICE_SUPPLIES">Office Supplies & Stationery</option>
                  <option value="CERTIFICATION">Courses & Certifications</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={reimbAmount}
                    onChange={(e) => setReimbAmount(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={reimbDate}
                    onChange={(e) => setReimbDate(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Merchant / Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jio Fiber, Uber, Trident Restaurant"
                  value={reimbMerchant}
                  onChange={(e) => setReimbMerchant(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Description</label>
                <input
                  type="text"
                  placeholder="Business purpose explanation..."
                  value={reimbDesc}
                  onChange={(e) => setReimbDesc(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Receipt File Name</label>
                <input
                  type="text"
                  value={reimbFile}
                  onChange={(e) => setReimbFile(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReimbModal(false)}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-100 text-slate-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-black bg-[#25D366] text-slate-950 text-xs shadow-xs"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD DOCUMENT */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Upload Employee Document</h3>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDoc} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Passport Copy, Rent Receipt Q1..."
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as any)}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="IDENTITY">Identity Proof (Aadhaar / PAN / Passport)</option>
                  <option value="TAX_INVESTMENT_PROOF">Tax Investment Proofs & Receipts</option>
                  <option value="ACADEMIC">Degree & Academic Certificates</option>
                  <option value="PREVIOUS_EMPLOYMENT">Relieving Letter / Past Payslips</option>
                  <option value="BANK_DETAILS">Bank Cheque / Passbook Copy</option>
                  <option value="OTHER">Other Documents</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">File Name</label>
                <input
                  type="text"
                  placeholder="e.g. Document_Proof.pdf"
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-100 text-slate-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-black bg-[#25D366] text-slate-950 text-xs shadow-xs"
                >
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PAYSLIP */}
      {viewPayslipMonth && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Payslip for {activeEmployee.name} ({viewPayslipMonth})
              </h3>
              <button onClick={() => setViewPayslipMonth(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-800 font-sans">
              <div className="text-center border-b border-slate-200 pb-4">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                  {company?.legalName || 'Apex Digital Solutions Pvt Ltd'}
                </h2>
                <p className="text-slate-500">{company?.address || 'BKC Complex'}, {company?.city || 'Mumbai'}</p>
                <div className="mt-2 inline-block bg-emerald-100 font-bold px-3 py-1 rounded-lg text-emerald-900 uppercase">
                  Pay Slip for the month of {viewPayslipMonth}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">Employee Name:</span> <span className="font-bold">{activeEmployee.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Designation:</span> <span className="font-bold">{activeEmployee.designation}</span>
                </div>
                <div>
                  <span className="text-slate-500">UAN:</span> <span className="font-bold font-mono">{activeEmployee.uan}</span>
                </div>
                <div>
                  <span className="text-slate-500">PAN:</span> <span className="font-bold font-mono">{activeEmployee.pan}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50 px-3 py-2 font-bold text-emerald-900 border-b border-slate-200 flex justify-between font-sans">
                    <span>EARNINGS</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="p-3 space-y-1.5 font-sans">
                    <div className="flex justify-between text-slate-600">
                      <span>Basic Pay</span>
                      <span>₹{activeEmployee.basicPay.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>HRA</span>
                      <span>₹{activeEmployee.hra.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Special Allowance</span>
                      <span>₹{activeEmployee.specialAllowance.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-rose-50 px-3 py-2 font-bold text-rose-900 border-b border-slate-200 flex justify-between font-sans">
                    <span>DEDUCTIONS</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="p-3 space-y-1.5 font-sans">
                    <div className="flex justify-between text-slate-600">
                      <span>Provident Fund (EPF 12%)</span>
                      <span>₹{Math.round(activeEmployee.basicPay * 0.12).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Professional Tax (PT)</span>
                      <span>₹200</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>TDS / Income Tax</span>
                      <span>₹1,250</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">NET TAKE-HOME SALARY</span>
                  <span className="text-xs text-emerald-400 font-medium">Direct Bank Transfer Credit</span>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  ₹{(monthlyGross - Math.round(activeEmployee.basicPay * 0.12) - 200 - 1250).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between items-center">
                <span>Computer generated payslip.</span>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1 rounded-lg text-[11px] flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Payslip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
