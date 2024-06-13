using db.invoiceupload as my from '../db/data-model';

service CatalogService {

    entity Invoice        as
        projection on my.UploadInvoice
        excluding {
            createdAt,
            modifiedAt,
            modifiedBy
        };

    @readonly
    entity FinanceDetails as projection on my.FinanceMaster;

    @readonly
    entity ServiceDetails as projection on my.Service;

    @readonly
    entity PlantDetails   as projection on my.PlantDetails;

    entity Attachments @(restrict: [{grant: [
        'READ',
        'WRITE',
    ]}])                  as
        projection on my.Attachments
        excluding {
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
        };

    function sendEmail(content : String, toAddress : String) returns String;
}
