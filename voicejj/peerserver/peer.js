var app = require('express')();
var http = require('http').Server(app);
var ExpressPeerServer = require('peer').ExpressPeerServer;
var io = require('socket.io')(http);

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://vps13171.publiccloud.com.br");
    res.header('Access-Control-Allow-Credentials', true);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', function(req, res, next) { res.send('Hello world!'); });

var server = require('http').createServer(app);
var peerserver = ExpressPeerServer(server, { debug: true });

io.on('connection', function(socket){
    console.log('O maot é um vagabundo');
    socket.on('disconnect', function(){
        console.log('O maot é um otário');
    });
});

app.use('/peerjs', peerserver);

server.listen(9000, function(){
    console.log('O maot é um arrombado');
});

http.listen(9001, function(){
    console.log('O maot é dois arrombados');
});