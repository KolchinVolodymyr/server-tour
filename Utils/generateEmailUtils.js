// Функция для формирования текста сообщения
function generateEmailBody(clientOrders) {
    let emailBody = 'Список заказов:\n\n';

    clientOrders.forEach((order, index) => {
        emailBody += `Заказ ${index + 1}:\n`;
        emailBody += `ID: ${order.id_label}\n`;
        emailBody += `Дата создания: ${new Date(order.created_at)}\n`;
        emailBody += '\n';
    });

    return emailBody;
}

module.exports = {
    generateEmailBody
};