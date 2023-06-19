const {STATUS} = require('../enums/Status.js');
const axios = require("axios");

class Waybill {

    waybillNum;
    status;
    recordId;
    shipmentId;
    warehouseCode;

    departureTime;
    portArrivalTime;
    warehouseArrivalTime;
    appointmentTime;
    deliveryTime;
    portETA;

    constructor() {
        this.waybillNum = '';
        this.shipmentId = '';
        this.warehouseCode = '';
        this.status = '';
        this.recordId = '';
    }

}

module.exports = Waybill;
