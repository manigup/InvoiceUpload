sap.ui.define(["sap/ui/core/UIComponent","sap/m/MessageBox","sap/fiori/invupload/model/formatter"],function(e,t){"use strict";return e.extend("sap.fiori.invupload.Component",{metadata:{manifest:"json"},init:function(){e.prototype.init.apply(this,arguments);this.getModel().metadataLoaded(true).then(()=>{var e=window.location.href.includes("site");if(e){var t=e?"/":"";var a=jQuery.sap.getModulePath("sap/fiori/invupload");a=a==="."?"":a;$.ajax({url:a+t+"user-api/attributes",type:"GET",success:e=>{const t=e;sap.ui.getCore().loginEmail=t.email;this.setHeaders(t.login_name[0],t.type[0].substring(0,1).toUpperCase())}})}else{sap.ui.getCore().loginEmail="samarnahak@kpmg.com";this.setHeaders("1100123","P")}}).catch(e=>this.handleError(e.responseText));this.getModel().attachRequestFailed(e=>this.handleError(e.getParameter("response").responseText))},setHeaders:function(e,t){this.getModel().setHeaders({loginId:e,loginType:t});this.getRouter().initialize()},handleError:function(e){if(e.indexOf("<?xml")!==-1){t.error($($.parseXML(e)).find("message").text())}else if(e.indexOf("{")!==-1){t.error(JSON.parse(e).error.message.value)}else{t.error(e)}}})});