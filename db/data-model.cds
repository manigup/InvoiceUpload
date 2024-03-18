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
      HodApprover        : String @(restrict: [{
        grant: ['WRITE'],
        where: 'CreatedBy = $user'
      }]);
      FinanceApprover    : String default '';
      HodRemarks         : String default '';
      FinRemarks         : String default '';
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
  key Id       : Int16;
      FinEmail : String;
      FinName  : String;
};

entity InvoiceType {
  key Id            : Int16;
      Type          : String;
      ApproverEmail : String;
      ApproverName  : String;
};

entity Department {
  key DeptId        : Int16;
      DeptName      : String;
      ApproverEmail : String;
      ApproverName  : String;
};

entity ServiceGroup {
  key GroupId   : Int16;
      GroupName : String;
      Service   : Composition of many Service
                    on Service.GroupId = $self;
};

entity Service {
  key ServiceId   : Int16;
  key GroupId     : Association to ServiceGroup;
      ServiceName : String;
};
