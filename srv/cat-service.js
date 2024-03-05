const cds = require('@sap/cds');
const axios = require('axios').default;
const FormData = require('form-data');

const sdmCredentials = {
    "clientid": "sb-af5ed0ac-6872-41a0-956e-ec2fea18c139!b26649|sdm-di-DocumentManagement-sdm_integration!b247",
    "clientsecret": "vORif9806WxSm8azpmw6Fuj99Ro=",
    "url": "https://impautosuppdev.authentication.ap10.hana.ondemand.com",
    "ecmserviceurl": "https://api-sdm-di.cfapps.ap10.hana.ondemand.com/",
    "repositoryId": "Inv_Submission"
}

module.exports = cds.service.impl(async function () {

    this.before('READ', 'Invoice', async (req) => {

        const userID = req.user.id;

        req.query.where(`createdBy = '${userID}' or HodApprover  = '${userID}' or FinanceApprover  = '${userID}' `);

    });

    this.before('CREATE', 'Invoice', async (req) => {

        const records = await cds.run(cds.parse.cql("Select InvoiceNumber,ReferenceNo from db.invoiceupload.UploadInvoice")),
            duplicate = records.filter(item => item.InvoiceNumber === req.data.InvoiceNumber);

        if (duplicate.length > 0) {
            req.reject(400, 'Duplicate invoice number');
        }

        if (records.length > 0) {
            const ref = records[records.length - 1].ReferenceNo.split("INV"),
                next = (parseInt(ref[1]) + 1).toString(),
                no = next.length === 1 ? "0" + next : next;
            req.data.ReferenceNo = "INV" + no;
        } else {
            req.data.ReferenceNo = "INV01";
        }

        req.data.Status = "HAP"; // hod approval pending

        const connJwtToken = await _fetchJwtToken(sdmCredentials.url, sdmCredentials.clientid, sdmCredentials.clientsecret);

        // Creating dms folder
        await _createFolder(sdmCredentials.ecmserviceurl, connJwtToken, sdmCredentials.repositoryId, req.data.InvoiceNumber);
    });

    this.before('UPDATE', 'Invoice', async (req) => {

        if (req.data.Status === "RBH" || req.data.Status === "RBF") {
            req.data.Status = "HAP"
        }

    });

    this.before("CREATE", 'Attachments', async (req) => {

        const reqData = req.data.Filename.split("/");

        const connJwtToken = await _fetchJwtToken(sdmCredentials.url, sdmCredentials.clientid, sdmCredentials.clientsecret);

        req.data.ObjectId = await _uploadAttachment(sdmCredentials.ecmserviceurl, connJwtToken, sdmCredentials.repositoryId, reqData[0], reqData[1]);

        req.data.ReferenceNo = reqData[0];
        req.data.Filename = reqData[1];
    });

    this.on('sendEmail', async (req) => {
        const { subject, content, toAddress, ccAddress } = req.data;

        const payload = {
            Subject: subject,
            Content: `Dear ${toAddress.split("@")[0]}, ${content} | | Regards | ImperialAuto`,
            Seperator: "|",
            ToAddress: toAddress,
            CCAddress: ccAddress,
            BCCAddress: "",
            CreatedBy: "Manikandan"
        };
        try {
            await axios.post('https://imperialauto.co:84/IAIAPI.asmx/SendMail', payload, {
                headers: {
                    'Authorization': 'Bearer IncMpsaotdlKHYyyfGiVDg==',
                    'Content-Type': 'application/json'
                }
            });
            return `Email sent successfully.`;
        } catch (error) {
            console.error('Error:', error);
        }
    });
});


const _fetchJwtToken = async function (oauthUrl, oauthClient, oauthSecret) {

    return new Promise((resolve, reject) => {
        const tokenUrl = oauthUrl + '/oauth/token?grant_type=client_credentials&response_type=token'
        const config = {
            headers: {
                Authorization: "Basic " + Buffer.from(oauthClient + ':' + oauthSecret).toString("base64")
            }
        }
        axios.get(tokenUrl, config)
            .then(response => {
                resolve(response.data.access_token)
            })
            .catch(error => {
                reject(error)
            })
    })
}

// create a new folder for every invoice upload & add their respective attachments in that folder
const _createFolder = async function (sdmUrl, jwtToken, repositoryId, folderName) {
    return new Promise((resolve, reject) => {
        const folderCreateURL = sdmUrl + "browser/" + repositoryId + "/root";

        const formData = new FormData();
        formData.append("cmisaction", "createFolder");
        formData.append("propertyId[0]", "cmis:name");
        formData.append("propertyValue[0]", folderName);
        formData.append("propertyId[1]", "cmis:objectTypeId");
        formData.append("propertyValue[1]", "cmis:folder");
        formData.append("succinct", 'true');

        let headers = formData.getHeaders();
        headers["Authorization"] = "Bearer " + jwtToken;

        const config = {
            headers: headers
        }

        axios.post(folderCreateURL, formData, config)
            .then(response => {
                resolve(response.data.succinctProperties["cmis:objectId"])
            })
            .catch(error => {
                reject(error)
            })
    })
}

const _uploadAttachment = async function (sdmUrl, jwtToken, repositoryId, folderName, fileName) {
    return new Promise((resolve, reject) => {
        const url = sdmUrl + "browser/" + repositoryId + "/root/" + folderName;

        const formData = new FormData();
        formData.append("cmisaction", "createDocument");
        formData.append("propertyId[0]", "cmis:name");
        formData.append("propertyValue[0]", fileName);
        formData.append("propertyId[1]", "cmis:objectTypeId");
        formData.append("propertyValue[1]", "cmis:document");
        formData.append("succinct", 'true');
        formData.append("filename", fileName);
        formData.append("media", 'binary');

        let headers = formData.getHeaders();
        headers["Authorization"] = "Bearer " + jwtToken;

        const config = {
            headers: headers
        }

        axios.post(url, formData, config)
            .then(response => {
                resolve(response.data.succinctProperties["cmis:objectId"])
            })
            .catch(error => {
                reject(error)
            })
    })
}

