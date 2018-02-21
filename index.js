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

function search(tag) {
  imap.search([tag], function (err, results) {
    if (err) throw err;

    console.log(results);

    var f = imap.fetch(results, { bodies: ['HEADER.FIELDS (FROM SUBJECT)', 'TEXT'] });
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
          console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
          console.log(prefix + 'UnParsed header: %s', buffer);
        });
      });
    });
    f.once('error', function (err) {
      console.log('Fetch error: ' + err);
    });
    f.once('end', function () {
      console.log('Done fetching all messages!');
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