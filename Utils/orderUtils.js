// function findOrdersByEmail(data, targetEmail) {
//     const filteredData = [];
//     let foundMatchingEmail = false;

//     for (let i = data.length - 1; i >= 0; i--) {
//         const item = data[i];
//         if (item.client.email === targetEmail) {
//             foundMatchingEmail = true;
//             filteredData.push(item);
//         } else {
//             if (foundMatchingEmail) {
//                 break;
//             }
//         }
//     }

//     return filteredData;
// } 

// module.exports = {
//     findOrdersByEmail
// };
function findOrdersByEmail(orders, email) {
    // Фильтруем заказы, оставляя только те, у которых совпадает email клиента
    const clientOrders = orders.filter(order => order.client && order.client.email === email);
    return clientOrders;
}

module.exports = {
    findOrdersByEmail
};