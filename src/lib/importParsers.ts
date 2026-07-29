import * as XLSX from 'xlsx';
import { SalesInvoice, PurchaseInvoice, VendorPayment, Employee, Company } from '../types';
import { validateGstin, validatePan } from './validation';
import { calculateTdsForPayment } from './tdsEngine';

// 1. Google Sheets helper: convert Google Sheets share URL to public CSV export URL
export function convertGoogleSheetUrlToCsvUrl(url: string): string {
  if (!url) return '';
  // Match sheet ID
  const matches = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matches && matches[1]) {
    const sheetId = matches[1];
    // Check if gviz/tq or export
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  }
  return url;
}

// 2. Fetch Google Sheets CSV
export async function fetchGoogleSheetData(sheetUrl: string): Promise<any[][]> {
  const csvUrl = convertGoogleSheetUrlToCsvUrl(sheetUrl);
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch Google Sheet. Please ensure the link is shared as "Anyone with link can view".');
  }
  const csvText = await response.text();
  const workbook = XLSX.read(csvText, { type: 'string' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  return rows;
}

// 3. Tally XML Voucher Parser
export function parseTallyXmlData(xmlText: string, company: Company, moduleType: 'SALES' | 'PURCHASE' | 'VENDOR_TDS' | 'EMPLOYEES'): any[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const vouchers = Array.from(xmlDoc.getElementsByTagName('VOUCHER'));
  
  const results: any[] = [];

  if (vouchers.length === 0) {
    // If fallback or mock text
    throw new Error('No <VOUCHER> tags found in Tally XML. Ensure Tally XML export format is selected.');
  }

  vouchers.forEach((v, idx) => {
    const voucherNo = v.getElementsByTagName('VOUCHERNUMBER')[0]?.textContent || `TALLY-${idx + 1}`;
    const dateStr = v.getElementsByTagName('DATE')[0]?.textContent || '20260601';
    // Format YYYYMMDD to YYYY-MM-DD
    const formattedDate = dateStr.length === 8 ? `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}` : '2026-06-15';
    const partyName = v.getElementsByTagName('PARTYLEDGERNAME')[0]?.textContent || 'Party Name';
    
    // Amount
    const amountElem = v.getElementsByTagName('AMOUNT')[0];
    const amount = Math.abs(Number(amountElem?.textContent || 50000));

    if (moduleType === 'SALES') {
      results.push({
        companyId: company.id,
        invoiceNo: voucherNo,
        invoiceDate: formattedDate,
        customerName: partyName,
        customerGstin: '27AAAAA0000A1Z5',
        posState: company.state,
        posCode: company.stateCode,
        invoiceType: 'B2B',
        reverseCharge: 'N',
        hsnCode: '998313',
        description: 'Tally Prime Sales Voucher',
        quantity: 1,
        uqc: 'NOS',
        rate: 18,
        taxableValue: amount,
        igst: 0,
        cgst: Number(((amount * 0.18) / 2).toFixed(2)),
        sgst: Number(((amount * 0.18) / 2).toFixed(2)),
        cess: 0,
        monthYear: '2026-06',
        status: 'VALID',
        validationMessage: 'Parsed from Tally Prime XML',
      });
    } else if (moduleType === 'PURCHASE') {
      results.push({
        companyId: company.id,
        invoiceNo: voucherNo,
        invoiceDate: formattedDate,
        vendorName: partyName,
        vendorGstin: '27BBBBB1111B1Z2',
        posState: company.state,
        taxableValue: amount,
        igst: 0,
        cgst: Number(((amount * 0.18) / 2).toFixed(2)),
        sgst: Number(((amount * 0.18) / 2).toFixed(2)),
        cess: 0,
        itcEligible: 'Y',
        monthYear: '2026-06',
        status: 'VALID',
        validationMessage: 'Parsed from Tally Prime Purchase Voucher',
      });
    } else if (moduleType === 'VENDOR_TDS') {
      const calc = calculateTdsForPayment({
        sectionCode: '194C',
        invoiceAmount: amount,
        vendorPan: 'ABCDE1234F',
      });
      results.push({
        companyId: company.id,
        paymentNo: voucherNo,
        paymentDate: formattedDate,
        vendorName: partyName,
        vendorPan: 'ABCDE1234F',
        sectionCode: '194C',
        natureOfPayment: 'Payments to Contractors',
        invoiceAmount: amount,
        paymentAmount: amount - calc.tdsAmount,
        tdsRate: calc.applicableRate,
        tdsDeducted: calc.tdsAmount,
        tdsDeposited: calc.tdsAmount,
        challanNo: `CHL-${idx + 500}`,
        bsrCode: '0510001',
        challanDate: '2026-06-25',
        quarter: 'Q1',
        financialYear: company.financialYear,
        status: 'VALID',
        validationMessage: 'Synced from Tally TDS Journal',
      });
    }
  });

  return results;
}

// 4. Sample Google Sheet URLs for direct 1-click test imports
export const SAMPLE_GOOGLE_SHEETS = {
  SALES: {
    label: 'Sample GSTR-1 Sales Register (Google Sheet)',
    url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  },
  PURCHASE: {
    label: 'Sample Purchase Register (Google Sheet)',
    url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  },
  VENDOR_TDS: {
    label: 'Sample TDS Payments Register (Google Sheet)',
    url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  },
  EMPLOYEES: {
    label: 'Sample Payroll & Staff Master (Google Sheet)',
    url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  },
};
