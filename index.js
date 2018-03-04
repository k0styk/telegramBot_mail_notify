process.env["NTBA_FIX_319"] = 1;
const config = require('./config/config');
const Imap = require('imap');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.getValue('token'), {polling: true});

const imapOptions = {
  user: config.getValue('user'),
  password: config.getValue('password'),
  host: config.getValue('host'),
  port: config.getValue('port'),
  tls: config.getValue('tls')
}

const imap = new Imap(imapOptions);
let _message = [];
let _from = [];
let _body = [];
let _subject = [];
let timerId = null;
let chatId = null;

function search(tag, options, markSeen = true) {
  imap.search([tag], function (err, results) {
    if (err) throw err;
    if(results.length) {
      if (markSeen) {
        imap.setFlags(results, ['\\Seen'], function (err) {
          if (err) { console.log(err); }
        });
      }

      let f = imap.fetch(results, options);
      f.on('message', (msg, seqno) => {

        msg.on('body', function (stream, info) {

          let buffer = '';
          stream.on('data', function (chunk) {
            buffer += chunk.toString('utf-8');
          });

          stream.once('end', function () {
            if (info.which === 'TEXT') {
              let buff = new Buffer(buffer, 'base64');
              _body.push(buff.toString('utf-8'));
            } else {
              let parsed = Imap.parseHeader(buffer);
              if (parsed.from) _from.push(parsed.from[0]);
              if (parsed.subject) _subject.push(parsed.subject[0]);
            }
          });

        });
      });

      f.once('error', function (err) {
        console.log('Fetch error: ' + err);
      });

      f.once('end', function () {
        for(let i=0;i<_from.length;i++) {
          _message.push({from: _from[i], subject: _subject[i], body: _body[i]});
        }
        _from = [];
        _body = [];
        _subject = [];
        sendAllMessages();
      });
  }
  });
}

imap.on('ready', () => {
  console.log('Connection OK');
  imap.openBox('INBOX', false, function (err, box) {
    if (err) {
      console.log("### Error open inbox:");
      throw err;
    }
    timerId = setTimeout(function run() {
      search('UNSEEN', { bodies: ['HEADER.FIELDS (FROM)','HEADER.FIELDS (SUBJECT)'], struct: true });
      timerId = setTimeout(run, 15000);
    }, 15000);
  });
});

function clearData() {
  if(timerId) {
    clearTimeout(timerId);
  }
  timerId = null;
  _message = [];
  _from = [];
  _body = [];
  _subject = [];
}

imap.once('error', function(err) {
  console.log(err);
  clearData();
});

imap.once('end', function() {
  console.log('Connection ended');
  clearData();
});

function startListening() {
  if(~imap.state.indexOf('auth') || imap.state === 'connected') {
    return;
  } 
  imap.connect();
  send('_Start listening_...',{parse_mode:'Markdown'});
}

function stopListening() {
  if(~imap.state.indexOf('auth') || imap.state === 'connected') {
    imap.end();
    send('_Listening stopped_...', { parse_mode: 'Markdown' });
  }
}

let index = 0;
let chain = Promise.resolve();
function sendAllMessages() {
  try {
    _message.forEach((message)=> {
      chain = chain
        .then(() => {
          index++;
          const optionsMessage = {};
          let resMessage = '';

          if (~message.from.indexOf('info@mclouds.ru')) {
            const data = message.body;
            if (data) {
              const arr = getMessage(data);
              let resString = arr[0] + '\n';
              for (let i = 1; i < arr.length; i++) {
                resString += arr[i][0] + ' ' + arr[i][1] + '\n';
              }
              resMessage = resString;
            } else {
              resMessage = 'Не могу прочитать тело письма';
            }
          } else {
            resMessage = 'Новое сообщение!\nОт: ' + message.from + '\nТема: ' + message.subject ? message.subject : 'Тема письма не установлена';
          }
          return send(resMessage,optionsMessage);
        })
        .then((result) => {

          console.log(result);
          console.log(index);
        });
    });
  } catch (er) {
    console.log(er);
  }
  _message = [];
}

// function meow() {
//   _message.forEach((msg)=> {
//     chain = chain
//       .then(() => send('_MEOW_',{parse_mode:'Markdown'}))
//       .then((result) => {
//         console.log(result);
//         results.push(result);
//       });
//   });
// }

function send(data, options) {
  return bot.sendMessage(chatId, data, options);
}

function getMessage(data) {
  const ticketExp = /<div style="font-size:17px; color:#0080c6; font-weight:bold; margin-bottom:10px">.+?<\/div>/i;
  const defaultTickets = ['Новое сообщение от провайдера', 'Новое сообщение от клиента', 'Уведомление о новой задаче', 'Запрос закрыт сотрудником'];
  const ticketRaw = data.match(ticketExp);
  const ticket = ticketRaw[0].replace(/(<div .+?>)|(<\/div>)/g, '').trim();
  const defaultString = 'Сообщение:';
  const myObj = [];
  myObj.push(ticket);

  // Сообщение от провайдера
  if (ticket === defaultTickets[0]) {
    const liExp = /<li class="item">.+?<\/li>/ig;
    const textExp = /<p class="ticket">.+?<\/p>/ig;

    const listsRaw = data.match(liExp);
    const textRaw = data.match(textExp);
    const listData = listsRaw.filter((val) => {
      return !~val.indexOf('Код');
    });

    for (let i = 0; i < listData.length - 1; i++) {
      let regEx1 = /<b>.+?<\/b>/;
      let regEx2 = /<\/b>.+?<\/li>/;
      let str1 = listData[i].match(regEx1)[0].replace(/(<b>)|(<\/b>)/g, '').trim();
      let str2 = listData[i].match(regEx2)[0].replace(/(<\/b>)|(<\/li>)/g, '').trim();

      myObj.push([str1, str2]);
    }
    const textRaw1 = textRaw[0].replace(/(<p class="ticket">)|(<\/p>)/g, '').trim();
    const text = textRaw1.replace(/<br\/>/g, '\n').trim();

    myObj.push([defaultString, text]);
    return myObj;
  } // Сообщение от клиента
  else if (ticket === defaultTickets[1]) {
    const p1Exp = /<p class="data">.+?<\/p>/ig;
    const p2Exp = /<p class="thread">.+?<\/p>/ig;
    const textExp = /<p class="ticket">.+?<\/p>/ig;
    const listsRaw = data.match(p1Exp);
    const textRaw = data.match(textExp);
    listsRaw.push(data.match(p2Exp)[0]);
    const listData = listsRaw.filter((val) => {
      return (!~val.indexOf('Сообщение'))&(!~val.indexOf('Код'));
    });

    for (let i = 0; i < listData.length; i++) {
      let regEx1 = /<b>.+?<\/b>/;
      let regEx2 = /<\/b>.+?<\/p>/;
      let str1 = listData[i].match(regEx1)[0].replace(/(<b>)|(<\/b>)/g, '').trim();
      let str2 = listData[i].match(regEx2)[0].replace(/(<\/b>)|(<\/p>)/g, '').trim();
      myObj.push([str1, str2]);
    }
    const textRaw1 = textRaw[0].replace(/(<p class="ticket">)|(<\/p>)/g, '').trim();
    const text = textRaw1.replace(/<br\/>/g, '\n').trim();

    myObj.push([defaultString, text]);
    return myObj;
  } // уведомление о новой задаче
  else if (ticket === defaultTickets[2]) {
    const p1Exp = /<p><b>.+?<\/p>/ig;
    const listsRaw = data.match(p1Exp);
    const listData = listsRaw.filter((val) => {
      return ~val.indexOf('Описание задачи');
    });
    let regEx1 = /<b>.+?<\/b>/;
    let regEx2 = /<\/b>.+?<\/p>/;
    let str1 = listData[0].match(regEx1)[0].replace(/(<b>)|(<\/b>)/g, '').trim();
    let str2 = listData[0].match(regEx2)[0].replace(/(<\/b>)|(<\/p>)/g, '').trim();
    myObj.push([str1, str2]);
    return myObj;
  } // Запрос закрыт сотрудником
  else if (ticket === defaultTickets[3]) {
    const p1Exp = /<p class="data">.+?<\/p>/ig;
    const listsRaw = data.match(p1Exp);
    const listData = listsRaw.filter((val) => {
      return !~val.indexOf('Код');
    });
    for (let i = 0; i < listData.length; i++) {
      let regEx1 = /<b>.+?<\/b>/;
      let regEx2 = /<\/b>.+?<\/p>/;
      let str1 = listData[i].match(regEx1)[0].replace(/(<b>)|(<\/b>)/g, '').trim();
      let str2 = listData[i].match(regEx2)[0].replace(/(<\/b>)|(<\/p>)/g, '').trim();
      myObj.push([str1, str2]);
    }
    return myObj;
  } // nothing
  else {
    myObj.push(';(');
    return myObj;
  }
}

bot.onText(/\/listen/,(msg, [source, match]) => {
  chatId = msg.chat.id;
  startListening();
});

bot.onText(/\/endlisten/,(msg, [source, match]) => {
  stopListening();
});

bot.onText(/\/meow/, (msg, [source, match]) => {
  chatId = msg.chat.id;
  console.log(index);
});