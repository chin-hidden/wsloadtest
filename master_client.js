var argv = require('yargs').argv;
var util = require('util');
var http = require('http');
var deferred = require('deferred');

var logger = require('./deps/logger');
var report_processor = require('./deps/report_processor');
var _ = require('underscore');

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
        http.get('http://' + agent + '/swarm/_start?host=' + host + '&ccu=' + ccu).on('error', function(e) {
            console.error('/agents/_start failed', agent, e.message);
        });
    });
    res.end();
});

app.get('/agents/_stop', function(req, res) {
    agents.forEach(function(agent) {
        http.get('http://' + agent + '/swarm/_stop').on('error', function(e) {
            console.error('/agents/_stop failed', agent, e.message);
        });
    });
    res.end();
});

app.get('/agents/_ping', function(req, res) {
    var wait = req.query.wait || 5;
    agents.forEach(function(agent) {
        http.get('http://' + agent + '/swarm/_ping?wait=' + wait).on('error', function(e) {
            console.error('/agents/_ping failed', agent, e.message);
        });
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
                    report.agents = [agent];
                });
                def.resolve({status: 'ok', description: 'ok', reports: reports});
            });
        }).on('error', function(e) {
            console.error('/reports failed', agent, e.message);
            def.resolve({status: 'nok', description: e.message, reports: []});
        });
        promises.push(def.promise);
    });
    return promises;
};
app.get('/reports', function(req, res) {
    deferred.apply(null, fetch_reports_as_promises()).done(function(_res) {
        if (!_.isArray(_res)) {
            _res = [_res];
        }

        logger.log('Detailed reports & status: ' + JSON.stringify(_res, null, 2));
        var reports = _res.map(function(item) {
            return item.reports;
        }).reduce(function(a, b) {
            return a.concat(b);
        }, []);
        res.json(reports);
    }, function(e) {
        console.error('shit happened: ', e);
    });
});

app.get('/reports/_brief', function(req, res) {
    deferred.apply(null, fetch_reports_as_promises())(function(_res) {
        var reports = _res.map(function(item) {
            return item.reports;
        }).reduce(function(a, b) {
            return a.concat(b);
        }, []).reduce(report_processor.sum, report_processor.gen_empty());
        res.json(reports);
    });
});

app.get('/reports/_flush', function(req, res) {
    agents.forEach(function(agent) {
        http.get('http://' + agent + '/reports/_flush').on('error', function(e) {
            console.error('/reports/_flush failed', agent, e.message);
        });
    });
    res.end();
});

app.get('/agents', function(req, res) {
    res.json(agents);
});

app.listen(port, '0.0.0.0', function() {
    logger.log('Master started @ port ' + port);
});
