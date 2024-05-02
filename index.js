const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Підключення cors
const axios = require('axios');
// const { createOrder } = require('./orderService');
const config = require('./config');
const performPostRequest = require('./postRequest');
const performGetRequest = require('./getRequest');
const fs = require('fs');
const { findOrdersByEmail } = require('./Utils/orderUtils'); // Подключаем функцию из нового файла
const { sendEmail } = require('./Utils/emailUtils');
const createOrder = require('./createOrder'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs'); // Установка EJS как шаблонизатора
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const sdk = require('api')('@remonlineua/v1.0#ab2ihuhlt8gf2fu');

// Включення CORS middleware
app.use(cors());

// Настройка статических файлов
app.use('/scripts', express.static(__dirname + '/public'));

// GET запрос для проверки работоспособности сервера
app.get('/', (req, res) => {
    res.send('Сервер работает!! !');
});
// GET запрос для отображения формы
app.get('/form_email', (req, res) => {
    // res.render('index'); // Рендеринг HTML шаблона с помощью EJS
    res.render('index', { message: 'message 222' });
});

// // POST запрос для обработки данных формы
// app.post('/submit_email', async(req, res) => {
//     const email = req.body.email;
    
//     try {
//         performGetRequest( 'https://api.remonline.app/order/')
//         .then(data => {
//             if (data) {

//                 // Пример использования функции
//                 const clientOrders = findOrdersByEmail(data.data, email);
//                 // console.log('clientOrders', clientOrders);
//                 clientOrders.forEach(item => { 
//                     console.log('clientOrders label', item.id_label);
//                     console.log('created_at', item.created_at);
//                 });

//             } else { 
//                 console.log('Failed to fetch data');
//           }
//         });
        
        
//     } catch (error) {
//         console.error('Error fetching order data:', error);
//         res.status(500).send('Error fetching order data');
//     }
// });
// POST запрос для обработки данных формы
app.post('/submit_email', async (req, res) => {
    const email = req.body.email;

    try {
        // Выполняем запрос, чтобы узнать общее количество заказов
        const totalCountData = await performGetRequest('https://api.remonline.app/order/');
        const totalCount = totalCountData.count; // Общее количество заказов
        const totalPages = Math.ceil(totalCount / 50); // Вычисляем общее количество страниц

        // Начинаем поиск с последней страницы и идем к началу
        for (let currentPage = totalPages; currentPage >= 1; currentPage--) {
            const url = `https://api.remonline.app/order/?page=${currentPage}`;
            const data = await performGetRequest(url);

            if (data) {
                const orders = data.data;

                // Ищем заказы по электронной почте на текущей странице
                const clientOrders = findOrdersByEmail(orders, email);
                console.log('start')
                // Если найдены заказы, выводим информацию и завершаем цикл
                // if (clientOrders.length > 0) {
                //     clientOrders.forEach(item => {
                //         console.log('clientOrders label', item.id_label);
                //         console.log('created_at', item.created_at);
                //     });
                //     break;
                // }
                if (clientOrders.length > 0) {
                    clientOrders.forEach(item => {
                        console.log('clientOrders label', item.id_label);
                    })
                    sendEmail(clientOrders, email);
                    res.status(200).send('Письмо отправлено');
                    return;
                }
            } else {
                console.log('Failed to fetch data');
                break;
            }
        }

    } catch (error) {
        console.error('Error fetching order data:', error);
        res.status(500).send('Error fetching order data');
    }
});


app.post('/process_order_data', async (req, res) => {
    try {
        // Получение данных о заказе из запроса
        const orderData = req.body;
        console.log('orderData', orderData);

        // 1. Получение токена от первого API
        const remOnlineResponse = await axios.post('https://api.remonline.app/token/new', {
            api_key: config.remOnlineApiKey
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
            console.log('client exists!!');
            orderData.products.forEach(product => {
                if (product.additionalInfo) {
                    product.additionalInfo.paymentMethod = orderData.paymentMethod;
                } else {
                    product.additionalInfo = { paymentMethod: orderData.paymentMethod };
                }
            });
            
            const products = orderData.products;
            for (const product of products) {
                const orderQuantity = parseInt(product.quantity);

                for (let i = 0; i < orderQuantity; i++) {
                    const serial = Math.floor(Math.random() * 90000) + 10000;
                    try {
                        await createOrder(config.branchId, config.orderType, client.id, product.name, serial, product.additionalInfo, orderData.paymentMethod);
                    } catch (error) {
                        console.error('Error creating order:', error);
                        console.error('Error creating order message:', error.message);
                        // Обработка ошибки
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
                    orderData.products.forEach(product => {
                        if (product.additionalInfo) {
                            product.additionalInfo.paymentMethod = orderData.paymentMethod;
                        } else {
                            product.additionalInfo = { paymentMethod: orderData.paymentMethod };
                        }
                    });

                    for (const product of products) {
                        const orderQuantity = parseInt(product.quantity);
                        for (let i = 0; i < orderQuantity; i++) {
                            try {
                                console.log('product', product);
                                // for (let i = 0; i < orderQuantity; i++) {
                                    const serial = Math.floor(Math.random() * 90000) + 10000;
                                    try {
                                        await createOrder(config.branchId, config.orderType, newClientResponse.data.data.id, product.name, serial, product.additionalInfo);
                                    } catch (error) {
                                        console.error('Error creating order:', error);
                                        console.error('Error creating order message:', error.message);
                                        // Обработка ошибки
                                    }
                                // }

                                // console.log('22 Order newOrderResponse:', orderResponse.data);
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