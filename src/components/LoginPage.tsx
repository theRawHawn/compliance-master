import React, { useState } from 'react';
import { User } from '../types';
import {
  ShieldCheck,
  Lock,
  Mail,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  PhoneCall,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  Briefcase,
  FileText,
  Bot,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP' | 'OTP'>('LOGIN');
  const [email, setEmail] = useState('rohankulkarnirk66@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [mobile, setMobile] = useState('9876543210');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [role, setRole] = useState<'CA_FIRM' | 'SME_ACCOUNTANT' | 'ADMIN'>('CA_FIRM');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.user);
      } else {
        setErrorMsg('Invalid login credentials. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser: { email: string; name: string; role: 'CA_FIRM' | 'SME_ACCOUNTANT' | 'ADMIN'; firmName: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoUser.email }),
      });

      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setErrorMsg('Demo sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = () => {
    if (mobile.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }
    setErrorMsg('');
    setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    if (otpCode.length !== 4) {
      setErrorMsg('Please enter 4-digit OTP code (Demo OTP: 1234)');
      return;
    }
    handleDemoLogin({
      email: `${mobile}@byalance.com`,
      name: `User ${mobile.slice(-4)}`,
      role: 'CA_FIRM',
      firmName: 'Byalance Compliance Client',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Top Brand Bar */}
      <div className="max-w-7xl w-full mx-auto px-6 py-6 flex justify-between items-center relative z-10 border-b border-slate-200 bg-white shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#25D366] text-slate-950 font-black flex items-center justify-center shadow-md shadow-emerald-500/10">
            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-2xl tracking-tight text-blue-950">Byalance</span>
              <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded uppercase tracking-wider">
                COMPLIANCE 2026
              </span>
            </div>
            <p className="text-xs text-emerald-600 font-bold">India Statutory Return & File Generator</p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-6 text-xs text-slate-600 font-medium">
          <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <CheckCircle2 className="w-4 h-4 text-[#25D366]" /> 256-Bit SSL Encrypted
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-600" /> India Data Residency Compliant
          </span>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="max-w-5xl w-full mx-auto px-4 my-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Hero Pitch */}
        <div className="lg:col-span-6 space-y-6 text-slate-900 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> India GST, TDS & Payroll Return Engine
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-blue-950 tracking-tight leading-tight">
            Complete Statutory File Generation & ERP Direct Sync
          </h1>

          <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto lg:mx-0">
            Automate GSTR-1 & 3B JSONs, Form 26Q & 24Q FVU Text Files, EPFO PF ECR v2.0, ESIC, Professional Tax, and Direct ERP Posting.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-left max-w-md mx-auto lg:mx-0">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-emerald-700 font-mono font-extrabold text-base block">100% Tax Accuracy</span>
              <span className="text-slate-500 text-[11px]">FY 2026-27 Slabs & FVU v8.8</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-blue-700 font-mono font-extrabold text-base block">1-Click Sync</span>
              <span className="text-slate-500 text-[11px]">ERP & Cloud Accounting</span>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            {/* Header / Tabs */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setAuthMode('LOGIN');
                    setErrorMsg('');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition ${
                    authMode === 'LOGIN' ? 'bg-[#25D366] text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-50'
                  }`}
                >
                  Password Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('OTP');
                    setErrorMsg('');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition ${
                    authMode === 'OTP' ? 'bg-[#25D366] text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-50'
                  }`}
                >
                  Mobile OTP
                </button>
                <button
                  onClick={() => {
                    setAuthMode('SIGNUP');
                    setErrorMsg('');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition ${
                    authMode === 'SIGNUP' ? 'bg-[#25D366] text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-50'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {/* PASSWORD LOGIN FORM */}
            {authMode === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registered Email ID</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="ca.partner@firm.com"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-10 pr-3 py-2.5 rounded-xl text-xs font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-10 pr-10 py-2.5 rounded-xl text-xs font-mono focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black py-3 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? 'Authenticating...' : 'Sign In to Byalance Workspace'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* OTP LOGIN FORM */}
            {authMode === 'OTP' && (
              <div className="space-y-4">
                {!otpSent ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Registered Mobile Number (+91)</label>
                      <div className="relative">
                        <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          maxLength={10}
                          placeholder="9876543210"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-10 pr-3 py-2.5 rounded-xl text-xs font-mono focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black py-3 rounded-xl text-xs shadow-md transition"
                    >
                      Send 4-Digit Login OTP
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-slate-600">
                      OTP sent to <span className="text-slate-900 font-mono font-bold">+91 {mobile}</span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Enter 4-Digit OTP Code</label>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        maxLength={4}
                        placeholder="1234"
                        className="w-full bg-slate-50 border border-slate-200 text-emerald-700 text-center tracking-widest text-lg py-2.5 rounded-xl font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black py-3 rounded-xl text-xs shadow-md transition"
                    >
                      Verify & Access Workspace
                    </button>
                  </>
                )}
              </div>
            )}

            {/* REGISTER FORM */}
            {authMode === 'SIGNUP' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="CA Ananya Sharma"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Firm / Enterprise Name</label>
                  <input
                    type="text"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    required
                    placeholder="Sharma & Co CA Firm"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="ananya@sharmaca.in"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Primary Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="CA_FIRM">Chartered Accountant / Tax Practitioner</option>
                    <option value="SME_ACCOUNTANT">SME Finance Manager / Accountant</option>
                    <option value="ADMIN">Enterprise Tax Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-md transition"
                >
                  Create Compliance Account
                </button>
              </form>
            )}

            {/* DEMO PROFILES SECTION */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Instant Single-Click Demo Personas
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDemoLogin({
                      email: 'rohankulkarnirk66@gmail.com',
                      name: 'CA Rohan Kulkarni',
                      role: 'CA_FIRM',
                      firmName: 'Kulkarni & Associates CA Firm',
                    })
                  }
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-500 text-left transition space-y-0.5 group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">CA Rohan Kulkarni</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-mono font-bold px-1.5 py-0.5 rounded">CA FIRM</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Kulkarni & Associates</p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDemoLogin({
                      email: 'finance@techcorp.in',
                      name: 'Priya Mehta',
                      role: 'SME_ACCOUNTANT',
                      firmName: 'TechCorp Pvt Ltd',
                    })
                  }
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-500 text-left transition space-y-0.5 group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Priya Mehta</span>
                    <span className="text-[9px] bg-blue-100 text-blue-800 font-mono font-bold px-1.5 py-0.5 rounded">FINANCE MGR</span>
                  </div>
                  <p className="text-[10px] text-slate-500">TechCorp Pvt Ltd</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl w-full mx-auto px-6 py-4 text-center text-xs text-slate-500 border-t border-slate-200 relative z-10 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>© 2026 Byalance Compliance Master. All Statutory Formats Updated for FY 2026-27.</span>
        <div className="flex gap-4 text-slate-500 font-medium">
          <a href="#" className="hover:text-blue-700">Privacy Policy</a>
          <a href="#" className="hover:text-blue-700">Terms of Service</a>
          <a href="#" className="hover:text-blue-700">Security Audit</a>
        </div>
      </div>
    </div>
  );
};
