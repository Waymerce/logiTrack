const axios = require('axios');
const Waybill = require('./models/Waybill');  // 你可能需要根据你的文件路径进行调整


class WaybillService {

    appToken;
    tableToken;
    viewToken;

    constructor(appToken, tableToken, viewToken, feishuAuth) {
        this.appToken = appToken;
        this.tableToken = tableToken;
        this.viewToken = viewToken;
        this.feishuAuth = feishuAuth;
    }

    async fetchRecords(pageSize = 100, pageToken = null) {
        const accessToken = await this.feishuAuth.getAccessToken();
        const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.appToken}/tables/${this.tableToken}/records`;
        let waybills = [];
        let response;

        try {
            do {
                let params = {
                    pageSize: pageSize,
                    view_id: this.viewToken
                };
                if (pageToken) {
                    params.page_token = pageToken;
                }
                response = await axios.get(url, {
                    params: params,
                    headers: {
                        'Authorization': 'Bearer ' + accessToken
                    }
                });

                waybills = waybills.concat(response.data.data.items.map(item => {
                    let waybill = new Waybill();
                    waybill.waybillNum = item.fields["运输商单号"];
                    waybill.shipmentId = item.fields["ShipmentID"];
                    waybill.warehouseCode = item.fields["AMZ仓库代码"];
                    waybill.status = item.fields["物流状态"];
                    waybill.recordId = item.record_id;
                    if (waybill.waybillNum) {
                        return waybill;
                    }
                }));

                pageToken = response.data.data.page_token;
            } while (response.data.data.has_more);

            return waybills;
        } catch (error) {
            console.error(error);
        }
    }


    async updateRecords(waybills) {
        const accessToken = await this.feishuAuth.getAccessToken();
        const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.appToken}/tables/${this.tableToken}/records/batch_update`


        const requestBody = {
            "records": waybills.map(waybill => ({
                record_id: waybill.recordId,
                fields: {
                    "API状态": waybill.status,
                    "开船日期": waybill.departureTime,
                    "预期到港": waybill.portETA,
                    "到仓日期": waybill.warehouseArrivalTime,
                    "预约日期": waybill.appointmentTime,
                    "送达日期": waybill.deliveryTime
                }
            }))
        }

        try {
            const response = await axios.post(url, requestBody, {
                headers: {
                    'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json; charset=utf-8'
                }
            });
            if(response.status === 200){
                console.info("SUCCESS UPDATED")
                return response;
            }
        } catch (error) {
            console.log("FAILED TO UPDATED STATUS TO BITABLE");
            console.error("错误详情:", error.response );
            console.log(error);
            //ROLL BACK ACTIONS REQUIRED
        }

    }
}

module.exports = WaybillService;
