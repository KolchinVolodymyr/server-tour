const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Підключення cors
const axios = require('axios');
// const { createOrder } = require('./orderService');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Включення CORS middleware
app.use(cors());

// GET запрос для проверки работоспособности сервера
app.get('/', (req, res) => {
    res.send('Сервер работает!! !');
});

const sdk = require('api')('@remonlineua/v1.0#ab2ihuhlt8gf2fu');

app.post('/process_order_data', async (req, res) => {
    try {
        // Получение данных о заказе из запроса
        const orderData = req.body;
        console.log('orderData', orderData);

        // 1. Получение токена от первого API
        const remOnlineResponse = await axios.post('https://api.remonline.app/token/new', {
            // api_key: '59457a2d14f247d4b0097db8b8d25a5a' // Публичный API ключ
            // api_key: '58538138a467432aac79d90684195285'
            api_key: config.remOnlineApiKey
            // Дополнительные параметры запроса, если необходимо
        });

        // Извлечение токена из ответа первого API
        const token = remOnlineResponse.data.token;

        // Авторизация SDK с использованием полученного токена
        sdk.auth(token);

        // 2. Получение списка всех счетов с базы данных
        const perPage = 50; // Количество элементов на странице
        let allInvoices = [];

        async function getAllInvoices() {
            let currentPage = 1;
            let totalPages = 1;
        
            try {
                // Получаем данные с первой страницы
                const response = await sdk.invoicesCopy({ page: currentPage, perPage });
                const { data } = response;
        
                allInvoices = allInvoices.concat(data);
        
                // Определяем общее количество страниц
                const totalCount = response.data.count;
                totalPages = Math.ceil(totalCount / perPage);
            } catch (error) {
                console.error('Error:', error);
                throw error; // Пробросить ошибку для обработки во внешнем коде
            }
        
            // Запрашиваем данные для остальных страниц
            for (currentPage = 2; currentPage <= totalPages; currentPage++) {
                try {
                    const response = await sdk.invoicesCopy({ page: currentPage, perPage });
                    const { data } = response;
                    allInvoices = allInvoices.concat(data);
                } catch (error) {
                    console.error('Error:', error);
                    // Обработка ошибок
                }
            }
        
            return allInvoices;
        }

        // Получение всех счетов
        const allInvoicesList = await getAllInvoices();
        // console.log('allInvoicesList', allInvoicesList);
        
        const allInvoicesData = allInvoicesList.reduce((acc, curr) => {
            return acc.concat(curr.data);
        }, []);
        // console.log('allInvoicesData', allInvoicesData);
        // Проверка наличия email в базе данных (ответ от второго запроса)
        const client = allInvoicesData.find((invoice) => invoice.email === orderData.email);

        if (client) {
            // Клиент существует
            console.log('client exists');

            const products = orderData.products;
            for (const product of products) {
                const orderQuantity = parseInt(product.quantity);

                for (let i = 0; i < orderQuantity; i++) {
                    try {
                        console.log('product.additionalInfo', product.additionalInfo);
                        const orderResponse = await sdk.getOrdersCopy({
                            branch_id: config.branchId,
                            order_type: config.orderType,
                            client_id: client.id,
                            // kindof_good: "sssssss",
                            // brand: "ddddd",
                            // model: product.name,
                            brand: product.name,
                            //assigned_at: //Час запису клієнта
                            manager_notes: JSON.stringify(product.additionalInfo)
                            // Дополнительные параметры заказа, если необходимо
                        });
                        console.log('Order newOrderResponse:', orderResponse.data);
                    } catch (error) {
                        console.error('Error creating order:', error);
                        console.error('Error creating order message:', error.data.message);
                        throw error;
                    }
                }
            }
        } else {
            // Создание нового клиента
            console.log('Create a new client');
            try {
                const newClientResponse = await sdk.clientsCopy({
                    name: orderData.name,
                    phone: '',
                    email: orderData.email,
                    address: orderData.address,
                    notes: `tel: ${orderData.tell}`
                });
        
                if (newClientResponse.data.success) {
                    console.log('Create a new order for the new client');
        
                    // Создание нового заказа для нового клиента
                    const products = orderData.products;
                    for (const product of products) {
                        const orderQuantity = parseInt(product.quantity);
                        for (let i = 0; i < orderQuantity; i++) {
                            try {
                                const orderResponse = await sdk.getOrdersCopy({
                                    // branch_id: 160752,
                                    branch_id: config.branchId,
                                    // order_type: 259583,
                                    order_type: config.orderType,
                                    client_id: newClientResponse.data.data.id,
                                    // model: product.name,
                                    brand: product.name,
                                    manager_notes: JSON.stringify(product.additionalInfo)
                                });
                                console.log('Order newOrderResponse:', orderResponse.data);
                            } catch (error) {
                                console.error('Error creating order:', error);
                                console.error('Error creating order message:', error.data.message);
                                throw error;
                            }
                        }
                    }
                } else {
                    console.log('Failed to create a new client');
                }
            } catch (error) {
                console.error('Error creating new client:', error);
            }
        }

        res.json({ success: true, message: 'The order data has been processed successfully' });
    } catch (error) {
        console.error('Order processing error:', error);
        res.status(500).json({ success: false, message: 'Order processing error' });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});