const config = require('./config/config');
const Imap = require('imap');
import TelegramBot from 'node-telegram-bot-api';
const bot = new TelegramBot(config.getValue('token'), {polling: true});

const imapOptions = {
  user: config.getValue('user'),
  password: config.getValue('password'),
  host: config.getValue('host'),
  port: config.getValue('port'),
  tls: config.getValue('tls')
}

const imap = new Imap(imapOptions);

let _from = [];
let _subject = [];
let _to = [];
let _body = []; 

function search(tag, markSeen = true) {
  imap.search([tag], function (err, results) {
    if (err) throw err;

    if (markSeen) {
        imap.setFlags(results, ['\\Seen'], function (err) {
            if (err) {
                console.log(JSON.stringify(err, null, 2));
            }
        });
    }

    let f = imap.fetch(results, { bodies: ['HEADER.FIELDS (FROM)','HEADER.FIELDS (SUBJECT)', 'TEXT'], struct: true});
    f.on('message', (msg, seqno) => {

      msg.on('body', function (stream, info) {

        let buffer = '';
        stream.on('data', function (chunk) {
          buffer += chunk.toString('utf8');
        });

        stream.once('end', function () {
          if(info.which === 'TEXT') {  
            let buff = new Buffer(buffer, 'base64');  
            _body.push(buff.toString('ascii'));
          } else {
            let parsed = Imap.parseHeader(buffer);
            if (parsed.from) _from.push(parsed.from);
            if (parsed.subject) _subject.push(parsed.subject);
          }
        });
      });
    });
    f.once('error', function (err) {
      console.log('Fetch error: ' + err);
    });
    f.once('end', function () {
        printAll();
        imap.end();
    });

  });
}

imap.on('ready', () => {
  imap.openBox('INBOX', false, function (err, box) {
    if (err) throw err;
    // delete false debug option
    search('UNSEEN', false);

    imap.on('mail', numNewMsg => {
      search('UNSEEN');
    });
  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

function parseBody() {

}

function printAll() {
  console.log("From:");
  console.log(_from);
  console.log("To:");
  console.log(_to);
  console.log("Subject:");
  console.log(_subject);
  console.log("Body:");
  console.log(_body);
}

function startListening() {
  imap.connect();
}

function stopListening() {
  imap.end();
}

console.log(Imap);

bot.on('message', msg => {
    // const {chat} = msg;
    // bot.sendMessage(chat.id, 'Pong');
});

bot.onText(/\/start (.+)/,(msg, [source, match]) => {
  const {chat} = msg;
  // startListening();
});

bot.onText(/\/stop (.+)/,(msg, [source, match]) => {
  const {chat} = msg;
  // stopListening();
});