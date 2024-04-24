// getRequest.js
const axios = require('axios');
const config = require('./config');
const getToken = require('./getToken');

// Функция для выполнения GET-запроса
async function performGetRequest(url) {
  try {
    const token = await getToken(config.remOnlineApiKey);
    if (!token) {
      throw new Error('Failed to obtain token');
    }
    // Выполнение GET-запроса с токеном в параметрах
    const response = await axios.get(url, {
        params: {
          token: token 
        }
      });
    return response.data;
  } catch (error) {
    // Если произошла ошибка, выводим её в консоль и возвращаем null
    console.error('Error:', error);
    return null;
  }
}

module.exports = performGetRequest;
