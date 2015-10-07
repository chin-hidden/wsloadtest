var argv = require('yargs').argv;
var util = require('util');
var http = require('http');
var deferred = require('deferred');
var _ = require('underscore');
var qs = require('querystring');

var logger = require('./deps/logger');
var report_processor = require('./deps/report_processor');
var ws = require('./deps/ws');

var express = require('express');

var agents = [

];

var port = argv.port || 8083;

var app = express();
app.engine('jade', require('jade').__express);
app.set('view engine', 'jade');

app.get('/', function(req, res) {
  res.render('master', {agents: agents});
});

app.get('/agents/_start', function(req, res) {
  var host = req.query.host || 'http://localhost:8081/echo';
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
      logger.error('/reports failed - ' + agent + ' - ' + e.message);
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

app.get('/reports/_brief', function(req, res) {
  deferred.apply(null, fetch_reports_as_promises()).done(function(_res) {
    if (!_.isArray(_res)) {
      _res = [_res];
    }

    var reports = _res.map(function(item) {
      return item.reports;
    }).reduce(function(a, b) {
      return a.concat(b);
    }, []).reduce(report_processor.sum, report_processor.gen_empty());
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

app.get('/host/_broadcast', function(req, res) {
  var host = req.query.host || 'https://priceservice.vndirect.com.vn/realtime';
  var hits = req.query.hits || 1;
  var tick = req.query.tick || 10; // in ms
  var message = req.query.message || 'This is the message for broadcasting';

  logger.info(util.format('Commanding host %s to broadcast test message to all its subscriber, rate: %d per %dms', host, hits, tick));
  ws.open_connection(host, 'test_master').done(function(conn) {
    conn.onmessage = function(e) {
      console.log('got data: ', e.data);
    };

    conn.send(JSON.stringify({type: 'ping', data: new Date().getTime()}));
    for (var i = 0; i < hits; i++) {
      setTimeout(function() {
        var data = util.format('[%d] %s', new Date().getTime(), message);
        conn.send(JSON.stringify({type: 'loadTest', data: data}));
      }, i * tick);
    }

    setTimeout(function() {
      conn.close();
    }, 5000);
  });
  res.end();
});

app.listen(port, '0.0.0.0', function() {
  logger.info('Master started @ port ' + port);
});
