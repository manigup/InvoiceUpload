using db.invoiceupload as my from '../db/data-model';

service CatalogService {

    entity Invoice     as
        projection on my.UploadInvoice
        excluding {
            createdAt,
            modifiedAt,
            modifiedBy
        };

    @readonly
    entity Finance     as projection on my.FinanceMaster;

    @readonly
    entity InvoiceType as projection on my.InvoiceType;


    entity Attachments @(restrict: [{grant: [
        'READ',
        'WRITE',
    ]}])               as
        projection on my.Attachments
        excluding {
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
        };

    function sendEmail(content : String, toAddress : String) returns String;
}
