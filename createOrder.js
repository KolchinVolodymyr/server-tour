const axios = require('axios');
const config = require('./config');
const getToken = require('./getToken');

async function createOrder(branchId, orderType, clientId, brand, serial, managerNotes) {
    try {
        const token = await getToken(config.remOnlineApiKey);
        if (!token) {
          throw new Error('Failed to obtain token');
        }
        const orderData = {
            branch_id: branchId,
            order_type: orderType,
            client_id: clientId,
            brand: brand,
            serial: String(serial),
            manager_notes: JSON.stringify(managerNotes)
        };

        const response = await axios.post('https://api.remonline.app/order/', orderData, {
            params: {
                token: token 
            }
        });
        // console.log('serial', serial);
        // console.log('orderData', orderData); 
        // console.log('Order newOrderResponse:', response.data);
        return response.data; // Возвращаем данные о созданном заказе
    } catch (error) {
        console.error('Error creating order:', error);
        console.error('Error creating order message:', error.message);
        throw error;
    }
}

module.exports = createOrder;
