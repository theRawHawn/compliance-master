import React, { useState } from 'react';
import { TDS_SECTIONS, PF_RULES, ESI_RULES, PROFESSIONAL_TAX_SLABS } from '../lib/taxRules';
import { ShieldCheck, BookOpen, Layers } from 'lucide-react';

export const TaxRulesConfig: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'GST' | 'TDS' | 'PF' | 'ESI' | 'PT'>('TDS');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" /> Statutory Tax Rules & Config Engine
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Built-in tax slabs, threshold limits, and statutory rates for Financial Year 2025-26 & 2026-27.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold">
        {[
          { id: 'TDS', label: 'TDS Sections & Rates' },
          { id: 'PF', label: 'EPFO PF Statutory Rates' },
          { id: 'ESI', label: 'ESIC Contribution Rules' },
          { id: 'PT', label: 'State Professional Tax (PT) Slabs' },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id as any)}
            className={`pb-3 transition border-b-2 ${
              selectedCategory === c.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* TDS SECTIONS TABLE */}
      {selectedCategory === 'TDS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Nature of Payment</th>
                  <th className="px-4 py-3 text-right">Individual Rate (%)</th>
                  <th className="px-4 py-3 text-right">Others Rate (%)</th>
                  <th className="px-4 py-3 text-right">Single Threshold (₹)</th>
                  <th className="px-4 py-3 text-right">Annual Threshold (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {Object.values(TDS_SECTIONS).map((sec) => (
                  <tr key={sec.code} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{sec.code}</td>
                    <td className="px-4 py-3 font-sans font-medium text-slate-800">{sec.name}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{sec.rateIndividual}%</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{sec.rateOthers}%</td>
                    <td className="px-4 py-3 text-right">₹{sec.thresholdSingle.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-bold">₹{sec.thresholdAnnual.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PF RULES */}
      {selectedCategory === 'PF' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-base">EPFO Provident Fund Statutory Rates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-sans">Employee PF Rate</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{PF_RULES.employeeRate}%</p>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">Deducted from Basic + DA</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-sans">EPS Pension Fund (Employer)</p>
              <p className="text-xl font-bold text-amber-700 mt-1">{PF_RULES.epsRate}%</p>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">Capped at ₹1,250 / month (₹15,000 ceiling)</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-sans">EPF Difference (Employer)</p>
              <p className="text-xl font-bold text-amber-700 mt-1">{PF_RULES.epfEmployerRate}%</p>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">12% - 8.33% = 3.67%</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-sans">EDLI & Admin Charges</p>
              <p className="text-xl font-bold text-slate-900 mt-1">0.5% + 0.5%</p>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">Employer contribution</p>
            </div>
          </div>
        </div>
      )}

      {/* ESI RULES */}
      {selectedCategory === 'ESI' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-base">ESIC Contribution Rules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-sans">Employee ESI Rate</p>
              <p className="text-xl font-bold text-teal-700 mt-1">{ESI_RULES.employeeRate}%</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-sans">Employer ESI Rate</p>
              <p className="text-xl font-bold text-teal-700 mt-1">{ESI_RULES.employerRate}%</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-sans">Gross Wage Ceiling</p>
              <p className="text-xl font-bold text-slate-900 mt-1">₹{ESI_RULES.grossWageCeiling.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">Eligible if gross monthly wage ≤ ₹21,000</p>
            </div>
          </div>
        </div>
      )}

      {/* PT SLABS */}
      {selectedCategory === 'PT' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          {Object.entries(PROFESSIONAL_TAX_SLABS).map(([stateName, slabs]) => (
            <div key={stateName} className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">{stateName} Professional Tax Slabs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="px-3 py-2">Min Gross Salary (₹)</th>
                      <th className="px-3 py-2">Max Gross Salary (₹)</th>
                      <th className="px-3 py-2 text-right">Monthly Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {slabs.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2">₹{s.minWage.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">{s.maxWage > 1000000 ? 'Above' : `₹${s.maxWage.toLocaleString('en-IN')}`}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">₹{s.taxAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
