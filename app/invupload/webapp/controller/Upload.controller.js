sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/StandardListItem",
    "sap/ui/model/Filter",
    "sap/m/MessageBox"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, BusyIndicator, StandardListItem, Filter, MessageBox) {
        "use strict";

        return Controller.extend("sap.fiori.invupload.controller.Upload", {

            onInit: function () {
                this.tblTemp = this.byId("uploadTblTemp").clone();
                this.getView().setModel(new JSONModel({}), "DataModel");
                this.getView().setModel(new JSONModel({}), "EditModel");
                this.getView().setModel(new JSONModel({}), "DecisionModel");
                this.getView().setModel(new JSONModel([]), "AttachmentModel");
            },

            onAfterRendering: function () {
                this.getData();
            },

            getData: function () {
                this.byId("uploadTbl").bindAggregation("items", {
                    path: "/Invoice",
                    template: this.tblTemp
                });
            },

            onAddPress: function () {
                const createFrag = sap.ui.xmlfragment("sap.fiori.invupload.fragment.Create", this);
                this.getView().addDependent(createFrag);
                sap.ui.getCore().byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl + "/Attachments");
                createFrag.open();
            },

            onReferenceNoPress: function (evt) {
                const obj = evt.getSource().getBindingContext().getObject();
                const frag = sap.ui.xmlfragment("sap.fiori.invupload.fragment.Edit", this);
                this.getView().addDependent(frag);
                this.getView().getModel("EditModel").setData(obj);
                this.getView().getModel("EditModel").refresh(true);
                this.refNo = obj.ReferenceNo;
                this.getAttachments();
                sap.ui.getCore().byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl + "/Attachments");
                frag.open();
            },

            getAttachments: function () {
                this.getView().getModel().read("/Attachments", {
                    filters: [new Filter("ReferenceNo", "EQ", this.refNo)],
                    success: data => {
                        this.getView().getModel("AttachmentModel").setData(data.results);
                        this.getView().getModel("AttachmentModel").refresh(true);
                        BusyIndicator.hide();
                    },
                    error: () => BusyIndicator.hide()
                });
            },

            onCreatePress: function (evt) {
                this.dialogSource = evt.getSource();
                if (this.validateReqFields(["invDate", "invNo", "invAmmount", "gst", "costCenter", "reason", "hod"]) && sap.ui.getCore().byId("attachment").getIncompleteItems().length > 0) {
                    BusyIndicator.show();
                    const payload = this.getView().getModel("DataModel").getData();
                    setTimeout(() => {
                        this.getView().getModel().create("/Invoice", payload, {
                            success: (sData) => {
                                this.toAddress = sData.HodApprover;
                                this.ccAddress = sData.createdBy;
                                this.refNo = sData.ReferenceNo;
                                this.doAttachment();
                            },
                            error: () => BusyIndicator.hide()
                        });
                    }, 500);
                } else {
                    MessageBox.error("Please fill all required inputs to proceed");
                }
            },

            onEditPress: function (evt) {
                this.dialogSource = evt.getSource();
                if (this.validateReqFields(["invDate", "invNo", "invAmmount", "gst", "costCenter", "reason", "hod"])) {
                    BusyIndicator.show();
                    const payload = this.getView().getModel("EditModel").getData();
                    setTimeout(() => {
                        this.getView().getModel().update("/Invoice('" + this.refNo + "')", payload, {
                            success: sData => {
                                BusyIndicator.hide();
                                MessageBox.success("Invoice " + sData.ReferenceNo + " updated successfully", {
                                    onClose: () => {
                                        this.dialogSource.getParent().destroy();
                                        this.getData();
                                    }
                                });
                            },
                            error: () => BusyIndicator.hide()
                        });
                    }, 500);
                } else {
                    MessageBox.error("Please fill all required inputs to proceed");
                }
            },

            onActionChange: function (evt) {
                const source = evt.getSource(),
                    obj = source.getBindingContext().getObject(),
                    selectedAction = source.getSelectedKey();
                MessageBox.confirm("Are you sure ?", {
                    onClose: (action) => {
                        if (action === "YES") {
                            this.refNo = obj.ReferenceNo;
                            this.getView().getModel("DecisionModel").setData({ Action: selectedAction });
                            this.payload = {};
                            if (obj.Status === "HAP" && selectedAction === "A") {
                                this.payload.Status = "ABH"; // Approved by HOD & Pending with Finance
                                this.openHodFrag();
                            } else if (obj.Status === "HAP" && selectedAction === "R") {
                                this.payload.Status = "RBH"; // Rejected by HOD
                                this.openHodFrag();
                            } else if (obj.Status === "ABH" && selectedAction === "A") {
                                this.payload.Status = "ABF"; // Approved by Finance
                                this.openFinFrag();
                            } else {
                                this.payload.Status = "RBF"; // Rejected by Finance
                                this.openFinFrag();
                            }
                        }
                    },
                    actions: ["YES", "NO"],
                });
            },

            openHodFrag: function () {
                const remarksFrag = sap.ui.xmlfragment("sap.fiori.invupload.fragment.HodRemarks", this);
                this.getView().addDependent(remarksFrag);
                remarksFrag.open();
            },

            openFinFrag: function () {
                const finFrag = sap.ui.xmlfragment("sap.fiori.invupload.fragment.FinAction", this);
                this.getView().addDependent(finFrag);
                finFrag.open();
            },

            onHodSubmit: function (evt) {
                this.dialogSource = evt.getSource();
                const data = this.getView().getModel("DecisionModel").getData(),
                    reqFields = data.Action === "A" ? ["finance", "remarks"] : ["remarks"];
                if (this.validateReqFields(reqFields)) {
                    this.payload.HodRemarks = data.HodRemarks;
                    this.payload.FinanceApprover = data.FinanceApprover;
                    this.takeAction();
                } else {
                    MessageBox.error("Please fill all required inputs to proceed");
                }
            },

            onFinSubmit: function (evt) {
                this.dialogSource = evt.getSource();
                const data = this.getView().getModel("DecisionModel").getData(),
                    reqFields = data.Action === "A" ? ["postingDate", "accNo", "remarks"] : ["remarks"];
                if (this.validateReqFields(reqFields)) {
                    this.payload.PostingDate = data.PostingDate;
                    this.payload.AccountingNumber = data.AccountingNumber;
                    this.payload.FinRemarks = data.FinRemarks;
                    this.takeAction();
                } else {
                    MessageBox.error("Please fill all required inputs to proceed");
                }
            },

            takeAction: function () {
                setTimeout(() => {
                    this.getView().getModel().update("/Invoice('" + this.refNo + "')", this.payload, {
                        success: () => {
                            BusyIndicator.hide();
                            MessageBox.success("Action taken successfully", {
                                onClose: () => {
                                    this.dialogSource.getParent().destroy();
                                    this.getData();
                                }
                            });
                        },
                        error: () => BusyIndicator.hide()
                    });
                }, 500);
            },

            validateReqFields: function (fields) {
                let check = [], control;
                fields.forEach(inp => {
                    control = sap.ui.getCore().byId(inp);
                    if (control.getValue() === "") {
                        control.setValueState("Error").setValueStateText("Required");
                        check.push(false);
                    } else {
                        control.setValueState("None");
                        check.push(true);
                    }
                });
                if (check.every(item => item === true)) return true;
                else return false;
            },

            doAttachment: function () {
                this.items = sap.ui.getCore().byId("attachment").getIncompleteItems();
                sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);
                this.items.splice(0, 1);
            },

            onAttachItemAdd: function (evt) {
                evt.getParameter("item").setVisibleEdit(false).setVisibleRemove(false);
            },

            onBeforeUploadStarts: function (evt) {
                evt.getParameter("item").addHeaderField(new sap.ui.core.Item({
                    key: "slug",
                    text: this.refNo + "/" + evt.getParameter("item").getFileName()
                }));
            },

            onUploadComplete: function () {
                if (sap.ui.getCore().byId("attachment").getIncompleteItems().length === 0) {
                    BusyIndicator.hide();
                    MessageBox.success("Invoice uploaded successfully", {
                        onClose: () => {
                            const content = "New invoice " + this.refNo + " uploaded.";
                            this.sendEmailNotification(content);
                            this.getView().getModel("DataModel").setData({});
                            this.dialogSource.getParent().destroy();
                            this.getData();
                        }
                    });
                } else {
                    sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);
                    this.items.splice(0, 1);
                }
            },

            onAttachmentUploadComplete: function () {
                if (sap.ui.getCore().byId("attachment").getIncompleteItems().length > 0) {
                    sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);
                    this.items.splice(0, 1);
                }
            },

            onAttachmentPress: function (evt) {
                BusyIndicator.show();
                const source = evt.getSource(),
                    refNo = source.getBindingContext().getProperty("ReferenceNo");
                setTimeout(() => {
                    this.getView().getModel().read("/Attachments", {
                        filters: [new Filter("ReferenceNo", "EQ", refNo)],
                        success: (data) => {
                            data.results.map(item => item.Url = this.getView().getModel().sServiceUrl + "/Attachments(ReferenceNo='"
                                + item.ReferenceNo + "',ObjectId='" + item.ObjectId + "')/$value");
                            var popOver = sap.ui.xmlfragment("sap.fiori.invupload.fragment.Attachment", this);
                            sap.ui.getCore().byId("attachPopover").setModel(new JSONModel(data), "AttachModel");
                            this.getView().addDependent(popOver);
                            popOver.openBy(source);
                            BusyIndicator.hide();
                        },
                        error: () => BusyIndicator.hide()
                    });
                }, 1000);
            },

            onF4Help: function (evt, type) {
                this.f4Source = evt.getSource();
                switch (type) {
                    case "HOD":
                        this.oTemplate = new StandardListItem({ title: "{Email}", description: "{Name}" });
                        this.openF4Help("Select HOD", "/Hod");
                    case "FIN":
                        this.oTemplate = new StandardListItem({ title: "{Email}", description: "{Name}" });
                        this.openF4Help("Select Finance", "/Finance");
                }
            },

            openF4Help: function (title, req) {
                const f4 = sap.ui.xmlfragment("sap.fiori.invupload.fragment.F4Help", this);
                this.getView().addDependent(f4);
                f4.setTitle(title);
                f4.bindAggregation("items", {
                    path: req,
                    template: this.oTemplate
                });
                f4.open();
            },

            onF4HelpSearch: function (evt) {
                let oPath = evt.getSource().getBinding("items").getPath();
                oPath = oPath.includes("?search") ? oPath.split("?search")[0] : oPath.split("&search")[0];
                sap.ui.getCore().byId("F4Help").bindAggregation("items", {
                    path: oPath,
                    parameters: { custom: { search: evt.getParameter("value") } },
                    template: this.oTemplate
                });
            },

            onF4HelpConfirm: function (evt) {
                this.f4Source.setValue(evt.getParameter("selectedItem").getTitle());
                evt.getSource().destroy();
            },

            onDialogEscapeHandler: function (oPromise) {
                oPromise.reject();
            },

            onDialogCancel: function (evt) {
                evt.getSource().getParent().destroy();
            },

            onPopOverClosePress: function (evt) {
                evt.getSource().getParent().getParent().destroy();
            },

            sendEmailNotification: function (body) {
                return new Promise((resolve, reject) => {
                    let emailBody = `|| ${body} Kindly log-in with the link to take action.<br><br><a href="https://impautosuppdev.launchpad.cfapps.ap10.hana.ondemand.com/site/SP#invupload-manage?sap-ui-app-id-hint=saas_approuter_sap.fiori.invupload">CLICK HERE</a>`;
                    var oModel = this.getView().getModel();
                    var mParameters = {
                        method: "GET",
                        urlParameters: {
                            subject: "Invoice Submission" + this.refNo,
                            content: emailBody,
                            toAddress: this.toAddress,
                            ccAddress: this.ccAddress
                        },
                        success: function (oData) {
                            console.log("Email sent successfully.");
                            resolve(oData);
                        },
                        error: function (oError) {
                            console.log("Failed to send email.");
                            reject(oError);
                        }
                    };
                    oModel.callFunction("/sendEmail", mParameters);
                });
            }
        });
    });
