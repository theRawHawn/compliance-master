import React, { useState } from 'react';
import { Company, User } from '../types';
import {
  Building2,
  Calendar,
  Sparkles,
  User as UserIcon,
  ChevronDown,
  FileCheck2,
  RotateCcw,
  LogOut,
  Shield,
  Settings,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  companies: Company[];
  selectedCompany: Company | null;
  onSelectCompany: (company: Company) => void;
  selectedFy: string;
  onSelectFy: (fy: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRestoreDemo: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  companies,
  selectedCompany,
  onSelectCompany,
  selectedFy,
  onSelectFy,
  activeTab,
  setActiveTab,
  onRestoreDemo,
  onLogout,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'import', label: 'Data Import' },
    { id: 'gst', label: 'GST Module' },
    { id: 'tds', label: 'TDS Module' },
    { id: 'payroll', label: 'Payroll Statutory' },
    { id: 'erp_sync', label: 'ERP & Direct Sync' },
    { id: 'recon', label: 'Reconciliation & Calendar' },
    { id: 'download', label: 'Download Center' },
    { id: 'company_profile', label: 'Company Profile' },
    { id: 'employee', label: 'Employee Master' },
    { id: 'rules', label: 'Tax Rules' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Tag */}
          <div
            className="flex items-center space-x-3 cursor-pointer shrink-0"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-[#25D366] text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/10">
              <FileCheck2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl tracking-tight text-blue-950">
                  Byalance
                </span>
                <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  2026
                </span>
              </div>
              <p className="text-xs text-emerald-600 font-bold tracking-tight">Compliance Portal</p>
            </div>
          </div>

          {/* Right Action Controls: FY, Company Switcher, Demo Reset, User Profile */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Demo Reset */}
            <button
              onClick={onRestoreDemo}
              title="Reset sample company & transaction data"
              className="flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 transition font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Reset Demo Data</span>
            </button>

            {/* Financial Year Selector */}
            <div className="flex items-center bg-blue-50/80 border border-blue-200 rounded-xl px-3 py-1.5 text-xs text-blue-900 font-bold">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              <span className="mr-1 text-slate-500 font-medium">FY:</span>
              <select
                value={selectedFy}
                onChange={(e) => onSelectFy(e.target.value)}
                className="bg-transparent font-extrabold text-blue-950 focus:outline-none cursor-pointer"
              >
                <option value="2026-27">2026-27</option>
                <option value="2025-26">2025-26</option>
              </select>
            </div>

            {/* Company Switcher Dropdown */}
            {selectedCompany && (
              <div className="relative group">
                <div className="flex items-center space-x-2 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <div className="text-left max-w-[160px] lg:max-w-[220px] truncate">
                    <span className="block font-bold text-slate-900 truncate">
                      {selectedCompany.tradeName || selectedCompany.legalName}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono truncate">
                      {selectedCompany.gstin}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 hidden group-hover:block z-50">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Client / Entity
                  </div>
                  {companies.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => onSelectCompany(comp)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition ${
                        comp.id === selectedCompany.id
                          ? 'bg-blue-50/80 border-l-4 border-blue-600 font-bold text-blue-950'
                          : 'text-slate-700'
                      }`}
                    >
                      <div className="truncate">
                        <p className="font-bold truncate">{comp.legalName}</p>
                        <p className="text-[10px] font-mono text-slate-500">GST: {comp.gstin}</p>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1 px-2">
                    <button
                      onClick={() => setActiveTab('company_profile')}
                      className="w-full text-center text-xs text-blue-600 hover:text-blue-800 py-1.5 font-bold"
                    >
                      + Add / Switch Company
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* User Profile Badge */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl text-xs border border-slate-200 transition font-semibold"
                >
                  <div className="w-5 h-5 rounded-full bg-[#25D366] text-slate-950 font-bold flex items-center justify-center text-[10px]">
                    {user.name.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-800">{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-xs"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-100 space-y-0.5">
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase">
                        {user.role} • {user.firmName || 'Tax Practice'}
                      </span>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveTab('company_profile');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                      >
                        <Building2 className="w-3.5 h-3.5 text-blue-600" /> Company Profile & Settings
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('rules');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                      >
                        <Settings className="w-3.5 h-3.5 text-blue-600" /> Tax & FY Configuration
                      </button>
                    </div>

                    {onLogout && (
                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onLogout();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            {selectedCompany && (
              <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 max-w-[120px] truncate">
                {selectedCompany.tradeName || selectedCompany.legalName}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Options */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-3 space-y-3 bg-slate-50 p-3 rounded-2xl mb-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Financial Year:</span>
              <select
                value={selectedFy}
                onChange={(e) => onSelectFy(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-blue-950"
              >
                <option value="2026-27">2026-27</option>
                <option value="2025-26">2025-26</option>
              </select>
            </div>

            {companies.length > 0 && (
              <div className="text-xs font-bold text-slate-700 space-y-1">
                <span>Active Entity:</span>
                <select
                  value={selectedCompany?.id}
                  onChange={(e) => {
                    const found = companies.find((c) => c.id === e.target.value);
                    if (found) onSelectCompany(found);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-blue-950"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.legalName} ({c.gstin.slice(0, 10)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onRestoreDemo}
                className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-amber-700 flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex-1 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center justify-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sub-Header Horizontal Navigation Bar */}
      <div className="bg-slate-50 border-t border-slate-200 py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex space-x-1.5 overflow-x-auto scrollbar-none items-center py-0.5 text-xs font-bold">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-[#25D366] text-slate-950 font-black shadow-xs ring-1 ring-emerald-400'
                    : 'text-slate-700 hover:text-blue-950 hover:bg-blue-50/80 font-semibold'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

