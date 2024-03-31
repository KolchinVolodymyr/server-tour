const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Підключення cors
const axios = require('axios');

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
            api_key: '59457a2d14f247d4b0097db8b8d25a5a' // Публичный API ключ
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
            // console.log('client', client)
            // Создание заказа для существующего клиента
            const orderResponse = await sdk.getOrdersCopy({
                branch_id: 160137,
                order_type: 258707,
                client_id: client.id 
                // Дополнительные параметры заказа, если необходимо
            });
            console.log('Order response:', orderResponse.data);
        } else {
            // Создание нового клиента
            console.log('Create a new client');
            sdk.clientsCopy({
                name: orderData.name,
                phone: '',
                email: orderData.email,
                address: orderData.address,
                notes: `tel: ${orderData.tell}`
            }).then(newClientResponse => {
                // console.log('New client response:', newClientResponse.data);
                // console.log('newClientResponse.data', newClientResponse.data.data.id)

                // Проверяем, что клиент успешно создан
                if (newClientResponse.data.success) {
                    // Создаем новый заказ для нового клиента
                    console.log('Create a new order for the new client');
                    sdk.getOrdersCopy({
                        branch_id: 160137,
                        order_type: 258707,
                        client_id: newClientResponse.data.data.id, // Используем ID только что созданного клиента
                        // Дополнительные параметры заказа, если необходимо
                    }).then(newOrderResponse => {
                        console.log('New order response:', newOrderResponse.data);
                    }).catch(error => {
                        console.error('Error creating new order:', error);
                    });
                } else {
                    console.log('Failed to create a new client');
                }
            }).catch(error => {
                console.error('Error creating new client:', error);
            });
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