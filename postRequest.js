// postRequest.js

const axios = require('axios');

// Функция для выполнения POST-запроса
async function performPostRequest(url, requestData) {
  try {
    // Выполнение POST-запроса к указанному URL с данными запроса
    const response = await axios.post(url, requestData);
    // Возвращаем данные ответа
    return response.data;
  } catch (error) {
    // Если произошла ошибка, выводим её в консоль и возвращаем null
    console.error('Error:', error);
    return null;
  }
}

module.exports = performPostRequest;
