namespace db.invoiceupload;

using managed from '@sap/cds/common';

entity UploadInvoice : managed {
  key ReferenceNo      : String;
      InvoiceDate      : String(8);
      InvoiceNumber    : String;
      InvoiceAmount    : Integer;
      CostCenter       : String;
      Reason           : String;
      PostingDate      : String(8);
      AccountingNumber : String;
      GST              : Integer;
      HodApprover      : String @(restrict: [{
        grant: ['WRITE'],
        where: 'CreatedBy = $user'
      }]);
      FinanceApprover  : String @(restrict: [{
        grant: ['WRITE'],
        where: 'HodApprover = $user'
      }]);
      HodRemarks       : String;
      FinRemarks       : String;
      Status           : String;
}

entity Attachments : managed {
  key ReferenceNo : String;

      @Core.MediaType: Mediatype
      Data        : LargeBinary @Core.ContentDisposition.Filename: Filename;


      Mediatype   : String;

      @Core.IsMediaType
      Filename    : String;
}

entity FinanceMaster {
  key Email : String;
      Name  : String;
};

entity HodMaster {
  key Email : String;
      Name  : String;
};
