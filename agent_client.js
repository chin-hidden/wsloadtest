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

  var agent = new (require('./deps/agent').Agent)();
  var ping_reports = [];

  app.get('/swarm/_start', function(req, res) {
    if (agent.swarm_size() > 0) {
      logger.info('A swarm is already running, force closing...');
      agent.stop();
    }

    var host = req.query.host || 'https://priceservice.vndirect.com.vn/realtime';
    var ccu = req.query.ccu || 20;

    logger.info('Creating swarm of ' + ccu + ' connections to ' + host);
    agent.start(host, ccu);
    res.end();
  });

  app.get('/swarm/_stop', function(req, res) {
    agent.stop();
    res.end();
  });

  app.get('/swarm/_ping', function(req, res) {
    var wait_time = req.query.wait || 5;
    var hits = req.query.hits || 1;
    var tick = req.query.tick || 10 // in ms

    agent.setup_ping();

    logger.info('Start sending ' + hits + ' pings');
    for (var i = 0; i < hits; i++) {
      setTimeout(function() {
        agent.do_ping();
      }, i * tick);
    }

    setTimeout(function() {
      var report = agent.make_ping_report();
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
    res.json({swarm_size: agent.swarm_size()});
  });

  app.listen(port, '0.0.0.0', function() {
    logger.info('Agent started @ port ' + port);
  });

  setInterval(function() {
    logger.info('Current swarm size: ' + agent.swarm_size());
  }, 10000);
};

if (cluster.isMaster) {
  cluster.fork();

  cluster.on('exit', function(worker, code, signal) {
    logger.error('oh crap! the worker has just died: ' + code + ' - ' + signal);
    cluster.fork();
  });
} else {
  spawn_worker();
}
