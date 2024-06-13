jQuery.sap.declare("formatter");
formatter = {
    formatDate: function (oDate) {
        if (oDate && oDate !== "00000000") {
            return sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "MMM dd, yyyy"
            }).format(new Date(oDate.substring(4, 6) + "/" + oDate.substring(6, 8) + "/" + oDate.substring(0, 4)));
        } else {
            return "";
        }
    },
    dateFormat: function (oDate) {
        if (oDate) {
            return sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "MMM dd, yyyy"
            }).format(new Date(oDate));
        } else {
            return "";
        }
    },
    formatTime: function (oDate) {
        if (oDate) {
            return oDate.toLocaleTimeString();
        } else {
            return "";
        }
    },
    formatStatus: function (status) {
        var text = "";
        if (status) {
            switch (status) {
                case "PL1":
                    text = "Purchase L1 Approval Pending";
                    break;
                case "PL2":
                    text = "Purchase L2 Approval Pending";
                    break;
                case "PL3":
                    text = "Purchase L3 Approval Pending";
                    break;
                case "RL1":
                    text = "Rejected by Purchase L1";
                    break;
                case "RL2":
                    text = "Rejected by Purchase L2";
                    break;
                case "RL3":
                    text = "Rejected by Purchase L3";
                    break;
                case "ABP":
                    text = "Approved by Purchase & Pending with Finance";
                    break;
                case "ABF":
                    text = "Approved by Finance";
                    break;
                case "RBF":
                    text = "Rejected by Finance";
                    break;
            }
        }
        return text;
    },
    statusState: function (status) {
        var state = "None";
        if (status) {
            switch (status) {
                case "ABF":
                    state = "Success";
                    break;
                case "PL1":
                case "PL2":
                case "PL3":
                case "ABP":
                    state = "Warning";
                    break;
                default:
                    state = "Error";
                    break;
            }
        }
        return state;
    },
    checkApprovalAccess: function (status, l1, l2, l3) {
        const finData = this.getModel("FinModel").getData();
        if (status && finData.length > 0 && (l1 || l2 || l3)) {
            if ((status === "PL1" || status === "PL2" || status === "PL3")) {
                if (status === "PL1" && l1.includes(sap.ui.getCore().loginEmail)) {
                    return true;
                } else if (status === "PL2" && l2.includes(sap.ui.getCore().loginEmail)) {
                    return true;
                } else if (status === "PL3" && l3.includes(sap.ui.getCore().loginEmail)) {
                    return true;
                } else {
                    return false;
                }
            } else if (status === "ABP" && finData.findIndex(item => item.Email.includes(sap.ui.getCore().loginEmail)) !== -1) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    },
    invNoLink: function (status, createdBy) {
        if (status && createdBy) {
            if ((status === 'RL1' || status === "RL2" || status === "RL3" || status === 'RBF') && sap.ui.getCore().loginEmail === createdBy) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    },
    addBtnVisible: function () {
        if (this.getModel().getHeaders().loginType === "P") {
            return true;
        } else {
            return false;
        }
    }
};