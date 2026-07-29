/**
 * TDS File Generator (Form 24Q & Form 26Q NSDL FVU Format & Form 27A)
 */

import * as XLSX from 'xlsx';
import { Company, VendorPayment, PayrollRun, GeneratedFile } from '../../types';

export function generateTds26qFvu(company: Company, payments: VendorPayment[], quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', financialYear: string): GeneratedFile {
  const tan = company.tan.trim().toUpperCase();
  const pan = company.pan.trim().toUpperCase();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const lines: string[] = [];

  // 1. File Header (FH)
  lines.push(`FH^SL^1.0^1.0^1^${dateStr}^1^N^${tan}^1^COMPLIANCE_MASTER_V1^`);

  // 2. Batch Header (BH)
  lines.push(
    `BH^1^${payments.length}^26Q^N^^${tan}^${pan}^${company.legalName}^O^${company.address}^${company.city}^27^${company.pincode}^${company.email}^${company.mobile}^Y^${company.contactPerson}^DESIGNATION^`
  );

  // Group payments by Challan or Section
  payments.forEach((p, idx) => {
    const challanNo = p.challanNo || `CHL${1000 + idx}`;
    const bsrCode = p.bsrCode || '0510001';
    const cDate = p.challanDate || p.paymentDate;

    // CD Record (Challan Detail)
    lines.push(
      `CD^1^${idx + 1}^1^26Q^${p.sectionCode}^0^0^${p.tdsDeducted}^0^0^0^${p.tdsDeducted}^0^${bsrCode}^${cDate}^${challanNo}^200^N^^`
    );

    // DD Record (Deductee Detail)
    lines.push(
      `DD^1^${idx + 1}^1^${p.sectionCode}^0^${p.vendorPan}^${p.vendorName}^${p.paymentDate}^${p.invoiceAmount}^${p.tdsDeducted}^${p.tdsDeposited}^${p.paymentDate}^Y^A^`
    );
  });

  const content = lines.join('\n');
  const sizeKb = Number((content.length / 1024).toFixed(2));

  return {
    id: `GEN-TDS26Q-${Date.now()}`,
    companyId: company.id,
    module: 'TDS',
    fileType: 'TDS_26Q_FVU',
    fileName: `${tan}_26Q_${financialYear}_${quarter}.fvu`,
    fileContent: content,
    monthYearOrQuarter: `${financialYear}-${quarter}`,
    createdAt: new Date().toISOString(),
    recordCount: payments.length,
    fileSizeKb: sizeKb,
  };
}

export function generateTds26qCsv(company: Company, payments: VendorPayment[], quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', financialYear: string): GeneratedFile {
  const tan = company.tan.trim().toUpperCase();

  const rows: any[][] = [
    ['Form 26Q Non-Salary TDS Annexure Statement', company.legalName, `TAN: ${tan}`, `Quarter: ${quarter}`, `FY: ${financialYear}`],
    [],
    [
      'S.No',
      'Payment No',
      'Payment Date',
      'Vendor Name',
      'Vendor PAN',
      'Section Code',
      'Nature of Payment',
      'Invoice Amount (INR)',
      'TDS Rate (%)',
      'TDS Deducted (INR)',
      'TDS Deposited (INR)',
      'BSR Code',
      'Challan No',
      'Challan Date',
    ],
  ];

  payments.forEach((p, idx) => {
    rows.push([
      idx + 1,
      p.paymentNo,
      p.paymentDate,
      p.vendorName,
      p.vendorPan,
      p.sectionCode,
      p.natureOfPayment || 'Contract / Services',
      p.invoiceAmount,
      p.tdsRate,
      p.tdsDeducted,
      p.tdsDeposited,
      p.bsrCode || '0510001',
      p.challanNo || `CHL${1000 + idx}`,
      p.challanDate || p.paymentDate,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const csvContent = XLSX.utils.sheet_to_csv(ws);

  return {
    id: `GEN-TDS26Q-CSV-${Date.now()}`,
    companyId: company.id,
    module: 'TDS',
    fileType: 'TDS_26Q_CSV',
    fileName: `${tan}_26Q_Annexure_${financialYear}_${quarter}.csv`,
    fileContent: csvContent,
    monthYearOrQuarter: `${financialYear}-${quarter}`,
    createdAt: new Date().toISOString(),
    recordCount: payments.length,
    fileSizeKb: Number((csvContent.length / 1024).toFixed(2)),
  };
}

export function generateTds24qFvu(company: Company, payroll: PayrollRun, quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', financialYear: string): GeneratedFile {
  const tan = company.tan.trim().toUpperCase();
  const pan = company.pan.trim().toUpperCase();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const lines: string[] = [];

  // File Header
  lines.push(`FH^SL^1.0^1.0^1^${dateStr}^1^N^${tan}^1^COMPLIANCE_MASTER_V1^`);

  // Batch Header
  lines.push(
    `BH^1^${payroll.lines.length}^24Q^N^^${tan}^${pan}^${company.legalName}^O^${company.address}^${company.city}^27^${company.pincode}^${company.email}^${company.mobile}^Y^${company.contactPerson}^HR MANAGER^`
  );

  // Challan Record
  const totalSalaryTds = payroll.lines.reduce((acc, l) => acc + l.tds, 0);
  lines.push(
    `CD^1^1^1^24Q^92B^0^0^${totalSalaryTds}^0^0^0^${totalSalaryTds}^0^0510001^${payroll.monthYear}-07^CHL9901^200^N^^`
  );

  // Deductee Records (Salary TDS per employee)
  payroll.lines.forEach((l, idx) => {
    lines.push(
      `DD^1^1^${idx + 1}^92B^0^${l.pan}^${l.empName}^${payroll.monthYear}-01^${l.grossSalary}^${l.tds}^${l.tds}^${payroll.monthYear}-01^Y^A^`
    );
  });

  const content = lines.join('\n');
  const sizeKb = Number((content.length / 1024).toFixed(2));

  return {
    id: `GEN-TDS24Q-${Date.now()}`,
    companyId: company.id,
    module: 'TDS',
    fileType: 'TDS_24Q_FVU',
    fileName: `${tan}_24Q_${financialYear}_${quarter}.fvu`,
    fileContent: content,
    monthYearOrQuarter: `${financialYear}-${quarter}`,
    createdAt: new Date().toISOString(),
    recordCount: payroll.lines.length,
    fileSizeKb: sizeKb,
  };
}

export function generateTds24qCsv(company: Company, payroll: PayrollRun, quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', financialYear: string): GeneratedFile {
  const tan = company.tan.trim().toUpperCase();

  const rows: any[][] = [
    ['Form 24Q Salary TDS Annexure Statement', company.legalName, `TAN: ${tan}`, `Quarter: ${quarter}`, `FY: ${financialYear}`],
    [],
    [
      'S.No',
      'Employee Name',
      'PAN',
      'UAN',
      'Section',
      'Gross Salary (INR)',
      'PF Deduction (INR)',
      'PT Deduction (INR)',
      'Taxable Salary (INR)',
      'Salary TDS Deducted (INR)',
      'Challan No',
      'BSR Code',
    ],
  ];

  payroll.lines.forEach((l, idx) => {
    const taxableEst = Math.max(0, l.grossSalary - l.pfEmployee - l.pt);
    rows.push([
      idx + 1,
      l.empName,
      l.pan,
      l.uan,
      '92B (Salary)',
      l.grossSalary,
      l.pfEmployee,
      l.pt,
      taxableEst,
      l.tds,
      'CHL9901',
      '0510001',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const csvContent = XLSX.utils.sheet_to_csv(ws);

  return {
    id: `GEN-TDS24Q-CSV-${Date.now()}`,
    companyId: company.id,
    module: 'TDS',
    fileType: 'TDS_24Q_CSV',
    fileName: `${tan}_24Q_Annexure_${financialYear}_${quarter}.csv`,
    fileContent: csvContent,
    monthYearOrQuarter: `${financialYear}-${quarter}`,
    createdAt: new Date().toISOString(),
    recordCount: payroll.lines.length,
    fileSizeKb: Number((csvContent.length / 1024).toFixed(2)),
  };
}

export function generateForm27aTxt(company: Company, formType: '26Q' | '24Q', paymentsOrPayroll: any, quarter: string, financialYear: string): GeneratedFile {
  const tan = company.tan.trim().toUpperCase();
  const pan = company.pan.trim().toUpperCase();
  const is26Q = formType === '26Q';

  const count = is26Q ? (paymentsOrPayroll as VendorPayment[]).length : (paymentsOrPayroll as PayrollRun).lines.length;
  const totalAmount = is26Q
    ? (paymentsOrPayroll as VendorPayment[]).reduce((a, p) => a + p.invoiceAmount, 0)
    : (paymentsOrPayroll as PayrollRun).totalGrossSalary;
  const totalTds = is26Q
    ? (paymentsOrPayroll as VendorPayment[]).reduce((a, p) => a + p.tdsDeducted, 0)
    : (paymentsOrPayroll as PayrollRun).totalTds;

  const textLines: string[] = [
    `================================================================================`,
    `                      FORM NO. 27A [See Rule 31AA / 31A]                        `,
    `      Control Chart for Quarterly Statement of Tax Deducted at Source (e-TDS)   `,
    `================================================================================`,
    ``,
    `1. Particulars of Deductor / Employer:`,
    `   (a) Tax Deduction Account Number (TAN) : ${tan}`,
    `   (b) Permanent Account Number (PAN)     : ${pan}`,
    `   (c) Name of Deductor / Employer       : ${company.legalName}`,
    `   (d) Flat/Door/Block No.                : ${company.address}`,
    `   (e) City / District / State            : ${company.city}, ${company.state} - ${company.pincode}`,
    `   (f) Email ID                           : ${company.email}`,
    `   (g) Mobile Number                      : ${company.mobile}`,
    ``,
    `2. Particulars of Person Responsible for Deduction of Tax:`,
    `   (a) Name                               : ${company.contactPerson}`,
    `   (b) Designation                        : Authorised Signatory / Manager`,
    ``,
    `3. Statement Details:`,
    `   (a) Form No.                           : Form ${formType}`,
    `   (b) Financial Year                     : ${financialYear}`,
    `   (c) Quarter                            : ${quarter}`,
    `   (d) Type of Return                     : Original (O)`,
    ``,
    `4. Summary of Statement:`,
    `   -----------------------------------------------------------------------------`,
    `   Total Number of Deductee Records       : ${count}`,
    `   Total Amount Paid / Credited (INR)     : Rs. ${totalAmount.toLocaleString('en-IN')}`,
    `   Total Tax Deducted at Source (INR)     : Rs. ${totalTds.toLocaleString('en-IN')}`,
    `   Total Tax Deposited to Govt (INR)      : Rs. ${totalTds.toLocaleString('en-IN')}`,
    `   Total Number of Challans Included      : 1`,
    `   -----------------------------------------------------------------------------`,
    ``,
    `5. Verification:`,
    `   I, ${company.contactPerson}, hereby certify that all particulars given above are correct`,
    `   and complete, and match with the attached electronic media file (${tan}_${formType}_${financialYear}_${quarter}.fvu).`,
    ``,
    `   Date  : ${new Date().toLocaleDateString('en-IN')}`,
    `   Place : ${company.city}`,
    `                                             ___________________________________`,
    `                                              Signature of Person Responsible   `,
    `================================================================================`,
  ];

  const content = textLines.join('\n');

  return {
    id: `GEN-FORM27A-${Date.now()}`,
    companyId: company.id,
    module: 'TDS',
    fileType: 'FORM_27A_TXT',
    fileName: `Form27A_${formType}_${tan}_${financialYear}_${quarter}.txt`,
    fileContent: content,
    monthYearOrQuarter: `${financialYear}-${quarter}`,
    createdAt: new Date().toISOString(),
    recordCount: count,
    fileSizeKb: Number((content.length / 1024).toFixed(2)),
  };
}

