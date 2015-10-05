require('look').start();
var timestamp = require('console-timestamp');
var argv = require('yargs').argv;
var util = require('util');
var ws = require('./deps/ws.js');
var Task = require('./deps/task.js').Task;
var logger = require('./deps/logger.js');

var PORT = argv.port || 8081;
var MSG_RATE = argv.msgrate || 20;

function _broadcast_loop(){
    for (var i = 0; i < client_list.length; i++){
        client_list[i].write(msg);
    }
}

function broadcast_all(msg_rate, client_list, msg){
    var task = new Task();
    task.start(_broadcast_loop);
    return task;
}

function print_server_stats_periodically(client_map){
    setInterval(function(){
        logger.info('Current active connection: ' + Object.keys(client_map).length);
    }, 5000);
}

function create_string(length){
    var str = '';
    for (var i = 0; i < length; i++){
        str += 'a';
    }
    return str;
}

function main(){
    logger.info(util.format('Running with %d msg per sec at port: %d', MSG_RATE, PORT));
    var server = ws.create_server(PORT);
    var runner = broadcast_all(MSG_RATE, server.client_list, create_string(200));

    server.emitter.on('stop', function(){
        runner.stop();
        logger.info('Stop sending message');
    });

    server.emitter.on('start', function(){
        try {
            runner.start(_broadcast_loop);
            logger.info('Start sending message');
        } catch(e) {
            logger.error('Attempted to start sending message, but failed: ' + e.message);
        }
    });

    print_server_stats_periodically(server.client_map);
}

main();
