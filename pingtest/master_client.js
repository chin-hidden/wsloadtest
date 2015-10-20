/**
 * The real test client. It will run a ping test for a number of time and report
 * statistics.
 */

var SockJS = require('sockjs-client');
var stats = require("stats-lite");
var argv = require('yargs').argv;

var RUN_COUNT = argv.times || 1000;
var RTT_RESULTS = [];
var host = argv.host || "http://localhost:8080/realtime";

var sock = SockJS(host);
var connectStarted = Date.now();


function ping() {
    sock.send(`{"type": "ping", "payload": ${Date.now()}}`);
    RUN_COUNT--;
}


sock.onopen = () => {
    console.log(`Connected, took ${Date.now() - connectStarted} ms`);
    ping();
};

sock.onmessage = (event) => {
    var {type, payload} = JSON.parse(event.data);

    if (type === "pong") {
        process.stdout.write(".");
        var startTime = payload;
        var rtt = Date.now() - startTime;
        RTT_RESULTS.push(rtt);

        if (RUN_COUNT) {
            ping();
        } else {
            sock.close();
        }
    }
};

sock.onclose = function() {
    // min/avg/max/mdev
    console.log();
    console.log(`Ran ${RTT_RESULTS.length} times`);
    console.log(`min: ${Math.min.apply(null, RTT_RESULTS).toFixed(2)}`);
    console.log(`max: ${Math.max.apply(null, RTT_RESULTS).toFixed(2)}`);
    console.log(`avg: ${stats.mean(RTT_RESULTS).toFixed(2)}`);
    console.log(`med: ${stats.median(RTT_RESULTS).toFixed(2)}`);
    console.log(`dev: ${stats.stdev(RTT_RESULTS).toFixed(2)}`);
}
