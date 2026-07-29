/**
 * Payroll Statutory File Generators:
 * 1. PF ECR (Electronic Challan cum Return v2.0) for EPFO portal
 * 2. ESI Contribution CSV file for ESIC portal
 * 3. Professional Tax Monthly Return Summary
 */

import { Company, PayrollRun, GeneratedFile } from '../../types';

export function generatePfEcrTxt(company: Company, payroll: PayrollRun): GeneratedFile {
  const estCode = company.pfCode || 'MH/BAN/0012345/000';
  const monthPeriod = payroll.monthYear.replace('-', ''); // e.g. 202606

  const lines: string[] = [];

  payroll.lines.forEach((l) => {
    const uan = l.uan || '100987654321';
    const name = l.empName.toUpperCase();
    const gross = l.grossSalary;
    const epfWage = l.pfWage;
    const epsWage = Math.min(l.pfWage, 15000); // EPS Wage capped at 15000
    const edliWage = Math.min(l.pfWage, 15000);

    const epfContriRemitted = l.pfEmployee; // 12%
    const epsContriRemitted = Math.min(Math.round(epsWage * 0.0833), 1250); // 8.33% up to 1250
    const epfEpsDiffRemitted = epfContriRemitted - epsContriRemitted; // 3.67%
    const ncpDays = Math.max(0, 30 - l.daysWorked);
    const refundAdvance = 0;

    // EPFO ECR Line Format v2.0
    const ecrLine = `${uan}#~#${name}#~#${gross}#~#${epfWage}#~#${epsWage}#~#${edliWage}#~#${epfContriRemitted}#~#${epsContriRemitted}#~#${epfEpsDiffRemitted}#~#${ncpDays}#~#${refundAdvance}`;
    lines.push(ecrLine);
  });

  const content = lines.join('\r\n');
  const sizeKb = Number((content.length / 1024).toFixed(2));

  return {
    id: `GEN-PFECR-${Date.now()}`,
    companyId: company.id,
    module: 'PAYROLL',
    fileType: 'PF_ECR_TXT',
    fileName: `ECR_${estCode.replace(/\//g, '_')}_${monthPeriod}.txt`,
    fileContent: content,
    monthYearOrQuarter: payroll.monthYear,
    createdAt: new Date().toISOString(),
    recordCount: payroll.lines.length,
    fileSizeKb: sizeKb,
  };
}

export function generateEsiCsv(company: Company, payroll: PayrollRun): GeneratedFile {
  const esiCode = company.esiCode || '31000123450000101';
  const monthPeriod = payroll.monthYear;

  const lines: string[] = [];
  // ESIC Header
  lines.push('IP Number,IP Name,No of Days Worked,Total Monthly Wages,Reason Code,Last Working Day');

  payroll.lines.forEach((l) => {
    if (l.esiNo && l.grossSalary <= 21000) {
      const ipNo = l.esiNo;
      const ipName = l.empName;
      const daysWorked = l.daysWorked;
      const monthlyWage = l.grossSalary;
      const reasonCode = 0; // 0 = Working
      const lastWorkingDay = '';

      lines.push(`${ipNo},"${ipName}",${daysWorked},${monthlyWage},${reasonCode},"${lastWorkingDay}"`);
    }
  });

  const content = lines.join('\n');
  const sizeKb = Number((content.length / 1024).toFixed(2));

  return {
    id: `GEN-ESI-${Date.now()}`,
    companyId: company.id,
    module: 'PAYROLL',
    fileType: 'ESI_CSV',
    fileName: `ESI_Contribution_${esiCode}_${monthPeriod}.csv`,
    fileContent: content,
    monthYearOrQuarter: payroll.monthYear,
    createdAt: new Date().toISOString(),
    recordCount: payroll.lines.filter((l) => l.esiNo && l.grossSalary <= 21000).length,
    fileSizeKb: sizeKb,
  };
}

export function generatePtSummaryCsv(company: Company, payroll: PayrollRun): GeneratedFile {
  const state = company.ptState || 'Maharashtra';
  const lines: string[] = [];
  lines.push('Emp ID,Employee Name,Gross Salary,PT Amount,State');

  let totalPt = 0;
  payroll.lines.forEach((l) => {
    lines.push(`${l.employeeId},"${l.empName}",${l.grossSalary},${l.pt},"${state}"`);
    totalPt += l.pt;
  });

  lines.push(`,TOTAL PT DEDUCTED,,${totalPt},`);

  const content = lines.join('\n');
  const sizeKb = Number((content.length / 1024).toFixed(2));

  return {
    id: `GEN-PT-${Date.now()}`,
    companyId: company.id,
    module: 'PAYROLL',
    fileType: 'PT_SUMMARY',
    fileName: `PT_Return_${company.legalName.replace(/\s+/g, '_')}_${payroll.monthYear}.csv`,
    fileContent: content,
    monthYearOrQuarter: payroll.monthYear,
    createdAt: new Date().toISOString(),
    recordCount: payroll.lines.length,
    fileSizeKb: sizeKb,
  };
}
