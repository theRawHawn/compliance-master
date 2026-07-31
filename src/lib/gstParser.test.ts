import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGstFile } from './gstParser';
import { generateGstr1Json, generateGstr3bSummary } from './generators/gstGenerator';
import { calculateGstLateFeeAndInterest, computeItcSetoff } from './calculators/gstLateFeeCalculator';
import type { Company, SalesInvoice } from '../types';

function makeTestCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'C1', userId: 'U1', legalName: 'Test Co', gstin: '29AAACT1234F1Z5', pan: 'AAACT1234F',
    tan: 'BLRT12345A', state: 'Karnataka', stateCode: '29',
    address: '1 MG Road', city: 'Bengaluru', pincode: '560001', contactPerson: 'Test Person',
    email: 'test@example.com', mobile: '9999999999', financialYear: '2026-27',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('parses GSTR1 CSV with correct invoice date, tax and rate', async () => {
  const csv = [
    'Invoice No.,Invoice Date,Customer Name,GSTIN/UIN,Taxable Value,GST Rate,CGST,SGST,IGST',
    'INV-100,01-06-2026,ABC Ltd,27AAAAA0000A1Z5,100000,18,9000,9000,0',
  ].join('\n');

  const file = new File([csv], 'gstr1.csv', { type: 'text/csv' });
  const result = await parseGstFile(file, 'GSTR1', 'C1', '27');

  assert.equal(result.salesInvoices.length, 1);
  assert.equal(result.salesInvoices[0].invoiceNo, 'INV-100');
  assert.equal(result.salesInvoices[0].invoiceDate, '2026-06-01');
  assert.equal(result.salesInvoices[0].rate, 18);
  assert.equal(result.salesInvoices[0].taxableValue, 100000);
  assert.equal(result.salesInvoices[0].cgst, 9000);
  assert.equal(result.salesInvoices[0].sgst, 9000);
});

test('prefers the billing-address customer over the seller for invoice text', async () => {
  const invoiceText = [
    'ABC Traders',
    'GSTIN: 27AAAAA0000A1Z5',
    'Invoice No: INV-100',
    'Date: 01-06-2026',
    'Billing Address',
    'M/s Blue Horizon Pvt Ltd',
    'GSTIN: 29AAAAA1111A1Z1',
    'Taxable Value: 100000',
    'CGST 9%: 9000',
    'SGST 9%: 9000',
  ].join('\n');

  const file = new File([invoiceText], 'invoice.txt', { type: 'text/plain' });
  const result = await parseGstFile(file, 'GSTR1', 'C1', '27');

  assert.equal(result.salesInvoices.length, 1);
  assert.equal(result.salesInvoices[0].customerName, 'Blue Horizon Pvt Ltd');
  assert.equal(result.salesInvoices[0].customerGstin, '29AAAAA1111A1Z1');
});

test('prefers billing-address customer details over seller details for text invoices', async () => {
  const text = [
    'Tax Invoice',
    'Seller: ABC Traders',
    'GSTIN: 27AAAAA1111A1Z5',
    'Billing Address',
    'M/s XYZ Customer Pvt Ltd',
    'GSTIN: 29BBBBB2222B1Z2',
    'Invoice No: INV-200',
    'Date: 02-06-2026',
    'Taxable Value: 50000',
    'CGST: 4500',
    'SGST: 4500',
  ].join('\n');

  const file = new File([text], 'invoice.txt', { type: 'text/plain' });
  const result = await parseGstFile(file, 'GSTR1', 'C1', '27');

  assert.equal(result.salesInvoices.length, 1);
  assert.equal(result.salesInvoices[0].customerName, 'XYZ Customer Pvt Ltd');
  assert.equal(result.salesInvoices[0].customerGstin, '29BBBBB2222B1Z2');
});

test('parses Zoho Books invoice layout with Bill To / Ship To sections', async () => {
  const zohoInvoice = [
    'INV/26-27086',
    '13/06/2026',
    'Bill To Miyuro',
    'GSTIN 09AACNC6502A1Z5',
    'Item Details',
    'Sub Total 105000.00',
    'CGST 9% 9450',
    'SGST 9% 9450',
  ].join('\n');

  const file = new File([zohoInvoice], 'zoho_invoice.txt', { type: 'text/plain' });
  const result = await parseGstFile(file, 'GSTR1', 'C1', '09');

  assert.equal(result.salesInvoices.length, 1);
  assert.equal(result.salesInvoices[0].invoiceNo, 'INV/26-27086');
  assert.equal(result.salesInvoices[0].invoiceDate, '2026-06-13');
  assert.equal(result.salesInvoices[0].customerName, 'Miyuro');
  assert.equal(result.salesInvoices[0].customerGstin, '09AACNC6502A1Z5');
  assert.equal(result.salesInvoices[0].taxableValue, 105000);
  assert.equal(result.salesInvoices[0].cgst, 9450);
  assert.equal(result.salesInvoices[0].sgst, 9450);
});

test('parses Tally text export with Buyer (Bill to), Party A/c Name style labels', async () => {
  const tallyText = [
    'Tax Invoice',
    'Invoice No. INV/25-26/0456          Dated 15-Jun-2026',
    'Buyer (Bill to)',
    'Shree Balaji Traders',
    'GSTIN/UIN: 29AAACS1234F1Z5',
    'Karnataka, Code: 29',
    'Description of Goods    HSN Code   Qty   Rate   Amount',
    'Steel Rods              7213       100   500    50000',
    'Taxable Value: 50000',
    'CGST 9%: 4500',
    'SGST 9%: 4500',
  ].join('\n');

  const file = new File([tallyText], 'tally_invoice.txt', { type: 'text/plain' });
  const result = await parseGstFile(file, 'GSTR1', 'C1', '29');

  assert.equal(result.salesInvoices.length, 1);
  const inv = result.salesInvoices[0];
  // Regression: 'INV' must not match inside the word 'Invoice' itself.
  assert.equal(inv.invoiceNo, 'INV/25-26/0456');
  // Regression: DD-Mon-YYYY (Tally's default date format) must be parsed.
  assert.equal(inv.invoiceDate, '2026-06-15');
  // Regression: 'Traders' in the name must not be misread as header noise.
  assert.equal(inv.customerName, 'Shree Balaji Traders');
  assert.equal(inv.customerGstin, '29AAACS1234F1Z5');
  // Regression: a comma-less number over 3 digits must not be truncated to 0.
  assert.equal(inv.taxableValue, 50000);
  assert.equal(inv.cgst, 4500);
  assert.equal(inv.sgst, 4500);
});

test('does not let the invoice subtotal leak into unrelated fields (rate/cgst) when their own label is absent', async () => {
  const zohoText = [
    'INVOICE',
    'Zoho Corporation Pvt Ltd',
    'GSTIN 33AAACZ8811A1Z0',
    'Invoice# ZB-2026-0091   Invoice Date: 22/06/2026',
    'Bill To Miyuro Enterprises',
    'Ship To Miyuro Enterprises',
    'GSTIN 29ABCDE1234F1Z5',
    'Item Description   Qty   Rate   Amount',
    'Cloud Services      1    80000  80000',
    'Sub Total  80000',
    'IGST 18%  14400',
    'Total  94400',
  ].join('\n');

  const file = new File([zohoText], 'zoho_no_rate_label.txt', { type: 'text/plain' });
  const result = await parseGstFile(file, 'GSTR1', 'C1', '27');

  assert.equal(result.salesInvoices.length, 1);
  const inv = result.salesInvoices[0];
  assert.equal(inv.taxableValue, 80000);
  assert.equal(inv.igst, 14400);
  // Regression: no explicit CGST/SGST label present, so these must stay 0 —
  // not silently pick up the 80000 subtotal.
  assert.equal(inv.cgst, 0);
  assert.equal(inv.sgst, 0);
  // Regression: no explicit rate label present, so this must fall back to the
  // 18% default — not silently pick up the 80000 subtotal either.
  assert.equal(inv.rate, 18);
});

test('parses Excel with Tally-style column headers (Party Name, Voucher No, GSTIN/UIN)', async () => {
  const XLSX = await import('xlsx');
  const rows = [
    ['Voucher No', 'Voucher Date', 'Party Name', 'GSTIN/UIN', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Rate'],
    ['INV/25-26/0456', '15-06-2026', 'Shree Balaji Traders', '29AAACS1234F1Z5', 50000, 4500, 4500, 0, 18],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sales');
  const file = new File([XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })], 'tally_export.xlsx');

  const result = await parseGstFile(file, 'GSTR1', 'C1', '29');
  assert.equal(result.salesInvoices.length, 1);
  const inv = result.salesInvoices[0];
  assert.equal(inv.customerName, 'Shree Balaji Traders');
  assert.equal(inv.taxableValue, 50000);
  // Regression: the short 'gst' candidate for the Rate column must not match
  // the unrelated GSTIN/UIN column and pull in GSTIN digits as the rate.
  assert.equal(inv.rate, 18);
});

test('parses CSV dates correctly for both ambiguous DD-MM-YYYY and unambiguous DD-Mon-YYYY formats', async () => {
  const XLSX = await import('xlsx');

  const ambiguousRows = [
    ['Invoice No', 'Invoice Date', 'Customer', 'Taxable Value'],
    ['INV-1', '01-06-2026', 'Ravi Traders', 10000],
  ];
  const wb1 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb1, XLSX.utils.aoa_to_sheet(ambiguousRows), 'Sheet1');
  const csvFile1 = new File([XLSX.write(wb1, { type: 'buffer', bookType: 'csv' })], 'ambiguous_date.csv');
  const result1 = await parseGstFile(csvFile1, 'GSTR1', 'C1', '29');
  // '01-06-2026' must be read as 1 June 2026 (Indian DD-MM-YYYY), not 6 January.
  assert.equal(result1.salesInvoices[0].invoiceDate, '2026-06-01');

  const monthNameRows = [
    ['Invoice No', 'Invoice Date', 'Customer', 'Taxable Value'],
    ['INV-2', '01-Jul-2026', 'Ganesh Enterprises', 25000],
  ];
  const wb2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(monthNameRows), 'Sheet1');
  const csvFile2 = new File([XLSX.write(wb2, { type: 'buffer', bookType: 'csv' })], 'month_name_date.csv');
  const result2 = await parseGstFile(csvFile2, 'GSTR1', 'C1', '29');
  // '01-Jul-2026' must be read as 1 July 2026, unaffected by locale ambiguity.
  assert.equal(result2.salesInvoices[0].invoiceDate, '2026-07-01');
});

test('resolves the real place-of-supply state name from the GSTIN, not a hardcoded state', async () => {
  const csv = [
    'Invoice No.,Invoice Date,Customer Name,GSTIN/UIN,Taxable Value,GST Rate,CGST,SGST,IGST',
    'INV-1,01-06-2026,Tamil Trading Co,33AAACT1234F1Z5,50000,18,0,0,9000',
  ].join('\n');
  const file = new File([csv], 'tn_customer.csv', { type: 'text/csv' });
  // Seller is registered in Karnataka (29); customer GSTIN starts with 33 (Tamil Nadu).
  const result = await parseGstFile(file, 'GSTR1', 'C1', '29');

  assert.equal(result.salesInvoices.length, 1);
  assert.equal(result.salesInvoices[0].posCode, '33');
  assert.equal(result.salesInvoices[0].posState, 'Tamil Nadu');
});

test('classifies B2CL only for inter-state B2C invoices above the current Rs.1 lakh threshold', async () => {
  const XLSX = await import('xlsx');

  // Inter-state (seller in Karnataka '29', unregistered customer with an explicit
  // 'Place of Supply' column showing Tamil Nadu) above 1 lakh -> B2CL.
  const interStateHighValue = [
    ['Invoice No', 'Invoice Date', 'Customer', 'Place of Supply', 'Taxable Value'],
    ['INV-1', '01-06-2026', 'Walk-in Customer', 'Tamil Nadu', 150000],
  ];
  const wb1 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb1, XLSX.utils.aoa_to_sheet(interStateHighValue), 'Sheet1');
  const file1 = new File([XLSX.write(wb1, { type: 'buffer', bookType: 'xlsx' })], 'interstate.xlsx');
  const result1 = await parseGstFile(file1, 'GSTR1', 'C1', '29');
  assert.equal(result1.salesInvoices[0].posState, 'Tamil Nadu');
  assert.equal(result1.salesInvoices[0].invoiceType, 'B2CL');

  // Exactly at the threshold (not "more than") must stay B2CS even when inter-state.
  const interStateAtThreshold = [
    ['Invoice No', 'Invoice Date', 'Customer', 'Place of Supply', 'Taxable Value'],
    ['INV-2', '01-06-2026', 'Walk-in Customer', 'Tamil Nadu', 100000],
  ];
  const wb2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(interStateAtThreshold), 'Sheet1');
  const file2 = new File([XLSX.write(wb2, { type: 'buffer', bookType: 'xlsx' })], 'threshold.xlsx');
  const result2 = await parseGstFile(file2, 'GSTR1', 'C1', '29');
  assert.equal(result2.salesInvoices[0].invoiceType, 'B2CS');

  // No GSTIN and no place-of-supply data at all -> cannot determine inter-state, so the
  // safe default is B2CS rather than guessing.
  const noStateData = [
    ['Invoice No', 'Invoice Date', 'Customer', 'Taxable Value'],
    ['INV-3', '01-06-2026', 'Walk-in Customer', 150000],
  ];
  const wb3 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb3, XLSX.utils.aoa_to_sheet(noStateData), 'Sheet1');
  const file3 = new File([XLSX.write(wb3, { type: 'buffer', bookType: 'xlsx' })], 'nostate.xlsx');
  const result3 = await parseGstFile(file3, 'GSTR1', 'C1', '29');
  assert.equal(result3.salesInvoices[0].invoiceType, 'B2CS');
});


test('derives monthYear from the actual invoice date instead of a fixed value', async () => {
  const csv = [
    'Invoice No.,Invoice Date,Customer Name,GSTIN/UIN,Taxable Value',
    'INV-1,15-03-2026,Some Customer,29AAACS1234F1Z5,50000',
  ].join('\n');
  const file = new File([csv], 'march_invoice.csv', { type: 'text/csv' });
  const result = await parseGstFile(file, 'GSTR1', 'C1', '29');

  assert.equal(result.salesInvoices[0].invoiceDate, '2026-03-15');
  assert.equal(result.salesInvoices[0].monthYear, '2026-03');
});

test('generateGstr1Json only includes invoices from the selected return period', () => {
  const company = makeTestCompany();
  const sales: SalesInvoice[] = [
    { id: '1', companyId: 'C1', invoiceNo: 'INV-1', invoiceDate: '2026-06-10', customerName: 'A',
      customerGstin: '29AAACA1234F1Z5', posState: 'Karnataka', posCode: '29', invoiceType: 'B2B',
      reverseCharge: 'N', hsnCode: '998313', description: 'x', quantity: 1, uqc: 'NOS', rate: 18,
      taxableValue: 10000, igst: 0, cgst: 900, sgst: 900, cess: 0, monthYear: '2026-06', status: 'VALID' },
    { id: '2', companyId: 'C1', invoiceNo: 'INV-2', invoiceDate: '2026-05-10', customerName: 'B',
      customerGstin: '29AAACB1234F1Z5', posState: 'Karnataka', posCode: '29', invoiceType: 'B2B',
      reverseCharge: 'N', hsnCode: '998313', description: 'x', quantity: 1, uqc: 'NOS', rate: 18,
      taxableValue: 500000, igst: 0, cgst: 45000, sgst: 45000, cess: 0, monthYear: '2026-05', status: 'VALID' },
  ];

  const file = generateGstr1Json(company, sales, '2026-06');
  const payload = JSON.parse(file.fileContent);
  const allInvNos = payload.b2b.flatMap((b: any) => b.inv.map((i: any) => i.inum));
  // Regression: the May invoice must not leak into the June return.
  assert.deepEqual(allInvNos, ['INV-1']);
  assert.equal(file.recordCount, 1);
});

test('generateGstr3bSummary only sums invoices from the selected return period', () => {
  const company = makeTestCompany();
  const sales: SalesInvoice[] = [
    { id: '1', companyId: 'C1', invoiceNo: 'INV-1', invoiceDate: '2026-06-10', customerName: 'A',
      customerGstin: '29AAACA1234F1Z5', posState: 'Karnataka', posCode: '29', invoiceType: 'B2B',
      reverseCharge: 'N', hsnCode: '998313', description: 'x', quantity: 1, uqc: 'NOS', rate: 18,
      taxableValue: 10000, igst: 0, cgst: 900, sgst: 900, cess: 0, monthYear: '2026-06', status: 'VALID' },
    { id: '2', companyId: 'C1', invoiceNo: 'INV-2', invoiceDate: '2026-05-10', customerName: 'B',
      customerGstin: '29AAACB1234F1Z5', posState: 'Karnataka', posCode: '29', invoiceType: 'B2B',
      reverseCharge: 'N', hsnCode: '998313', description: 'x', quantity: 1, uqc: 'NOS', rate: 18,
      taxableValue: 500000, igst: 0, cgst: 45000, sgst: 45000, cess: 0, monthYear: '2026-05', status: 'VALID' },
  ];

  const summary = generateGstr3bSummary(company, sales, [], '2026-06', '2026-07-15', '1.5CR_TO_5CR');
  // Regression: only the June invoice (taxable 10000) should be counted, not the May one (500000).
  assert.equal(summary.table31_OutwardSupplies.a_taxableSupplies.totalTaxableValue, 10000);
  assert.equal(summary.table31_OutwardSupplies.a_taxableSupplies.centralTax, 900);
});

test('QRMP filers get quarterly due dates based on their state category', () => {
  // Karnataka (29) is a Category X state -> 22nd.
  const kaCompany = makeTestCompany({ gstFilingFrequency: 'QRMP' });
  const kaResult = calculateGstLateFeeAndInterest(kaCompany, [], [], '2026-05', '2026-07-20', '1.5CR_TO_5CR');
  // May falls in the Apr-Jun quarter -> filing month is July.
  assert.equal(kaResult.gstr1DueDate, '2026-07-13');
  assert.equal(kaResult.gstr3bDueDate, '2026-07-22');

  // Uttar Pradesh (09) is a Category Y state -> 24th.
  const upCompany = makeTestCompany({
    id: 'C2', legalName: 'Test Co UP', gstin: '09AAACT1234F1Z5', tan: 'LKOT12345A',
    state: 'Uttar Pradesh', stateCode: '09', gstFilingFrequency: 'QRMP',
  });
  const upResult = calculateGstLateFeeAndInterest(upCompany, [], [], '2026-05', '2026-07-20', '1.5CR_TO_5CR');
  assert.equal(upResult.gstr3bDueDate, '2026-07-24');

  // Monthly filers are unaffected.
  const monthlyCompany: Company = { ...kaCompany, gstFilingFrequency: 'MONTHLY' };
  const monthlyResult = calculateGstLateFeeAndInterest(monthlyCompany, [], [], '2026-05', '2026-06-20', '1.5CR_TO_5CR');
  assert.equal(monthlyResult.gstr1DueDate, '2026-06-11');
  assert.equal(monthlyResult.gstr3bDueDate, '2026-06-20');
});

test('computeItcSetoff follows Rule 88A cross-utilization order', () => {
  // IGST credit of 5000 should first clear IGST liability (2000, leaving 3000 credit), then
  // fully clear CGST liability (3000, leaving 0 credit) -- before any CGST/SGST credit is used.
  // With no IGST credit left over, SGST liability is untouched (no CGST/SGST credit was supplied).
  const result = computeItcSetoff(
    { igst: 2000, cgst: 3000, sgst: 3000, cess: 0 },
    { igst: 5000, cgst: 0, sgst: 0, cess: 0 }
  );
  assert.equal(result.igst, 0); // fully cleared by IGST credit
  assert.equal(result.cgst, 0); // fully cleared by remaining IGST credit (3000)
  assert.equal(result.sgst, 3000); // no IGST credit left, and no SGST credit supplied
});

test('computeItcSetoff lets IGST credit spill over into both CGST and SGST when there is enough', () => {
  const result = computeItcSetoff(
    { igst: 1000, cgst: 2000, sgst: 2000, cess: 0 },
    { igst: 6000, cgst: 500, sgst: 500, cess: 0 }
  );
  // IGST credit: 1000 clears IGST, 2000 clears CGST, 2000 clears SGST -> 1000 IGST credit left over (unused, per Rule 88A it cannot refund/carry sideways beyond IGST/CGST/SGST).
  assert.equal(result.igst, 0);
  assert.equal(result.cgst, 0);
  assert.equal(result.sgst, 0);
});

test('computeItcSetoff never lets CGST credit offset SGST liability or vice versa', () => {
  const result = computeItcSetoff(
    { igst: 0, cgst: 1000, sgst: 1000, cess: 0 },
    { igst: 0, cgst: 5000, sgst: 0, cess: 0 }
  );
  assert.equal(result.cgst, 0); // cleared by its own CGST credit
  assert.equal(result.sgst, 1000); // untouched -- CGST credit must never offset SGST liability
});
