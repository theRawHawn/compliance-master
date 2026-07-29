import React, { useState } from 'react';
import { Company, User } from '../types';
import {
  Building2,
  Calendar,
  RotateCcw,
  LogOut,
  ChevronDown,
  Settings,
  Menu,
  FileCheck2,
  Upload,
  Globe,
  Plus,
} from 'lucide-react';

interface HeaderProps {
  user: User | null;
  companies: Company[];
  selectedCompany: Company | null;
  onSelectCompany: (company: Company) => void;
  selectedFy: string;
  onSelectFy: (fy: string) => void;
  activeTab: string;
  activeSubTab?: string;
  onNavigate: (tab: string, subTab?: string) => void;
  onRestoreDemo: () => void;
  onLogout?: () => void;
  setMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  companies,
  selectedCompany,
  onSelectCompany,
  selectedFy,
  onSelectFy,
  activeTab,
  activeSubTab,
  onNavigate,
  onRestoreDemo,
  onLogout,
  setMobileOpen,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left Mobile Menu Toggle, Brand Logo & Title Breadcrumb */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1 sm:flex-initial">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo & Name */}
            <div
              className="flex items-center space-x-2 cursor-pointer shrink-0"
              onClick={() => onNavigate('dashboard')}
              title="Byalance Compliance Engine - Back to Dashboard"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-[#25D366] text-slate-950 font-black flex items-center justify-center shadow-xs">
                <FileCheck2 className="w-4.5 h-4.5 stroke-[2.5] text-slate-950" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm text-slate-950 tracking-tight block leading-none">
                  Byalance
                </span>
                <span className="text-[9px] font-extrabold text-emerald-600 tracking-tight block leading-none mt-0.5">
                  Tax Suite
                </span>
              </div>
            </div>
          </div>

          {/* Right Top Action Bar */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* Quick Launch Import Button */}
            <button
              onClick={() => onNavigate('import')}
              className="hidden md:flex items-center space-x-1.5 text-xs bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 px-3 py-1.5 rounded-xl font-black shadow-xs transition shrink-0"
              title="Import Data from Google Sheets, Excel, Tally or Zoho"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Import Data</span>
            </button>

            {/* Reset Demo Data */}
            <button
              onClick={onRestoreDemo}
              title="Reset sample company & transaction data"
              className="hidden lg:flex items-center space-x-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl border border-slate-200 transition font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Reset</span>
            </button>

            {/* User Profile & Business Switcher Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 bg-slate-50 hover:bg-blue-50/80 px-2.5 py-1.5 rounded-xl text-xs border border-slate-200 hover:border-blue-300 transition font-semibold"
                >
                  <div className="w-5 h-5 rounded-full bg-[#25D366] text-slate-950 font-bold flex items-center justify-center text-[10px]">
                    {user.name.charAt(0)}
                  </div>
                  {selectedCompany && (
                    <div className="text-left hidden sm:block max-w-[120px] md:max-w-[160px] truncate">
                      <span className="block font-black text-slate-900 truncate text-xs">
                        {selectedCompany.tradeName || selectedCompany.legalName}
                      </span>
                    </div>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-xs"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    {/* User Profile Details */}
                    <div className="px-3 py-2 border-b border-slate-100 space-y-0.5">
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase">
                        {user.role} • {user.firmName || 'Tax Practice'}
                      </span>
                    </div>

                    {/* Switch Business / Entity Section */}
                    {selectedCompany && (
                      <div className="py-2 border-b border-slate-100">
                        <div className="px-3 pb-1 text-[10px] font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-blue-600" /> Active Business Entity
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {companies.map((comp) => (
                            <button
                              key={comp.id}
                              onClick={() => {
                                onSelectCompany(comp);
                                setShowUserMenu(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition ${
                                comp.id === selectedCompany.id
                                  ? 'bg-blue-50/90 border-l-4 border-blue-600 font-bold text-blue-950'
                                  : 'text-slate-700'
                              }`}
                            >
                              <div className="truncate">
                                <p className="font-bold truncate">{comp.legalName}</p>
                                <p className="text-[10px] font-mono text-slate-500">
                                  GST: {comp.gstin}
                                </p>
                              </div>
                              {comp.id === selectedCompany.id && (
                                <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded ml-2 shrink-0">
                                  Active
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="pt-1 px-2">
                          <button
                            onClick={() => {
                              onNavigate('company_profile');
                              setShowUserMenu(false);
                            }}
                            className="w-full text-center text-xs text-blue-600 hover:text-blue-800 py-1 font-bold flex items-center justify-center gap-1 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Plus className="w-3.5 h-3.5" /> Switch or Add Business
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick Menu Options */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onNavigate('company_profile');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                      >
                        <Building2 className="w-3.5 h-3.5 text-blue-600" /> Entity Settings
                      </button>

                      <button
                        onClick={() => {
                          onNavigate('rules');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                      >
                        <Settings className="w-3.5 h-3.5 text-blue-600" /> Tax & Rules Engine
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
        </div>
      </div>
    </header>
  );
};
