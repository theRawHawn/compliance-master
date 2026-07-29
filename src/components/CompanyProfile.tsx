import React, { useState, useEffect } from 'react';
import { Company, User } from '../types';
import {
  Building2,
  FileCheck,
  CreditCard,
  Key,
  ShieldCheck,
  Users,
  CheckCircle2,
  Edit2,
  Save,
  Plus,
  Trash2,
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Building,
  FileText,
  Lock,
  Landmark,
  BadgeCheck,
  UserCheck,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface CompanyProfileProps {
  company: Company | null;
  onUpdateCompany: (updated: Company) => void;
  currentUser: User | null;
  companies?: Company[];
  onSelectCompany?: (c: Company) => void;
  onCreateCompany?: (newComp: Omit<Company, 'id' | 'userId' | 'createdAt'>) => void;
  onDeleteCompany?: (id: string) => void;
}

export const CompanyProfile: React.FC<CompanyProfileProps> = ({
  company,
  onUpdateCompany,
  currentUser,
  companies = [],
  onSelectCompany,
  onCreateCompany,
  onDeleteCompany,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'DETAILS' | 'STATUTORY' | 'BANK' | 'SIGNATORY' | 'TEAM'>('DETAILS');
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Editable state for selected company
  const [formData, setFormData] = useState<Company | null>(company ? { ...company } : null);

  useEffect(() => {
    if (company) {
      setFormData({ ...company });
    }
  }, [company]);

  // Initial State for New Company Creation Form
  const initialNewCompany = {
    legalName: '',
    tradeName: '',
    entityType: 'Private Limited',
    gstin: '',
    pan: '',
    tan: '',
    state: 'Maharashtra',
    stateCode: '27',
    gstUser: '',
    gstFilingFrequency: 'MONTHLY' as 'MONTHLY' | 'QRMP',
    eInvoicingEnabled: true,
    eWayBillUser: '',
    pfCode: '',
    pfExtension: '000',
    esiCode: '',
    ptState: 'Maharashtra',
    ptRegistrationNo: '',
    lwfRegistrationNo: '',
    address: '',
    city: 'Mumbai',
    pincode: '',
    contactPerson: '',
    email: '',
    mobile: '',
    financialYear: '2026-27',
    bankName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    bankBranch: '',
    cmsClientCode: '',
    authorizedSignatoryName: '',
    authorizedSignatoryDesignation: 'Director / Partner',
    authorizedSignatoryPan: '',
    authorizedSignatoryDin: '',
    dscSerialNo: '',
    dscExpiryDate: '2027-03-31',
  };

  const [newCompanyData, setNewCompanyData] = useState(initialNewCompany);

  const handleSaveProfile = async () => {
    if (formData) {
      onUpdateCompany(formData);
      setSavedSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyData.legalName || !newCompanyData.gstin || !newCompanyData.pan) {
      alert('Please fill at least Legal Name, GSTIN, and PAN Number.');
      return;
    }

    if (onCreateCompany) {
      onCreateCompany(newCompanyData);
    }
    setShowCreateModal(false);
    setNewCompanyData(initialNewCompany);
    setWizardStep(1);
  };

  if (!company && !showCreateModal) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">No Company Selected</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Set up a company profile with GSTIN, PAN, TAN, EPFO, ESIC, and Banking details to start statutory return filings.
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition inline-flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-4 h-4" /> Create Company Compliance Profile
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* Top Header & Company Selector */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 p-0.5 shadow-md flex items-center justify-center text-white font-black text-lg sm:text-xl shrink-0">
            {company?.legalName ? company.legalName.substring(0, 2).toUpperCase() : 'CO'}
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{company?.legalName}</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase">
                {company?.entityType || 'Private Limited'}
              </span>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200 uppercase">
                FY {company?.financialYear || '2026-27'}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5 sm:mt-1">
              GSTIN: <span className="font-mono font-bold text-slate-800">{company?.gstin}</span> | PAN:{' '}
              <span className="font-mono font-bold text-slate-800">{company?.pan}</span> | TAN:{' '}
              <span className="font-mono font-bold text-slate-800">{company?.tan}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full lg:w-auto justify-end">
          {/* Company Switcher Dropdown */}
          {companies.length > 1 && onSelectCompany && (
            <select
              value={company?.id}
              onChange={(e) => {
                const found = companies.find((c) => c.id === e.target.value);
                if (found) onSelectCompany(found);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legalName} ({c.gstin.slice(0, 10)}...)
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" /> Add Company
          </button>

          {savedSuccess && (
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Saved
            </span>
          )}

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
            >
              <Edit2 className="w-4 h-4 text-emerald-400" /> Edit Profile
            </button>
          ) : (
            <button
              onClick={handleSaveProfile}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
            >
              <Save className="w-4 h-4" /> Save Profile
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('DETAILS')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'DETAILS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span>Basic Identity</span>
        </button>

        <button
          onClick={() => setActiveSubTab('STATUTORY')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'STATUTORY'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4 text-blue-400" />
          <span>GST, TDS & Labor Registrations</span>
        </button>

        <button
          onClick={() => setActiveSubTab('BANK')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'BANK'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4 text-purple-400" />
          <span>Bank & CMS Disbursal</span>
        </button>

        <button
          onClick={() => setActiveSubTab('SIGNATORY')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'SIGNATORY'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Key className="w-4 h-4 text-amber-400" />
          <span>Authorized Signatory & Class-3 DSC</span>
        </button>

        <button
          onClick={() => setActiveSubTab('TEAM')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'TEAM'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-teal-400" />
          <span>Team Access</span>
        </button>
      </div>

      {/* BASIC DETAILS VIEW & EDIT */}
      {activeSubTab === 'DETAILS' && formData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Entity Identity & Address Information</h2>
              <p className="text-xs text-slate-500">Legal entity name and address header for all filed returns</p>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Active In FY {formData.financialYear}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Legal Name</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold disabled:bg-slate-50 disabled:text-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Trade / Brand Name</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.tradeName || ''}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold disabled:bg-slate-50 disabled:text-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Entity Structure</label>
              <select
                disabled={!isEditing}
                value={formData.entityType || 'Private Limited'}
                onChange={(e) => setFormData({ ...formData, entityType: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold disabled:bg-slate-50 disabled:text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="Private Limited">Private Limited (Pvt Ltd)</option>
                <option value="Public Limited">Public Limited</option>
                <option value="Limited Liability Partnership">LLP (Limited Liability Partnership)</option>
                <option value="Partnership Firm">Partnership Firm</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Registered Address</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold disabled:bg-slate-50 disabled:text-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">City & Pincode</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold disabled:bg-slate-50 disabled:text-slate-700 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono disabled:bg-slate-50 disabled:text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">State & State Code</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="col-span-2 w-full border border-slate-200 p-2.5 rounded-xl font-semibold disabled:bg-slate-50 disabled:text-slate-700 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.stateCode}
                  onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-mono text-center disabled:bg-slate-50 disabled:text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Contact Person</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold disabled:bg-slate-50 disabled:text-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Email Address</label>
              <input
                type="email"
                disabled={!isEditing}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-mono disabled:bg-slate-50 disabled:text-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-mono disabled:bg-slate-50 disabled:text-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* STATUTORY TAB */}
      {activeSubTab === 'STATUTORY' && formData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Tax & Labor Registration Master</h2>
            <p className="text-xs text-slate-500">Official registrations required for GST, TDS Form 26Q, EPFO ECR, and ESIC Returns</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* GST Card */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-emerald-900 uppercase">GSTIN Registration</span>
                <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">ACTIVE</span>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">GSTIN Number</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full bg-white border border-emerald-300 p-2 rounded-xl font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">API Username</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.gstUser || 'BYALANCE_GST_API'}
                    onChange={(e) => setFormData({ ...formData, gstUser: e.target.value })}
                    className="w-full bg-white border border-emerald-300 p-1.5 rounded-lg font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Frequency</label>
                  <select
                    disabled={!isEditing}
                    value={formData.gstFilingFrequency || 'MONTHLY'}
                    onChange={(e) => setFormData({ ...formData, gstFilingFrequency: e.target.value as any })}
                    className="w-full bg-white border border-emerald-300 p-1.5 rounded-lg text-[11px] font-semibold"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QRMP">QRMP Scheme</option>
                  </select>
                </div>
              </div>
            </div>

            {/* PAN Card */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-blue-900 uppercase">PAN Registration</span>
                <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">VERIFIED</span>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">PAN Card Number</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                  className="w-full bg-white border border-blue-300 p-2 rounded-xl font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 pt-1">Corporate Entity PAN validated with NSDL Master database.</p>
            </div>

            {/* TAN Card */}
            <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-purple-900 uppercase">TAN Deductor No</span>
                <span className="text-[9px] bg-purple-600 text-white font-bold px-1.5 py-0.5 rounded">FORM 26Q / 24Q</span>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">TAN Number</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.tan}
                  onChange={(e) => setFormData({ ...formData, tan: e.target.value })}
                  className="w-full bg-white border border-purple-300 p-2 rounded-xl font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 pt-1">Used for FVU v8.8 Quarterly Return validations.</p>
            </div>

            {/* EPFO PF Card */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-amber-900 uppercase">EPFO Establishment</span>
                <span className="text-[9px] bg-amber-600 text-white font-bold px-1.5 py-0.5 rounded">ECR v2.0</span>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">PF Code (MH/BAN/...)</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.pfCode || 'MH/BAN/0012345/000'}
                  onChange={(e) => setFormData({ ...formData, pfCode: e.target.value })}
                  className="w-full bg-white border border-amber-300 p-2 rounded-xl font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* ESIC Card */}
            <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-teal-900 uppercase">ESIC Sub-Code</span>
                <span className="text-[9px] bg-teal-600 text-white font-bold px-1.5 py-0.5 rounded">17-DIGIT</span>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">ESIC Registration Code</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.esiCode || '31000123450000101'}
                  onChange={(e) => setFormData({ ...formData, esiCode: e.target.value })}
                  className="w-full bg-white border border-teal-300 p-2 rounded-xl font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* PT Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-800 uppercase">Professional Tax (PT)</span>
                <span className="text-[9px] bg-slate-800 text-white font-bold px-1.5 py-0.5 rounded">STATE SPECIFIC</span>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">PTRC / PTEC Registration No.</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.ptRegistrationNo || 'PTRC-279988112233'}
                  onChange={(e) => setFormData({ ...formData, ptRegistrationNo: e.target.value })}
                  className="w-full bg-white border border-slate-300 p-2 rounded-xl font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BANK TAB */}
      {activeSubTab === 'BANK' && formData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Corporate Banking & Direct Disbursal Master</h2>
            <p className="text-xs text-slate-500">Configured account numbers used in HDFC, ICICI, and SBI bulk payout files</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Operating Bank Name</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.bankName || 'HDFC Bank'}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Current Account Number</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.bankAccountNumber || '50200011223344'}
                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Bank IFSC Code</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.bankIfscCode || 'HDFC0000123'}
                onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">CMS Disbursal Client Code</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.cmsClientCode || 'HDFCCMS_BYALANCE_99'}
                onChange={(e) => setFormData({ ...formData, cmsClientCode: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Branch Location</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.bankBranch || 'Koramangala Branch'}
                onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* SIGNATORY & DSC TAB */}
      {activeSubTab === 'SIGNATORY' && formData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Authorized Signatory & Class-3 DSC Status</h2>
            <p className="text-xs text-slate-500">Digital Signature Certificate validity for Form 27A, 26Q FVU, and GSTR filings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <span className="font-bold text-slate-800 text-sm block">Authorized Signatory Profile</span>
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-500 mb-0.5 font-bold">Signatory Full Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.authorizedSignatoryName || 'CA Rohan Kulkarni'}
                    onChange={(e) => setFormData({ ...formData, authorizedSignatoryName: e.target.value })}
                    className="w-full bg-white border border-slate-300 p-2 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 mb-0.5 font-bold">Designation</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.authorizedSignatoryDesignation || 'Managing Director / Partner'}
                      onChange={(e) => setFormData({ ...formData, authorizedSignatoryDesignation: e.target.value })}
                      className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-0.5 font-bold">Signatory PAN</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.authorizedSignatoryPan || 'ABCDE1234F'}
                      onChange={(e) => setFormData({ ...formData, authorizedSignatoryPan: e.target.value })}
                      className="w-full bg-white border border-slate-300 p-2 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5 font-bold">DIN / DPIN Number</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.authorizedSignatoryDin || '08912345'}
                    onChange={(e) => setFormData({ ...formData, authorizedSignatoryDin: e.target.value })}
                    className="w-full bg-white border border-slate-300 p-2 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 bg-emerald-950 text-white rounded-2xl border border-emerald-800 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-200 text-sm">Class-3 USB Token DSC Status</span>
                <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded uppercase">
                  USB TOKEN READY
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-emerald-300/80 text-[11px] mb-0.5 font-bold">Token Serial Number</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.dscSerialNo || '2026-HYD-998812'}
                    onChange={(e) => setFormData({ ...formData, dscSerialNo: e.target.value })}
                    className="w-full bg-emerald-900/60 border border-emerald-700 p-2 rounded-xl font-mono font-bold text-white"
                  />
                </div>

                <div>
                  <label className="block text-emerald-300/80 text-[11px] mb-0.5 font-bold">DSC Expiry Date</label>
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={formData.dscExpiryDate || '2027-03-31'}
                    onChange={(e) => setFormData({ ...formData, dscExpiryDate: e.target.value })}
                    className="w-full bg-emerald-900/60 border border-emerald-700 p-2 rounded-xl font-mono text-emerald-300 font-bold"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-emerald-800/80">
                Directly integrated with emSigner USB dongle service for FVU Form 27A digital signing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TEAM ACCESS TAB */}
      {activeSubTab === 'TEAM' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Compliance Team Access & Permissions</h2>
              <p className="text-xs text-slate-500">Invite CAs, Tax Advocates, and Internal Accountants to this company master</p>
            </div>
            <button
              onClick={() => alert('Invitation modal dispatched to team member')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" /> Invite CA / Auditor
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="py-3 flex justify-between items-center text-xs">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900">{currentUser?.name || 'CA Rohan Kulkarni'}</span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                    OWNER / COMPLIANCE LEAD
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{currentUser?.email || 'rohankulkarnirk66@gmail.com'}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>

            <div className="py-3 flex justify-between items-center text-xs">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900">Ananya Sharma</span>
                  <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                    GST & TDS AUDITOR
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">ananya@sharmaca.in</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW COMPANY PROFILE COMPLIANCE SETUP MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Create New Company Compliance Master</h2>
                  <p className="text-xs text-slate-400">Step {wizardStep} of 4 • Complete statutory setup wizard</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wizard Steps Indicator */}
            <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-200 text-center text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className={`py-3 px-2 border-r border-slate-200 transition ${
                  wizardStep === 1 ? 'bg-white text-emerald-700 border-b-2 border-b-emerald-600' : 'text-slate-500'
                }`}
              >
                1. Basic Info
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className={`py-3 px-2 border-r border-slate-200 transition ${
                  wizardStep === 2 ? 'bg-white text-emerald-700 border-b-2 border-b-emerald-600' : 'text-slate-500'
                }`}
              >
                2. GST, PAN & TAN
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className={`py-3 px-2 border-r border-slate-200 transition ${
                  wizardStep === 3 ? 'bg-white text-emerald-700 border-b-2 border-b-emerald-600' : 'text-slate-500'
                }`}
              >
                3. PF & ESIC Labor
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(4)}
                className={`py-3 px-2 transition ${
                  wizardStep === 4 ? 'bg-white text-emerald-700 border-b-2 border-b-emerald-600' : 'text-slate-500'
                }`}
              >
                4. Bank & Signatory
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
              {/* STEP 1: BASIC IDENTITY */}
              {wizardStep === 1 && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-800 mb-1">Company Legal Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Apex FinTech Solutions Private Limited"
                        value={newCompanyData.legalName}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, legalName: e.target.value })}
                        className="w-full border border-slate-300 p-2.5 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Trade Name / Brand Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex FinTech"
                        value={newCompanyData.tradeName}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, tradeName: e.target.value })}
                        className="w-full border border-slate-300 p-2.5 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Entity Structure</label>
                      <select
                        value={newCompanyData.entityType}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, entityType: e.target.value })}
                        className="w-full border border-slate-300 p-2.5 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Private Limited">Private Limited (Pvt Ltd)</option>
                        <option value="Public Limited">Public Limited</option>
                        <option value="Limited Liability Partnership">LLP (Limited Liability Partnership)</option>
                        <option value="Partnership Firm">Partnership Firm</option>
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-800 mb-1">Registered Address</label>
                      <input
                        type="text"
                        placeholder="Suite 401, Cyber Towers, Hitec City"
                        value={newCompanyData.address}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, address: e.target.value })}
                        className="w-full border border-slate-300 p-2.5 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">City</label>
                      <input
                        type="text"
                        placeholder="Hyderabad"
                        value={newCompanyData.city}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, city: e.target.value })}
                        className="w-full border border-slate-300 p-2.5 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Pincode</label>
                      <input
                        type="text"
                        placeholder="500081"
                        value={newCompanyData.pincode}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, pincode: e.target.value })}
                        className="w-full border border-slate-300 p-2.5 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">State & Code</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Telangana"
                          value={newCompanyData.state}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, state: e.target.value })}
                          className="col-span-2 border border-slate-300 p-2.5 rounded-xl text-slate-900"
                        />
                        <input
                          type="text"
                          placeholder="36"
                          value={newCompanyData.stateCode}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, stateCode: e.target.value })}
                          className="border border-slate-300 p-2.5 rounded-xl font-mono text-center text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Financial Year</label>
                      <select
                        value={newCompanyData.financialYear}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, financialYear: e.target.value })}
                        className="w-full border border-slate-300 p-2.5 rounded-xl font-bold text-slate-900"
                      >
                        <option value="2026-27">FY 2026-27 (Current)</option>
                        <option value="2025-26">FY 2025-26</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Contact Email</label>
                      <input
                        type="email"
                        placeholder="finance@apex.in"
                        value={newCompanyData.email}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, email: e.target.value })}
                        className="w-full border border-slate-300 p-2.5 rounded-xl font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Mobile Number</label>
                      <input
                        type="text"
                        placeholder="9876543210"
                        value={newCompanyData.mobile}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, mobile: e.target.value })}
                        className="w-full border border-slate-300 p-2.5 rounded-xl font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: GST, PAN & TAN */}
              {wizardStep === 2 && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                    <span className="font-extrabold text-emerald-900 text-sm block">15-Digit GSTIN & API Credentials</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">GSTIN Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="36ABCDE1234F1Z5"
                          value={newCompanyData.gstin}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, gstin: e.target.value })}
                          className="w-full border border-emerald-300 p-2.5 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-800 mb-1">GST Portal API User</label>
                        <input
                          type="text"
                          placeholder="APEX_GST_PROD"
                          value={newCompanyData.gstUser}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, gstUser: e.target.value })}
                          className="w-full border border-emerald-300 p-2.5 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                      <label className="block font-bold text-slate-800 mb-1">PAN Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="ABCDE1234F"
                        value={newCompanyData.pan}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, pan: e.target.value })}
                        className="w-full border border-blue-300 p-2.5 rounded-xl font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-2">
                      <label className="block font-bold text-slate-800 mb-1">TAN Deductor Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="HYDA12345B"
                        value={newCompanyData.tan}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, tan: e.target.value })}
                        className="w-full border border-purple-300 p-2.5 rounded-xl font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: LABOR & SOCIAL SECURITY */}
              {wizardStep === 3 && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                    <span className="font-extrabold text-amber-900 text-sm block">EPFO Establishment Code</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">EPFO Code (e.g. MH/BAN/0012345/000)</label>
                        <input
                          type="text"
                          placeholder="MH/BAN/0012345/000"
                          value={newCompanyData.pfCode}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, pfCode: e.target.value })}
                          className="w-full border border-amber-300 p-2.5 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">Branch Extension Code</label>
                        <input
                          type="text"
                          placeholder="000"
                          value={newCompanyData.pfExtension}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, pfExtension: e.target.value })}
                          className="w-full border border-amber-300 p-2.5 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-2">
                      <label className="block font-bold text-slate-800 mb-1">17-Digit ESIC Code</label>
                      <input
                        type="text"
                        placeholder="31000123450000101"
                        value={newCompanyData.esiCode}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, esiCode: e.target.value })}
                        className="w-full border border-teal-300 p-2.5 rounded-xl font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <label className="block font-bold text-slate-800 mb-1">Professional Tax (PTRC) Registration</label>
                      <input
                        type="text"
                        placeholder="PTRC-279988112233"
                        value={newCompanyData.ptRegistrationNo}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, ptRegistrationNo: e.target.value })}
                        className="w-full border border-slate-300 p-2.5 rounded-xl font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: BANKING & SIGNATORY */}
              {wizardStep === 4 && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <span className="font-extrabold text-slate-900 text-sm block">Bank Payout & CMS Account</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">Bank Name</label>
                        <input
                          type="text"
                          placeholder="HDFC Bank"
                          value={newCompanyData.bankName}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, bankName: e.target.value })}
                          className="w-full border border-slate-300 p-2.5 rounded-xl font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">Account Number</label>
                        <input
                          type="text"
                          placeholder="50200011223344"
                          value={newCompanyData.bankAccountNumber}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, bankAccountNumber: e.target.value })}
                          className="w-full border border-slate-300 p-2.5 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">IFSC Code</label>
                        <input
                          type="text"
                          placeholder="HDFC0000123"
                          value={newCompanyData.bankIfscCode}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, bankIfscCode: e.target.value })}
                          className="w-full border border-slate-300 p-2.5 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-950 text-white rounded-2xl space-y-3">
                    <span className="font-extrabold text-emerald-300 text-sm block">Authorized Signatory & DSC</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-emerald-200 mb-1">Signatory Name</label>
                        <input
                          type="text"
                          placeholder="CA Rohan Kulkarni"
                          value={newCompanyData.authorizedSignatoryName}
                          onChange={(e) =>
                            setNewCompanyData({ ...newCompanyData, authorizedSignatoryName: e.target.value })
                          }
                          className="w-full bg-emerald-900/60 border border-emerald-700 p-2.5 rounded-xl font-bold text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-emerald-200 mb-1">Signatory PAN</label>
                        <input
                          type="text"
                          placeholder="ABCDE1234F"
                          value={newCompanyData.authorizedSignatoryPan}
                          onChange={(e) =>
                            setNewCompanyData({ ...newCompanyData, authorizedSignatoryPan: e.target.value })
                          }
                          className="w-full bg-emerald-900/60 border border-emerald-700 p-2.5 rounded-xl font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Footer Controls */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Previous Step
                  </button>
                ) : (
                  <div />
                )}

                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-1 shadow"
                  >
                    Next Step <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save & Create Company Compliance Master
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
