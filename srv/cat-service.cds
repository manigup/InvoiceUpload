using db.invoiceupload as my from '../db/data-model';

service CatalogService {

    entity Invoice as projection on my.UploadInvoice;

    @readonly
    entity Finance as projection on my.FinanceMaster;

    @readonly
    entity Hod     as projection on my.HodMaster;


    entity Attachments @(restrict: [{
        grant: [
            'WRITE',
            'UPDATE',
            'DELETE'
        ],
        where: 'CreatedBy = $user'
    }])            as projection on my.Attachments;
}
