const {STATUS} = require('../enums/Status.js');
const axios = require("axios");

class Waybill {

    waybillNum;
    status;
    recordId;
    shipmentId;
    warehouseCode;
    shippingDetailsCode;
    isShippingDetailsSynced;

    departureTime;
    portArrivalTime;
    warehouseArrivalTime;
    appointmentTime;
    deliveryTime;
    portETA;
    shippingDetailList;

    constructor() {
        this.waybillNum = '';
        this.shipmentId = '';
        this.warehouseCode = '';
        this.status = '';
        this.recordId = '';
        this.shippingDetailsCode = '';
    }

}

module.exports = Waybill;
