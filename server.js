var PORT = 9999;
var http = require('http');
var sockjs = require('sockjs');
var node_static = require('node-static');

// 1. Echo sockjs server
var sockjs_opts = {sockjs_url: "http://cdn.jsdelivr.net/sockjs/0.3.4/sockjs.min.js"};

var conn_count = 0;
var sockjs_echo = sockjs.createServer(sockjs_opts);
sockjs_echo.on('connection', function(conn) {
    conn_count += 1;
    console.log('[INFO] ' + (new Date()).toString() + ' New connection. Now total: ' + conn_count);
    conn.on('data', function(message) {
	setInterval(function(){
		conn.write(Math.random() + ":::" + (new Date()).toString() + " This is a long enough message to simulate small packets in the network");
	}, 50);
        conn.write("[ERROR] Finished internal");
    });

    conn.on('close', function(){
	conn_count -= 1;
	console.log('[INFO] ' + (new Date()).toString() + ' Connection closed. Now total: ' + conn_count);
    });
});

// 2. Static files server
var static_directory = new node_static.Server(__dirname);

// 3. Usual http stuff
var server = http.createServer();
server.addListener('request', function(req, res) {
    static_directory.serve(req, res);
});
server.addListener('upgrade', function(req,res){
    res.end();
});

sockjs_echo.installHandlers(server, {prefix:'/echo'});

console.log(' [*] Listening on 0.0.0.0:9999' );
server.listen(PORT, '0.0.0.0');
