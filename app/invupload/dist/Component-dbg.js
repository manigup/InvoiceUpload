/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/m/MessageBox",
    "sap/fiori/invupload/model/formatter"
],
    function (UIComponent, MessageBox) {
        "use strict";

        return UIComponent.extend("sap.fiori.invupload.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                this.getModel().metadataLoaded(true).then(() => {
                    // metadata success

                    var site = window.location.href.includes("site");
                    if (site) {
                        var slash = site ? "/" : "";
                        var modulePath = jQuery.sap.getModulePath("sap/fiori/invupload");
                        modulePath = modulePath === "." ? "" : modulePath;
                        $.ajax({
                            url: modulePath + slash + "user-api/attributes",
                            type: "GET",
                            success: res => {
                                const attributes = res;
                                // sap.ui.getCore().loginEmail = attributes.email;
                                sap.ui.getCore().userName = attributes.firstname + " " + attributes.lastname;
                                this.setHeaders(attributes.login_name[0], attributes.type[0].substring(0, 1).toUpperCase());
                            }
                        });
                    } else {
                        // sap.ui.getCore().loginEmail = "samarnahak@kpmg.com";
                        sap.ui.getCore().userName = "Samar" + " " + "Nahak";
                        this.setHeaders("1100123", "P");
                    }
                }).catch(err =>
                    // metadata error
                    this.handleError(err.responseText));

                // odata request failed
                this.getModel().attachRequestFailed(err =>
                    this.handleError(err.getParameter("response").responseText));
            },

            setHeaders: function (loginId, loginType) {
                this.getModel().setHeaders({
                    "loginId": loginId,
                    "loginType": loginType
                });

                // enable routing
                this.getRouter().initialize();
            },

            handleError: function (responseText) {
                if (responseText.indexOf("<?xml") !== -1) {
                    MessageBox.error($($.parseXML(responseText)).find("message").text());
                } else if (responseText.indexOf("{") !== -1) {
                    MessageBox.error(JSON.parse(responseText).error.message.value);
                } else {
                    MessageBox.error(responseText);
                }
            }
        });
    }
);