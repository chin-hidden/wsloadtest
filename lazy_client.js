/**
	Only receive message and measure message rate
*/
var argv = require('yargs').argv;
var ws = require('./deps/ws.js');
var logger = require('./deps/logger.js');
var util = require('util');
var CCU = argv.ccu || 100;
var HOST = argv.host || "http://localhost:8081/echo";

var def = ws.create_conn_swarm(HOST, CCU);

function msg_count(swarms){
	return swarms.map(function(conn){
		return conn.time_received.length;
	}).reduce(function(a, b){return a + b});
}

def.done(function(swarms){
	logger.info(util.format('Done! swarm size: %d', swarms.length));
	var curr_count = msg_count(swarms);
	setInterval(function(){
		var count = msg_count(swarms);
		logger.info(util.format('Swarm size: %d, Message rate: %s per sec', swarms.length, (msg_count(swarms) - curr_count)/5));
		curr_count = count;
	}, 5000);
});
