import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGstFile } from './gstParser';

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
    'GSTIN 09AACNC6502A1Z',
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
  assert.equal(result.salesInvoices[0].customerGstin, '09AACNC6502A1Z');
  assert.equal(result.salesInvoices[0].taxableValue, 105000);
  assert.equal(result.salesInvoices[0].cgst, 9450);
  assert.equal(result.salesInvoices[0].sgst, 9450);
});
