// tcpServer.js

// Based on work by Oskar Emilsson https://community.flic.io/topic/18043/irtcp-v1-0-0-hub-server-for-using-ir-module-via-http

const net = require('net');

const irUtils = require('./irUtils');

// Set true to log TCP (HTTP) requests/responses
const logRequestResponse = false;

const respondToClient = function(c, statusCode, message, log) {
  
  var content = 'HTTP/1.1 '+statusCode+'\r\n'+'\r\n'+message;

  if(typeof log === 'undefined') log = logRequestResponse;

  if(log) {
    console.log('\n# HTTP RESPONSE');
    console.log(content);
    console.log('# END HTTP RESPONSE\n');
  }

  c.write(content);
  c.end();
}

var server = net.createServer(function(c) {
  console.log('Server connected');

  c.on('end', function() {
    console.log('Server disconnected\n');
  });

  c.on('data', function(data) {

    // Convert TCP content byte array to string
    var content = data.toString();
    
    // Ignore favicon requests from a browser
    if(content.indexOf('GET /favicon.ico') !== -1) {
      console.log('# ignoring favicon.ico request');
      return respondToClient(c, '200 OK', '', false);
    }

    if(logRequestResponse) {
      console.log('\n# HTTP REQUEST');
      console.log(content);
      console.log('# END HTTP REQUEST\n');      
    }

    // The first line of the raw TCP will look something like this "GET playIR/tvOn:2.0,lightsOff HTTP/1.1"
    // Check for URL paths /recordIR/<IR_NAME>, /playIR/<IR_SEQUENCE>, /putIRarray/<IR_NAME>:<IR_ARRAY> or /getIRarray/<IR_NAME>

    // <IR_ARRAY> is, without spaces, in the form from the docs [<CARRIER_FREQ>,<ON_us>,<OFF_us>,<ON_us>,...]
    
    // <IR_SEQUENCE> is a comma-separated list of <IR_NAME>, eg: playIR/tvOn or playIR/tvOn,lightsOff
    // To stagger when the IR codes start use <IR_NAME>:<SECONDS_DELAY> (0.1 second precision), eg: playIR/tvOn:2.0,lightsOff

    // From the Hub SDK documentation "If another play is started before a previous one has completed, it gets enqueued and starts as soon as the previous completes (max 100 enqueued signals)"

    var recordIRmatch = content.match(/GET \/recordIR\/(.[^ ]*) HTTP/);
    var playIRmatch = content.match(/GET \/playIR\/(.[^ ]*) HTTP/);
    var putIRarraymatch = content.match(/GET \/putIRarray\/(.[^ ]*) HTTP/);
    var getIRarraymatch = content.match(/GET \/getIRarray\/(.[^ ]*) HTTP/);
    
    if(recordIRmatch && recordIRmatch[1]) {
      // Start recording an IR signal
      irUtils.record(c, recordIRmatch[1]);
    }
    else if(playIRmatch && playIRmatch[1]) {
      // Play an IR signal or IR signal sequence
      var items = playIRmatch[1].split(',');
      irUtils.play(c, items);
    }
    else if(putIRarraymatch && putIRarraymatch[1]) {
      // Store an IR signal
      var splitPath = putIRarraymatch[1].split(':');
      if(splitPath.length == 2) {
        var irArray = JSON.parse(splitPath[1]);
        if(Array.isArray(irArray) && irArray.length % 2 === 0) {
          irUtils.put(c, splitPath[0], splitPath[1]);
        }
        else {
          respondToClient(c, '400 Bad Request', 'Use the form /putIRarray/<IR_NAME>:<IR_ARRAY>\r\n\r\n<IR_ARRAY> is, without spaces, in the form from the Flic Hub SDK docs [<CARRIER_FREQ>,<ON_us>,<OFF_us>,<ON_us>,...] and must have an even number of items (finishing with an <ON_us> item)');
        }
      }
      else {
        respondToClient(c, '400 Bad Request', 'Use the form /putIRarray/<IR_NAME>:<IR_ARRAY>\r\n\r\n<IR_ARRAY> is, without spaces, in the form from the Flic Hub SDK docs [<CARRIER_FREQ>,<ON_us>,<OFF_us>,<ON_us>,...] and must have an even number of items (finishing with an <ON_us> item)');
      }
    }
    else if(getIRarraymatch && getIRarraymatch[1]) {
      // Retrieve an IR signal
      irUtils.get(c, getIRarraymatch[1]);
    }
    else {
      respondToClient(c, '400 Bad Request', 'Valid url paths are recordIR/<IR_NAME> and playIR/<IR_SEQUENCE> \r\n\r\nWhere <IR_SEQUENCE> is a comma-separated list of <IR_NAME>, eg: playIR/tvOn or playIR/tvOn,lightsOff \r\n\r\nTo stagger when the IR codes start use <IR_NAME>:<SECONDS_DELAY> (0.1 second precision), eg: playIR/tvOn:2.0,lightsOff');
    }

  }); // on.data

}); // net.createServer

server.listen(1338, "0.0.0.0", function() {
  console.log('Server bound', server.address().port);
});

exports.respondToClient = respondToClient;
