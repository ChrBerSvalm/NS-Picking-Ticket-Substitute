/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/url'], function(url) {
function beforeLoad(context) {
    if (context.type === context.UserEventType.VIEW) {
        var soId = context.newRecord.getValue({ fieldId: 'custbody_spt_cb_createdfrom_so' });

        if (soId) {
            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_cb_sl_print_conn_so_doc',
                deploymentId: 'customdeploy_cb_sl_print_conn_so_doc',
                params: { soId: soId, irId: context.newRecord.id }
            });
            log.debug('Suitelet URL', suiteletUrl);

            context.form.addButton({
                id: 'custpage_print_connsodoc',
                label: 'Print Connected SO document',
                functionName: 'window.open("' + suiteletUrl + '", "_blank");'
            });
        }
        if (!soId) {
            return; // Exit if no Sales Order ID is found

        }
    }
}

    return {
        beforeLoad: beforeLoad
    };
});
