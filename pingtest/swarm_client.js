/**
 * Simulates a number of dormant clients occupying server resources.
 */

var SockJS = require('sockjs-client');
var argv = require('yargs').argv;

var connection_count = argv.clients || 100;
var host = argv.host || "http://localhost:8080/realtime";
var connections = [];

var actualConnections = 0;

for (var i = 0; i < connection_count; i++) {
    (function() {
        var sock = SockJS(host);

        sock.onopen = function() {
            sock.send(`{"type": "gameon"}`);
            actualConnections++;
            console.log(`${actualConnections}/${connection_count}`)
        };

        sock.onmessage = function(e) {
            // console.log(e.data)
        };

        connections.push(sock);
    })();
}

