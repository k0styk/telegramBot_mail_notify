const config = require('./config/config');
const Imap = require('imap');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.getValue('token'), {polling: true});
const fs = require('fs');

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
          buffer += chunk.toString('utf-8');
        });

        stream.once('end', function () {
          if(info.which === 'TEXT') {  
            let buff = new Buffer(buffer, 'base64');  
            _body.push(buff.toString('utf-8'));
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
        // imap.end();
        // sendDataToChat();
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
  //fs.writeFile('body_utf.txt',_body[0],'utf-8');
}

function startListening() {
  imap.connect();
}

function stopListening() {
  imap.end();
}

function sendDataToChat() {
  if(meow) {
    const resString = getMessage();

    bot.sendMessage(meow, resString);
  }
}

function getMessage() {
  fs.readFile('body_utf.txt', 'utf-8', (err, data) => {
    const ticketExp = /<div style="font-size:17px; color:#0080c6; font-weight:bold; margin-bottom:10px">.+?<\/div>/i;
    const defaultTickets = ['Новое сообщение от провайдера', 'Новое сообщение от клиента', 'Уведомление о новой задаче', 'Запрос закрыт сотрудником'];
    const ticketRaw = data.match(ticketExp);
    const ticket = ticketRaw[0].replace(/(<div .+?>)|(<\/div>)/g, '').trim();

    const liExp = /<li class="item">.+?<\/li>/ig;
    const textExp = /<p class="ticket">.+?<\/p>/ig;


    if (ticket === defaultTickets[0]) {
      const defaultString = 'Сообщение:';
      const myObj = [];
      const listsRaw = data.match(liExp);
      const textRaw = data.match(textExp);

      for (let i = 0; i < listsRaw.length - 1; i++) {
        let regEx1 = /<b>.+?<\/b>/;
        let regEx2 = /<\/b>.+?<\/li>/;
        let str1 = listsRaw[i].match(regEx1)[0].replace(/(<b>)|(<\/b>)/g, '').trim();
        let str2 = listsRaw[i].match(regEx2)[0].replace(/(<\/b>)|(<\/li>)/g, '').trim();

        myObj.push([str1, str2]);
      }

      const textRaw1 = textRaw[0].replace(/(<p class="ticket">)|(<\/p>)/g, '').trim();
      const text = textRaw1.replace(/<br\/>/g, '\n').trim();
      myObj.push(defaultString,text);
      return myObj;
    } else if (ticket === defaultTickets[1]) {

    } else if (ticket === defaultTickets[2]) {

    } else if (ticket === defaultTickets[3]) {

    } else {
      // suka blet
      return ';(';
    }
  });
}

bot.on('message', msg => {});

let meow = null;

bot.onText(/\/start/,(msg, [source, match]) => {
  bot.sendMessage(msg.chat.id, '... WELCOME ...');
});

bot.onText(/\/startlisten/,(msg, [source, match]) => {
  meow = msg.chat.id;
  startListening();
});

bot.onText(/\/stop/,(msg, [source, match]) => {
  const {chat} = msg;
  stopListening();
});

bot.onText(/\/try/,(msg, [source, match]) => {
  const {chat} = msg;
  let message = getMessage();
  console.log(message);
});