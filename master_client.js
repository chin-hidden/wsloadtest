var argv = require('yargs').argv;
var util = require('util');
var http = require('http');
var deferred = require('deferred');

var logger = require('./logger');

var express = require('express');

var agents = [
    // 'localhost:8082'
];

var port = argv.port || 8083;

var app = express();

app.get('/agents/_start', function(req, res) {
    var host = req.query.host || 'http://localhost:8081/echo';
    var ccu = req.query.ccu || 20;

    agents.forEach(function(agent) {
        http.get('http://' + agent + '/swarm/_start?host=' + host + '&ccu=' + ccu);
    });
    res.end();
});

app.get('/agents/_stop', function(req, res) {
    agents.forEach(function(agent) {
        http.get('http://' + agent + '/swarm/_stop');
    });
    res.end();
});

app.get('/agents/_ping', function(req, res) {
    var wait = req.query.wait || 5;
    agents.forEach(function(agent) {
        http.get('http://' + agent + '/swarm/_ping?wait=' + wait);
    });
    res.end();
});

var fetch_reports_as_promises = function() {
    var promises = [];
    agents.forEach(function(agent) {
        var def = deferred();
        http.get('http://' + agent + '/reports', function(_res) {
            if (_res.statusCode !== 200) {
                def.resolve({status: 'nok', description: _res.statusMessage, reports: []});
                return;
            }
            var body = '';
            _res.on('data', function(chunk) {
                body += chunk;
            });
            _res.on('end', function() {
                var reports = JSON.parse(body);
                reports.forEach(function(report) {
                    report.agent = agent;
                });
                def.resolve({status: 'ok', description: 'ok', reports: reports});
            });
        }).on('error', function(e) {
            def.resolve({status: 'nok', description: e.message, reports: []});
        });
        promises.push(def.promise);
    });
    return promises;
};
app.get('/reports', function(req, res) {
    deferred.apply(null, fetch_reports_as_promises())(function(_res) {
        logger.log('Detailed reports & status: ' + JSON.stringify(_res));
        var reports = _res.map(function(item) {
            return item.reports;
        }).reduce(function(a, b) {
            return a.concat(b);
        }, []);
        res.json(reports);
    });
});

app.get('/reports/_brief', function(req, res) {
    deferred.apply(null, fetch_reports_as_promises())(function(_res) {
        var reports = _res.map(function(item) {
            return item.reports;
        }).reduce(function(a, b) {
            return a.concat(b);
        }, []).reduce(function(r1, r2) {
            r1 || (r1 = {});
            r2 || (r2 = {});

            r1.no_received = r1.no_received || 0;
            r2.no_received = r2.no_received || 0;

            r1.no_timeout = r1.no_timeout || 0;
            r2.no_timeout = r2.no_timeout || 0;

            r1.min_rtt = r1.no_received > 0 ? r1.min_rtt : null;
            r2.min_rtt = r2.no_received > 0 ? r2.min_rtt : null;

            r1.max_rtt = r1.no_received > 0 ? r1.max_rtt : null;
            r2.max_rtt = r2.no_received > 0 ? r2.max_rtt : null;

            r1.mean_rtt = r1.no_received > 0 ? r1.mean_rtt : 0;
            r2.mean_rtt = r2.no_received > 0 ? r2.mean_rtt : 0;

            return {
                no_received: r1.no_received + r2.no_received,
                no_timeout: r1.no_timeout + r2.no_timeout,
                min_rtt: Math.min(r1.min_rtt, r2.min_rtt),
                max_rtt: Math.max(r1.max_rtt, r2.max_rtt),
                mean_rtt: r1.no_received > 0 || r2.no_received > 0 ?
                    (r1.mean_rtt * r1.no_received + r2.mean_rtt * r2.no_received) / (r1.no_received + r2.no_received) : null
            }
        }, {no_received: 0, no_timeout: 0, min_rtt: null, max_rtt: null, mean_rtt: null});
        res.json(reports);
    });
});

app.get('/reports/_flush', function(req, res) {
    agents.forEach(function(agent) {
        http.get('http://' + agent + '/reports/_flush');
    });
    res.end();
});

app.get('/agents', function(req, res) {
    res.json(agents);
});

app.listen(port, '0.0.0.0', function() {
    logger.log('Master started @ port ' + port);
});
