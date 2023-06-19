const axios = require('axios');

class FeishuAuth {
    constructor(appId, appSecret) {
        this.appId = appId;
        this.appSecret = appSecret;
        this.token = null;
        this.tokenExpiration = null;
    }

    async getAccessToken() {
        // 如果 token 还有效，直接返回
        if (this.token && Date.now() < this.tokenExpiration) {
            return this.token;
        }

        // 飞书 API endpoint
        const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/';

        // 你的 App ID 和 App Secret
        const data = {
            app_id: this.appId,
            app_secret: this.appSecret
        };

        try {
            const response = await axios.post(url, data);
            // 获取 access_token
            this.token = response.data.tenant_access_token;
            // 假设 token 的有效期为 2 小时
            this.tokenExpiration = Date.now() + response.data.expire * 1000;
            return this.token;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}

module.exports = FeishuAuth;