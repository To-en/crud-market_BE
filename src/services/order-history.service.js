import models from '../models/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Papa from 'papaparse';
import React from 'react';
import { Document, Page, View, Text, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = join(__dirname, '../assets/fonts');

// Register once at module load. Sarabun = Thai glyphs + correct shaping (built-in
// PDF fonts are Latin-only and render Thai as blanks).
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: join(FONT_DIR, 'THSarabunNew.ttf') },
    { src: join(FONT_DIR, 'THSarabunNew Bold.ttf'), fontWeight: 'bold' },
  ],
});

// Builds scoped where + include based on role. Pass orderId for single-item queries.
export function scopeQueryByClassroom(user, orderId = null) {
  const idClause = orderId ? { id: orderId } : {};
  if (user.role === 0) 
    return { where: { ...idClause, userId: user.id }, include: [] };
  if (user.role === 1) 
    return { where: idClause, 
            include: [{ model: models.User, attributes: ['username','class'], where: { class: user.class }, required: true }] };
  
  return { where: idClause, include: [{ model: models.User, attributes: ['username', 'class'], required: false }] };
}

// Build an invoice-style CSV: metadata block, line-item table (with per-line
// subtotal), then a total row. bill = { schoolName, invoiceNo, date, department, items[], total }
// items[i] = { name, qty, unit, price }
export async function exportOrderCSV(bill) {
  const rows = bill.items.map(i => ({
    name:     i.name,
    qty:      i.qty,
    unit:     i.unit,
    price:    i.price,
    subtotal: i.price * i.qty,
  }));

  const meta = Papa.unparse([
    ['School', bill.schoolName],
    ['Invoice', bill.invoiceNo],
    ['Date', bill.date],
    ['Department', bill.department],
  ]);
  const table = Papa.unparse(rows, {
    columns: ['name', 'qty', 'unit', 'price', 'subtotal'],
  });
  const totalRow = Papa.unparse([['', '', '', 'Total', bill.total]]);

  return `${meta}\n\n${table}\n${totalRow}`;
}

const h = React.createElement;

const styles = StyleSheet.create({
  page:    { fontFamily: 'Sarabun', fontSize: 12, padding: 32 },
  school:  { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  meta:    { marginBottom: 2, color: '#444' },
  table:   { marginTop: 16, borderTop: '1px solid #000' },
  row:     { flexDirection: 'row', borderBottom: '1px solid #ccc', paddingVertical: 4 },
  head:    { fontWeight: 'bold', borderBottom: '1px solid #000' },
  cName:   { flex: 3 },
  cNum:    { flex: 1, textAlign: 'right' },
  cUnit:   { flex: 1, textAlign: 'center' },
  total:   { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, fontWeight: 'bold' },
});

// bill = { schoolName, invoiceNo, date, department, items[], total }
// items[i] = { name, qty, unit, price }
function InvoiceDoc(bill) {
  const cell = (txt, style) => h(Text, { style }, String(txt));
  const headRow = h(View, { style: [styles.row, styles.head] },
    cell('Item', styles.cName), cell('Qty', styles.cNum),
    cell('Unit', styles.cUnit), cell('Price', styles.cNum), cell('Subtotal', styles.cNum));
  const itemRows = bill.items.map((i, idx) =>
    h(View, { style: styles.row, key: idx },
      cell(i.name, styles.cName), cell(i.qty, styles.cNum),
      cell(i.unit, styles.cUnit), cell(i.price, styles.cNum), cell(i.price * i.qty, styles.cNum)));

  return h(Document, null,
    h(Page, { size: 'A4', style: styles.page },
      cell(bill.schoolName, styles.school),
      cell(`Invoice: ${bill.invoiceNo}`, styles.meta),
      cell(`Date: ${bill.date}`, styles.meta),
      cell(`Department: ${bill.department}`, styles.meta),
      h(View, { style: styles.table }, headRow, ...itemRows),
      h(View, { style: styles.total }, cell(`Total: ${bill.total}`, {}))));
}

export async function exportPDF(bill) {
  return await renderToBuffer(InvoiceDoc(bill));
}
