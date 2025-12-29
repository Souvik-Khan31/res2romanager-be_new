const axios = require('axios');
const crypto = require('crypto');

const initiatePayment = async (amount, orderId, customerId) => {
    const merchantTransactionId = crypto.randomUUID();
    const merchantId = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT';
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;

    const amountInPaise = Math.round(amount * 100);
    const apiPath = '/pg/v1/pay';

    const payload = {
        merchantId: merchantId,
        merchantTransactionId: merchantTransactionId,
        merchantUserId: customerId || 'MUID' + crypto.randomUUID().slice(0, 8),
        amount: amountInPaise,
        redirectUrl: `${process.env.PHONEPE_CALLBACK_URL}?transactionId=${merchantTransactionId}&orderId=${orderId}`,
        redirectMode: 'REDIRECT',
        callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/phonepe/webhook`,
        paymentInstrument: {
            type: 'PAY_PAGE'
        }
    };

    const base64EncodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const stringToHash = base64EncodedPayload + apiPath + saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const checksum = sha256 + '###' + saltIndex;

    try {
        console.log('--- PhonePe Initiation ---');
        console.log('Merchant:', merchantId);

        const response = await axios.post(
            `${process.env.PHONEPE_API_URL}${apiPath}`,
            { request: base64EncodedPayload },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': checksum,
                    'accept': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data,
            merchantTransactionId: merchantTransactionId
        };
    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error('PhonePe Error:', errorData);
        return {
            success: false,
            error: errorData
        };
    }
};

const verifyPaymentStatus = async (merchantTransactionId) => {
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;

    const apiPath = `/ pg / v1 / status / ${merchantId}/${merchantTransactionId}`;
    const stringToHash = apiPath + saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const checksum = sha256 + '###' + saltIndex;

    try {
        const response = await axios.get(
            `${process.env.PHONEPE_API_URL}${apiPath}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': checksum,
                    'X-MERCHANT-ID': merchantId,
                    'accept': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('PhonePe Status Verification Error:', error.response ? error.error : error.message);
        return {
            success: false,
            error: error.response ? error.response.data : error.message
        };
    }
};

module.exports = {
    initiatePayment,
    verifyPaymentStatus
};
