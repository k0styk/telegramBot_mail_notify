var Imap = require('imap'),
    inspect = require('util').inspect;

var imap = new Imap({
  user: 'bot.8ot@yandex.ru',
  password: 'Lada2105!',
  host: 'imap.yandex.ru',
  port: 993,
  tls: true
});

// function openInbox(cb) {
//   imap.openBox('INBOX', true, cb);
// }

// imap.once('ready', function() {
  
//   openInbox(function(err, box) {
//     if (err) throw err;

//     var f = imap.seq.fetch(box.messages.total + ':*', { bodies: ['HEADER.FIELDS (FROM)','TEXT'] });
    
//     f.on('message', function(msg, seqno) {
      
//       console.log('Message #%d', seqno);

//       var prefix = '(#' + seqno + ') ';

//       msg.on('body', function(stream, info) {
        
//         console.log(info);
        
//         if (info.which === 'TEXT') {
          
//           console.log(prefix + 'Body [%s] found, %d total bytes', inspect(info.which), info.size);
          
//         }
//         var buffer = '', count = 0;
        
//         stream.on('data', function(chunk) {
//           count += chunk.length;
//           buffer += chunk.toString('utf8');
//           console.log(buffer);
//           if (info.which === 'TEXT')
//             console.log(prefix + 'Body [%s] (%d/%d)', inspect(info.which), count, info.size);
//         });
        
//         stream.once('end', function() {
//           if (info.which !== 'TEXT')
//             console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
//           else
//             console.log(prefix + 'Body [%s] Finished', inspect(info.which));
//         });
//       });
      
//       msg.once('attributes', function(attrs) {
//         console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
//       });
      
//       msg.once('end', function() {
//         console.log(prefix + 'Finished');
//       });
//     });
    
//     f.once('error', function(err) {
//       console.log('Fetch error: ' + err);
//     });
    
//     f.once('end', function() {
//       console.log('Done fetching all messages!');
//       imap.end();
//     });
//   });
// });

// openInbox(function(err, box) {
//   if (err) throw err;
//   var f = imap.seq.fetch(box.messages.total + ':*', { bodies: ['HEADER.FIELDS (FROM)','TEXT'] });
//   f.on('message', function(msg, seqno) {
//     console.log('Message #%d', seqno);
//     var prefix = '(#' + seqno + ') ';
//     msg.on('body', function(stream, info) {
//       if (info.which === 'TEXT')
//         console.log(prefix + 'Body [%s] found, %d total bytes', inspect(info.which), info.size);
//       var buffer = '', count = 0;
//       stream.on('data', function(chunk) {
//         count += chunk.length;
//         buffer += chunk.toString('utf8');
//         if (info.which === 'TEXT')
//           console.log(prefix + 'Body [%s] (%d/%d)', inspect(info.which), count, info.size);
//       });
//       stream.once('end', function() {
//         if (info.which !== 'TEXT')
//           console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
//         else
//           console.log(prefix + 'Body [%s] Finished', inspect(info.which));
//       });
//     });
//     msg.once('attributes', function(attrs) {
//       console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
//     });
//     msg.once('end', function() {
//       console.log(prefix + 'Finished');
//     });
//   });
//   f.once('error', function(err) {
//     console.log('Fetch error: ' + err);
//   });
//   f.once('end', function() {
//     console.log('Done fetching all messages!');
//     imap.end();
//   });
// });

imap.once('ready', function() {
  var arr = [];

  imap.getBoxes(function(err, boxes) {
      if (err) {
          throw err
      }
      console.log(boxes);

      var count = 0,
          total = 0,
          dump = [];

      if (boxes['[Gmail]'] && boxes['[Gmail]'].children && boxes['[Gmail]'].children['All Mail']) {
          openBoxes('[Gmail]/All Mail', function(arr) {

              // Send it all to the front-end
              result.google.dataDump = arr;
              result.save(function(err) {
                  if (err) {
                      console.log("Saving Email Dump Error: " + err);
                  } else {
                      console.log("Saved email dump woohoo!");
                      res.send(arr);
                      // End IMAP connection
                      imap.end();
                  }
              });

          });

      }
  }); // end Imap getBoxes();
});

function openBoxes(key, callback) {
  var arr = [];
  imap.openBox(key, true, function(err, box) {

      if (err) throw err;
      var total = box.messages.total;
      console.log("Total messages: " + total);

      var f = imap.seq.fetch('1:' + total, {
          struct: true
      });

      f.on('message', function(msg, seqno) {
          var obj = {};


          var prefix = '(#' + seqno + ') ';

          obj.num = seqno;


          msg.on('attributes', function(attrs) {
              console.log("getting Msg");
              getMsgByUID(attrs.uid, function(err, msg) {
                  if (err)
                      throw err;
                  console.log(inspect(msg, false, 10));
              });
          });



      });

      f.once('error', function(err) {
          console.log('Fetch error: ' + err);
      });
      f.once('end', function() {
          console.log('Done fetching msgData!');
      });
  });

  function checkEnd(arr, callback) {
      console.log(arr);
      for (var i = 0; i < arr.length; i++) {
          arr[i].from = [];
          var addStr = arr[i].header.from[0];
          var thang = mimelib.parseAddresses(addStr);
          for (var x = 0; x < thang.length; x++) {
              arr[i].from.push(thang[x]);
          }
      }

      // Clean up them damn arrays

      callback(arr);
  }
}

function findTextPart(struct) {
  for (var i = 0, len = struct.length, r; i < len; ++i) {
      if (Array.isArray(struct[i])) {
          if (r = findTextPart(struct[i]))
              return r;
      } else if (struct[i].type === 'text' && (struct[i].subtype === 'plain' || struct[i].subtype === 'html'))
          return [struct[i].partID, struct[i].type + '/' + struct[i].subtype];
  }
}

function getMsgByUID(uid, cb, partID) {
  console.log("getMsgByUID")
  var f = imap.fetch(uid, partID ? {
          bodies: ['HEADER.FIELDS (TO FROM SUBJECT)', partID[0]]
      } : {
          struct: true
      }),
      hadErr = false;

  if (partID)
      var msg = {
          header: undefined,
          body: '',
          attrs: undefined
      };

  f.on('error', function(err) {
      hadErr = true;
      cb(err);
  });

  if (!partID) {
      f.on('message', function(m) {
          m.on('attributes', function(attrs) {
              partID = findTextPart(attrs.struct);
          });
      });
      f.on('end', function() {
          if (hadErr)
              return;
          if (partID)
              getMsgByUID(uid, cb, partID);
          else
              cb(new Error('No text part found for message UID ' + uid));
      });
  } else {
      f.on('message', function(m) {
          m.on('body', function(stream, info) {
              var b = '';
              stream.on('data', function(d) {
                  b += d;
              });
              stream.on('end', function() {
                  if (/^header/i.test(info.which))
                      msg.header = Imap.parseHeader(b);
                  else
                      msg.body = b;
              });
          });
          m.on('attributes', function(attrs) {
              msg.attrs = attrs;
              msg.contentType = partID[1];
          });
      });
      f.on('end', function() {
          if (hadErr)
              return;
          cb(undefined, msg);
      });
  }
}

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

imap.connect();