/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/log', 'N/format', 'N/record', 'N/query'], 
(ui, search, log, format, record, query) => {

  const PARAM_SO_ID = 'soId';

  const onRequest = (ctx) => {
    try {
      log.debug('onRequest START', `Method: ${ctx.request.method}`);
      if (ctx.request.method === 'GET') {
        const rawParams = ctx.request.parameters || {};
        const soId = rawParams.soId || '';
        log.debug('onRequest - Params', { soId, rawParams });
        
        let soNumber = soId ? loadSONumber(soId) || '' : '';
        let todayStr = '';

        try {
          todayStr = format.format({ value: new Date(), type: format.Type.DATE });
        } catch (e) {
          log.error('Format today date failed', e);
          todayStr = new Date().toISOString().slice(0, 10);
        }

        // Dynamic form title
        const form = ui.createForm({ 
          title: 'Sales Order Lines'
        });

        // Print button + client script
        form.addButton({ id: 'custpage_btn_print', label: 'Print', functionName: 'printPage' });
        form.clientScriptModulePath = 'SuiteScripts/cb_cs_print_conn_so_doc.js';

        // Info block
        form.addField({
          id: 'custpage_info',
          type: ui.FieldType.INLINEHTML,
          label: 'Info'
        }).defaultValue =
          '<div style="margin:8px 0;color:#555;">' +
          (soId ? 'Showing lines for Sales Order ID: ' + escapeHtml(soNumber || soId) + '</div>' : '') +
          '</div>';

        // Header data
        let headerData = { soNumber: '', customer: '', trandate: '', shipcomplete: false, custbody_cb_ship_earlier: false };

        if (soId) {
          const hdr = loadSalesOrderHeader(soId);
          if (hdr) headerData = hdr;

          const printHeaderHtml =
            '<div id="print-header">' +
              '<h1 style="margin:0 0 6px 0;font-size:16pt;">Connected Sales Order</h1>' +
              '<div class="meta" style="font-size:12pt;color:#222;line-height:1.45;">' +
                '<div><strong>Sales Order:</strong> ' + escapeHtml(headerData.soNumber) + '</div>' +
                '<div><strong>Customer:</strong> ' + escapeHtml(headerData.customer) + '</div>' +
                '<div><strong>Date:</strong> ' + escapeHtml(todayStr) + '</div>' +
                '<div><strong>Ship Complete:</strong> ' + (headerData.shipcomplete ? 'Yes' : 'No') + '</div>' +
                '<div><strong>Allowed to ship earlier:</strong> ' + (headerData.custbody_cb_ship_earlier ? 'Yes' : 'No') + '</div>' +
              '</div>' +
            '</div>';

          form.addField({ id: 'custpage_print_header', type: ui.FieldType.INLINEHTML, label: 'Print Header' })
              .defaultValue = printHeaderHtml;
        }

        // Print CSS
        const printCss =
          '<style>' +
          '@media print {' +
            '@page { size: A4 landscape; margin: 8mm; }' +
            '#body, .ns-child-component {' +
              'min-height: 0 !important;' +
              'height: auto !important;' +
              'max-height: none !important;' +
              'overflow: visible !important;' +
               /* Preserve \n as line breaks */
              '#custpage_lines td {white-space: pre-line !important;}' +
            '}' +
            'body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
            '#tbl_formbuttons, .uir-footer, .uir-navigation-panel, .uir-record-type,' +
            '.uir-page-title, .uir-page-buttons, .uir-control-buttons,' +
            '#custpage_btn_print, #custpage_btn_print_fs, #custpage_btn_print_row,' +
            '.uir-buttons-bottom, #div__footer,' +
            'input[type="button"], button,' +
            'div[style*="z-index: 20001"], .uir-popup, .uir-timeout,' +
            '#server_commands {' +
              'display:none!important;' +
            '}' +
            '#print-header { display:block!important; margin:0 0 6px 0; }' +
            '#custpage_lines_splits { width:100%!important; border-collapse:collapse!important; font-size:12pt!important; }' +
            '#custpage_lines_splits th, #custpage_lines_splits td { border:1px solid #ccc!important; padding:4px 6px!important; }' +
          '}' +
          '@media screen { #print-header { display:none; } }' +
          '</style>';

        form.addField({ id: 'custpage_print_css', type: ui.FieldType.INLINEHTML, label: 'Print CSS' })
            .defaultValue = printCss;

        // Sublist
        const sub = form.addSublist({ id: 'custpage_lines', type: ui.SublistType.LIST, label: 'Transaction Lines' });
        const fldOnIR = sub.addField({ id: 'custpage_onir', type: ui.FieldType.CHECKBOX, label: 'On This Transaction' });
        //fldOnIR.updateDisplayType({ displayType: ui.FieldDisplayType.DISABLED });
        sub.addField({ id: 'custpage_line_num', type: ui.FieldType.TEXT, label: 'Line #' });
        sub.addField({ id: 'custpage_item', type: ui.FieldType.TEXT, label: 'Item' });
        sub.addField({ id: 'custpage_displayname', type: ui.FieldType.TEXT, label: 'Display Name' });
        sub.addField({ id: 'custpage_qty', type: ui.FieldType.FLOAT, label: 'Quantity ordered' });
        sub.addField({ id: 'custpage_qty_committed', type: ui.FieldType.FLOAT, label: 'Quantity committed' });
        sub.addField({ id: 'custpage_qty_picked', type: ui.FieldType.FLOAT, label: 'Quantity picked' });
        sub.addField({ id: 'custpage_supplyreq', type: ui.FieldType.TEXT, label: 'Supply Required By Date' });
        sub.addField({ id: 'custpage_expectedship', type: ui.FieldType.TEXT, label: 'Expected Ship Date' });
        sub.addField({ id: 'custpage_confship', type: ui.FieldType.TEXT, label: 'Confirmed Ship Date' });
        sub.addField({ id: 'custpage_bins', type: ui.FieldType.TEXT, label: 'Bin(s)' });



        if (soId) {
          const lines = loadSalesOrderLines(soId);

          lines.forEach((ln, i) => {
            const isIRItem = false;
            sub.setSublistValue({ id: 'custpage_onir', line: i, value: isIRItem ? 'T' : 'F' });
            if (ln.lineNum) sub.setSublistValue({ id: 'custpage_line_num', line: i, value: String(ln.lineNum) });
            if (ln.itemText) sub.setSublistValue({ id: 'custpage_item', line: i, value: ln.itemText });
            if (ln.displayName) sub.setSublistValue({ id: 'custpage_displayname', line: i, value: ln.displayName });
            if (ln.qtyOrdered != null) sub.setSublistValue({ id: 'custpage_qty', line: i, value: String(ln.qtyOrdered) });
            if (ln.qtyCommitted != null) sub.setSublistValue({ id: 'custpage_qty_committed', line: i, value: String(ln.qtyCommitted) });
            if (ln.qtyPicked != null) sub.setSublistValue({ id: 'custpage_qty_picked', line: i, value: String(ln.qtyPicked) });
            if (ln.supplyReqText) sub.setSublistValue({ id: 'custpage_supplyreq', line: i, value: ln.supplyReqText });
            if (ln.expectedShipText) sub.setSublistValue({ id: 'custpage_expectedship', line: i, value: ln.expectedShipText });
            if (ln.confirmedShipText) sub.setSublistValue({ id: 'custpage_confship', line: i, value: ln.confirmedShipText });
            if (ln.bins) sub.setSublistValue({ id: 'custpage_bins', line: i, value: ln.bins });

          });
        }

        ctx.response.writePage(form);
      }
      log.debug('onRequest END', 'Suitelet execution completed');
    } catch (e) {
      log.error('Suitelet error', e);
      const form = ui.createForm({ title: 'Transaction Lines – Error' });
      form.addField({ id: 'custpage_err', type: ui.FieldType.INLINEHTML, label: 'Error' })
          .defaultValue = '<div style="color:#b00020;">' + escapeHtml(e.message || String(e)) + '</div>';
      ctx.response.writePage(form);
    }
  };

  // ===== Helpers =====

  function loadSalesOrderHeader(soId) {
    const res = search.create({
      type: 'salesorder',
      filters: [['internalid', 'anyof', soId], 'AND', ['mainline', 'is', 'T']],
      columns: ['tranid','entity','trandate','shipcomplete','custbody_cb_ship_earlier']
        .map(name => search.createColumn({ name }))
    }).run().getRange({ start: 0, end: 1 });

    if (!res || !res.length) return null;
    const r = res[0];
    return {
      soNumber: r.getValue('tranid') || '',
      customer: r.getText('entity') || '',
      trandate: r.getValue('trandate') || '',
      shipcomplete: asCheckbox(r.getValue('shipcomplete')),
      custbody_cb_ship_earlier: asCheckbox(r.getValue('custbody_cb_ship_earlier'))
    };
  }

function loadSalesOrderLines(soId) {
  const results = [];
  log.debug('loadSalesOrderLines', 'Starting SO line fetch for ' + soId);

  // First, get the SO location
  let soLocation = '';
  try {
    const locRes = search.create({
      type: 'salesorder',
      filters: [['internalid', 'anyof', soId], 'AND', ['mainline', 'is', 'T']],
      columns: [search.createColumn({ name: 'location' })]
    }).run().getRange({ start: 0, end: 1 });
    if (locRes && locRes.length) {
      soLocation = locRes[0].getValue('location');
    }
  } catch (e) {
    log.error('Failed to load SO location', e);
  }
  log.debug('SO location', soLocation);

  const soLineSearch = search.create({
    type: 'salesorder',
    filters: [
      ['internalid', 'anyof', soId],
      'AND', ['mainline', 'is', 'F'],
      'AND', ['taxline', 'is', 'F'],
      'AND', ['shipping', 'is', 'F'],
      'AND', ['cogs', 'is', 'F']
    ],
    columns: [
      'custcol_spt_cb_linenumber',
      'item',
      'quantity',
      'quantitycommitted',
      'quantitypicked',
      'requesteddate',
      'shipdate',
      'custcol_cb_confirmed_ship_date',
      search.createColumn({ name: 'displayname', join: 'item' }),
      search.createColumn({ name: 'type', join: 'item' })
    ]
  });

  const lineMap = {};
  let count = 0;

  soLineSearch.run().each(r => {
    count++;
    const lineNum = r.getValue('custcol_spt_cb_linenumber') || '';
    const itemId = r.getValue('item');
    const itemText = r.getText('item') || '';
    const itemType = r.getValue({ name: 'type', join: 'item' });

    log.debug('SO line base', { lineNum, itemText, itemType });

    const baseLine = {
      lineNum,
      itemId,
      itemText,
      displayName: r.getValue({ name: 'displayname', join: 'item' }) || '',
      qtyOrdered: Number(r.getValue('quantity')) || 0,
      qtyCommitted: toNumberOrNull(r.getValue('quantitycommitted')),
      qtyPicked: toNumberOrNull(r.getValue('quantitypicked')),
      supplyReqText: r.getValue('requesteddate') || '',
      expectedShipText: r.getValue('shipdate') || '',
      confirmedShipText: r.getValue('custcol_cb_confirmed_ship_date') || '',
      binList: []
    };

// Fallback: search for bins for this item at the SO location
// Use SuiteQL to find bins for this item and location
if (itemId && soLocation) {
  try {
    const sql = `
      SELECT
        bn.binnumber AS binname,
        invbalance.quantityavailable AS qty
      FROM
        inventorybalance invbalance
      INNER JOIN bin bn ON bn.id = invbalance.binnumber
      WHERE
        invbalance.item = ?
        AND invbalance.location = ?
        AND invbalance.quantityavailable > 0
      ORDER BY bn.binnumber
    `;

    const params = [itemId, soLocation];
    const queryResult = query.runSuiteQL({ query: sql, params });
    const rows = queryResult.asMappedResults() || [];

    const binNames = rows.map(r =>
      `${r.binname}${r.qty ? ' (' + r.qty + ')' : ''}`
    );

    if (binNames.length) {
      baseLine.binList = binNames;
    }

    log.debug('SuiteQL bin lookup', {
      itemText,
      itemId,
      location: soLocation,
      binsFound: binNames
    });
  } catch (e) {
    log.error('SuiteQL bin lookup failed', { itemId, error: e });
  }
}



    lineMap[lineNum] = baseLine;
    return true;
  });

  log.debug('loadSalesOrderLines summary', { totalLinesFetched: count });

  // Finalize results
  Object.values(lineMap).forEach(l => {
    const binStr = l.binList.join('\n');
    results.push({
      lineNum: l.lineNum,
      itemId: l.itemId,
      itemText: l.itemText,
      displayName: l.displayName,
      qtyOrdered: l.qtyOrdered,
      qtyCommitted: l.qtyCommitted,
      qtyPicked: l.qtyPicked,
      supplyReqText: l.supplyReqText,
      expectedShipText: l.expectedShipText,
      confirmedShipText: l.confirmedShipText,
      bins: binStr
    });
  });

  log.debug('loadSalesOrderLines', 'Returning ' + results.length + ' results');
  return results;
}




function getKitMembers(kitItemId) {
  log.debug('Loading kit item record', { kitItemId });

  let kitRec;
  try {
    kitRec = record.load({
      type: record.Type.KIT_ITEM,
      id: kitItemId
    });
  } catch (e) {
    log.error('Record load failed - maybe wrong record type?', { kitItemId, error: e });
    return [];
  }

  const memberCount = kitRec.getLineCount({ sublistId: 'member' });
  log.debug('Kit member count', { kitItemId, memberCount });

  const members = [];
  for (let i = 0; i < memberCount; i++) {
    const memberId = kitRec.getSublistValue({ sublistId: 'member', fieldId: 'item', line: i });
    const memberText = kitRec.getSublistText({ sublistId: 'member', fieldId: 'item', line: i });
    const memberQty = Number(kitRec.getSublistValue({ sublistId: 'member', fieldId: 'quantity', line: i })) || 1;

    members.push({ memberId, memberText, memberQty });
    log.debug('Kit member found', { line: i, memberId, memberText, memberQty });
  }

  return members;
}

  function loadSONumber(soId) {
    try {
      const res = search.create({
        type: 'salesorder',
        filters: [['internalid', 'anyof', soId], 'AND', ['mainline', 'is', 'T']],
        columns: [ search.createColumn({ name: 'tranid' }) ]
      }).run().getRange({ start: 0, end: 1 });
      return (res && res.length) ? res[0].getValue('tranid') || '' : '';
    } catch (e) {
      log.error('loadSONumber error', e);
      return '';
    }
  }

  function toNumberOrNull(v) { return (v == null || v === '' || isNaN(Number(v))) ? null : Number(v); }
  function escapeHtml(s) { return !s ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function asCheckbox(val) { return val === true || val === 'T' || val === 'true' || val === 'Y' || val === '1' || val === 1; }

  return { onRequest };
});
