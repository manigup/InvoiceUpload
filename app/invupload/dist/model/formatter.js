jQuery.sap.declare("formatter");formatter={formatDate:function(e){if(e&&e!=="00000000"){return sap.ui.core.format.DateFormat.getDateInstance({pattern:"MMM dd, yyyy"}).format(new Date(e.substring(4,6)+"/"+e.substring(6,8)+"/"+e.substring(0,4)))}else{return""}},formatStatus:function(e){var r="";if(e){switch(e){case"HAP":r="HOD Approval Pending";break;case"APR":r="Approved by HOD";break;case"ABH":r="Approved by HOD & Pending with Finance";break;case"RBH":case"REJ":r="Rejected by HOD";break;case"ABF":r="Approved by Finance";break;case"RBF":r="Rejected by Finance";break}}return r},statusState:function(e){var r="None";if(e){switch(e){case"ABF":case"APR":r="Success";break;case"HAP":case"ABH":r="Warning";break;default:r="Error";break}}return r},checkApprovalAccess:function(e,r,t){const a=this.getModel().getHeaders().loginId;if(e==="HAP"&&r===a){return true}else if(e==="ABH"&&t===a){return true}else{return false}},refNoLink:function(e,r){if(e&&r){const t=this.getModel().getHeaders().loginId;if((e==="RBH"||e==="RBF")&&t===r){return true}else{return false}}else{return false}}};