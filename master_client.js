var argv = require('yargs').argv;

var logger = require('./deps/logger');
var Master = require('./deps/master');

var express = require('express');

var agents = [
  '10.27.10.9:8082'
];
var master = new Master(agents);

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

  master.start(host, ccu, tick);
  res.end();
});

app.get('/agents/_stop', function(req, res) {
  master.stop();
  res.end();
});

app.get('/agents/_ping', function(req, res) {
  var wait = req.query.wait || 20;
  var hits = req.query.hits || 1;
  var tick = req.query.tick || 10; // in ms

  master.ping(hits, tick, wait);
  res.end();
});

app.get('/agents/_broadcast', function(req, res) {
  var wait = req.query.wait || 20;
  var hits = req.query.hits || 1;
  var tick = req.query.tick || 10; // in ms

  master.broadcast(hits, tick, wait);
  res.end();
});

app.get('/agents/stats/', function(req, res) {
  master.get_stats().done(function(stats) {
    res.json(stats);
  });
});

app.get('/agents/stats/_brief', function(req, res) {
  master.get_brief_stats().done(function(stats) {
    res.json(stats);
  });
});

app.get('/reports/ping', function(req, res) {
  master.get_ping_reports().done(function(reports) {
    res.json(reports);
  });
});

app.get('/reports/ping/_brief', function(req, res) {
  master.get_brief_ping_reports().done(function(reports) {
    res.json(reports);
  });
});

app.get('/reports/broadcast', function(req, res) {
  master.get_broadcast_reports().done(function(reports) {
    res.json(reports);
  });
});

app.get('/reports/broadcast/_brief', function(req, res) {
  master.get_brief_broadcast_reports().done(function(reports) {
    res.json(reports);
  });
});

app.get('/reports/_flush', function(req, res) {
  master.flush_reports();
  res.end();
});

app.get('/agents', function(req, res) {
  res.json(master.agents);
});

app.listen(port, '0.0.0.0', function() {
  logger.info('Master started @ port ' + port);
});
