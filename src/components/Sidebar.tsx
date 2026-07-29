import React, { useState } from 'react';
import { Company, User } from '../types';
import {
  LayoutDashboard,
  FileText,
  FileCode2,
  Users,
  Globe,
  ArrowRightLeft,
  Download,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  CalendarDays,
  Clock,
  Receipt,
  ShoppingBag,
  FileCheck2,
  RefreshCw,
  Upload,
  Calculator,
  FileSpreadsheet,
  Building,
  ShieldCheck,
  FilePlus2,
  Server,
  Cloud,
  Database,
  Layers,
  Settings,
  UserCheck,
  DollarSign,
  Sparkles,
  Menu,
  X,
  RotateCcw,
  LogOut,
  Search,
  User as UserIcon,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  activeSubTab?: string;
  onNavigate: (tab: string, subTab?: string) => void;
  selectedCompany: Company | null;
  companies: Company[];
  onSelectCompany: (company: Company) => void;
  selectedFy: string;
  onSelectFy: (fy: string) => void;
  user: User | null;
  onRestoreDemo: () => void;
  onLogout?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: any;
  tab: string;
  subTab?: string;
  badge?: string;
}

export interface MenuGroup {
  id: string;
  label: string;
  icon: any;
  items: MenuItem[];
}

const menuGroupsData: MenuGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      {
        id: 'dash_summary',
        label: 'Executive Summary & KPIs',
        icon: LayoutDashboard,
        tab: 'dashboard',
      },
      {
        id: 'dash_calendar',
        label: 'Compliance Due Dates',
        icon: Calendar,
        tab: 'recon',
        subTab: 'CALENDAR',
      },
    ],
  },
  {
    id: 'gst',
    label: 'GST Compliance',
    icon: FileText,
    items: [
      {
        id: 'gst_sales',
        label: 'GSTR-1 Sales Register',
        icon: FileText,
        tab: 'gst',
        subTab: 'SALES',
      },
      {
        id: 'gst_purchases',
        label: 'GSTR-3B Purchases & ITC',
        icon: ShoppingBag,
        tab: 'gst',
        subTab: 'PURCHASE',
      },
      {
        id: 'gst_3b',
        label: 'GSTR-3B Summary',
        icon: FileCheck2,
        tab: 'gst',
        subTab: 'GSTR3B',
      },
      {
        id: 'gst_recon',
        label: '2A/2B Reconciliation',
        icon: RefreshCw,
        tab: 'gst',
        subTab: 'RECON',
      },
      {
        id: 'gst_import',
        label: 'Import Sales & Purchases',
        icon: Upload,
        tab: 'import',
        subTab: 'SALES',
        badge: 'Import',
      },
    ],
  },
  {
    id: 'tds',
    label: 'TDS & Income Tax',
    icon: FileCode2,
    items: [
      {
        id: 'tds_26q',
        label: 'Form 26Q Vendor TDS',
        icon: FileCode2,
        tab: 'tds',
        subTab: '26Q',
      },
      {
        id: 'tds_24q',
        label: 'Form 24Q Salary TDS',
        icon: Users,
        tab: 'tds',
        subTab: '24Q',
      },
      {
        id: 'tds_calc',
        label: 'TDS Rate Calculator',
        icon: Calculator,
        tab: 'tds',
        subTab: 'CALC',
      },
      {
        id: 'tds_27a',
        label: 'Form 27A Statement',
        icon: FileSpreadsheet,
        tab: 'tds',
        subTab: '27A',
      },
      {
        id: 'tds_import',
        label: 'Import TDS Payments',
        icon: Upload,
        tab: 'import',
        subTab: 'VENDOR_TDS',
      },
    ],
  },
  {
    id: 'payroll',
    label: 'Payroll & HR Admin',
    icon: Users,
    items: [
      {
        id: 'emp_master',
        label: 'Employee Roster Master',
        icon: UserCheck,
        tab: 'employee',
      },
      {
        id: 'payroll_reg',
        label: 'Monthly Payroll Register',
        icon: DollarSign,
        tab: 'payroll',
        subTab: 'REGISTER',
      },
      {
        id: 'payroll_cms',
        label: 'Bank Payout CMS File',
        icon: Building,
        tab: 'payroll',
        subTab: 'BANK_CMS',
      },
      {
        id: 'payroll_pf',
        label: 'EPFO PF & ESIC Returns',
        icon: ShieldCheck,
        tab: 'payroll',
        subTab: 'CHALLAN',
      },
      {
        id: 'payroll_f16',
        label: 'Form 16 Tax Estimator',
        icon: FilePlus2,
        tab: 'payroll',
        subTab: 'TAX_ESTIMATOR',
      },
      {
        id: 'payroll_import',
        label: 'Import Staff & Salary',
        icon: Upload,
        tab: 'import',
        subTab: 'EMPLOYEES',
      },
    ],
  },
  {
    id: 'employee_portal',
    label: 'Employee Self-Service',
    icon: UserIcon,
    items: [
      {
        id: 'emp_att',
        label: 'Mark Attendance',
        icon: Clock,
        tab: 'employee_portal',
        subTab: 'ATTENDANCE',
        badge: 'Self-Service',
      },
      {
        id: 'emp_leave',
        label: 'Leave Application',
        icon: CalendarDays,
        tab: 'employee_portal',
        subTab: 'LEAVES',
      },
      {
        id: 'emp_holiday',
        label: 'Company Holidays',
        icon: Calendar,
        tab: 'employee_portal',
        subTab: 'HOLIDAYS',
      },
      {
        id: 'emp_pay',
        label: 'My Pay & Payslips',
        icon: DollarSign,
        tab: 'employee_portal',
        subTab: 'MY_PAY',
      },
      {
        id: 'emp_reimb',
        label: 'Reimbursements',
        icon: Receipt,
        tab: 'employee_portal',
        subTab: 'REIMBURSEMENTS',
      },
      {
        id: 'emp_tax',
        label: 'Tax Deductions (80C/80D)',
        icon: FileText,
        tab: 'employee_portal',
        subTab: 'TAX_DEDUCTIONS',
      },
      {
        id: 'emp_docs',
        label: 'Upload Documents',
        icon: Upload,
        tab: 'employee_portal',
        subTab: 'DOCUMENTS',
      },
    ],
  },
  {
    id: 'import',
    label: 'Data Connectors & ERP',
    icon: Globe,
    items: [
      {
        id: 'import_hub',
        label: 'Multi-Source Import Hub',
        icon: Globe,
        tab: 'import',
      },
      {
        id: 'import_sheets',
        label: 'Google Sheets Live Sync',
        icon: FileSpreadsheet,
        tab: 'import',
        subTab: 'GOOGLE_SHEETS',
        badge: 'Popular',
      },
      {
        id: 'erp_tally',
        label: 'Desktop ERP Sync',
        icon: Server,
        tab: 'erp_sync',
        subTab: 'TALLY',
      },
      {
        id: 'erp_zoho',
        label: 'Cloud ERP API Sync',
        icon: Cloud,
        tab: 'erp_sync',
        subTab: 'ZOHO',
      },
      {
        id: 'erp_busy',
        label: 'Ledger Mapping Connector',
        icon: Database,
        tab: 'erp_sync',
        subTab: 'CONFIG',
      },
    ],
  },
  {
    id: 'recon',
    label: 'Reconciliation & Audits',
    icon: ArrowRightLeft,
    items: [
      {
        id: 'recon_2b',
        label: 'Portal 2B vs Books Recon',
        icon: ArrowRightLeft,
        tab: 'recon',
        subTab: 'RECON',
      },
      {
        id: 'recon_cal',
        label: 'Compliance Due Calendar',
        icon: Calendar,
        tab: 'recon',
        subTab: 'CALENDAR',
      },
    ],
  },
  {
    id: 'download',
    label: 'Reports & Downloads',
    icon: Download,
    items: [
      {
        id: 'dl_center',
        label: 'Download Center & FVU',
        icon: Download,
        tab: 'download',
      },
      {
        id: 'dl_archives',
        label: 'Generated File Logs',
        icon: Layers,
        tab: 'download',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Company & Settings',
    icon: Building2,
    items: [
      {
        id: 'set_profile',
        label: 'Company Profile & GSTIN',
        icon: Building2,
        tab: 'company_profile',
      },
      {
        id: 'set_rules',
        label: 'Tax Slabs & Rules Engine',
        icon: Settings,
        tab: 'rules',
      },
    ],
  },
];

const getActiveGroupId = (tab: string, subTab?: string): string => {
  if (subTab) {
    const match = menuGroupsData.find((g) =>
      g.items.some((item) => item.tab === tab && item.subTab === subTab)
    );
    if (match) return match.id;
  }
  const match = menuGroupsData.find((g) => g.items.some((item) => item.tab === tab));
  return match ? match.id : 'dashboard';
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  activeSubTab,
  onNavigate,
  selectedCompany,
  companies,
  onSelectCompany,
  selectedFy,
  onSelectFy,
  user,
  onRestoreDemo,
  onLogout,
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Expanded state for each group (only the active group expanded by default)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const activeGroupId = getActiveGroupId(activeTab, activeSubTab);
    return { [activeGroupId]: true };
  });

  // Keep active component group expanded on tab changes
  React.useEffect(() => {
    const activeGroupId = getActiveGroupId(activeTab, activeSubTab);
    setExpandedGroups((prev) => ({
      ...prev,
      [activeGroupId]: true,
    }));
  }, [activeTab, activeSubTab]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const menuGroups = menuGroupsData;

  const handleItemClick = (tab: string, subTab?: string) => {
    onNavigate(tab, subTab);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-slate-700 border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => handleItemClick('dashboard')}
        >
          <div className="w-9 h-9 rounded-xl bg-[#25D366] text-slate-950 font-black flex items-center justify-center shrink-0 shadow-xs">
            <FileCheck2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          {!isCollapsed && (
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base text-slate-900 tracking-tight">
                  Byalance
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 font-bold tracking-tight">
                Tax & Compliance Suite
              </p>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Search inside Sidebar */}
      {!isCollapsed && (
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search components or forms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium transition"
            />
          </div>
        </div>
      )}

      {/* Navigation Group Accordions */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
        {menuGroups.map((group) => {
          const GroupIcon = group.icon;
          const isGroupExpanded = searchTerm ? true : !!expandedGroups[group.id];

          // Filter group items if search active
          const filteredItems = group.items.filter((item) =>
            item.label.toLowerCase().includes(searchTerm.toLowerCase())
          );

          if (searchTerm && filteredItems.length === 0) return null;

          const itemsToRender = searchTerm ? filteredItems : group.items;

          return (
            <div key={group.id} className="space-y-1">
              {/* Group Main Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition ${
                  isGroupExpanded
                    ? 'text-slate-900 bg-slate-100/80'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <GroupIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  {!isCollapsed && <span className="truncate">{group.label}</span>}
                </div>
                {!isCollapsed && (
                  <div>
                    {isGroupExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                )}
              </button>

              {/* Group Sub-Items List */}
              {(isGroupExpanded || isCollapsed) && (
                <div className={`space-y-0.5 ${!isCollapsed ? 'pl-3 border-l-2 border-slate-200 ml-3.5' : ''}`}>
                  {itemsToRender.map((item) => {
                    const ItemIcon = item.icon;
                    // Check if active
                    const isItemActive =
                      activeTab === item.tab &&
                      (!item.subTab || activeSubTab === item.subTab);

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.tab, item.subTab)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition group ${
                          isItemActive
                            ? 'bg-[#25D366] text-slate-950 font-extrabold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                        }`}
                        title={item.label}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <ItemIcon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isItemActive
                                ? 'text-slate-950'
                                : 'text-slate-400 group-hover:text-emerald-600'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isCollapsed && item.badge && (
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              isItemActive
                                ? 'bg-slate-950 text-white'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info & Quick Controls */}
      {!isCollapsed && selectedCompany && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs space-y-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Entity</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono font-bold">
              {selectedCompany.stateCode}
            </span>
          </div>
          <p className="font-extrabold text-slate-900 truncate text-xs">{selectedCompany.legalName}</p>
          <p className="text-[10px] text-slate-500 font-mono truncate">{selectedCompany.gstin}</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside
        className={`hidden md:block sticky top-0 h-screen transition-all duration-300 z-30 shrink-0 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-full h-full bg-white z-10 border-r border-slate-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
