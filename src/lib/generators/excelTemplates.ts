/**
 * Sample Excel / CSV Template Generator for Compliance Master
 */

import * as XLSX from 'xlsx';

export function downloadSalesRegisterTemplate() {
  const headers = [
    'Invoice No',
    'Invoice Date (YYYY-MM-DD)',
    'Customer Name',
    'Customer GSTIN',
    'POS State Code',
    'Invoice Type (B2B/B2CL/B2CS/CDNR/EXPORT)',
    'Reverse Charge (Y/N)',
    'HSN Code',
    'Description',
    'Quantity',
    'UQC',
    'GST Rate (%)',
    'Taxable Value (₹)',
    'IGST (₹)',
    'CGST (₹)',
    'SGST (₹)',
    'Cess (₹)',
  ];

  const sampleRow1 = [
    'INV/2026/001',
    '2026-06-10',
    'Infosys Ltd',
    '29AAACI1681G1ZD',
    '29',
    'B2B',
    'N',
    '998313',
    'Software Consulting Services',
    1,
    'NOS',
    18,
    100000,
    18000,
    0,
    0,
    0,
  ];

  const sampleRow2 = [
    'INV/2026/002',
    '2026-06-12',
    'Tata Consultancy Services',
    '27AAACT2727Q1ZW',
    '27',
    'B2B',
    'N',
    '998314',
    'IT Managed Services',
    2,
    'NOS',
    18,
    50000,
    0,
    4500,
    4500,
    0,
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow1, sampleRow2]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');

  XLSX.writeFile(wb, 'Sales_Register_Template_ComplianceMaster.xlsx');
}

export function downloadPurchaseRegisterTemplate() {
  const headers = [
    'Invoice No',
    'Invoice Date (YYYY-MM-DD)',
    'Vendor Name',
    'Vendor GSTIN',
    'POS State',
    'Taxable Value (₹)',
    'IGST (₹)',
    'CGST (₹)',
    'SGST (₹)',
    'Cess (₹)',
    'ITC Eligible (Y/N)',
    'HSN Code',
  ];

  const sampleRow1 = [
    'PUR/8812',
    '2026-06-05',
    'Dell India Pvt Ltd',
    '29AAACD1234F1Z1',
    'Karnataka',
    250000,
    45000,
    0,
    0,
    0,
    'Y',
    '8471',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow1]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Purchase Register');

  XLSX.writeFile(wb, 'Purchase_Register_Template_ComplianceMaster.xlsx');
}

export function downloadVendorTdsTemplate() {
  const headers = [
    'Payment No',
    'Payment Date (YYYY-MM-DD)',
    'Vendor Name',
    'Vendor PAN',
    'Section Code (194C/194J/194H/194I/194Q)',
    'Nature of Payment',
    'Invoice Amount (₹)',
    'TDS Rate (%)',
    'TDS Deducted (₹)',
    'TDS Deposited (₹)',
    'Challan No',
    'BSR Code',
    'Challan Date',
  ];

  const sampleRow = [
    'PAY/2026/01',
    '2026-06-15',
    'Acme Security Services',
    'AACCA1234K',
    '194C',
    'Contractor Payment',
    100000,
    2,
    2000,
    2000,
    'CHL8801',
    '0510001',
    '2026-06-20',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vendor TDS Payments');

  XLSX.writeFile(wb, 'Vendor_TDS_Template_ComplianceMaster.xlsx');
}

export function downloadEmployeeMasterTemplate() {
  const headers = [
    'Employee ID',
    'Full Name',
    'PAN',
    'UAN (PF Number)',
    'PF Member ID',
    'ESI No',
    'Designation',
    'Department',
    'Joining Date (YYYY-MM-DD)',
    'Gender (M/F)',
    'Basic Pay (₹)',
    'DA (₹)',
    'HRA (₹)',
    'Special Allowance (₹)',
  ];

  const sampleRow = [
    'EMP001',
    'Rajesh Kumar',
    'ABCDE1234F',
    '100987654321',
    'MH/BAN/0012345/000/0001',
    '31000123450000101',
    'Software Engineer',
    'Engineering',
    '2024-01-15',
    'M',
    35000,
    5000,
    15000,
    10000,
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employee Master');

  XLSX.writeFile(wb, 'Employee_Master_Template_ComplianceMaster.xlsx');
}
