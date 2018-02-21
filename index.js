var Imap = require('imap');
var inspect = require('util').inspect;
var fs = require('fs'), fileStream;

var imap = new Imap({
  user: 'bot.8ot@yandex.ru',
  password: 'Lada2105!',
  host: 'imap.yandex.ru',
  port: 993,
  tls: true
});


var _from;
var _subject;
function search(tag) {
  imap.search([tag], function (err, results) {
    if (err) throw err;

    var f = imap.fetch(results, { bodies: ['HEADER.FIELDS (FROM)','HEADER.FIELDS (SUBJECT)', 'TEXT'] });
    f.on('message', (msg, seqno) => {
      console.log('Message #%d', seqno);
      var prefix = '(#' + seqno + ') ';
      msg.on('body', function (stream, info) {
        console.log(prefix + 'Body');
        var buffer = '';
        stream.on('data', function (chunk) {
          buffer += chunk.toString('utf8');
        });
        stream.once('end', function () {
          var parsed = inspect(Imap.parseHeader(buffer));
          if(~parsed.indexOf('from')) {
            _from = parse_fields(parsed);
          } else if(~parsed.indexOf('subject')) {
            _subject = parse_fields(parsed);
          }
          console.log(prefix + 'Parsed header: %s', parsed);
        });
      });
    });
    f.once('error', function (err) {
      console.log('Fetch error: ' + err);
    });
    f.once('end', function () {
      console.log('Done fetching all messages!');

      printAll();
      imap.end();
    });
  });
}

imap.on('ready', () => {
  imap.openBox('INBOX', true, function (err, box) {
    if (err) throw err;
    search('UNSEEN');

    imap.on('mail', numNewMsg => {
      console.log(numNewMsg);
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

imap.connect();


function printAll() {
  console.log("From: %s",_from);
  console.log("Subject: %s",_subject);
}

function parse_fields(str) {
  const newStr = str.replace(/{|}/g,'').trim();
  const result = newStr.split(':')[1].replace(/\[|\]|\'/g,'').trim();
  return result;
}