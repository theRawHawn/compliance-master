import React, { useState } from 'react';
import { Company, Employee } from '../types';
import { ImportModal } from './ImportModal';
import { Users, Plus, Search, X, Edit, Trash2, Upload, Sparkles, ShieldCheck, Calculator } from 'lucide-react';

interface EmployeeMasterProps {
  company: Company | null;
  employees: Employee[];
  onCreateEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee?: (id: string, emp: Partial<Employee>) => void;
  onDeleteEmployee?: (id: string) => void;
  onImportEmployees?: (employees: Omit<Employee, 'id'>[]) => void;
}

export const EmployeeMaster: React.FC<EmployeeMasterProps> = ({
  company,
  employees,
  onCreateEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onImportEmployees,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State - Employee Details
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [pan, setPan] = useState('');
  const [uan, setUan] = useState('');
  const [pfMemberId, setPfMemberId] = useState('');
  const [esiNo, setEsiNo] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [joiningDate, setJoiningDate] = useState('2024-01-01');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M');
  const [ptExempt, setPtExempt] = useState(false);

  // CTC & Auto-Calculation States
  const [monthlyCtc, setMonthlyCtc] = useState<number>(43000);
  const [annualCtc, setAnnualCtc] = useState<number>(516000);
  const [autoCalc, setAutoCalc] = useState<boolean>(true);

  // Granular Component Auto-Calc Rules & Checkboxes
  const [useBasicAuto, setUseBasicAuto] = useState<boolean>(true);
  const [basicPercent, setBasicPercent] = useState<number>(50); // 50% of CTC

  const [useDaAuto, setUseDaAuto] = useState<boolean>(true);
  const [daPercent, setDaPercent] = useState<number>(10); // 10% of Basic

  const [useHraAuto, setUseHraAuto] = useState<boolean>(true);
  const [hraPercent, setHraPercent] = useState<number>(40); // 40% of Basic

  const [useSpecialAuto, setUseSpecialAuto] = useState<boolean>(true);
  const [usePfAuto, setUsePfAuto] = useState<boolean>(true);
  const [useEsiAuto, setUseEsiAuto] = useState<boolean>(true);

  // Actual Salary Breakup Boxes
  const [basicPay, setBasicPay] = useState<number>(21500);
  const [da, setDa] = useState<number>(2150);
  const [hra, setHra] = useState<number>(8600);
  const [specialAllowance, setSpecialAllowance] = useState<number>(10750);

  if (!company) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        Please select a company first.
      </div>
    );
  }

  const compEmployees = employees.filter((e) => e.companyId === company.id);
  const filteredEmployees = compEmployees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.pan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Core salary auto-calculation engine
  const applyAutoCalculations = (
    ctcVal: number,
    opts?: {
      calcEnabled?: boolean;
      bAuto?: boolean;
      bPct?: number;
      dAuto?: boolean;
      dPct?: number;
      hAuto?: boolean;
      hPct?: number;
      sAuto?: boolean;
      esiAuto?: boolean;
    }
  ) => {
    const isCalc = opts?.calcEnabled ?? autoCalc;
    if (!isCalc) return;

    const bAuto = opts?.bAuto ?? useBasicAuto;
    const bPct = opts?.bPct ?? basicPercent;
    const dAuto = opts?.dAuto ?? useDaAuto;
    const dPct = opts?.dPct ?? daPercent;
    const hAuto = opts?.hAuto ?? useHraAuto;
    const hPct = opts?.hPct ?? hraPercent;
    const sAuto = opts?.sAuto ?? useSpecialAuto;
    const esiAuto = opts?.esiAuto ?? useEsiAuto;

    // 1. Calculate Basic Pay
    let calculatedBasic = basicPay;
    if (bAuto) {
      calculatedBasic = Math.round(ctcVal * (bPct / 100));
      setBasicPay(calculatedBasic);
    }

    // 2. Calculate DA
    let calculatedDa = da;
    if (dAuto) {
      calculatedDa = Math.round(calculatedBasic * (dPct / 100));
      setDa(calculatedDa);
    } else if (opts?.dAuto === false) {
      calculatedDa = 0;
      setDa(0);
    }

    // 3. Calculate HRA
    let calculatedHra = hra;
    if (hAuto) {
      calculatedHra = Math.round(calculatedBasic * (hPct / 100));
      setHra(calculatedHra);
    } else if (opts?.hAuto === false) {
      calculatedHra = 0;
      setHra(0);
    }

    // 4. Calculate Special / Balancing Allowance
    if (sAuto) {
      const remaining = Math.max(0, ctcVal - (calculatedBasic + calculatedDa + calculatedHra));
      setSpecialAllowance(remaining);
    }

    // 5. Auto ESI Check
    if (esiAuto) {
      const gross = ctcVal;
      if (gross > 21000) {
        if (!esiNo || esiNo === '31000123450000101') {
          setEsiNo('');
        }
      } else if (!esiNo) {
        setEsiNo('31000123450000101');
      }
    }
  };

  const openCreateModal = () => {
    setEditingEmp(null);
    const newEmpId = `EMP${String(compEmployees.length + 1).padStart(3, '0')}`;
    setEmpId(newEmpId);
    setName('');
    setPan('');
    setUan('');
    setPfMemberId('');
    setEsiNo('');
    setDesignation('Software Engineer');
    setDepartment('Engineering');
    setJoiningDate('2024-01-01');
    setGender('M');
    setPtExempt(false);

    // Initial CTC setup (₹43,000 / month = ₹5,16,000 / year)
    const initCtc = 43000;
    setMonthlyCtc(initCtc);
    setAnnualCtc(initCtc * 12);
    setAutoCalc(true);
    setUseBasicAuto(true);
    setBasicPercent(50);
    setUseDaAuto(true);
    setDaPercent(10);
    setUseHraAuto(true);
    setHraPercent(40);
    setUseSpecialAuto(true);
    setUsePfAuto(true);
    setUseEsiAuto(true);

    const b = Math.round(initCtc * 0.5); // 21500
    const d = Math.round(b * 0.1); // 2150
    const h = Math.round(b * 0.4); // 8600
    const s = initCtc - (b + d + h); // 10750
    setBasicPay(b);
    setDa(d);
    setHra(h);
    setSpecialAllowance(s);

    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpId(emp.empId);
    setName(emp.name);
    setPan(emp.pan);
    setUan(emp.uan);
    setPfMemberId(emp.pfMemberId || '');
    setEsiNo(emp.esiNo || '');
    setDesignation(emp.designation || '');
    setDepartment(emp.department || '');
    setJoiningDate(emp.joiningDate || '2024-01-01');
    setGender(emp.gender || 'M');
    setPtExempt(emp.ptExempt || false);

    const currentGross = (emp.basicPay || 0) + (emp.da || 0) + (emp.hra || 0) + (emp.specialAllowance || 0);
    const mCtc = currentGross || 43000;
    setMonthlyCtc(mCtc);
    setAnnualCtc(mCtc * 12);
    setAutoCalc(false); // Preserve exact manually stored breakdown unless user toggles auto-calc

    setBasicPay(emp.basicPay || 0);
    setDa(emp.da || 0);
    setHra(emp.hra || 0);
    setSpecialAllowance(emp.specialAllowance || 0);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPan = pan.toUpperCase().trim();
    const cleanEmpId = empId || `EMP${compEmployees.length + 1}`;
    const generatedPfId = pfMemberId || `${company.pfCode || 'MH/BAN/0012345/000'}/${cleanEmpId}`;
    const defaultUan = uan || `1010${Math.floor(10000000 + Math.random() * 90000000)}`;

    if (editingEmp && onUpdateEmployee) {
      onUpdateEmployee(editingEmp.id, {
        empId: cleanEmpId,
        name,
        pan: cleanPan,
        uan: defaultUan,
        pfMemberId: generatedPfId,
        esiNo,
        designation,
        department,
        joiningDate,
        gender,
        ptExempt,
        basicPay: Number(basicPay),
        da: Number(da),
        hra: Number(hra),
        specialAllowance: Number(specialAllowance),
      });
    } else {
      onCreateEmployee({
        companyId: company.id,
        empId: cleanEmpId,
        name,
        pan: cleanPan,
        uan: defaultUan,
        pfMemberId: generatedPfId,
        esiNo,
        designation,
        department,
        joiningDate,
        gender,
        state: company.state,
        ptExempt,
        basicPay: Number(basicPay),
        da: Number(da),
        hra: Number(hra),
        specialAllowance: Number(specialAllowance),
      });
    }

    setShowModal(false);
    setEditingEmp(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetModule="EMPLOYEES"
        company={company}
        onImportEmployees={onImportEmployees}
      />

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Employee Master Roster</h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            Managing {compEmployees.length} active employees for <strong>{company.legalName}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, ID, or PAN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 shrink-0"
            title="Import via Google Sheets, Excel, Tally, or Zoho"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Import Employees</span>
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Emp ID</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">PAN</th>
                <th className="px-4 py-3">UAN (PF Number)</th>
                <th className="px-4 py-3">ESI No</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3 text-right">Gross Salary (₹)</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-sans">
                    No employees found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((e) => {
                  const gross = e.basicPay + e.da + e.hra + e.specialAllowance;
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">{e.empId}</td>
                      <td className="px-4 py-3 font-sans font-semibold text-slate-800">{e.name}</td>
                      <td className="px-4 py-3">{e.pan}</td>
                      <td className="px-4 py-3 text-slate-600">{e.uan}</td>
                      <td className="px-4 py-3 text-slate-600">{e.esiNo || 'Exempt'}</td>
                      <td className="px-4 py-3 font-sans text-slate-600">{e.designation}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">₹{gross.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-center font-sans">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            onClick={() => openEditModal(e)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded transition"
                            title="Edit Employee"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteEmployee && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete employee ${e.name}?`)) onDeleteEmployee(e.id);
                              }}
                              className="p-1 hover:bg-rose-50 text-rose-600 rounded transition"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal with CTC Auto Calculation Engine */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingEmp ? 'Edit Employee Profile' : 'Add New Employee Profile'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-5 text-xs">
              {/* Section 1: Basic Profile Information */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" /> Basic Employee Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employee ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="EMP005"
                      value={empId}
                      onChange={(e) => setEmpId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Sanjay Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PAN *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="ABCDE1234F"
                      value={pan}
                      onChange={(e) => setPan(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      placeholder="Software Developer"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="Engineering"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'O')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Total CTC & Auto-Calculation Breakdown Panel */}
              <div className="bg-gradient-to-br from-emerald-50/80 via-blue-50/40 to-slate-50 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/30 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <h3 className="font-extrabold text-slate-900 text-sm">Total CTC & Salary Auto-Breakdown Engine</h3>
                      <span className="bg-emerald-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Auto Engine
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Entering total CTC automatically computes Basic, DA, HRA, Special Allowance, PF, and ESI. Toggle checkboxes to enable/disable specific rules.
                    </p>
                  </div>

                  {/* Master Auto-Calc Toggle Switch */}
                  <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-xs hover:border-emerald-500 transition shrink-0">
                    <input
                      type="checkbox"
                      checked={autoCalc}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setAutoCalc(val);
                        if (val) {
                          applyAutoCalculations(monthlyCtc, { calcEnabled: true });
                        }
                      }}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="font-extrabold text-slate-900 text-xs">
                      Enable Auto-Calculation
                    </span>
                  </label>
                </div>

                {/* CTC Package Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div>
                    <label className="block font-extrabold text-slate-900 mb-1 flex items-center justify-between">
                      <span>Total Monthly CTC (₹) *</span>
                      <span className="text-[10px] text-emerald-700 font-semibold font-mono">Monthly Package</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        required
                        value={monthlyCtc}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setMonthlyCtc(val);
                          setAnnualCtc(val * 12);
                          if (autoCalc) applyAutoCalculations(val);
                        }}
                        className="w-full pl-7 pr-3 py-2 border-2 border-emerald-500/50 focus:border-emerald-600 rounded-xl font-mono font-extrabold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="e.g. 50000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-900 mb-1 flex items-center justify-between">
                      <span>Total Annual CTC (₹)</span>
                      <span className="text-[10px] text-blue-700 font-semibold font-mono">Annual Package</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        value={annualCtc}
                        onChange={(e) => {
                          const ann = Number(e.target.value) || 0;
                          setAnnualCtc(ann);
                          const m = Math.round(ann / 12);
                          setMonthlyCtc(m);
                          if (autoCalc) applyAutoCalculations(m);
                        }}
                        className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="e.g. 600000"
                      />
                    </div>
                  </div>
                </div>

                {/* Tickable Checkboxes for Component Auto-Calculation Rules */}
                {autoCalc && (
                  <div className="space-y-2 bg-white/90 p-3 rounded-xl border border-emerald-200/80">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-emerald-600" /> Tick & Enable Component Calculation Rules
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {/* Basic Pay Checkbox */}
                      <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/60 cursor-pointer border border-slate-200/80 transition">
                        <input
                          type="checkbox"
                          checked={useBasicAuto}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUseBasicAuto(checked);
                            applyAutoCalculations(monthlyCtc, { bAuto: checked });
                          }}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold text-slate-900 block">Auto Basic Pay</span>
                          <span className="text-slate-500 font-mono text-[10px]">{basicPercent}% of CTC</span>
                        </div>
                      </label>

                      {/* DA Checkbox */}
                      <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/60 cursor-pointer border border-slate-200/80 transition">
                        <input
                          type="checkbox"
                          checked={useDaAuto}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUseDaAuto(checked);
                            applyAutoCalculations(monthlyCtc, { dAuto: checked });
                          }}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold text-slate-900 block">Auto DA (Dearness)</span>
                          <span className="text-slate-500 font-mono text-[10px]">{daPercent}% of Basic</span>
                        </div>
                      </label>

                      {/* HRA Checkbox */}
                      <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/60 cursor-pointer border border-slate-200/80 transition">
                        <input
                          type="checkbox"
                          checked={useHraAuto}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUseHraAuto(checked);
                            applyAutoCalculations(monthlyCtc, { hAuto: checked });
                          }}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold text-slate-900 block">Auto HRA (House Rent)</span>
                          <span className="text-slate-500 font-mono text-[10px]">{hraPercent}% of Basic</span>
                        </div>
                      </label>

                      {/* Special Allowance Checkbox */}
                      <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/60 cursor-pointer border border-slate-200/80 transition">
                        <input
                          type="checkbox"
                          checked={useSpecialAuto}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUseSpecialAuto(checked);
                            applyAutoCalculations(monthlyCtc, { sAuto: checked });
                          }}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold text-slate-900 block">Special Allowance</span>
                          <span className="text-slate-500 font-mono text-[10px]">Balances remaining CTC</span>
                        </div>
                      </label>

                      {/* Auto PF Rule Checkbox */}
                      <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/60 cursor-pointer border border-slate-200/80 transition">
                        <input
                          type="checkbox"
                          checked={usePfAuto}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUsePfAuto(checked);
                          }}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold text-slate-900 block">Auto PF Rule</span>
                          <span className="text-slate-500 font-mono text-[10px]">12% on Basic + DA</span>
                        </div>
                      </label>

                      {/* Auto ESI Rule Checkbox */}
                      <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/60 cursor-pointer border border-slate-200/80 transition">
                        <input
                          type="checkbox"
                          checked={useEsiAuto}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUseEsiAuto(checked);
                            applyAutoCalculations(monthlyCtc, { esiAuto: checked });
                          }}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold text-slate-900 block">Auto ESI Rule</span>
                          <span className="text-slate-500 font-mono text-[10px]">Applies if Gross ≤ ₹21k</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Salary Components Breakup Boxes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-extrabold text-slate-900 text-xs">Calculated Salary Components</label>
                    <div className="text-[11px] font-bold font-mono">
                      Gross Total: <span className="text-emerald-700">₹{(basicPay + da + hra + specialAllowance).toLocaleString('en-IN')}</span>
                      {monthlyCtc > 0 && Math.abs(monthlyCtc - (basicPay + da + hra + specialAllowance)) === 0 && (
                        <span className="ml-2 bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-sans font-extrabold">
                          ✓ Matches CTC
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Basic Pay Box */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 text-[11px]">Basic Pay (₹)</label>
                        {autoCalc && useBasicAuto && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">50% CTC</span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={basicPay}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setBasicPay(val);
                          if (autoCalc && useSpecialAuto) {
                            const rem = Math.max(0, monthlyCtc - (val + da + hra));
                            setSpecialAllowance(rem);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* DA Box */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 text-[11px]">DA (₹)</label>
                        {autoCalc && useDaAuto && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">10% Basic</span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={da}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setDa(val);
                          if (autoCalc && useSpecialAuto) {
                            const rem = Math.max(0, monthlyCtc - (basicPay + val + hra));
                            setSpecialAllowance(rem);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* HRA Box */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 text-[11px]">HRA (₹)</label>
                        {autoCalc && useHraAuto && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">40% Basic</span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={hra}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setHra(val);
                          if (autoCalc && useSpecialAuto) {
                            const rem = Math.max(0, monthlyCtc - (basicPay + da + val));
                            setSpecialAllowance(rem);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Special Allowance Box */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 text-[11px]">Special Allow. (₹)</label>
                        {autoCalc && useSpecialAuto && (
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 rounded">Balancer</span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={specialAllowance}
                        onChange={(e) => setSpecialAllowance(Number(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Statutory & Compliance Identifiers */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Statutory & Compliance Identifiers (PF / ESI / PT)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">UAN (12-digit PF Number)</label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="100987654321"
                      value={uan}
                      onChange={(e) => setUan(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {usePfAuto && (
                      <p className="text-[10px] text-emerald-700 mt-1 font-mono font-medium">
                        ✓ PF Base: ₹{Math.min(15000, basicPay + da).toLocaleString('en-IN')} | Est. Emp PF: ₹{Math.round(Math.min(15000, basicPay + da) * 0.12).toLocaleString('en-IN')}/mo
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PF Member ID</label>
                    <input
                      type="text"
                      placeholder={`${company.pfCode || 'MH/BAN/0012345/000'}/${empId || 'EMP01'}`}
                      value={pfMemberId}
                      onChange={(e) => setPfMemberId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>ESI Insurance No</span>
                      {(basicPay + da + hra + specialAllowance) > 21000 ? (
                        <span className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded font-bold">Exempt (&gt; ₹21k)</span>
                      ) : (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">Applicable (≤ ₹21k)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="31000123450000101"
                      value={esiNo}
                      onChange={(e) => setEsiNo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date of Joining</label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center sm:col-span-2 pt-4">
                    <label className="inline-flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs hover:bg-slate-50 transition">
                      <input
                        type="checkbox"
                        checked={ptExempt}
                        onChange={(e) => setPtExempt(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800 text-xs">Exempt Employee from Professional Tax (PT)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow"
                >
                  Save Employee Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

