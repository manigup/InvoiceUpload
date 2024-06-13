namespace db.invoiceupload;

using managed from '@sap/cds/common';

entity UploadInvoice : managed {
  key Id                 : String(6);
      InvoiceDate        : String(8);
  key InvoiceNumber      : String;
      TotalInvoiceAmount : Integer;
      InvoiceType        : String;
      Department         : String;
      ServiceGroup       : String;
      Service            : String;
      Reason             : String;
      PostingDate        : String(8) default '';
      AccountingNumber   : String default '';
      GST                : Integer;
      PlantCode          : String(3);
      FinanceApprover    : String default '';
      FinApproverName    : String default '';
      FinRemarks         : String default '';
      FinApprovedAt      : DateTime default '';
      L1HodApprover      : String @(restrict: [{
        grant: ['WRITE'],
        where: 'CreatedBy = $user'
      }]) default '';
      L1HodApproverName  : String default '';
      L1HodRemarks       : String default '';
      L1ApprovedAt       : DateTime default '';
      L2HodApprover      : String @(restrict: [{
        grant: ['WRITE'],
        where: 'CreatedBy = $user'
      }]) default '';
      L2HodRemarks       : String default '';
      L2HodApproverName  : String default '';
      L2ApprovedAt       : DateTime default '';
      L3HodApprover      : String @(restrict: [{
        grant: ['WRITE'],
        where: 'CreatedBy = $user'
      }]) default '';
      L3HodRemarks       : String default '';
      L3HodApproverName  : String default '';
      L3ApprovedAt       : DateTime default '';
      Action             : String(1);
      Status             : String;
}

entity Attachments : managed {
  key Id        : String(6);
  key ObjectId  : String;

      @Core.MediaType: Mediatype
      Data      : LargeBinary @Core.ContentDisposition.Filename: Filename;

      Mediatype : String;

      @Core.IsMediaType
      Filename  : String;
}

entity FinanceMaster {
  key Plant : String(3);
      Email : String default '';
};

entity Service {
  key ID               : Int16;
      SERVICE_CATEGORY : String;
      SERVICE_GROUP    : String;
      SERVICE          : String;
      Approver1        : String;
      Approver1_Email  : String default '';
      Approver2        : String;
      Approver2_Email  : String default '';
      Approver3        : String;
      Approver3_Email  : String default '';
};

entity PlantDetails {
  key Unit_Code           : String;
      Division_Head       : String;
      Email_Division_Head : String default '';
      Plant_Head          : String;
      Email_Plant_Head    : String default '';
};
