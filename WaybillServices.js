const axios = require('axios');
const Waybill = require('./models/Waybill');  // 你可能需要根据你的文件路径进行调整
const ShippingDetail = require('./models/ShippingDetail');


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

    /**
     * Legacy Method - using for fetching Logistics Status Only
     * @param pageSize
     * @param pageToken
     * @returns {Promise<*[]>}
     */
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


    /**
     * Legacy Method - using for fetching Logistics Status Only
     * @param waybills
     * @returns {Promise<axios.AxiosResponse<any>>}
     */
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
            if (response.status === 200) {
                console.info("SUCCESS UPDATED")
                return response;
            }
        } catch (error) {
            console.log("FAILED TO UPDATED STATUS TO BITABLE");
            console.error("错误详情:", error.response);
            console.log(error);
            //ROLL BACK ACTIONS REQUIRED
        }

    }

    /**
     * It get Records from the Main Logistics Table and Populate the Shipping Details Table.
     * @param shippingDetailsAppToken
     * @param shippingDetailsTableToken
     * @param filterView
     * @returns {Promise<void>}
     */
    async populateShippingDetails(shippingDetailsAppToken, shippingDetailsTableToken, filterView) {
        //Fetch All Waybills That Needs to be updated

        let records = await this.getRecords(this.appToken, this.tableToken, filterView);
        let waybillList = this.getWaybillsFromRecords(records);

        for (const waybill of waybillList) {
            if (waybill.shippingDetailList && waybill.shippingDetailList.length > 0) {
                const updateShippingDetails = await this.updateShippingDetails(shippingDetailsAppToken,
                    shippingDetailsTableToken, waybill.shippingDetailList);

                /*如果成功，更新状态*/
                if (updateShippingDetails) {
                    console.info("Update Details Sucessfully");
                    await this.updateShippingDetailSyncStatus(waybill);
                } else {
                    console.error("ERROR WHILE UPDATING SHIPPING DETAILS TABLE" + waybill.shipmentId);
                }
            }
        }

        console.info("ALL SHIPPING DETAIL LIST NEEDED TO BE UPDATED: ");
    }


    async updateShippingDetailSyncStatus(waybill) {
        const accessToken = await this.feishuAuth.getAccessToken();
        const recordId = waybill.recordId;

        console.info("RECORD ID: " + recordId);
        const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.appToken}/tables/${this.tableToken}/records/${recordId}`;
        // const url='https://open.feishu.cn/open-apis/bitable/v1/apps/bascn4KgdzXZjy2GTZ7OrROqo3g/tables/tblqu7P2S1IcQLoF/records/recFAbh5pO';
        const requestBody = {
            'fields': {
                'Shipping Details Synced': "YES"
            }
        }

        try {
            const response = await axios.put(url, requestBody, {
                headers: {
                    'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json; charset=utf-8'
                }
            });
            if (response.status === 200) {
                console.info("SUCCESS UPDATED")
                return true;
            }
        } catch (error) {
            console.log("FAILED TO UPDATED STATUS TO BITABLE");
            console.error("错误详情:", error.response);
            console.log(error);
            //ROLL BACK ACTIONS REQUIRED
        }
        return false;
    }

    async updateShippingDetails(shippingDetailsAppToken, shippingDetailsTableToken, shippingDetailList) {
        const accessToken = await this.feishuAuth.getAccessToken();
        const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${shippingDetailsAppToken}/tables/${shippingDetailsTableToken}/records`;

        if (shippingDetailList && shippingDetailList.length > 0) {
            // 使用 map 创建一个 promise 列表
            const promises = shippingDetailList.map(shippingDetail => {
                const requestBody = {
                    'fields': {
                        'sku': shippingDetail.sku,
                        '件数': shippingDetail.numOfPieces,
                        '箱数': shippingDetail.numOfBoxes,
                        'ShipmentID': shippingDetail.shipmentID,
                        '商品详情编码': shippingDetail.code
                    }
                };

                return axios.post(url, requestBody, {
                    headers: {
                        'Authorization': 'Bearer ' + accessToken,
                        'Content-Type': 'application/json; charset=utf-8'
                    }
                });
            });

            // 使用 Promise.all 等待所有 promise 完成
            try {
                const responses = await Promise.all(promises);
                // 检查所有响应的状态码是否都为 200
                for (const response of responses) {
                    if (response.status !== 200) {
                        console.error("Request failed with status:", response.status);
                        return false; // 如果任何请求不成功，返回 false
                    }
                }
                return true; // 所有请求都成功，返回 true
            } catch (error) {
                console.error("There was an error with the request:", error);
                return false;
            }
        }
        return false; // 如果没有需要处理的 shippingDetail，返回 false
    }

    getShippingDetailByCode(shippingDetailsCode) {

        // Split the code string into lines
        let lines = shippingDetailsCode.split('\n');

        // Create an array to hold the ShippingDetails objects
        let shippingDetailList = [];

        // Loop through each line and parse the details
        for (let line of lines) {
            // Split the line into its components
            let details = line.split('/');

            // Check if the line was split into five parts
            if (details.length !== 5) {
                // If not, return false
                return false;
            }

            // Create a new ShippingDetails object and populate its fields
            let shippingDetail = new ShippingDetail();
            shippingDetail.sku = details[0];
            shippingDetail.productName = details[1];
            shippingDetail.numOfBoxes = parseInt(details[2]);
            shippingDetail.numOfPieces = parseInt(details[3]);
            shippingDetail.shipmentID = details[4];
            shippingDetail.code = shippingDetailsCode;

            // Add the ShippingDetails object to the array
            shippingDetailList.push(shippingDetail);
        }

        // Return the array of ShippingDetails objects
        return shippingDetailList;
    }


    getWaybillsFromRecords(records) {
        if (records && records.length > 0) {
            let waybillList = [];
            for (let item of records) {
                let waybill = new Waybill();
                waybill.recordId = item.record_id;
                waybill.shippingDetailsCode = item.fields["商品详情编码"];
                waybill.shipmentId = item.fields["ShipmentID"];
                waybill.waybillNum = item.fields["运输商单号"];
                waybill.shipmentId = item.fields["ShipmentID"];
                waybill.warehouseCode = item.fields["AMZ仓库代码"];
                waybill.status = item.fields["物流状态"];
                waybill.shippingDetailList = this.getShippingDetailByCode(waybill.shippingDetailsCode);
                waybillList.push(waybill);
            }
            return waybillList;
        }
    }


    async getRecords(appToken, tableToken, viewToken) {

        /**
         * TODO - Need to verify the appToken & tableToken
         */

        const accessToken = await this.feishuAuth.getAccessToken();
        const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableToken}/records`;
        const pageSize = 100; //Default it to 100 per request;
        let response, pageToken;
        let records = [];

        try {
            do {
                let params = {
                    pageSize: pageSize,
                    view_id: viewToken
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

                records = records.concat(response.data.data.items.map(item => {
                    return item;
                }));

                pageToken = response.data.data.page_token;
            } while (response.data.data.has_more);

            return records;  // return the list of records
        } catch (error) {
            console.error(error);
        }


    }
}

module.exports = WaybillService;
