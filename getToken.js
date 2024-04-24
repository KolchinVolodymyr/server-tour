const axios = require('axios');

// Функция для получения токена
async function getToken(apiKey) {
  try {
    // Выполнение POST-запроса для получения токена
    const response = await axios.post('https://api.remonline.app/token/new', {
      api_key: apiKey
    });
    // Возвращаем полученный токен
    return response.data.token;
  } catch (error) {
    // Если произошла ошибка, выводим её в консоль и возвращаем null
    console.error('Error fetching token:', error);
    return null;
  }
}

module.exports = getToken;
