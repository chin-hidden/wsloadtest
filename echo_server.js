// this server broadcast all recevied message to all clients
var timestamp = require('console-timestamp');
var argv = require('yargs').argv;
var http = require('http');
var sockjs = require('sockjs');
var node_static = require('node-static');
var logger = require('./logger.js');

var PORT = argv.port || 8080;

var sockjs_opts = {sockjs_url: "http://cdn.jsdelivr.net/sockjs/0.3.4/sockjs.min.js"};

var sockjs_echo = sockjs.createServer(sockjs_opts);

var client_map = {};

function conn_count(){
    return Object.keys(client_map).length;
}

function print_server_stats(){
    setInterval(function(){
        // print server stats
        logger.log('Current active connection: ' + conn_count());
    }, 5000);
}

function interval_execute(duration, count, callback){
    // callback 'count' times during 'time'
    var i = 0;
    var interval_time = duration/count;
    logger.log('Echoing at time interval: ' + interval_time);
    for(var i = 0; i < count; i++){
        (function(index){
            setTimeout(function(){
                callback(index + 1);
            }, i * interval_time);
        })(i);
    }
};

sockjs_echo.on('connection', function(conn) {
    client_map[conn.id] = conn;

    conn.on('close', function(){
        delete client_map[conn.id];
    });

    conn.on('data', function(message){
        var args = JSON.parse(message);
        logger.log('Echo back: ' + args.count + ' message to ' + conn_count() + ' client');
        conn.write('ping');
        interval_execute(args.duration, args.count, function(index){
            logger.log('Echo message number: ' + index);
            for(var key in client_map){
                client_map[key].write(args.message);
            }
        });
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

logger.log(' [*] Listening on 0.0.0.0:' + PORT );

server.listen(PORT, '0.0.0.0');

print_server_stats();

