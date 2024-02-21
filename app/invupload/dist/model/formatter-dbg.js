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
    formatStatus: function (status) {
        var text = "";
        if (status) {
            switch (status) {
                case "HAP":
                    text = "HOD Approval Pending";
                    break;
                case "ABH":
                    text = "Approved by HOD & Pending with Finance";
                    break;
                case "RBH":
                    text = "Rejected by HOD";
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
                case "HAP":
                case "ABH":
                    state = "Warning";
                    break;
                default:
                    state = "Error";
                    break;
            }
        }
        return state;
    },
    checkApprovalAccess: function (status, hod, finance) {
        const logUser = this.getModel().getHeaders().loginId;
        if (status === "HAP" && hod === logUser) {
            return true;
        } else if (status === "ABH" && finance === logUser) {
            return true;
        } else {
            return false;
        }
    }
};