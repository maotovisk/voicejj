var express = require('express');
var app = express();
var ExpressPeerServer = require('peer').ExpressPeerServer;

app.get('/', function(req, res, next) { res.send('Hello world!'); });

var server = require('http').createServer(app);
var peerserver = ExpressPeerServer(server, { debug: true });

app.use('/peerjs', peerserver);

server.listen(21211);