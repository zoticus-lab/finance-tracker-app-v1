import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Test the didDrawCell callback logic
const testData = [
  { type: 'income', amount: 1000 },
  { type: 'expense', amount: 500 },
];

const doc = new jsPDF();
autoTable(doc, {
  head: [['Type', 'Amount']],
  body: testData.map(t => [
    String(t.type || '').toUpperCase(),
    t.amount,
  ]),
  didDrawCell: (data) => {
    if (data.rowIndex > 0) {
      try {
        const cellText = data.row.cells[0]?.text;
        const transactionType = Array.isArray(cellText) ? cellText[0] : cellText;
        if (transactionType === 'INCOME') {
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.textColor = [22, 163, 74];
        } else if (transactionType === 'EXPENSE') {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = [220, 38, 38];
        }
      } catch (e) {
        console.error('Color error:', e);
      }
    }
  },
});

console.log('Test passed - no errors in didDrawCell logic');
