var argv = require('yargs').argv;
var util = require('util');
var http = require('http');
var deferred = require('deferred');
var _ = require('underscore');
var qs = require('querystring');

var logger = require('./deps/logger');
var PingReport = require('./deps/report').PingReport;
var BroadcastReport = require('./deps/report').BroadcastReport;
var ws = require('./deps/ws');

var express = require('express');

var agents = [
  '10.27.10.9:8082'
];

var port = argv.port || 8083;

var app = express();
app.engine('jade', require('jade').__express);
app.set('view engine', 'jade');

app.get('/', function(req, res) {
  res.render('master', {agents: agents});
});

app.get('/agents/_start', function(req, res) {
  var host = req.query.host || 'https://priceservice.vndirect.com.vn/realtime';
  var ccu = req.query.ccu || 20;
  var tick = req.query.tick || 30;

  agents.forEach(function(agent) {
    http.get('http://' + agent + '/swarm/_start?host=' + host + '&ccu=' + ccu + '&tick=' + tick).on('error', function(e) {
      logger.error('/agents/_start failed - ' + agent + ' - ' + e.message);
    });
  });
  res.end();
});

app.get('/agents/_stop', function(req, res) {
  agents.forEach(function(agent) {
    http.get('http://' + agent + '/swarm/_stop').on('error', function(e) {
      logger.error('/agents/_stop failed - ' + agent + ' - ' + e.message);
    });
  });
  res.end();
});

app.get('/agents/_ping', function(req, res) {
  var params = {
    wait: req.query.wait || 20,
    hits: req.query.hits || 1,
    tick: req.query.tick || 10 // in ms
  };

  agents.forEach(function(agent) {
    http.get('http://' + agent + '/swarm/_ping?' + qs.stringify(params)).on('error', function(e) {
      logger.error('/agents/_ping failed - ' + agent + ' - ' + e.message);
    });
  });
  res.end();
});

app.get('/agents/_broadcast', function(req, res) {
  var params = {
    wait: req.query.wait || 5,
    hits: req.query.hits || 1,
    tick: req.query.tick || 10 // in ms
  };

  agents.forEach(function(agent) {
    http.get('http://' + agent + '/swarm/_broadcast?' + qs.stringify(params)).on('error', function(e) {
      logger.error('/agents/_broadcast failed - ' + agent + ' - ' + e.message);
    });
  });
  res.end();
});

var fetch_stats_as_promises = function() {
  var promises = [];
  agents.forEach(function(agent) {
    var def = deferred();
    http.get('http://' + agent + '/swarm/_stats', function(_res) {
      if (_res.statusCode !== 200) {
        def.resolve({status: 'nok', description: _res.statusMessage, swarm_size: 0});
        return;
      }

      var body = '';
      _res.on('data', function(chunk) {
        body += chunk;
      });
      _res.on('end', function() {
        var stats = JSON.parse(body);
        def.resolve({status: 'ok', description: 'ok', swarm_size: stats.swarm_size, agent: agent});
      });
    }).on('error', function(e) {
      logger.error('/agents/_stats failed - ' + agent + ' - ' + e.message);
      def.resolve({status: 'nok', description: e.message, swarm_size: 0});
    });
    promises.push(def.promise);
  });

  return promises;
}
app.get('/agents/stats/', function(req, res) {
  var promises = fetch_stats_as_promises();
  deferred.apply(null, promises).done(function(_res) {
    if (!_.isArray(_res)) {
      _res = [_res];
    }

    res.json(_res);
  }, function(e) {
    logger.error('shit happened: ' + e);
  });
});

app.get('/agents/stats/_brief', function(req, res) {
  var promises = fetch_stats_as_promises();
  deferred.apply(null, promises).done(function(_res) {
    if (!_.isArray(_res)) {
      _res = [_res];
    }

    var no_dead = _res.filter(function(item) {
      return item.status !== 'ok';
    }).length;
    var no_alive = _res.length - no_dead;

    var stats = _res.map(function(item) {
      var el = {};
      el[item.agent] = item.swarm_size;
      return el;
    });

    res.json({
      no_alive: no_alive,
      no_dead: no_dead,
      swarm_stats: stats
    });
  }, function(e) {
    logger.error('shit happened: ' + e);
  });
});

var fetch_ping_reports_as_promises = function() {
  var promises = [];
  agents.forEach(function(agent) {
    var def = deferred();
    http.get('http://' + agent + '/reports/ping', function(_res) {
      if (_res.statusCode !== 200) {
        def.resolve({status: 'nok', description: _res.statusMessage, reports: []});
        return;
      }

      var body = '';
      _res.on('data', function(chunk) {
        body += chunk;
      });
      _res.on('end', function() {
        var objects = JSON.parse(body);
        var reports = []
        objects.forEach(function(object) {
          var report = new PingReport(object);
          report.agents = [agent];
          reports.push(report);
        });
        def.resolve({status: 'ok', description: 'ok', reports: reports});
      });
    }).on('error', function(e) {
      logger.error('/reports failed - ' + agent + ' - ' + e.message);
      def.resolve({status: 'nok', description: e.message, reports: []});
    });
    promises.push(def.promise);
  });
  return promises;
};

app.get('/reports/ping', function(req, res) {
  deferred.apply(null, fetch_ping_reports_as_promises()).done(function(_res) {
    if (!_.isArray(_res)) {
      _res = [_res];
    }

    var reports = _res.map(function(item) {
      return item.reports;
    }).reduce(function(a, b) {
      return a.concat(b);
    }, []);
    res.json(reports);
  }, function(e) {
    logger.error('shit happened: ' + e);
  });
});

app.get('/reports/ping/_brief', function(req, res) {
  deferred.apply(null, fetch_ping_reports_as_promises()).done(function(_res) {
    if (!_.isArray(_res)) {
      _res = [_res];
    }

    var reports = _res.map(function(item) {
      return item.reports;
    }).reduce(function(a, b) {
      return a.concat(b);
    }, []).reduce(function(r1, r2) {
      return r1.sum(r2);
    }, new PingReport());
    res.json(reports);
  }, function(e) {
    logger.error('shit happened: ' + e);
  });
});

var fetch_broadcast_reports_as_promises = function() {
  var promises = [];
  agents.forEach(function(agent) {
    var def = deferred();
    http.get('http://' + agent + '/reports/broadcast', function(_res) {
      if (_res.statusCode !== 200) {
        def.resolve({status: 'nok', description: _res.statusMessage, reports: []});
        return;
      }

      var body = '';
      _res.on('data', function(chunk) {
        body += chunk;
      });
      _res.on('end', function() {
        var objects = JSON.parse(body);
        var reports = []
        objects.forEach(function(object) {
          var report = new BroadcastReport(object);
          report.agents = [agent];
          reports.push(report);
        });
        def.resolve({status: 'ok', description: 'ok', reports: reports});
      });
    }).on('error', function(e) {
      logger.error('/reports failed - ' + agent + ' - ' + e.message);
      def.resolve({status: 'nok', description: e.message, reports: []});
    });
    promises.push(def.promise);
  });
  return promises;
};

app.get('/reports/broadcast', function(req, res) {
  deferred.apply(null, fetch_broadcast_reports_as_promises()).done(function(_res) {
    if (!_.isArray(_res)) {
      _res = [_res];
    }

    var reports = _res.map(function(item) {
      return item.reports;
    }).reduce(function(a, b) {
      return a.concat(b);
    }, []);
    res.json(reports);
  }, function(e) {
    logger.error('shit happened: ' + e);
  });
});

app.get('/reports/broadcast/_brief', function(req, res) {
  deferred.apply(null, fetch_broadcast_reports_as_promises()).done(function(_res) {
    if (!_.isArray(_res)) {
      _res = [_res];
    }

    var reports = _res.map(function(item) {
      return item.reports;
    }).reduce(function(a, b) {
      return a.concat(b);
    }, []).reduce(function(r1, r2) {
      return r1.sum(r2);
    }, new BroadcastReport());
    res.json(reports);
  }, function(e) {
    logger.error('shit happened: ' + e);
  });
});

app.get('/reports/_flush', function(req, res) {
  agents.forEach(function(agent) {
    http.get('http://' + agent + '/reports/_flush').on('error', function(e) {
      logger.error('/reports/_flush failed - ' + agent + ' - ' + e.message);
    });
  });
  res.end();
});

app.get('/agents', function(req, res) {
  res.json(agents);
});

app.listen(port, '0.0.0.0', function() {
  logger.info('Master started @ port ' + port);
});
