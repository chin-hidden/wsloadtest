var argv = require('yargs').argv;
var util = require('util');
var _ = require('underscore');
var express = require('express');
var cluster = require('cluster');

var ws = require('./deps/ws');
var logger = require('./deps/logger');

var spawn_worker = function() {
    var port = argv.port || 8082;

    var app = express();

    var swarm = [];
    var ping_reports = [];

    var stop = function() {
        swarm.forEach(function(conn) {
            conn.close();
        });
        swarm = [];
    };
    var count = function() {
        return swarm.filter(function(conn) { return conn; }).length;
    };

    app.get('/swarm/_start', function(req, res) {
        if (swarm.length > 0) {
            logger.info('A swarm is already running, force closing...');
            stop();
        }

        var host = req.query.host || 'https://priceservice.vndirect.com.vn/realtime';
        var ccu = req.query.ccu || 20;

        logger.info('Creating swarm of ' + ccu + ' connections to ' + host);
        var def = ws.create_conn_swarm(host, ccu).done(function(_swarm) {
            swarm = _swarm;
        });
        res.end();
    });

    app.get('/swarm/_stop', function(req, res) {
        stop();
        res.end();
    });

    app.get('/swarm/_ping', function(req, res) {
        var wait_time = req.query.wait || 5;
        logger.info('Start sending ping');
        swarm.forEach(function(conn) {
            conn.onmessage = function(e) {
                conn.received_at = new Date().getTime();
            };

            conn.sent_at = new Date().getTime();
            delete conn.received_at;
            conn.send(JSON.stringify({type: 'ping'}));
        });

        setTimeout(function() {
            var partitions = _.partition(swarm, function(conn) {
                return conn.received_at;
            });

            var rtts = partitions[0].map(function(conn) {
                return conn.received_at - conn.sent_at;
            });

            var report = {
                no_received: partitions[0].length,
                no_timeout: partitions[1].length,
                min_rtt: _.min(rtts),
                max_rtt: _.max(rtts),
                mean_rtt: rtts.reduce(function(rtt1, rtt2) { return rtt1 + rtt2; }, 0) / rtts.length
            };
            ping_reports.push(report);

            res.json(report);
        }, wait_time * 1000);
    });

    app.get('/reports', function(req, res) {
        res.json(ping_reports);
    });

    app.get('/reports/_flush', function(req, res) {
        ping_reports = [];
        res.end();
    });

    app.get('/swarm/_stats', function(req, res) {
        res.json({swarm_size: count()});
    });

    app.listen(port, '0.0.0.0', function() {
        logger.info('Agent started @ port ' + port);
    });

    setInterval(function() {
        logger.info('Current swarm size: ' + count());
    }, 10000);
};

if (cluster.isMaster) {
    cluster.fork();

    cluster.on('exit', function(worker, code, signal) {
        logger.error('oh crap! the worker has just died ' + code + ' - ' + signal);
        cluster.fork();
    });
} else {
    spawn_worker();
}
