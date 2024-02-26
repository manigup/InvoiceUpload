const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    this.before('CREATE', 'Invoice', async (req) => {

        req.data.Status = "HAP"; // hod approval pending

        const records = await cds.run(cds.parse.cql("Select ReferenceNo from db.invoiceupload.UploadInvoice"));

        if (records.length > 0) {
            const ref = records[records.length - 1].ReferenceNo.split("INV"),
                next = (parseInt(ref[1]) + 1).toString(),
                no = next.length === 1 ? "0" + next : next;
            req.data.ReferenceNo = "INV" + no;
        } else {
            req.data.ReferenceNo = "INV01";
        }
    });

    this.before("CREATE", 'Attachments', async (req) => {

        const reqData = req.data.Filename.split("/");

        req.data.ReferenceNo = reqData[0];
        req.data.Filename = reqData[1];
    });
});

