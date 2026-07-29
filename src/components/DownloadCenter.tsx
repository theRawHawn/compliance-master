import React, { useState } from 'react';
import { Company, GeneratedFile } from '../types';
import { FileText, Download, Copy, Check, ShieldCheck, FileCode, Layers } from 'lucide-react';

interface DownloadCenterProps {
  company: Company | null;
  files: GeneratedFile[];
}

export const DownloadCenter: React.FC<DownloadCenterProps> = ({ company, files }) => {
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(files[0] || null);
  const [copied, setCopied] = useState(false);

  if (!company) {
    return <div className="p-8 text-center text-slate-500">Please select a company.</div>;
  }

  const handleDownload = (f: GeneratedFile) => {
    const blob = new Blob([f.fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = f.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeFile = selectedFile || files[0];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Download className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" /> Compliance File Download Center
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            Generated portal-ready compliance files with schema validation for <strong>{company.legalName}</strong>
          </p>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <FileCode className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Generated Files Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Use the GST, TDS, or Payroll statutory modules to calculate tax and click "Generate File". Your portal files will appear here ready for upload to government portals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File List */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <h2 className="font-bold text-slate-900 text-sm px-2">Generated Files ({files.length})</h2>
            <div className="space-y-2">
              {files.map((f) => {
                const isSelected = activeFile?.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFile(f)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                        {f.fileType.replace(/_/g, ' ')}
                      </span>
                      <p className="text-xs font-mono font-semibold truncate mt-1">{f.fileName}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">{f.recordCount} records • {f.fileSizeKb} KB</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Preview & Download Pane */}
          {activeFile && (
            <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white shadow-xl flex flex-col h-[550px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                      SCHEMA VALIDATED
                    </span>
                    <span className="text-xs text-slate-400">{activeFile.monthYearOrQuarter}</span>
                  </div>
                  <h2 className="text-lg font-mono font-bold mt-1 text-emerald-400">{activeFile.fileName}</h2>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopy(activeFile.fileContent)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => handleDownload(activeFile)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>
              </div>

              {/* Code / Content Viewer */}
              <div className="mt-4 flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-auto font-mono text-xs text-emerald-300 leading-relaxed scrollbar-thin">
                <pre>{activeFile.fileContent}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
