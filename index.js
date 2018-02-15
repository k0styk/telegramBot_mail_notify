// import TelegramBot from 'node-telegram-bot-api';

// const config = require('./config/config');
// const bot = new TelegramBot(config.getValue('token'), {polling: true});

// bot.on('message', msg => {
//     const {chat} = msg;
//     bot.sendMessage(chat.id, 'Pong');
// });

const MailListener = require("mail-listener2");

const mailListener = new MailListener({
  username: "bot.8ot@yandex.ru",
  password: "Lada2105!",
  host: "imap.yandex.ru",
  port: 993,
  tls: true,
  connTimeout: 10000,
  authTimeout: 5000,
  debug: console.log,
  tlsOptions: { rejectUnauthorized: false },
  mailbox: "INBOX",
  searchFilter: ["UNSEEN", "FLAGGED"],
  markSeen: true,
  fetchUnreadOnStart: true,
  mailParserOptions: {streamAttachments: true},
  attachments: true,
  attachmentOptions: { directory: "attachments/" }
});

mailListener.start(); // start listening

// stop listening
//mailListener.stop();

mailListener.on("server:connected", function(){
  console.log("imapConnected");
});

mailListener.on("server:disconnected", function(){
  console.log("imapDisconnected");
});

mailListener.on("error", function(err){
  console.log(err);
});

mailListener.on("mail", function(mail, seqno, attributes){
  // do something with mail object including attachments
  console.log("emailParsed", mail);
  // mail processing code goes here
});

mailListener.on("attachment", function(attachment){
  console.log(attachment.path);
});