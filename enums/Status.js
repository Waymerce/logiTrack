const STATUS = Object.freeze({
    IN_PLAN: '计划中',
    DEPARTED: '已开船',
    ARRIVE_PORT: '已到港',
    COLLECTED: '已提取',
    BOOKED: '已预约',
    DELIVERED: '已签收',
    INSPECTION: "查验中",
    RECEIVED: '已上架'
});

module.exports = {
    STATUS
}