sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/m/MessageBox"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, BusyIndicator, Filter, MessageBox) {
        "use strict";

        return Controller.extend("sap.fiori.invupload.controller.Upload", {

            onInit: function () {
                this.tblTemp = this.byId("uploadTblTemp").clone();
                this.getView().setModel(new JSONModel(), "DataModel");
                this.getView().setModel(new JSONModel({}), "EditModel");
                this.getView().setModel(new JSONModel({}), "DecisionModel");
                this.getView().setModel(new JSONModel([]), "AttachmentModel");
                this.getView().setModel(new JSONModel([]), "ServiceModel");
                this.getView().setModel(new JSONModel([]), "FinModel");
                this.getView().setModel(new JSONModel({}), "Filter");
            },

            onAfterRendering: function () {
                this.getData();

                const cData = JSON.parse(sessionStorage.getItem("CodeDetails")) || [{ "code": "P39" }];
                this.getView().setModel(new JSONModel(cData), "CodeDetails");

                if (this.getView().getModel().getHeaders().loginType === "E") {
                    this.getView().getModel().read("/Finance", {
                        success: data => {
                            this.getView().getModel("FinModel").setData(data.results);
                            this.getView().getModel("FinModel").refresh(true);
                        }
                    });
                }
            },

            getData: function () {
                const filterData = this.getView().getModel("Filter").getData();
                let oFilters = [];
                Object.keys(filterData).forEach(key => {
                    if (!jQuery.isEmptyObject(filterData[key])) {
                        oFilters.push(new Filter(key, "EQ", filterData[key]));
                    }
                });
                this.byId("uploadTbl").bindAggregation("items", {
                    path: "/Invoice",
                    filters: oFilters,
                    template: this.tblTemp
                });
            },

            onFilterClear: function () {
                this.getView().getModel("Filter").setData({});
                this.getView().getModel("Filter").refresh(true);
            },

            onAddPress: function () {
                const createFrag = sap.ui.xmlfragment("sap.fiori.invupload.fragment.Create", this);
                this.getView().addDependent(createFrag);
                this.getView().getModel("DataModel").setData({});
                this.getView().getModel("DataModel").refresh(true);
                sap.ui.getCore().byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl + "/Attachments");
                createFrag.open();
            },

            onInvNoPress: function (evt) {
                const obj = evt.getSource().getBindingContext().getObject();
                const frag = sap.ui.xmlfragment("sap.fiori.invupload.fragment.Edit", this);
                this.getView().addDependent(frag);
                this.getView().getModel("EditModel").setData(obj);
                this.getView().getModel("EditModel").refresh(true);
                this.invNo = obj.InvoiceNumber;
                this.id = obj.Id;
                this.getAttachments();
                sap.ui.getCore().byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl + "/Attachments");
                frag.open();
            },

            getAttachments: function () {
                this.getView().getModel().read("/Attachments", {
                    filters: [new Filter("Id", "EQ", this.id)],
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
                const payload = this.getView().getModel("DataModel").getData();
                let reqFields = ["invDate", "invNo", "invAmmount", "gst", "pCode", "invType", "reason"];
                if (payload.InvoiceType === "Domestic Service Procurement") {
                    reqFields.push("dept");
                    reqFields.push("serviceGroup");
                    reqFields.push("service");
                }
                if (this.validateReqFields(reqFields) && sap.ui.getCore().byId("attachment").getIncompleteItems().length > 0) {
                    BusyIndicator.show();
                    setTimeout(() => {
                        this.getView().getModel().create("/Invoice", payload, {
                            success: sData => {
                                this.toAddress = sData.HodApprover;
                                this.invNo = sData.InvoiceNumber;
                                this.id = sData.Id;
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
                const payload = this.getView().getModel("EditModel").getData();
                let reqFields = ["invDate", "invNo", "invAmmount", "gst", "pCode", "invType", "reason"];
                if (payload.InvoiceType === "Domestic Service Procurement") {
                    reqFields.push("dept");
                    reqFields.push("serviceGroup");
                    reqFields.push("service");
                }
                if (this.validateReqFields(reqFields)) {
                    BusyIndicator.show();
                    payload.Status = "HAP";
                    setTimeout(() => {
                        this.getView().getModel().update("/Invoice(InvoiceNumber='" + this.invNo + "',Id='" + this.id + "')", payload, {
                            success: sData => {
                                BusyIndicator.hide();
                                MessageBox.success("Invoice " + sData.InvoiceNumber + " updated successfully", {
                                    onClose: () => {
                                        this.toAddress = payload.HodApprover;
                                        const content = "Invoice number " + this.invNo + " updated by supplier " + sap.ui.getCore().userName + ".";
                                        this.sendEmailNotification(content);
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

            onAction: function (evt, selectedAction) {
                const source = evt.getSource(),
                    obj = source.getBindingContext().getObject();
                // selectedAction = source.getSelectedKey();
                // MessageBox.confirm("Are you sure ?", {
                //     onClose: (action) => {
                //         if (action === "YES") {
                this.invNo = obj.InvoiceNumber;
                this.id = obj.Id;
                this.payload = {};
                this.getView().getModel("DecisionModel").setData({ Action: selectedAction });
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
                this.toAddress = obj.createdBy;
                //         }
                //     },
                //     actions: ["YES", "NO"],
                // });
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
                const data = this.getView().getModel("DecisionModel").getData();
                if (this.validateReqFields(["remarks"])) {
                    this.payload.HodRemarks = data.HodRemarks;
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
                    this.payload.FinApproverName = sap.ui.getCore().userName;
                    this.takeAction();
                } else {
                    MessageBox.error("Please fill all required inputs to proceed");
                }
            },

            takeAction: function () {
                setTimeout(() => {
                    this.getView().getModel().update("/Invoice(Id='" + this.id + "',InvoiceNumber='" + this.invNo + "')", this.payload, {
                        success: () => {
                            BusyIndicator.hide();
                            MessageBox.success("Action taken successfully", {
                                onClose: () => {
                                    let content;
                                    switch (this.payload.Status) {
                                        case "ABH":
                                            content = " approved by HOD";
                                            break;
                                        case "RBH":
                                            content = " rejected by HOD";
                                            break;
                                        case "RBF":
                                            content = " rejected by Finance";
                                            break;
                                        case "ABF":
                                            content = " approved by Finance";
                                            break;
                                    }
                                    if (this.payload.Status === "ABH") {
                                        this.getView().getModel("FinModel").getData().forEach(item => {
                                            this.toAddress = item.FinEmail;
                                            this.sendEmailNotification("Invoice number " + this.invNo + content + sap.ui.getCore().userName + ".");
                                        });
                                    } else {
                                        this.sendEmailNotification("Invoice number " + this.invNo + content);
                                    }
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
                let check = [], control, val;
                fields.forEach(inp => {
                    control = sap.ui.getCore().byId(inp);
                    val = control.getMetadata().getName() === 'sap.m.Select' ? control.getSelectedKey() : control.getValue();
                    if (val === "") {
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
                    text: this.id + "/" + evt.getParameter("item").getFileName()
                }));
            },

            onUploadComplete: function () {
                if (sap.ui.getCore().byId("attachment").getIncompleteItems().length === 0) {
                    BusyIndicator.hide();
                    MessageBox.success("Invoice " + this.invNo + " uploaded successfully", {
                        onClose: () => {
                            const content = "New invoice " + this.invNo + " uploaded by supplier " + sap.ui.getCore().userName + ".";
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
                    id = source.getBindingContext().getProperty("Id");
                setTimeout(() => {
                    this.getView().getModel().read("/Attachments", {
                        filters: [new Filter("Id", "EQ", id)],
                        success: (data) => {
                            data.results.map(item => item.Url = this.getView().getModel().sServiceUrl + "/Attachments(Id='"
                                + item.Id + "',ObjectId='" + item.ObjectId + "')/$value");
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

            onDialogClose: function (evt) {
                evt.getSource().destroy();
            },

            onDialogCancel: function (evt) {
                evt.getSource().getParent().destroy();
            },

            onPopOverClosePress: function (evt) {
                evt.getSource().getParent().getParent().destroy();
            },

            setHodApprover: function (evt, mode) {
                const context = evt.getSource().getSelectedItem().getBindingContext();
                if (mode === "C") {
                    this.getView().getModel("DataModel").getData().HodApprover = context.getProperty("ApproverEmail");
                    this.getView().getModel("DataModel").getData().HodApproverName = context.getProperty("ApproverName");
                    this.getView().getModel("DataModel").refresh(true);
                } else {
                    this.getView().getModel("EditModel").getData().HodApprover = context.getProperty("ApproverEmail");
                    this.getView().getModel("DataModel").getData().HodApproverName = context.getProperty("ApproverName");
                    this.getView().getModel("EditModel").refresh(true);
                }
            },

            onServiceGroupChange: function (evt) {
                sap.ui.getCore().byId("service").setSelectedKey("");
                const path = evt.getSource().getSelectedItem().getBindingContext().getPath();
                this.getView().getModel().read(path + "/Service", {
                    success: data => {
                        this.getView().getModel("ServiceModel").setData(data.results);
                        this.getView().getModel("ServiceModel").refresh(true);
                    }
                });
            },

            sendEmailNotification: function (body) {
                const link = window.location.origin +
                    "/site/SP#invupload-manage?sap-ui-app-id-hint=saas_approuter_sap.fiori.invupload";
                return new Promise((resolve, reject) => {
                    const emailBody = `|| ${body} Kindly log-in with the link to take your action.<br><br><a href='${link}'>CLICK HERE</a>`,
                        oModel = this.getView().getModel(),
                        mParameters = {
                            method: "GET",
                            urlParameters: {
                                content: emailBody,
                                toAddress: this.toAddress
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
