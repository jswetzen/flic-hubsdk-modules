// irUtils.js

const ir = require('ir');
const datastore = require('datastore');

const server = require('./tcpServer');

// Set true to respond before playing IR signals (and after checking all signals have been recorded)
// You may want a faster response for the system requesting the IR signal(s) playback, although you will not know if ir.play() fails
const respondBeforePlaying = false;

const _irSignal2str = function(signal) {
  // Instead of using signal.buffer use the JS object (undocumented, this might not always be available)
  // The object keys are "0", "1", etc and the values are the integers that need to be in the array

  // Convert the JS object to an array of integers
  var items = [];
  for(var i=0; i<Object.keys(signal).length;i++) {
    items.push(signal[i]);
  }

  return JSON.stringify(items);
}

const _str2irSignal = function(str) {
  return new Uint32Array(JSON.parse(str));
}

const put = function(c, name, data) {
  console.log('@ irUtils.put',name,data);
  
  datastore.put(name, data, function(err) {
    console.log('@ datastore.put callback');
    if (!err) {
      console.log('IR signal '+name+' stored');
      server.respondToClient(c, '200 OK', 'IR signal '+name+' stored');
    } else {
      console.error('# error: ', error);
      server.respondToClient(c, '500 Internal Server Error', 'Could not store IR signal');
    }
  }); // datastore.put
}

const get = function(c, name) {
  console.log('@ irUtils.get '+name);

  datastore.get(name, function(err, str) {
    console.log('@ datastore.get callback');
    if(!err && typeof str === 'string' && str.length > 0) {
      server.respondToClient(c, '200 OK', str);
    }
    else {
      server.respondToClient(c, '404 Not Found', 'Could not find IR signal '+name);
    }    
  }); // datastore.get
}

const record = function(c, name) {
  console.log('@ irUtils.record '+name);
  
  // Start recording
  ir.record();

  // Set up a timeout timer for 5 seconds
  var timeoutTimer = setTimeout(function(){
    ir.cancelRecord();
    console.log('Recording IR signal '+name+' TIMEOUT');
    clearTimeout(timeoutTimer);
    server.respondToClient(c, '408 Request Timeout', 'Recording IR signal '+name+' TIMEOUT');
    return;
  },5000);

  // Wait for recordComplete event
  ir.on('recordComplete', function(signal) {  

    console.log('@ ir.on.recordComplete');
    // Stop the timeout timer
    clearTimeout(timeoutTimer);
    
    // Convert the signal to a string
    var data = _irSignal2str(signal);
    console.log(data);

    // Store the data
    put(c, name, data);

  }); // ir.on.recordComplete
}

const play = function(c, items) {
  console.log('@ irUtils.play '+items);

  // Check all the IR codes exist
  const retrievalMs = 20;
  var index = 0;
  var irCodes = {};
  var errors = '';

  // datastore is async, so give each item time to be retrieved
  var fetchingTimer = setInterval(function(){
    var item = items[index].split(':')[0];
    if(typeof irCodes[item] !== 'undefined') {
      console.log('# '+item+' already retrieved');
      if(++index === items.length) clearTimeout(fetchingTimer);      
    }
    else {
      console.log('# getting '+item+' from datastore')
      datastore.get(item, function(err, str) {
        console.log('@ datastore.get callback');
        if(!err && typeof str === 'string' && str.length > 0) {
          irCodes[item] = str;
        }
        else {
          console.error('Cannot find IR code '+item+' in datastore.');
          errors += 'Cannot find IR code '+item+' in datastore. ';
        }    
        if(++index === items.length) clearTimeout(fetchingTimer);
      }); // datastore.get
    }
  },retrievalMs); // setInterval

  // Wait for datastore to finish
  setTimeout(function(){

    if(errors !== '') {
      server.respondToClient(c, '400 Bad Request', errors);
      return;
    }

    console.log(JSON.stringify(irCodes,null,2));
    
    if(respondBeforePlaying) server.respondToClient(c, '200 OK', 'Sending IR signal(s)');
    
    // Set up a timer to process the queue and pauses
    var pausingTenths = 0;
    var sendingTimer = setInterval(function(){
      if(pausingTenths > 0) {
        // Keep pausing
        pausingTenths--;
      }
      else {
        if(items.length > 0) {
          var itemSplit = items.shift().split(':');
          // Play the IR code
          console.log('# Sending IR code '+itemSplit[0]);
          var signal = _str2irSignal(irCodes[itemSplit[0]]);
          ir.play(signal, function(err) {
            if(err) {
              clearTimeout(sendingTimer);
              if(!respondBeforePlaying) server.respondToClient(c, '500 Internal Server Error', 'Could not send IR signal '+itemSplit[0]);
              return;
            }
          });

          // Add a pause if requested
          if(itemSplit[1] && typeof parseFloat(itemSplit[1]) === 'number') {
            var pause = parseFloat(itemSplit[1]);
            console.log('# Adding '+pause+' seconds pause');
            pausingTenths = parseInt(pause*10);
          }
        }
        else {
          // Finish up
          console.log('# Finished IR send');
          clearTimeout(sendingTimer);
          if(!respondBeforePlaying) server.respondToClient(c, '200 OK', 'Sent IR signal(s)');
        }
      }

    },100); // setInterval
    
  },retrievalMs*(items.length+1)); // setTimeout
}

exports.put = put;
exports.get = get;
exports.record = record;
exports.play = play;