const FeishuAuth = require('./FeishuAuth');
const WaybillService = require('./WaybillServices');
const CDCarrierService = require('./CDCarrierService');

//1. 连接飞书多维表

const appId = "";
const appSecret = "";

const appToken = "";
const tableToken = ""

// 固定好的View，可以避免代码里面选择filter
const viewToken = ""

const cdUsername = "";
const cdPassword = "";

let feishuAuth = new FeishuAuth(appId, appSecret);


const waybillService = new WaybillService(appToken, tableToken, viewToken, feishuAuth);

async function main() {
    const records = await waybillService.fetchRecords();
    let cdCarrierService = new CDCarrierService(cdUsername, cdPassword);

    for (const waybill of records) {
        await cdCarrierService.fetchWaybillDetails(waybill);
    }

    console.log(records.length);
    console.log(records);

    let updateResults = await waybillService.updateRecords(records);

    console.log("RESULTS");
    console.log(updateResults);

}

main();

//2. 搜索不是已上架或者已到达的Shipment


//3.搜索赤道订单


//4.获取安全Token


//5.逐个查询订单，并存储在Waybill的类下


//6.更新飞书的表格数据