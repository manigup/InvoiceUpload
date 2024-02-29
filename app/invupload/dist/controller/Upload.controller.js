sap.ui.define(["sap/ui/core/mvc/Controller","sap/ui/model/json/JSONModel","sap/ui/core/BusyIndicator","sap/m/StandardListItem","sap/ui/model/Filter","sap/m/MessageBox"],function(e,t,i,s,o,a){"use strict";return e.extend("sap.fiori.invupload.controller.Upload",{onInit:function(){this.tblTemp=this.byId("uploadTblTemp").clone();this.getView().setModel(new t({}),"DataModel");this.getView().setModel(new t({}),"EditModel");this.getView().setModel(new t({}),"DecisionModel");this.getView().setModel(new t([]),"AttachmentModel")},onAfterRendering:function(){this.getData()},getData:function(){this.byId("uploadTbl").bindAggregation("items",{path:"/Invoice",template:this.tblTemp})},onAddPress:function(){const e=sap.ui.xmlfragment("sap.fiori.invupload.fragment.Create",this);this.getView().addDependent(e);sap.ui.getCore().byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl+"/Attachments");e.open()},onReferenceNoPress:function(e){const t=e.getSource().getBindingContext().getObject();const i=sap.ui.xmlfragment("sap.fiori.invupload.fragment.Edit",this);this.getView().addDependent(i);this.getView().getModel("EditModel").setData(t);this.getView().getModel("EditModel").refresh(true);this.refNo=t.ReferenceNo;this.getAttachments();sap.ui.getCore().byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl+"/Attachments");i.open()},getAttachments:function(){this.getView().getModel().read("/Attachments",{filters:[new o("ReferenceNo","EQ",this.refNo)],success:e=>{this.getView().getModel("AttachmentModel").setData(e.results);this.getView().getModel("AttachmentModel").refresh(true);i.hide()},error:()=>i.hide()})},onCreatePress:function(e){this.dialogSource=e.getSource();if(this.validateReqFields(["invDate","invNo","invAmmount","gst","costCenter","reason","hod"])&&sap.ui.getCore().byId("attachment").getIncompleteItems().length>0){i.show();const e=this.getView().getModel("DataModel").getData();setTimeout(()=>{this.getView().getModel().create("/Invoice",e,{success:e=>{this.toAddress=e.HodApprover;this.ccAddress=e.createdBy;this.refNo=e.ReferenceNo;this.doAttachment()},error:()=>i.hide()})},500)}else{a.error("Please fill all required inputs to proceed")}},onEditPress:function(e){this.dialogSource=e.getSource();if(this.validateReqFields(["invDate","invNo","invAmmount","gst","costCenter","reason","hod"])){i.show();const e=this.getView().getModel("EditModel").getData();setTimeout(()=>{this.getView().getModel().update("/Invoice('"+this.refNo+"')",e,{success:t=>{i.hide();a.success("Invoice "+t.ReferenceNo+" updated successfully",{onClose:()=>{this.toAddress=e.HodApprover;this.ccAddress=e.createdBy;const t="Invoice with refrence no. "+this.refNo+" updated by requestor.";this.sendEmailNotification(t);this.dialogSource.getParent().destroy();this.getData()}})},error:()=>i.hide()})},500)}else{a.error("Please fill all required inputs to proceed")}},onActionChange:function(e){const t=e.getSource(),i=t.getBindingContext().getObject(),s=t.getSelectedKey();a.confirm("Are you sure ?",{onClose:e=>{if(e==="YES"){this.refNo=i.ReferenceNo;this.getView().getModel("DecisionModel").setData({Action:s});this.payload={};if(i.Status==="HAP"&&s==="A"){this.payload.Status="ABH";this.toAddress=i.FinanceApprover;this.ccAddress=i.createdBy;this.openHodFrag()}else if(i.Status==="HAP"&&s==="R"){this.payload.Status="RBH";this.toAddress=i.createdBy;this.ccAddress=i.HodApprover;this.openHodFrag()}else if(i.Status==="ABH"&&s==="A"){this.payload.Status="ABF";this.openFinFrag()}else{this.payload.Status="RBF";this.toAddress=i.createdBy;this.ccAddress=i.FinanceApprover;this.openFinFrag()}}},actions:["YES","NO"]})},openHodFrag:function(){const e=sap.ui.xmlfragment("sap.fiori.invupload.fragment.HodRemarks",this);this.getView().addDependent(e);e.open()},openFinFrag:function(){const e=sap.ui.xmlfragment("sap.fiori.invupload.fragment.FinAction",this);this.getView().addDependent(e);e.open()},onHodSubmit:function(e){this.dialogSource=e.getSource();const t=this.getView().getModel("DecisionModel").getData(),i=t.Action==="A"?["finance","remarks"]:["remarks"];if(this.validateReqFields(i)){this.payload.HodRemarks=t.HodRemarks;this.payload.FinanceApprover=t.FinanceApprover;this.takeAction()}else{a.error("Please fill all required inputs to proceed")}},onFinSubmit:function(e){this.dialogSource=e.getSource();const t=this.getView().getModel("DecisionModel").getData(),i=t.Action==="A"?["postingDate","accNo","remarks"]:["remarks"];if(this.validateReqFields(i)){this.payload.PostingDate=t.PostingDate;this.payload.AccountingNumber=t.AccountingNumber;this.payload.FinRemarks=t.FinRemarks;this.takeAction()}else{a.error("Please fill all required inputs to proceed")}},takeAction:function(){setTimeout(()=>{this.getView().getModel().update("/Invoice('"+this.refNo+"')",this.payload,{success:()=>{i.hide();a.success("Action taken successfully",{onClose:()=>{let e;switch(this.payload.Status){case"ABH":e=" approved by HOD.";case"RBH":e=" rejected by HOD.";case"RBF":e=" rejected by Finance."}this.sendEmailNotification("Invoice with refrence no. "+this.refNo+e);this.dialogSource.getParent().destroy();this.getData()}})},error:()=>i.hide()})},500)},validateReqFields:function(e){let t=[],i;e.forEach(e=>{i=sap.ui.getCore().byId(e);if(i.getValue()===""){i.setValueState("Error").setValueStateText("Required");t.push(false)}else{i.setValueState("None");t.push(true)}});if(t.every(e=>e===true))return true;else return false},doAttachment:function(){this.items=sap.ui.getCore().byId("attachment").getIncompleteItems();sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);this.items.splice(0,1)},onAttachItemAdd:function(e){e.getParameter("item").setVisibleEdit(false).setVisibleRemove(false)},onBeforeUploadStarts:function(e){e.getParameter("item").addHeaderField(new sap.ui.core.Item({key:"slug",text:this.refNo+"/"+e.getParameter("item").getFileName()}))},onUploadComplete:function(){if(sap.ui.getCore().byId("attachment").getIncompleteItems().length===0){i.hide();a.success("Invoice uploaded successfully",{onClose:()=>{const e="New invoice with refrence no. "+this.refNo+" uploaded by requestor.";this.sendEmailNotification(e);this.getView().getModel("DataModel").setData({});this.dialogSource.getParent().destroy();this.getData()}})}else{sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);this.items.splice(0,1)}},onAttachmentUploadComplete:function(){if(sap.ui.getCore().byId("attachment").getIncompleteItems().length>0){sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);this.items.splice(0,1)}},onAttachmentPress:function(e){i.show();const s=e.getSource(),a=s.getBindingContext().getProperty("ReferenceNo");setTimeout(()=>{this.getView().getModel().read("/Attachments",{filters:[new o("ReferenceNo","EQ",a)],success:e=>{e.results.map(e=>e.Url=this.getView().getModel().sServiceUrl+"/Attachments(ReferenceNo='"+e.ReferenceNo+"',ObjectId='"+e.ObjectId+"')/$value");var o=sap.ui.xmlfragment("sap.fiori.invupload.fragment.Attachment",this);sap.ui.getCore().byId("attachPopover").setModel(new t(e),"AttachModel");this.getView().addDependent(o);o.openBy(s);i.hide()},error:()=>i.hide()})},1e3)},onF4Help:function(e,t){this.f4Source=e.getSource();switch(t){case"HOD":this.oTemplate=new s({title:"{Email}",description:"{Name}"});this.openF4Help("Select HOD","/Hod");case"FIN":this.oTemplate=new s({title:"{Email}",description:"{Name}"});this.openF4Help("Select Finance","/Finance")}},openF4Help:function(e,t){const i=sap.ui.xmlfragment("sap.fiori.invupload.fragment.F4Help",this);this.getView().addDependent(i);i.setTitle(e);i.bindAggregation("items",{path:t,template:this.oTemplate});i.open()},onF4HelpSearch:function(e){let t=e.getSource().getBinding("items").getPath();t=t.includes("?search")?t.split("?search")[0]:t.split("&search")[0];sap.ui.getCore().byId("F4Help").bindAggregation("items",{path:t,parameters:{custom:{search:e.getParameter("value")}},template:this.oTemplate})},onF4HelpConfirm:function(e){this.f4Source.setValue(e.getParameter("selectedItem").getTitle());e.getSource().destroy()},onDialogEscapeHandler:function(e){e.reject()},onDialogCancel:function(e){e.getSource().getParent().destroy()},onPopOverClosePress:function(e){e.getSource().getParent().getParent().destroy()},sendEmailNotification:function(e){return new Promise((t,i)=>{const s=`|| ${e} Kindly log-in with the link to take your action.<br><br><a href="https://impautosuppdev.launchpad.cfapps.ap10.hana.ondemand.com/site/SP#invupload-manage?sap-ui-app-id-hint=saas_approuter_sap.fiori.invupload">CLICK HERE</a>`,o=this.getView().getModel(),a={method:"GET",urlParameters:{subject:"Invoice Submission",content:s,toAddress:this.toAddress,ccAddress:this.ccAddress},success:function(e){console.log("Email sent successfully.");t(e)},error:function(e){console.log("Failed to send email.");i(e)}};o.callFunction("/sendEmail",a)})}})});