import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGstFile } from './gstParser';
import { generateGstr1Json, generateGstr3bSummary, generateGstr3bExcel } from './generators/gstGenerator';
import { calculateGstLateFeeAndInterest, computeItcSetoff } from './calculators/gstLateFeeCalculator';
import type { Company, SalesInvoice, PurchaseInvoice } from '../types';

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

test('GSTIN checksum matches the published worked reference example (34AABCB5576G1Z -> Q)', async () => {
  const { computeGstinCheckDigit, hasValidGstinChecksum } = await import('./gstParser');
  assert.equal(computeGstinCheckDigit('34AABCB5576G1Z'), 'Q');
  assert.equal(hasValidGstinChecksum('34AABCB5576G1ZQ'), true);
  // Flipping the check character must be detected as invalid.
  assert.equal(hasValidGstinChecksum('34AABCB5576G1ZA'), false);
});

test('getDemoParsedData always marks its output as sample data, for every doc type', async () => {
  const { getDemoParsedData } = await import('./gstParser');
  for (const docType of ['GSTR1', 'GSTR2B', 'GSTR3B'] as const) {
    const demo = getDemoParsedData(docType, 'C1');
    assert.equal(demo.isSampleData, true, `${docType} demo data must be flagged as sample data`);
  }
});

test('PDF text reconstruction preserves line breaks instead of flattening a page into one line', async () => {
  const { reconstructPdfPageText } = await import('./gstParser');
  // Captured from a real multi-line PDF invoice via pdfjs's getTextContent(): each line is its
  // own text item, and hasEOL is true at the end of every line except the very last item.
  const items = [
    { str: 'Tax Invoice', hasEOL: true },
    { str: 'Invoice No. INV/25-26/0456', hasEOL: true },
    { str: 'Dated 15-Jun-2026', hasEOL: true },
    { str: 'Buyer (Bill to)', hasEOL: true },
    { str: 'Shree Balaji Traders', hasEOL: true },
    { str: 'GSTIN/UIN: 29AAACS1234F1Z5', hasEOL: true },
    { str: 'Taxable Value: 50000', hasEOL: true },
    { str: 'CGST 9%: 4500', hasEOL: true },
    { str: 'SGST 9%: 4500', hasEOL: false },
  ];
  const text = reconstructPdfPageText(items);
  const lines = text.split('\n').filter(Boolean);
  // Regression: this must produce 9 separate lines, not one flattened line joined with spaces
  // (which was the actual bug -- every line of a real PDF invoice collapsed into a single line,
  // silently breaking party-name/date/amount extraction with no error surfaced).
  assert.equal(lines.length, 9);
  assert.equal(lines[3].trim(), 'Buyer (Bill to)');
  assert.equal(lines[4].trim(), 'Shree Balaji Traders');
});

test('PDF text reconstruction inserts a column-break marker at wide side-by-side gaps, not normal inter-word spaces', async () => {
  const { reconstructPdfPageText, PDF_COLUMN_BREAK_MARKER } = await import('./gstParser');
  // Captured from a real two-column PDF invoice (Bill To / Ship To side-by-side) via pdfjs's
  // getTextContent(): the gap between columns is a whitespace-only item with a large width
  // (216.7pt here), vs a normal single space between words which would be only a few points.
  const items = [
    { str: 'Bill To', hasEOL: false, width: 33.3 },
    { str: ' ', hasEOL: false, width: 216.7 },
    { str: 'Ship To', hasEOL: true, width: 41.4 },
  ];
  const text = reconstructPdfPageText(items);
  assert.ok(text.includes(PDF_COLUMN_BREAK_MARKER), 'expected a column-break marker at the wide gap');
  const beforeMarker = text.split(PDF_COLUMN_BREAK_MARKER)[0];
  assert.ok(beforeMarker.includes('Bill To'));
  assert.ok(!beforeMarker.includes('Ship To'));
});

test('extractPartyName recovers just the first column when Bill To / Ship To sit side-by-side on one PDF line', async () => {
  const { extractPartyName, PDF_COLUMN_BREAK_MARKER } = await import('./gstParser');
  // Simulates the reconstructed lines from a real side-by-side Bill To / Ship To PDF layout.
  const lines = [
    `Bill To${PDF_COLUMN_BREAK_MARKER}Ship To`,
    `Miyuro Enterprises${PDF_COLUMN_BREAK_MARKER}Miyuro Warehouse Unit 2`,
    'GSTIN: 29ABCDE1234F1Z5',
  ];
  // Regression: this previously returned 'Ship To' (the wrong column's label picked up as the
  // name) with no warning, since 'Ship To' alone passed every plausibility check.
  assert.equal(extractPartyName(lines, ''), 'Miyuro Enterprises');
});

test('a genuinely parsed file is never flagged as sample data', async () => {
  const csv = [
    'Invoice No.,Invoice Date,Customer Name,GSTIN/UIN,Taxable Value',
    'INV-1,15-03-2026,Some Customer,29AAACS1234F1Z5,50000',
  ].join('\n');
  const file = new File([csv], 'real_upload.csv', { type: 'text/csv' });
  const result = await parseGstFile(file, 'GSTR1', 'C1', '29');
  assert.equal(result.isSampleData, undefined);
});
test('export invoices derive exp_typ from actual IGST charged, and never fabricate shipping bill data', () => {
  const company = makeTestCompany();
  const zeroRatedExport: SalesInvoice = {
    id: '1', companyId: 'C1', invoiceNo: 'EXP-1', invoiceDate: '2026-06-10', customerName: 'Overseas Client',
    customerGstin: '', posState: 'Other Territory', posCode: '97', invoiceType: 'EXPORT',
    reverseCharge: 'N', hsnCode: '998315', description: 'Consulting', quantity: 1, uqc: 'NOS', rate: 0,
    taxableValue: 200000, igst: 0, cgst: 0, sgst: 0, cess: 0, monthYear: '2026-06', status: 'VALID',
  };
  const wpayExport: SalesInvoice = {
    ...zeroRatedExport, id: '2', invoiceNo: 'EXP-2', igst: 36000, rate: 18,
  };

  const file = generateGstr1Json(company, [zeroRatedExport, wpayExport], '2026-06');
  const payload = JSON.parse(file.fileContent);
  const zeroRated = payload.exp.find((e: any) => e.inv[0].inum === 'EXP-1');
  const withPayment = payload.exp.find((e: any) => e.inv[0].inum === 'EXP-2');

  // Regression: an export with zero IGST must be WOPAY; one with IGST charged must be WPAY —
  // never hardcoded to WOPAY regardless of actual tax charged.
  assert.equal(zeroRated.exp_typ, 'WOPAY');
  assert.equal(withPayment.exp_typ, 'WPAY');

  // Regression: shipping bill number/port must never be a fabricated-but-plausible value
  // (e.g. the same '12345'/'INBOM4' for every invoice) since that data isn't actually captured.
  assert.notEqual(zeroRated.inv[0].sbnum, 12345);
  assert.notEqual(zeroRated.inv[0].sbpcode, 'INBOM4');
});

test('a row with no customer/vendor name column is flagged WARNING, not silently marked VALID', async () => {
  const csv = [
    'Invoice No.,Invoice Date,GSTIN/UIN,Taxable Value',
    'INV-1,15-03-2026,29AAACS1234F1Z5,50000',
  ].join('\n');
  const file = new File([csv], 'no_name_column.csv', { type: 'text/csv' });
  const result = await parseGstFile(file, 'GSTR1', 'C1', '29');

  assert.equal(result.salesInvoices.length, 1);
  // Regression: this previously got a fabricated 'Enterprise Client / Vendor' name baked in
  // before the warning check ran, so it always looked VALID even with no real name found.
  assert.equal(result.salesInvoices[0].status, 'WARNING');
  assert.ok(result.salesInvoices[0].validationMessage?.includes('name'));
});

test('a GST-portal JSON supplier with no cname/tradeName/legalName is flagged WARNING', async () => {
  const jsonPayload = {
    b2b: [
      {
        ctin: '29AAACS1234F1Z5',
        // No cname/tradeName/legalName field at all.
        inv: [
          {
            inum: 'INV-1',
            idt: '15-03-2026',
            itms: [{ itm_det: { txval: 50000, rt: 18, iamt: 0, camt: 4500, samt: 4500 } }],
          },
        ],
      },
    ],
  };
  const file = new File([JSON.stringify(jsonPayload)], 'portal_export.json', { type: 'application/json' });
  const result = await parseGstFile(file, 'GSTR1', 'C1', '29');

  assert.equal(result.salesInvoices.length, 1);
  assert.equal(result.salesInvoices[0].status, 'WARNING');
  assert.ok(result.salesInvoices[0].validationMessage?.toLowerCase().includes('name'));
});

test('generateGstr3bSummary netTaxPayable matches the late-fee engine net cash liability (Rule 88A consistency)', () => {
  const company = makeTestCompany();
  const sales: SalesInvoice[] = [
    { id: '1', companyId: 'C1', invoiceNo: 'INV-1', invoiceDate: '2026-06-10', customerName: 'A',
      customerGstin: '33AAACA1234F1Z5', posState: 'Tamil Nadu', posCode: '33', invoiceType: 'B2B',
      reverseCharge: 'N', hsnCode: '998313', description: 'x', quantity: 1, uqc: 'NOS', rate: 18,
      // Inter-state sale -> IGST only, no CGST/SGST on the outward side.
      taxableValue: 100000, igst: 18000, cgst: 0, sgst: 0, cess: 0, monthYear: '2026-06', status: 'VALID' },
  ];
  const purchases: PurchaseInvoice[] = [
    { id: '1', companyId: 'C1', invoiceNo: 'PUR-1', invoiceDate: '2026-06-05', vendorName: 'B',
      vendorGstin: '29AAACB1234F1Z5', posState: 'Karnataka', hsnCode: '998313',
      // Intra-state purchase -> CGST/SGST credit, no IGST credit.
      taxableValue: 100000, igst: 0, cgst: 9000, sgst: 9000, cess: 0, itcEligible: 'Y',
      monthYear: '2026-06', status: 'VALID', reconciledWith2B: 'MATCHED' },
  ];

  const summary = generateGstr3bSummary(company, sales, purchases, '2026-06', '2026-07-15', '1.5CR_TO_5CR');
  const engine = (summary as any).lateFeeEngineDetails;

  // Regression: these two figures must always agree -- they appear together in the same
  // generated file and previously used two different (and disagreeing) calculations.
  assert.equal(summary.netTaxPayable.integratedTax, engine.netCashLiability.igst);
  assert.equal(summary.netTaxPayable.centralTax, engine.netCashLiability.cgst);
  assert.equal(summary.netTaxPayable.stateTax, engine.netCashLiability.sgst);

  // With CGST/SGST credit available but no matching CGST/SGST outward liability, and IGST
  // outward liability with no IGST credit, the correct Rule 88A answer is: IGST liability stays
  // at 18000 (CGST/SGST credit cannot offset IGST liability), CGST/SGST liability is 0 (no
  // outward CGST/SGST to offset in the first place).
  assert.equal(summary.netTaxPayable.integratedTax, 18000);
  assert.equal(summary.netTaxPayable.centralTax, 0);
  assert.equal(summary.netTaxPayable.stateTax, 0);
});

test('excess (unutilized) ITC is tracked and carried forward, not silently discarded when net liability floors at zero', () => {
  const company = makeTestCompany();
  // ITC-heavy scenario: large IGST purchase credit, small CGST/SGST output liability.
  const sales: SalesInvoice[] = [
    { id: '1', companyId: 'C1', invoiceNo: 'INV-1', invoiceDate: '2026-06-10', customerName: 'A',
      customerGstin: '29AAACA1234F1Z5', posState: 'Karnataka', posCode: '29', invoiceType: 'B2B',
      reverseCharge: 'N', hsnCode: '998313', description: 'x', quantity: 1, uqc: 'NOS', rate: 18,
      taxableValue: 55555.56, igst: 0, cgst: 5000, sgst: 5000, cess: 0, monthYear: '2026-06', status: 'VALID' },
  ];
  const purchases: PurchaseInvoice[] = [
    { id: '1', companyId: 'C1', invoiceNo: 'PUR-1', invoiceDate: '2026-06-05', vendorName: 'B',
      vendorGstin: '33AAACB1234F1Z5', posState: 'Tamil Nadu', hsnCode: '998313',
      taxableValue: 111111.11, igst: 20000, cgst: 0, sgst: 0, cess: 0, itcEligible: 'Y',
      monthYear: '2026-06', status: 'VALID', reconciledWith2B: 'MATCHED' },
  ];

  const engine = calculateGstLateFeeAndInterest(company, sales, purchases, '2026-06', '2026-07-20', '1.5CR_TO_5CR');
  // 20000 IGST credit offsets IGST(0), then CGST(5000), then SGST(5000) = 10000 consumed,
  // leaving 10000 unutilized IGST credit carried forward.
  assert.equal(engine.excessItcCarriedForward.igst, 10000);
  assert.equal(engine.excessItcCarriedForward.total, 10000);
  assert.equal(engine.netCashLiability.total, 0);

  const summary = generateGstr3bSummary(company, sales, purchases, '2026-06', '2026-07-20', '1.5CR_TO_5CR');
  assert.equal(summary.excessItcCarriedForward.total, 10000);

  const file = generateGstr3bExcel(company, sales, purchases, '2026-06', '2026-07-20', '1.5CR_TO_5CR');
  assert.ok(file.fileContent.includes('Excess ITC Carried Forward'));
});

test('generateGstr3bExcel actually renders the RCM and zero-rated rows into the downloadable file, not just the internal summary object', () => {
  const company = makeTestCompany();
  const rcmSale: SalesInvoice = {
    id: '1', companyId: 'C1', invoiceNo: 'INV-1', invoiceDate: '2026-06-10', customerName: 'A',
    customerGstin: '', posState: 'Karnataka', posCode: '29', invoiceType: 'B2CS',
    reverseCharge: 'N', hsnCode: '998313', description: 'x', quantity: 1, uqc: 'NOS', rate: 18,
    taxableValue: 50000, igst: 0, cgst: 4500, sgst: 4500, cess: 0, monthYear: '2026-06', status: 'VALID',
  };
  const rcmPurchase: PurchaseInvoice = {
    id: '1', companyId: 'C1', invoiceNo: 'PUR-RCM-1', invoiceDate: '2026-06-05', vendorName: 'Advocate X',
    vendorGstin: '', posState: 'Karnataka', hsnCode: '998213', taxableValue: 20000,
    igst: 0, cgst: 1800, sgst: 1800, cess: 0, itcEligible: 'Y', reverseCharge: 'Y',
    monthYear: '2026-06', status: 'VALID', reconciledWith2B: 'MATCHED',
  };

  const file = generateGstr3bExcel(company, [rcmSale], [rcmPurchase], '2026-06', '2026-07-20', '1.5CR_TO_5CR');
  assert.ok(file.fileContent.includes('(b) Outward taxable supplies (zero rated)'));
  assert.ok(file.fileContent.includes('(d) Inward supplies (liable to reverse charge)'));
  assert.ok(file.fileContent.includes('Reverse Charge (RCM) Cash Required'));
  assert.ok(file.fileContent.includes('1800')); // the RCM CGST amount should actually appear
});

test('zero-rated exports are disclosed separately (Table 3.1(b)), and WPAY export IGST still counts as real cash liability', () => {
  const company = makeTestCompany();
  const regularSale: SalesInvoice = {
    id: '1', companyId: 'C1', invoiceNo: 'INV-1', invoiceDate: '2026-06-10', customerName: 'Domestic Co',
    customerGstin: '29AAACA1234F1Z5', posState: 'Karnataka', posCode: '29', invoiceType: 'B2B',
    reverseCharge: 'N', hsnCode: '998313', description: 'x', quantity: 1, uqc: 'NOS', rate: 18,
    taxableValue: 100000, igst: 0, cgst: 9000, sgst: 9000, cess: 0, monthYear: '2026-06', status: 'VALID',
  };
  const wopayExport: SalesInvoice = {
    id: '2', companyId: 'C1', invoiceNo: 'EXP-1', invoiceDate: '2026-06-12', customerName: 'Overseas Client',
    customerGstin: '', posState: 'Other Territory', posCode: '97', invoiceType: 'EXPORT',
    reverseCharge: 'N', hsnCode: '998315', description: 'x', quantity: 1, uqc: 'NOS', rate: 0,
    taxableValue: 200000, igst: 0, cgst: 0, sgst: 0, cess: 0, monthYear: '2026-06', status: 'VALID',
  };
  const wpayExport: SalesInvoice = {
    id: '3', companyId: 'C1', invoiceNo: 'EXP-2', invoiceDate: '2026-06-14', customerName: 'Another Overseas Client',
    customerGstin: '', posState: 'Other Territory', posCode: '97', invoiceType: 'EXPORT',
    reverseCharge: 'N', hsnCode: '998315', description: 'x', quantity: 1, uqc: 'NOS', rate: 18,
    taxableValue: 50000, igst: 9000, cgst: 0, sgst: 0, cess: 0, monthYear: '2026-06', status: 'VALID',
  };

  const summary = generateGstr3bSummary(company, [regularSale, wopayExport, wpayExport], [], '2026-06', '2026-07-20', '1.5CR_TO_5CR');

  // Regression: export turnover (both WOPAY and WPAY) must not appear in Table 3.1(a)'s regular
  // domestic taxable value -- only the domestic sale's 100000 should be there.
  assert.equal(summary.table31_OutwardSupplies.a_taxableSupplies.totalTaxableValue, 100000);
  assert.equal(summary.table31_OutwardSupplies.a_taxableSupplies.integratedTax, 0);

  // Table 3.1(b) should show both exports' combined taxable value (200000 + 50000) and only the
  // WPAY export's actual IGST (9000; the WOPAY export correctly contributes 0).
  assert.equal(summary.table31_OutwardSupplies.b_zeroRatedSupplies.totalTaxableValue, 250000);
  assert.equal(summary.table31_OutwardSupplies.b_zeroRatedSupplies.integratedTax, 9000);

  // The WPAY export's real IGST liability (9000) must still flow into the actual net cash
  // liability -- only its disclosure row differs, not whether it's real money owed now.
  assert.equal(summary.netTaxPayable.integratedTax, 9000);
});

test('RCM (reverse charge) purchases are mandatory cash liability, correctly interacting with regular ITC set-off', () => {
  const company = makeTestCompany();
  const sales: SalesInvoice[] = [
    { id: '1', companyId: 'C1', invoiceNo: 'INV-1', invoiceDate: '2026-06-10', customerName: 'A',
      customerGstin: '29AAACA1234F1Z5', posState: 'Karnataka', posCode: '29', invoiceType: 'B2B',
      reverseCharge: 'N', hsnCode: '998313', description: 'x', quantity: 1, uqc: 'NOS', rate: 18,
      taxableValue: 100000, igst: 0, cgst: 9000, sgst: 9000, cess: 0, monthYear: '2026-06', status: 'VALID' },
  ];
  // Legal services from an advocate: RCM-liable, and eligible for ITC once the RCM tax is paid.
  const purchases: PurchaseInvoice[] = [
    { id: '1', companyId: 'C1', invoiceNo: 'PUR-RCM-1', invoiceDate: '2026-06-05', vendorName: 'Advocate X',
      vendorGstin: '', posState: 'Karnataka', hsnCode: '998213', taxableValue: 50000,
      igst: 0, cgst: 4500, sgst: 4500, cess: 0, itcEligible: 'Y', reverseCharge: 'Y',
      monthYear: '2026-06', status: 'VALID', reconciledWith2B: 'MATCHED' },
  ];

  const engine = calculateGstLateFeeAndInterest(company, sales, purchases, '2026-06', '2026-07-20', '1.5CR_TO_5CR');
  // RCM liability itself: always the full 4500+4500, regardless of ITC balance.
  assert.equal(engine.reverseChargeCashRequired.cgst, 4500);
  assert.equal(engine.reverseChargeCashRequired.sgst, 4500);
  assert.equal(engine.reverseChargeCashRequired.total, 9000);
  // Total cash needed: 9000 mandatory RCM cash, plus the regular 18000 liability reduced by the
  // 9000 of ITC that becomes available once the RCM tax itself is paid (9000 regular cash left).
  assert.equal(engine.netCashLiability.total, 18000);

  const summary = generateGstr3bSummary(company, sales, purchases, '2026-06', '2026-07-20', '1.5CR_TO_5CR');
  assert.equal(summary.table31_OutwardSupplies.d_inwardSuppliesRCM.centralTax, 4500);
  assert.equal(summary.rcmCashRequired, 9000);
  // The regular netTaxPayable (Rule 88A, excluding RCM) should show only 4500+4500 remaining
  // after the RCM-derived ITC offsets half of the regular 9000+9000 liability.
  assert.equal(summary.netTaxPayable.centralTax, 4500);
  assert.equal(summary.netTaxPayable.stateTax, 4500);
  assert.equal(summary.totalCashRequired, 18000);
});

test('reverse-charge sales are excluded from the supplier\'s own outward tax liability', () => {
  const company = makeTestCompany();
  const rcmSale: SalesInvoice = {
    id: '1', companyId: 'C1', invoiceNo: 'INV-1', invoiceDate: '2026-06-10', customerName: 'A',
    customerGstin: '29AAACA1234F1Z5', posState: 'Karnataka', posCode: '29', invoiceType: 'B2B',
    reverseCharge: 'Y', hsnCode: '996511', description: 'GTA freight', quantity: 1, uqc: 'NOS', rate: 5,
    taxableValue: 100000, igst: 0, cgst: 2500, sgst: 2500, cess: 0, monthYear: '2026-06', status: 'VALID',
  };
  const summary = generateGstr3bSummary(company, [rcmSale], [], '2026-06', '2026-07-20', '1.5CR_TO_5CR');
  // Regression: under RCM the recipient pays this tax directly, so the supplier's own outward
  // tax liability must not include it, even though the taxable value is still disclosed.
  assert.equal(summary.table31_OutwardSupplies.a_taxableSupplies.totalTaxableValue, 100000);
  assert.equal(summary.table31_OutwardSupplies.a_taxableSupplies.centralTax, 0);
  assert.equal(summary.table31_OutwardSupplies.a_taxableSupplies.stateTax, 0);
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
