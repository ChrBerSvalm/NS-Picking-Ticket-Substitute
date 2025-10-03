/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([], () => {
  // Required entry point to satisfy 2.1
  function pageInit(_context) {}

  // Helper: find the index of a column by its header text
  function findColumnIndexByHeader(table, headerText) {
    try {
      const ths = table.querySelectorAll('thead tr th');
      for (let i = 0; i < ths.length; i++) {
        if (ths[i].innerText.trim().toLowerCase() === headerText.toLowerCase()) return i;
      }
    } catch (_) {}
    return -1;
  }

  // Helper: decide if a "checkbox" cell is checked in the rendered table
  function cellIsChecked(cell) {
    const t = (cell.innerText || '').trim().toUpperCase();
    if (t === 'T' || t === 'Y' || t === 'YES' || t === 'TRUE' || t === '✔') return true;
    // Sometimes NetSuite renders images for checkboxes:
    const img = cell.querySelector('img');
    if (img && /check/i.test(img.alt || '') && !/uncheck/i.test(img.alt || '')) return true;
    // Sometimes it renders a disabled <input type="checkbox">
    const cb = cell.querySelector('input[type="checkbox"]');
    if (cb && cb.checked) return true;
    return false;
  }

  function markIRRows() {
    const tbl = document.getElementById('custpage_lines_splits');
    if (!tbl) return { marked: 0 };

    // Your first column is "On This Receipt"
    let onIrIdx = findColumnIndexByHeader(tbl, 'On This Receipt');
    if (onIrIdx < 0) onIrIdx = 0; // fallback if headers are hidden

    let marked = 0;
    const rows = tbl.querySelectorAll('tbody tr');
    rows.forEach((tr) => {
      const cells = tr.querySelectorAll('td');
      if (!cells.length || onIrIdx >= cells.length) return;
      const isChecked = cellIsChecked(cells[onIrIdx]);
      if (isChecked) {
        tr.classList.add('on-ir'); // CSS makes it bold & shaded in print
        marked++;
      }
    });
    return { marked };
  }

  function unmarkIRRows() {
    const tbl = document.getElementById('custpage_lines_splits');
    if (!tbl) return;
    tbl.querySelectorAll('tbody tr.on-ir').forEach((tr) => tr.classList.remove('on-ir'));
  }

  // Called by the Suitelet button
  function printPage() {
    try {
      // Add highlight classes before printing
      const { marked } = markIRRows();
      // console.log('Marked rows:', marked);

      window.focus();
      window.print();

      // Clean up after printing (some browsers trigger after a delay)
      setTimeout(unmarkIRRows, 250);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert('Unable to print: ' + (e && e.message ? e.message : e));
    }
  }

  return { pageInit, printPage };
});
