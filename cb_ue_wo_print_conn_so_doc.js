/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/url'], function (url) {
  function beforeLoad(context) {
    if (context.type !== context.UserEventType.VIEW) return;

    var rec = context.newRecord;
    // Prefer a true internalid field; fall back to your custom link if needed
    var soId = rec.getValue({ fieldId: 'createdfrom' }) ||
               rec.getValue({ fieldId: 'custbody_spt_cb_createdfrom_so' });

    if (!soId) return;

    var suiteletUrl = url.resolveScript({
      scriptId: 'customscript_cb_sl_print_conn_so_doc',
      deploymentId: 'customdeploy_cb_sl_print_conn_so_doc',
      params: { soId: soId, irId: rec.id }
    });

    context.form.addButton({
      id: 'custpage_print_connsodoc',
      label: 'Print Connected SO document',
      functionName: 'window.open("' + suiteletUrl + '","_blank");'
    });
  }
  return { beforeLoad: beforeLoad };
});
