class ShippingDetail {

    sku;
    productName;
    numOfBoxes;
    numOfPieces;
    shipmentID;
    code;

    constructor() {
        this.sku = '';
        this.productName = '';
        this.numOfBoxes = 0;
        this.numOfPieces = 0;
        this.shipmentID = '';
        this.code = '';
    }
}

module.exports = ShippingDetail;