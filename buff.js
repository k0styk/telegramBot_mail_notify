var Imap = require("imap");
var MailParser = require("mailparser").MailParser;
var Promise = require("bluebird");
Promise.longStackTraces();

var imapConfig = {
  user: 'bot.8ot@yandex.ru',
  password: 'Lada2105!',
  host: 'imap.yandex.ru',
  port: 993,
  tls: true
};

var imap = new Imap(imapConfig);
Promise.promisifyAll(imap);

imap.once("ready", execute);
imap.once("error", function(err) {
    log.error("Connection error: " + err.stack);
});

imap.connect();

function execute() {
    imap.openBox("INBOX", false, function(err, mailBox) {
        if (err) {
            console.error(err);
            return;
        }
        imap.search(["UNSEEN"], function(err, results) {
            if(!results || !results.length){console.log("No unread mails");imap.end();return;}
            /* mark as seen
            imap.setFlags(results, ['\\Seen'], function(err) {
                if (!err) {
                    console.log("marked as read");
                } else {
                    console.log(JSON.stringify(err, null, 2));
                }
            });*/

            var f = imap.fetch(results, { bodies: "" });
            f.on("message", processMessage);
            f.once("error", function(err) {
                return Promise.reject(err);
            });
            f.once("end", function() {
                console.log("Done fetching all unseen messages.");
                imap.end();
            });
        });
    });
}


function processMessage(msg, seqno) {
    console.log("Processing msg #" + seqno);
    // console.log(msg);

    var parser = new MailParser();
    parser.on("headers", function(headers) {
        console.log("Header: " + JSON.stringify(headers));
    });

    parser.on('data', data => {
        if (data.type === 'text') {
            console.log(seqno);
            console.log(data.text);  /* data.html*/
        }

        // if (data.type === 'attachment') {
        //     console.log(data.filename);
        //     data.content.pipe(process.stdout);
        //     // data.content.on('end', () => data.release());
        // }
     });

    msg.on("body", function(stream) { 
      stream.on("data", function(chunk) {
            parser.write(chunk.toString("utf8"));
        });
    });
    msg.once("end", function() {
        // console.log("Finished msg #" + seqno);
        parser.end();
    });
}
// import TelegramBot from 'node-telegram-bot-api';

// const config = require('./config/config');
// const bot = new TelegramBot(config.getValue('token'), {polling: true});

// bot.on('message', msg => {
//     const {chat} = msg;
//     bot.sendMessage(chat.id, 'Pong');
// });

// const MailListener = require("mail-listener2");

// const mailListener = new MailListener({
//   username: "bot.8ot@yandex.ru",
//   password: "Lada2105!",
//   host: "imap.yandex.ru",
//   port: 993,
//   tls: true,
//   connTimeout: 10000,
//   authTimeout: 5000,
//   debug: console.log,
//   tlsOptions: { rejectUnauthorized: false },
//   mailbox: "INBOX",
//   searchFilter: ["UNSEEN", "FLAGGED"],
//   markSeen: true,
//   fetchUnreadOnStart: true,
//   mailParserOptions: {streamAttachments: true},
//   attachments: true,
//   attachmentOptions: { directory: "attachments/" }
// });

// mailListener.start(); // start listening

// // stop listening
// //mailListener.stop();

// mailListener.on("server:connected", function(){
//   console.log("imapConnected");
// });

// mailListener.on("server:disconnected", function(){
//   console.log("imapDisconnected");
// });

// mailListener.on("error", function(err){
//   console.log(err);
// });

// mailListener.on("mail", function(mail, seqno, attributes){
//   // do something with mail object including attachments
//   console.log("emailParsed", mail);
//   // mail processing code goes here
// });

// mailListener.on("attachment", function(attachment){
//   console.log(attachment.path);
// });