const { generateEmailBody } = require('./generateEmailUtils');
const nodemailer = require('nodemailer');

// Функция отправки письма
function sendEmail(clientOrders, email) {
    const transporter = nodemailer.createTransport({
        host: 'mail.adm.tools',
        port: 465,
        secure: true, // используется SSL
        auth: {
          user: 'admin@new-tourpoint.website',
          pass: '29em2EjL8N'
        }
    });

    const mailOptions = {
        from: 'admin@new-tourpoint.website',
        to: "KolchinVolodumur@gmail.com",
        subject: 'Список заказов',
        text: generateEmailBody(clientOrders)
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.error('Ошибка отправки письма:', error);
        } else {
            console.log('Письмо отправлено: ', info.response);
        }
    });
}
module.exports = {
    sendEmail
};