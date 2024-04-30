const cds = require('@sap/cds');
const axios = require('axios').default;
const FormData = require('form-data');

const ecmserviceurl = "https://api-sdm-di.cfapps.ap10.hana.ondemand.com/";
const devSdm = {
    "clientid": "sb-af5ed0ac-6872-41a0-956e-ec2fea18c139!b26649|sdm-di-DocumentManagement-sdm_integration!b247",
    "clientsecret": "vORif9806WxSm8azpmw6Fuj99Ro=",
    "url": "https://impautosuppdev.authentication.ap10.hana.ondemand.com",
    "repositoryId": "Inv_Submission"
}, prdSdm = {
    "clientid": "sb-75d68fc2-fdc0-4ee1-ac19-572a35f46864!b36774|sdm-di-DocumentManagement-sdm_integration!b247",
    "clientsecret": "5LcakzQRIAEeMZpjCSUPd6NhKRE=",
    "url": "https://supplier-portal.authentication.ap10.hana.ondemand.com",
    "repositoryId": "ZDMS_SUPP"
};

module.exports = cds.service.impl(async function () {

    this.before('READ', 'Invoice', async (req) => {
        let userID = req.user.id;

        if (userID === "anonymous") {
            userID = "samarnahak@kpmg.com";
        }

        const records = await cds.run(cds.parse.cql("Select * from db.invoiceupload.UploadInvoice")),
            finRecord = await cds.run(cds.parse.cql("Select FinEmail from db.invoiceupload.FinanceMaster"));

        if (records.findIndex(item => item.Status === "HAP" && item.HodApprover === userID) !== -1 &&
            records.findIndex(item => item.Status === "ABH") !== -1 && finRecord.findIndex(item => item.FinEmail === userID) !== -1) {
            // user is both HOD & Finance
            req.query.where(`HodApprover = '${userID}' and (Status = 'HAP' or Status = 'ABH')`);
        } else if (records.findIndex(item => item.Status === "HAP" && item.HodApprover === userID) !== -1) {
            // user is HOD
            req.query.where(`HodApprover = '${userID}' and Status = 'HAP'`);
        } else if (records.findIndex(item => item.Status === "ABH") !== -1 && finRecord.findIndex(item => item.FinEmail === userID) !== -1) {
            // user is finance
            req.query.where(`Status = 'ABH'`);
        } else if (req.headers.logintype === "P") {
            req.query.where(`createdBy = '${userID}'`);
        } else {
            req.reject(404, "No data available");
        }
    });

    this.before('UPDATE', 'Invoice', async (req) => {

        if (req.data.Status === "ABF") {
            req.data.FinanceApprover = req.user.id;
            // req.data.FinApproverName = JSON.stringify(req.user.attr.firstname);
        }
        if (req.data.Status !== "HAP") {
            req.data.ApprovedAt = new Date();
        }
    });

    this.before('CREATE', 'Invoice', async (req) => {

        if (req.user.id === "anonymous") {
            req.user.id = "samarnahak@kpmg.com";
        }

        const records = await cds.run(cds.parse.cql("Select InvoiceNumber from db.invoiceupload.UploadInvoice")),
            duplicate = records.filter(item => item.InvoiceNumber === req.data.InvoiceNumber);

        if (duplicate.length > 0) {
            req.reject(400, 'Duplicate invoice number');
        }

        // if (records.length > 0) {
        //     const ref = records[records.length - 1].ReferenceNo.split("INV"),
        //         next = (parseInt(ref[1]) + 1).toString(),
        //         no = next.length === 1 ? "0" + next : next;
        //     req.data.ReferenceNo = "INV" + no;
        // } else {
        //     req.data.ReferenceNo = "INV01";
        // }

        req.data.Status = "HAP"; // hod approval pending
        req.data.Id = Math.random().toString().substr(2, 6);

        let connJwtToken;
        if (req.headers.origin.includes("port") || req.headers.origin.includes("impautosuppdev")) {
            connJwtToken = await _fetchJwtToken(devSdm.url, devSdm.clientid, devSdm.clientsecret);

            // Creating dms folder
            await _createFolder(ecmserviceurl, connJwtToken, devSdm.repositoryId, req.data.Id);
        } else {

            connJwtToken = await _fetchJwtToken(prdSdm.url, prdSdm.clientid, prdSdm.clientsecret);

            // Creating dms folder
            await _createFolder(ecmserviceurl, connJwtToken, prdSdm.repositoryId, req.data.Id);
        }
    });

    this.before("CREATE", 'Attachments', async (req) => {

        const reqData = req.data.Filename.split("/");

        let connJwtToken;
        if (req.headers.origin.includes("port") || req.headers.origin.includes("impautosuppdev")) {
            
            connJwtToken = await _fetchJwtToken(devSdm.url, devSdm.clientid, devSdm.clientsecret);

            req.data.ObjectId = await _uploadAttachment(ecmserviceurl, connJwtToken, devSdm.repositoryId, reqData[0], reqData[1]);

        } else {

            connJwtToken = await _fetchJwtToken(prdSdm.url, prdSdm.clientid, prdSdm.clientsecret);

            req.data.ObjectId = await _uploadAttachment(ecmserviceurl, connJwtToken, prdSdm.repositoryId, reqData[0], reqData[1]);
        }

        if (req.user.id === "anonymous") {
            req.user.id = "samarnahak@kpmg.com";
        }
        req.data.Id = reqData[0];
        req.data.Filename = reqData[1];
    });

    this.on('sendEmail', async (req) => {
        const { content, toAddress } = req.data;

        const payload = {
            Subject: "Invoice Submission Without PO/Schedule",
            Content: `Dear ${toAddress.split("@")[0]}, ${content} | | Regards | ImperialAuto`,
            Seperator: "|",
            ToAddress: toAddress,
            CCAddress: "",
            BCCAddress: "",
            CreatedBy: req.headers.loginid
        };
        try {
            const token = await generateToken(req.headers.loginid),
                legApi = await cds.connect.to('Legacy'),
                response = await legApi.send({
                    query: `POST SendMail`,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    data: payload
                });
            if (response.ErrorCode) {
                return "Error sending email";
            } else {
                return "Email sent successfully";
            }
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

async function generateToken(username) {
    try {
        const legApi = await cds.connect.to('Legacy'),
            response = await legApi.send({
                query: `POST GenerateToken`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    "InputKey": username
                }
            });

        if (response.d) {
            return response.d;
        } else {
            console.error('Error parsing token response:', response.data);
            throw new Error('Error parsing the token response from the API.');
        }
    } catch (error) {
        console.error('Error generating token:', error);
        throw new Error('Unable to generate token.');
    }
}

