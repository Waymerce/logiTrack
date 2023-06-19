const axios = require('axios');
const qs = require('qs');
const {STATUS} = require("./enums/Status");

class CDCarrierService {

    constructor(username, password) {
        this.username = username;
        this.password = password;
    }

    async getToken() {
        if (!this.token) {
            const response = await axios({
                method: 'post',
                url: 'http://api.ywcd56.com/indexlogin',
                data: qs.stringify({username: this.username, password: this.password}),
                headers: {'content-type': 'application/x-www-form-urlencoded'}
            });

            if (response.data.code === 200) {
                this.token = response.data.data.token;
            } else {
                throw new Error(`Failed to fetch token: ${response.data.msg}`);
            }
        }
        return this.token;
    }


    async fetchWaybillDetails(waybill) {

        const url = `http://api.ywcd56.com/locusinfo`;


        try {
            const response = await axios.get(url, {
                params: {
                    token: await this.getToken(),
                    waybill_num: waybill.waybillNum,
                    type: 0
                }
            });

            if (response.data.code === 200) {
                // 解析response.data.data
                response.data.data.map(item => {
                    if (item.type_name && item.type_name === "开船时间") {
                        waybill.departureTime = item.date;
                        if (item.find.length > 0) {
                            item.find.map(findItem => {
                                if (findItem.type_name && findItem.type_name === "预计到港") {
                                    waybill.portETA = findItem.date;
                                }
                            });
                        }
                    } else if (item.type_name && item.type_name === "到港时间") {
                        waybill.portArrivalTime = item.date;
                    } else if (item.type_name && item.type_name === "到仓时间") {
                        waybill.warehouseArrivalTime = item.date;
                    } else if (item.type_name && item.type_name === "预约时间") {
                        waybill.appointmentTime = item.date;
                    } else if (item.type_name && item.type_name === "送达时间") {
                        waybill.deliveryTime = item.date;
                    }

                    /**
                     * 根据有的物流时间，设置Waybill状态
                     */
                    if(waybill.deliveryTime){
                        waybill.status = STATUS.DELIVERED;
                    }else if(waybill.appointmentTime){
                        waybill.status = STATUS.BOOKED;
                    }else if(waybill.warehouseArrivalTime){
                        waybill.status = STATUS.COLLECTED;
                    }else if(waybill.portArrivalTime){
                        waybill.status = STATUS.ARRIVE_PORT;
                    }else if(waybill.deliveryTime){
                        waybill.status = STATUS.DEPARTED;
                    }
                });

                return waybill;

            } else {
                console.log(`Failed to fetch data: ${response.data.code}`);
                throw new Error(`Failed to fetch data: ${response.data}`);
            }

        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = CDCarrierService;