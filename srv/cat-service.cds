using db.invoiceupload as my from '../db/data-model';

service CatalogService {

    entity Invoice as projection on my.UploadInvoice;

    @readonly
    entity Finance as projection on my.FinanceMaster;

    @readonly
    entity Hod     as projection on my.HodMaster;


    entity Attachments @(restrict: [{grant: [
        'READ',
        'WRITE',
    ]}])           as projection on my.Attachments;
}
