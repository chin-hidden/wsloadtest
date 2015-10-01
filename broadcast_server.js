require('look').start();
var timestamp = require('console-timestamp');
var argv = require('yargs').argv;
var util = require('util');
var ws = require('./ws.js');
var Task = require('./task.js').Task;
var logger = require('./logger.js');

var PORT = argv.port || 8081;
var MSG_RATE = argv.msgrate || 20;

function broadcast_all(msg_rate, client_list, msg){
    function _broadcast_loop(){
        for(var i = 0; i < client_list.length; i++){
            client_list[i].write(msg);
        }
    }
    var task = new Task();
    task.start(_broadcast_loop);
    return task;
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
    task = broadcast_all(MSG_RATE, server.client_list, create_string(200));
    setTimeout(function(){
        console.log('Stopping sending message');
        task.stop();
    }, 10000);
    print_server_stats_periodically(server.client_map);
}

main();
