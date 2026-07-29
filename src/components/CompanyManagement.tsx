import React, { useState } from 'react';
import { Company } from '../types';
import { validateGstin, validatePan, validateTan, STATE_CODES } from '../lib/validation';
import { Building2, Plus, CheckCircle2, AlertCircle, Edit, Trash2, Check, X } from 'lucide-react';

interface CompanyManagementProps {
  companies: Company[];
  selectedCompany: Company | null;
  onSelectCompany: (company: Company) => void;
  onCreateCompany: (companyData: Omit<Company, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdateCompany?: (id: string, data: Partial<Company>) => void;
  onDeleteCompany?: (id: string) => void;
}

export const CompanyManagement: React.FC<CompanyManagementProps> = ({
  companies,
  selectedCompany,
  onSelectCompany,
  onCreateCompany,
  onUpdateCompany,
  onDeleteCompany,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Form State
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [tan, setTan] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [stateCode, setStateCode] = useState('27');
  const [pfCode, setPfCode] = useState('');
  const [esiCode, setEsiCode] = useState('');
  const [ptState, setPtState] = useState('Maharashtra');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [financialYear, setFinancialYear] = useState('2026-27');

  const [formError, setFormError] = useState('');

  const openCreateModal = () => {
    setEditingCompany(null);
    setLegalName('');
    setTradeName('');
    setGstin('');
    setPan('');
    setTan('');
    setPfCode('');
    setEsiCode('');
    setContactPerson('');
    setEmail('');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (c: Company) => {
    setEditingCompany(c);
    setLegalName(c.legalName);
    setTradeName(c.tradeName);
    setGstin(c.gstin);
    setPan(c.pan);
    setTan(c.tan);
    setState(c.state);
    setStateCode(c.stateCode);
    setPfCode(c.pfCode || '');
    setEsiCode(c.esiCode || '');
    setContactPerson(c.contactPerson || '');
    setEmail(c.email || '');
    setFormError('');
    setShowModal(true);
  };

  // Handle GSTIN Change and auto-fill State and PAN
  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setGstin(clean);

    if (clean.length >= 2) {
      const code = clean.substring(0, 2);
      if (STATE_CODES[code]) {
        setStateCode(code);
        setState(STATE_CODES[code]);
        setPtState(STATE_CODES[code]);
      }
    }
    if (clean.length >= 12) {
      const extractedPan = clean.substring(2, 12);
      setPan(extractedPan);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!legalName.trim()) {
      setFormError('Legal Name is required');
      return;
    }

    const gstVal = validateGstin(gstin);
    if (!gstVal.valid) {
      setFormError(gstVal.message || 'Invalid GSTIN');
      return;
    }

    const panVal = validatePan(pan);
    if (!panVal.valid) {
      setFormError(panVal.message || 'Invalid PAN');
      return;
    }

    const tanVal = validateTan(tan);
    if (!tanVal.valid) {
      setFormError(tanVal.message || 'Invalid TAN');
      return;
    }

    if (editingCompany && onUpdateCompany) {
      onUpdateCompany(editingCompany.id, {
        legalName,
        tradeName: tradeName || legalName,
        gstin,
        pan,
        tan,
        state,
        stateCode,
        pfCode,
        esiCode,
        ptState,
        address,
        city,
        pincode,
        contactPerson,
        email,
        mobile,
        financialYear,
      });
    } else {
      onCreateCompany({
        legalName,
        tradeName: tradeName || legalName,
        gstin,
        pan,
        tan,
        state,
        stateCode,
        pfCode,
        pfExtension: '000',
        esiCode,
        ptState,
        address,
        city,
        pincode,
        contactPerson,
        email,
        mobile,
        financialYear,
      });
    }

    setShowModal(false);
    setEditingCompany(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Company Master</h1>
          <p className="text-slate-500 text-sm mt-1">Manage client profiles, GSTINs, TANs, and Statutory Registration codes for filing.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Company</span>
        </button>
      </div>

      {/* Companies List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((comp) => {
          const isSelected = selectedCompany?.id === comp.id;
          return (
            <div
              key={comp.id}
              className={`bg-white rounded-2xl p-6 border transition shadow-sm relative flex flex-col justify-between ${
                isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{comp.legalName}</h3>
                      <p className="text-xs text-slate-500">{comp.tradeName}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">GSTIN:</span>
                    <span className="font-bold text-slate-800">{comp.gstin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">TAN:</span>
                    <span className="font-bold text-slate-800">{comp.tan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">PAN:</span>
                    <span className="font-bold text-slate-800">{comp.pan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">PF Code:</span>
                    <span className="text-slate-700">{comp.pfCode || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">State:</span>
                    <span className="text-slate-700">{comp.state} ({comp.stateCode})</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(comp)}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                    title="Edit Company"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {onDeleteCompany && companies.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${comp.legalName}?`)) onDeleteCompany(comp.id);
                      }}
                      className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                      title="Delete Company"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onSelectCompany(comp)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isSelected ? 'Selected Client' : 'Select Client'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Company Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Add New Company Master</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Legal Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme InfoTech Pvt Ltd"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trade Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Tech"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN *</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="27AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PAN *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="AAAAA0000A"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">TAN * (for TDS)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="MUMB12345A"
                    value={tan}
                    onChange={(e) => setTan(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State & Code</label>
                  <select
                    value={stateCode}
                    onChange={(e) => {
                      setStateCode(e.target.value);
                      setState(STATE_CODES[e.target.value]);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {Object.entries(STATE_CODES).map(([code, name]) => (
                      <option key={code} value={code}>
                        {code} - {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PF Establishment Code</label>
                  <input
                    type="text"
                    placeholder="MH/BAN/0012345/000"
                    value={pfCode}
                    onChange={(e) => setPfCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ESI Code</label>
                  <input
                    type="text"
                    placeholder="31000123450000101"
                    value={esiCode}
                    onChange={(e) => setEsiCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="finance@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

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
                  Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
