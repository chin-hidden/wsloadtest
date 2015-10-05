/*
 * This client send a message to server and measure the time
 * between sent and when all other clients received the broadcast version
*/

var timestamp = require('console-timestamp');
var deferred = require('deferred');
var argv = require('yargs').argv;
var SockJS = require('sockjs-client');
var StatsArray = require('stats-array');
var util = require('util');
var ws = require('./deps/ws.js');
var logger = require('./deps/logger.js');

var MEASURE_TIME = argv.measuretime || 5000;
var CCU_COUNT = argv.ccu || 50;
var MSG_COUNT = argv.msgcount || 10;
var HOST = argv.host || 'http://localhost:8080/echo';
var DURATION = argv.duration || 1000;

var time_last_msg = new Date();

// simple function to replace setTimeout
function after(delay){
    var def = deferred();
    setTimeout(function(){
        def.resolve();
    }, delay);
    return def.promise;
}

function time_received(clients, index){
    return clients.map(function(cl){
        return cl.time_received[index];
    });
}

function latency_stats(sent_time, time_received_list){
    time_list = time_received_list.filter(function(time){
        return time > 0;
    });
    if(time_list.length == 0){
        return null;
    }
    return {
        'mean': time_list.mean() - sent_time,
        'max': time_list.max() - sent_time,
        'min': time_list.min() - sent_time,
        'std': time_list.stdDeviation()
    }
}

function log_latency_stats(latency_stats_list){
    var mean_list = latency_stats_list.map(function(l){return l.mean});
    var max_list = latency_stats_list.map(function(l){return l.max});
    var min_list = latency_stats_list.map(function(l){return l.min});
    var std_list = latency_stats_list.map(function(l){return l.std});
    log_stats("Mean", mean_list);
    log_stats("Max", max_list);
    log_stats("Min", min_list);
    log_stats("Std", std_list);
}

function log_stats(msg, num_list){
    logger.log(util.format(msg + " :: Mean: %d, Max: %d, Min: %d, stdDeviation: %d",
                        num_list.mean(),
                        num_list.max(),
                        num_list.min(),
                        num_list.stdDeviation()
                        ));
}

function print_time_stats(time_sent, time_received_list){
    var latency_list = latency_stats(time_sent, time_received_list);
    time_list = time_received_list.filter(function(time){
        return time > 0;
    });
    var mean_delay = time_list.mean() - time_sent;
    var max_delay = time_list.max() - time_sent;
    var min_delay = time_list.min() - time_sent;
    var stdDeviation = time_list.stdDeviation();
    logger.log(util.format("Mean: %d, Max: %d, Min: %d, stdDeviation: %d",
                        mean_delay, max_delay, min_delay, stdDeviation));
}

function print_stats(num_list){
    var sum = num_list.reduce(function(a, b){return a + b;});
    var mean_delay = num_list.mean();
    var max_delay = num_list.max();
    var min_delay = num_list.min();
    var stdDeviation = num_list.stdDeviation();
    logger.log(util.format("Sum: %d, Mean: %d, Max: %d, Min: %d, stdDeviation: %d",
                        sum, mean_delay, max_delay, min_delay, stdDeviation));
}

function estimated_sent_time(start_time, msg_count, duration){
    // what is the estimated sent_time if I start at start_time
    // sending out msg_count messages per duration?
    var interval = duration/msg_count;
    var predicted_sent_time = [];
    for(var i = 0; i < msg_count; i++){
        predicted_sent_time.push(start_time + i * interval);
    }
    return predicted_sent_time;
}

function gen_string(length){
    var result = '';
    for(var i = 0; i < length; i++){
        result += 'a';
    }
    return result;
}

function main(){
    // ::: Main App :::
    logger.log('Running benchmark with ccu ' + CCU_COUNT + ' and host: ' + HOST);

    ws.create_conn_swarm(HOST, CCU_COUNT)
    .done(function(swarm){
        var sent_time = 0;
        var roundtrip_time = 0;
        ws.open_connection(HOST, 'master').done(function(master){
            sent_time = new Date().getTime();
            master.send(JSON.stringify({
                'count': MSG_COUNT,
                'duration': DURATION,
                'message': gen_string(200),
            }));
            logger.log('Message sent. Number of active conn: ' + swarm.length);
            logger.log('Expecting ' + MSG_COUNT + ' echo message for each');
            after(MEASURE_TIME).done(function(){
                var total_msg_count = swarm.map(function(conn){
                    return conn.msg_count;
                });
                print_stats(total_msg_count);
                if(roundtrip_time == 0){
                    throw "roundtrip_time has not been calculated";
                }
                // adjusting the round trip
                var server_sent_time = sent_time + roundtrip_time;
                var estimated = estimated_sent_time(server_sent_time, MSG_COUNT, DURATION);

                var latency_stats_list = [];
                for(var i = 0; i < MSG_COUNT; i++){
                    latency_stats_list.push(latency_stats(estimated[i], time_received(swarm, i)));
                }
                log_latency_stats(latency_stats_list.filter(function(l){return l != null}));

            });

            master.onmessage = function(data){
                if(sent_time == 0){
                    throw "Sent time has not been set";
                }
                if(data.data == 'ping'){
                    // only accept the first ping
                    var ping_received_time = new Date().getTime();
                    roundtrip_time = (ping_received_time - sent_time)/2;
                    logger.log('Echoed time: ' + ping_received_time + ' Round trip time: ' + roundtrip_time);
                }
            }
        });


    });
}

main();

