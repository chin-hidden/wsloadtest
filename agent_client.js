var argv = require('yargs').argv;
var express = require('express');
var cluster = require('cluster');

var logger = require('./deps/logger');

var spawn_worker = function() {
  var port = argv.port || 8082;

  var app = express();

  var agent = new (require('./deps/agent').Agent)();
  var ping_reports = [];
  var broadcast_reports = [];

  app.get('/swarm/_start', function(req, res) {
    if (agent.swarm_size() > 0) {
      logger.info('A swarm is already running, force closing...');
      agent.stop();
    }

    var host = req.query.host || 'https://priceservice.vndirect.com.vn/realtime';
    var ccu = Number(req.query.ccu) || 20;
    var tick = Number(req.query.tick) || 30;

    logger.info('Creating swarm of ' + ccu + ' connections to ' + host);
    agent.start(host, ccu, tick);
    res.end();
  });

  app.get('/swarm/_stop', function(req, res) {
    agent.stop();
    res.end();
  });

  app.get('/swarm/_ping', function(req, res) {
    var wait_time = Number(req.query.wait) || 5;
    var hits = Number(req.query.hits) || 1;
    var tick = Number(req.query.tick) || 10; // in ms

    agent.setup_ping();

    logger.info('Start sending ' + hits + ' pings');
    for (var i = 0; i < hits; i++) {
      var delay = Math.max(i * tick - Math.random() * tick * 0.5, 0); // let's spice things up with a bit of randomness
      setTimeout(function() {
        agent.do_ping();
      }, delay);
    }

    setTimeout(function() {
      var report = agent.make_ping_report();
      ping_reports.push(report);
      res.json(report);
    }, wait_time * 1000);
  });

  app.get('/swarm/_broadcast', function(req, res) {
    var wait_time = Number(req.query.wait) || 5;
    var hits = Number(req.query.hits) || 1;
    var tick = Number(req.query.tick) || 10; // in ms

    agent.setup_broadcast();

    logger.info('Request for broadcast ' + hits + ' messages per ' + tick + 'ms');
    agent.request_for_broadcast(hits, tick);

    setTimeout(function() {
      var report = agent.make_broadcast_report();
      broadcast_reports.push(report);
      res.json(report);
    }, wait_time * 1000);
  })

  app.get('/reports/ping', function(req, res) {
    res.json(ping_reports);
  });

  app.get('/reports/broadcast', function(req, res) {
    res.json(broadcast_reports);
  });

  app.get('/reports/_flush', function(req, res) {
    ping_reports = [];
    broadcast_reports = [];
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
