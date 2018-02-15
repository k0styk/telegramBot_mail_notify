import TelegramBot from 'node-telegram-bot-api';

const config = require('./src/utils/config');
const bot = new TelegramBot(config.getValue('token'), {polling: true});

bot.on('message', msg => {
    const {chat} = msg;
    bot.sendMessage(chat.id, 'Pong');
});
