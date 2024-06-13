sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, BusyIndicator, Fragment, Filter, FilterOperator, MessageBox) {
        "use strict";

        return Controller.extend("sap.fiori.invupload.controller.Upload", {

            onInit: function () {
                this.tblTemp = this.byId("uploadTblTemp").clone();
                this.getView().setModel(new JSONModel(), "DataModel");
                this.getView().setModel(new JSONModel({}), "EditModel");
                this.getView().setModel(new JSONModel({}), "DecisionModel");
                this.getView().setModel(new JSONModel([]), "AttachmentModel");
                this.getView().setModel(new JSONModel([]), "HistoryModel");
                // this.getView().setModel(new JSONModel([]), "ServiceModel");
                this.getView().setModel(new JSONModel([]), "UnitCodeModel");
                this.getView().setModel(new JSONModel([]), "FinModel");
                this.getView().setModel(new JSONModel({}), "Filter");
            },

            onAfterRendering: function () {
                this.getData();

                const cData = JSON.parse(sessionStorage.getItem("CodeDetails")) || [{ "code": "P39" }];
                this.getView().setModel(new JSONModel(cData), "CodeDetails");

                this.getView().getModel().read("/FinanceDetails", {
                    success: data => {
                        this.getView().getModel("FinModel").setData(data.results);
                        this.getView().getModel("FinModel").refresh(true);
                    }
                });

                if (this.getView().getModel().getHeaders().loginType === "P") {
                    this.getView().getModel().read("/PlantDetails", {
                        success: data => {
                            this.getView().getModel("UnitCodeModel").setData(data.results);
                            this.getView().getModel("UnitCodeModel").refresh(true);
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
                let reqFields = ["invDate", "invNo", "invAmmount", "gst", "pCode", "invType", "reason", "L1Approver", "finApprover"];
                if (payload.InvoiceType === "Domestic Service Procurement") {
                    reqFields.push("service");
                    reqFields.push("serviceGroup");
                    reqFields.push("dept");
                    reqFields.push("L2Approver");
                    reqFields.push("L3Approver");
                }
                if (this.validateReqFields(reqFields) && sap.ui.getCore().byId("attachment").getIncompleteItems().length > 0) {
                    BusyIndicator.show();
                    setTimeout(() => {
                        this.getView().getModel().create("/Invoice", payload, {
                            success: sData => {
                                this.toEmail = sData.L1HodApprover.split("/");
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
                let payload = this.getView().getModel("EditModel").getData(),
                    reqFields = ["invDate", "invNo", "invAmmount", "gst", "pCode", "invType", "reason", "L1Approver", "finApprover"];
                payload.Action = "E";
                if (payload.InvoiceType === "Domestic Service Procurement") {
                    reqFields.push("service");
                    reqFields.push("serviceGroup");
                    reqFields.push("dept");
                    reqFields.push("L2Approver");
                    reqFields.push("L3Approver");
                }
                if (this.validateReqFields(reqFields)) {
                    BusyIndicator.show();
                    setTimeout(() => {
                        this.getView().getModel().update("/Invoice(InvoiceNumber='" + this.invNo + "',Id='" + this.id + "')", payload, {
                            success: sData => {
                                BusyIndicator.hide();
                                MessageBox.success("Invoice " + sData.InvoiceNumber + " updated successfully", {
                                    onClose: () => {
                                        const toAddress = payload.L1HodApprover.split("/"),
                                            content = "Invoice number " + this.invNo + " updated by supplier " + sap.ui.getCore().userName + ".";
                                        toAddress.forEach(item => {
                                            this.toAddress = item;
                                            this.sendEmailNotification(content);
                                        });
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
                this.cStatus = obj.Status;
                this.createdBy = obj.createdBy;
                this.getView().getModel("DecisionModel").setData({ Action: selectedAction });
                if (obj.Status === "ABP") {
                    this.plantCode = obj.PlantCode;
                    this.finApprover = obj.FinanceApprover;
                    this.openFinFrag();
                } else {
                    this.openHodFrag();
                }
                // if (obj.Status === "HAP" && selectedAction === "A") {
                //     this.payload.Status = "ABH"; // Approved by HOD & Pending with Finance
                //     this.openHodFrag();
                // } else if (obj.Status === "HAP" && selectedAction === "R") {
                //     this.payload.Status = "RBH"; // Rejected by HOD
                //     this.openHodFrag();
                // } else if (obj.Status === "ABH" && selectedAction === "A") {
                //     this.payload.Status = "ABF"; // Approved by Finance
                //     this.openFinFrag();
                // } else {
                //     this.payload.Status = "RBF"; // Rejected by Finance
                //     this.openFinFrag();
                // }
                // this.toAddress = obj.createdBy;
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
                    let payload = {};
                    if (this.cStatus === "PL1") {
                        payload.L1HodRemarks = data.HodRemarks;
                        payload.L1HodApproverName = sap.ui.getCore().userName;
                    } else if (this.cStatus === "PL2") {
                        payload.L2HodRemarks = data.HodRemarks;
                        payload.L2HodApproverName = sap.ui.getCore().userName;
                    } else if (this.cStatus === "PL3") {
                        payload.L3HodRemarks = data.HodRemarks;
                        payload.L3HodApproverName = sap.ui.getCore().userName;
                    }
                    payload.Action = data.Action;
                    payload.Status = this.cStatus;
                    payload.InvoiceNumber = this.invNo;
                    this.takeAction(payload);
                } else {
                    MessageBox.error("Please fill all required inputs to proceed");
                }
            },

            onFinSubmit: function (evt) {
                this.dialogSource = evt.getSource();
                const data = this.getView().getModel("DecisionModel").getData(),
                    reqFields = data.Action === "A" ? ["postingDate", "accNo", "remarks"] : ["remarks"];
                if (this.validateReqFields(reqFields)) {
                    const payload = {
                        PostingDate: data.PostingDate,
                        AccountingNumber: data.AccountingNumber,
                        FinRemarks: data.FinRemarks,
                        FinApproverName: sap.ui.getCore().userName,
                        Action: data.Action,
                        Status: this.cStatus,
                        InvoiceNumber: this.invNo,
                        PlantCode: this.plantCode
                    };
                    this.takeAction(payload);
                } else {
                    MessageBox.error("Please fill all required inputs to proceed");
                }
            },

            takeAction: function (payload) {
                setTimeout(() => {
                    this.getView().getModel().update("/Invoice(Id='" + this.id + "',InvoiceNumber='" + this.invNo + "')", payload, {
                        success: () => {
                            BusyIndicator.hide();
                            MessageBox.success("Action taken successfully", {
                                onClose: (sData) => {
                                    let content = payload.Action === "A" ? " approved " : " rejected ";
                                    if (payload.Status === "ABP") {
                                        content += " by finance ";
                                    } else {
                                        content += " by purchase ";
                                    }
                                    if (sData.Status === "ABP") {
                                        this.finApprover.split("/").forEach(item => {
                                            this.toAddress = item;
                                            this.sendEmailNotification("Invoice number " + this.invNo + content + sap.ui.getCore().userName + ".");
                                        });
                                    } else if (payload.Action === "R") {
                                        this.toAddress = this.createdBy;
                                        this.sendEmailNotification("Invoice number " + this.invNo + content + ".");
                                    } else {
                                        this.toAddress = sap.ui.getCore().loginEmail;
                                        this.sendEmailNotification("Invoice number " + this.invNo + content + sap.ui.getCore().userName + ".");
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
                    if (control.getVisible() === true && val === "") {
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
                            this.toEmail.forEach(item => {
                                this.toAddress = item;
                                this.sendEmailNotification(content);
                            });
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
                const context = evt.getSource().getSelectedItem().getBindingContext().getObject();
                if (mode === "C") {
                    this.getView().getModel("DataModel").getData().L1HodApprover = context.Email;
                    this.getView().getModel("DataModel").getData().L1HodApproverName = context.Name;
                    this.getView().getModel("DataModel").refresh(true);
                } else {
                    this.getView().getModel("EditModel").getData().L1HodApprover = context.Email;
                    this.getView().getModel("EditModel").getData().L1HodApproverName = context.Name;
                    this.getView().getModel("EditModel").refresh(true);
                }
            },

            // onServiceGroupChange: function (evt) {
            //     sap.ui.getCore().byId("service").setSelectedKey("");
            //     const path = evt.getSource().getSelectedItem().getBindingContext().getPath();
            //     this.getView().getModel().read(path + "/Service", {
            //         success: data => {
            //             this.getView().getModel("ServiceModel").setData(data.results);
            //             this.getView().getModel("ServiceModel").refresh(true);
            //         }
            //     });
            // },

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
            },

            onValueHelpRequest: function () {
                var oView = this.getView();

                if (!this._pValueHelpDialog) {
                    this._pValueHelpDialog = Fragment.load({
                        id: oView.getId(),
                        name: "sap.fiori.invupload.fragment.ValueHelp",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                this._pValueHelpDialog.then(function (oDialog) {
                    oDialog.open();
                });
            },

            onValueHelpSearch: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var oFilter = new Filter("SERVICE", FilterOperator.Contains, sValue);
                oEvent.getSource().getBinding("items").filter([oFilter]);
            },

            onValueHelpClose: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedItem").getBindingContext().getObject();
                oEvent.getSource().getBinding("items").filter([]);
                if (!oSelectedItem) {
                    return;
                }
                sap.ui.getCore().byId("service").setValue(oSelectedItem.SERVICE);
                sap.ui.getCore().byId("serviceGroup").setValue(oSelectedItem.SERVICE_GROUP);
                sap.ui.getCore().byId("dept").setValue(oSelectedItem.SERVICE_CATEGORY);

                let data = this.getView().getModel("DataModel").getData(),
                    pData = this.getView().getModel("UnitCodeModel").getData().filter(item => item.Unit_Code === data.PlantCode)[0];

                if (oSelectedItem.Approver1 === "Division Head") {
                    data.L1HodApprover = pData.Email_Division_Head;
                    data.L1HodApproverName = pData.Division_Head;
                } else if (oSelectedItem.Approver1 === "Plant Head") {
                    data.L1HodApprover = pData.Email_Plant_Head;
                    data.L1HodApproverName = pData.Plant_Head;
                } else {
                    data.L1HodApprover = oSelectedItem.Approver1_Email;
                    data.L1HodApproverName = oSelectedItem.Approver1;
                }

                if (oSelectedItem.Approver2 !== "N/A" && parseInt(data.TotalInvoiceAmount) >= 200000) {
                    data.L2HodApprover = oSelectedItem.Approver2_Email;
                    data.L2HodApproverName = oSelectedItem.Approver2;
                } else if (oSelectedItem.Approver2 === "N/A" || parseInt(data.TotalInvoiceAmount) < 200000) {
                    delete data.L2HodApprover;
                    delete data.L2HodApproverName;
                }
                if (oSelectedItem.Approver3 !== "N/A" && parseInt(data.TotalInvoiceAmount) > 2000000) {
                    data.L3HodApprover = oSelectedItem.Approver3_Email;
                    data.L3HodApproverName = oSelectedItem.Approver3;
                } else if (oSelectedItem.Approver3 === "N/A" || parseInt(data.TotalInvoiceAmount) < 2000000) {
                    delete data.L3HodApprover;
                    delete data.L3HodApproverName;
                }
                this.getView().getModel("DataModel").refresh(true);
            },

            onApproverDetailsPress: function (evt) {
                const obj = evt.getSource().getBindingContext().getObject();
                let hData = [];
                for (var i = 1; i <= 3; i++) {
                    if (obj["L" + i + "ApprovedAt"]) {
                        hData.push({
                            "Level": "Purchase Level " + i,
                            "Approver": obj["L" + i + "HodApproverName"],
                            "ApproverEmail": obj["L" + i + "HodApprover"],
                            "ApprovedAt": obj["L" + i + "ApprovedAt"],
                            "Remarks": obj["L" + i + "HodRemarks"]
                        });
                    }
                }
                if (obj.FinApprovedAt) {
                    hData.push({
                        "Level": "Finance",
                        "Approver": obj.FinApproverName,
                        "ApproverEmail": obj.FinanceApprover,
                        "ApprovedAt": obj.FinApprovedAt,
                        "Remarks": obj.FinRemarks
                    });
                }
                this.getView().getModel("HistoryModel").setData(hData);
                this.getView().getModel("HistoryModel").refresh(true);


                var oButton = evt.getSource(),
                    oView = this.getView();

                // create popover
                if (!this._pPopover) {
                    this._pPopover = Fragment.load({
                        id: oView.getId(),
                        name: "sap.fiori.invupload.fragment.ApprovalHistory",
                        controller: this
                    }).then(function (oPopover) {
                        oView.addDependent(oPopover);
                        return oPopover;
                    });
                }
                this._pPopover.then(function (oPopover) {
                    oPopover.openBy(oButton);
                });
            },

            onPlantChange: function (evt) {
                const val = evt.getParameter("selectedItem").getBindingContext("CodeDetails").getProperty("code"),
                    fdata = this.getView().getModel("FinModel").getData(),
                    data = fdata.filter(item => item.Plant === val)

                if (data.length > 0) {
                    sap.ui.getCore().byId("finApprover").setValue(data[0].Email);
                } else {
                    sap.ui.getCore().byId("finApprover").setValue("");
                }
            }
        });
    });
