/**
	Only receive message and measure message rate
*/
var argv = require('yargs').argv;
var ws = require('./ws.js');
var logger = require('./logger.js');
var CCU = argv.ccu || 100;

var def = ws.create_conn_swarm("http://localhost:8080/echo", CCU);

function msg_count(swarms){
	return swarms.map(function(conn){
		return conn.time_received.length;
	}).reduce(function(a, b){return a + b});
}

def.done(function(swarms){
	logger.log('Done!', swarms.length);
	var curr_count = msg_count(swarms);
	setInterval(function(){
		var count = msg_count(swarms);
		logger.log('Message rate: ' + (msg_count(swarms) - curr_count)/5 + ' per 1s');
		curr_count = count;
	}, 5000);
});
