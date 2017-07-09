var mic = require('mic');
var express = require('express');
var lame = require('lame');
var devnull = require('dev-null');
var shell = require('shelljs');

var devnullInstance = devnull();

var app = express();

app.use(express.static('static'));

var micInstance = mic({
    rate: '44100',
    channels: '1',
    debug: true,
    exitOnSilence: 0,
    device: 'plughw:1'
});
var micInputStream = micInstance.getAudioStream();
micInputStream.on('stopComplete', function() {
      console.log("Got SIGNAL stopComplete");
});
micInputStream.on('error', function(err) {
    console.log("Error in Input Stream: " + err);
});
micInputStream.on('startComplete', function() {
        console.log("Got SIGNAL startComplete");
});
micInputStream.pipe(devnullInstance);
micInstance.start();

function createEncoder() {
  var lameEncoder = new lame.Encoder({
    channels: 1,
    bitDepth: 16,
    sampleRate: 44100,
  
    bitRate: 64,
    outSampleRate: 44100,
    mode: (lame.MONO)
  });

  return lameEncoder;
}


app.get('/stream.mp3', function (req, res) {
  res.set({
    'Content-Type': 'audio/mpeg3',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': 'Wednesday, 27-Dec-95 05:29:10 GMT'
  });

  var encoder = createEncoder();
  micInputStream.pipe(encoder);

  req.on("close", function() {
    micInputStream.unpipe(encoder);
    encoder.unpipe(res);
    encoder.end();
  });
  req.on("end", function() {
    micInputStream.unpipe(encoder);
    encoder.unpipe(res);
    encoder.end();
  });

  encoder.pipe(res);
});

app.get('/restart', function(req, res) {
  shell.exec('systemctl restart nodejs.service');
});

app.listen(80);

