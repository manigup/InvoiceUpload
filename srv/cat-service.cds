using db.invoiceupload as my from '../db/data-model';

service CatalogService {

    entity Invoice      as
        projection on my.UploadInvoice
        excluding {
            createdAt,
            modifiedAt,
            modifiedBy
        };

    @readonly
    entity Finance      as projection on my.FinanceMaster;

    @readonly
    entity InvoiceType  as projection on my.InvoiceType;

    @readonly
    entity Department   as projection on my.Department;

    @readonly
    entity ServiceGroup as projection on my.ServiceGroup;

    @readonly
    entity Service      as projection on my.Service;


    entity Attachments @(restrict: [{grant: [
        'READ',
        'WRITE',
    ]}])                as
        projection on my.Attachments
        excluding {
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
        };

    function sendEmail(content : String, toAddress : String) returns String;
}
