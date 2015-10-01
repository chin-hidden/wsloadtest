require('look').start();
var timestamp = require('console-timestamp');
var argv = require('yargs').argv;
var util = require('util');
var ws = require('./ws.js');
var logger = require('./logger.js');

var PORT = argv.port || 8081;
var MSG_RATE = argv.msgrate || 20;

var sockjs_opts = {sockjs_url: "http://cdn.jsdelivr.net/sockjs/0.3.4/sockjs.min.js",
    log: function(){}};

function broadcast_all(msg_rate, client_list, msg){
    function __broadcast_loop(){
        for(var i = 0; i < client_list.length; i++){
            client_list[i].write(msg);
        }
        setTimeout(function(){
            process.nextTick(__broadcast_loop);
        }, 1);
    }
    __broadcast_loop();
}

function print_server_stats_periodically(client_map){
	setInterval(function(){
		logger.log('Current active connection: ' + Object.keys(client_map).length);
	}, 5000);
}

function create_string(length){
	var str = '';
	for(var i = 0; i < length; i++){
		str += 'a';
	}
    return str;
}

function main(){
	logger.log(util.format('Running with %d msg per sec at port: %d', MSG_RATE, PORT));
	var server = ws.create_server(PORT);
	broadcast_all(MSG_RATE, server.client_list, create_string(200));
	print_server_stats_periodically(server.client_map);
}

main();
