import models from '../models/index.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// import puppeteer from 'puppeteer';
import Papa from 'papaparse';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

export async function exportOrderCSV(data) {
  return Papa.unparse(data);
}

// export async function exportPDF(data) {
//   const html = renderTemplate(data);
//   return await generatePDF(html);
// }

// async function generatePDF(html) {
//   const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
//   const page = await browser.newPage();
//   await page.setContent(html, { waitUntil: 'networkidle0' });
//   const pdf = await page.pdf({ format: 'A4', printBackground: true });
//   await browser.close();
//   return pdf;
// }

// function renderTemplate(data) {
//   let html = fs.readFileSync(join(__dirname, 'invoiceTemplate.html'), 'utf-8');

//   const rows = data.items.map((item, i) => `
//     <tr>
//       <td>${i + 1}</td>
//       <td>${item.name}</td>
//       <td>${item.qty}</td>
//       <td>${item.unit}</td>
//       <td>${item.price}</td>
//       <td>${item.qty * item.price}</td>
//     </tr>
//   `).join('');

//   return html
//     .replace('{{schoolName}}', data.schoolName)
//     .replace('{{invoiceNo}}', data.invoiceNo)
//     .replace('{{date}}', data.date)
//     .replace('{{department}}', data.department)
//     .replace('{{rows}}', rows)
//     .replace('{{total}}', data.total);
// }
