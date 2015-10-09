var deferred = require('deferred');
var _ = require('underscore');
var request = require('request');

var ws = require('./ws');
var logger = require('./logger');
var PingReport = require('./report').PingReport;
var BroadcastReport = require('./report').BroadcastReport;

var Master = function(agents) {
  this.agents = agents || [];
};

var wrap = function(obj) {
  if (!_.isArray(obj)) {
    return [obj];
  }
  return obj;
};

Master.prototype.start = function(host, ccu, tick) {
  this.agents.forEach(function(agent) {
    var url = 'http://' + agent + '/swarm/_start';
    request.get({url: url, qs: {host: host, ccu: ccu, tick: tick}}, function(e, res, body) {
      if (e) {
        logger.error('/agents/_start failed - ' + agent + ' - ' + e.message);
      }
    });
  });
};

Master.prototype.stop = function() {
  this.agents.forEach(function(agent) {
    var url = 'http://' + agent + '/swarm/_stop';
    request.get({url: url}, function(e, res, body) {
      if (e) {
        logger.error('/agents/_start failed - ' + agent + ' - ' + e.message);
      }
    });
  });
};

Master.prototype.ping = function(hits, tick, wait) {
  this.agents.forEach(function(agent) {
    var url = 'http://' + agent + '/swarm/_ping';
    request.get({url: url, qs: {hits: hits, tick: tick, wait: wait}}, function(e, res, body) {
      if (e) {
        logger.error('/agents/_ping failed - ' + agent + ' - ' + e.message);
      }
    });
  });
};

Master.prototype.broadcast = function(hits, tick, wait) {
  this.agents.forEach(function(agent) {
    var url = 'http://' + agent + '/swarm/_broadcast';
    request.get({url: url, qs: {hits: hits, tick: tick, wait: wait}}, function(e, res, body) {
      if (e) {
        logger.error('/agents/_broadcast failed - ' + agent + ' - ' + e.message);
      }
    });
  });
};

Master.prototype.fetch_raw_stats = function() {
  var promises = [];
  this.agents.forEach(function(agent) {
    var def = deferred();

    var url = 'http://' + agent + '/swarm/_stats';
    request.get({url: url, timeout: 1000}, function(e, res, body) {
      if (e) {
        logger.error('/agents/_stats failed - ' + agent + ' - ' + e.message);
        def.resolve({status: 'nok', description: e.message, swarm_size: 0, agent: agent});
        return;
      }
      if (res.statusCode !== 200) {
        def.resolve({status: 'nok', description: res.statusMessage, swarm_size: 0, agent: agent});
        return;
      }
      var stats = JSON.parse(body);
      def.resolve({status: 'ok', description: 'ok', swarm_size: stats.swarm_size, agent: agent});
    });

    promises.push(def.promise);
  });

  return promises;
};

Master.prototype.get_stats = function() {
  var def = deferred();
  deferred.apply(null, this.fetch_raw_stats()).done(function(stats) {
    def.resolve(wrap(stats));
  }, function(e) {
    logger.error('shit happened: ' + e);
    def.resolve();
  });
  return def.promise;
};

Master.prototype.get_brief_stats = function() {
  var def = deferred();
  deferred.apply(null, this.fetch_raw_stats()).done(function(stats) {
    stats = wrap(stats);
    var no_dead = stats.filter(function(item) {
      return item.status !== 'ok';
    }).length;
    var no_alive = stats.length - no_dead;

    stats = stats.map(function(item) {
      var el = {};
      el[item.agent] = item.swarm_size;
      return el;
    });

    def.resolve({
      no_alive: no_alive,
      no_dead: no_dead,
      swarm_stats: stats
    });
  }, function(e) {
    logger.error('shit happened: ' + e);
    def.resolve();
  });
  return def.promise;
};

Master.prototype.fetch_ping_reports = function() {
  var promises = [];
  this.agents.forEach(function(agent) {
    var def = deferred();
    request.get({url: 'http://' + agent + '/reports/ping', timeout: 2000}, function(e, res, body) {
      if (e) {
        logger.error('/reports failed - ' + agent + ' - ' + e.message);
        def.resolve({status: 'nok', description: e.message, reports: []});
        return;
      }
      if (res.statusCode !== 200) {
        def.resolve({status: 'nok', description: res.statusMessage, reports: []});
        return;
      }

      var objects = JSON.parse(body);
      var reports = [];
      objects.forEach(function(object) {
        var report = new PingReport(object);
        report.agents = [agent];
        reports.push(report);
      });
      def.resolve({status: 'ok', description: 'ok', reports: reports});
    });
    promises.push(def.promise);
  });
  return promises;
};

Master.prototype.get_ping_reports = function() {
  var def = deferred();
  deferred.apply(null, this.fetch_ping_reports()).done(function(reports) {
    reports = wrap(reports).map(function(item) {
      return item.reports;
    }).reduce(function(a, b) {
      return a.concat(b);
    }, []);

    def.resolve(reports);
  }, function(e) {
    logger.error('shit happened: ' + e);
    def.resolve();
  });
  return def.promise;
};

Master.prototype.get_brief_ping_reports = function() {
  var def = deferred();
  deferred.apply(null, this.fetch_ping_reports()).done(function(reports) {
    reports = wrap(reports).map(function(item) {
      return item.reports;
    }).reduce(function(a, b) {
      return a.concat(b);
    }, []).reduce(function(r1, r2) {
      return r1.sum(r2);
    }, new PingReport());

    def.resolve(reports);
  }, function(e) {
    logger.error('shit happened: ' + e);
    def.resolve();
  });
  return def.promise;
};

Master.prototype.fetch_broadcast_reports = function() {
  var promises = [];
  this.agents.forEach(function(agent) {
    var def = deferred();
    request.get({url: 'http://' + agent + '/reports/broadcast', timeout: 2000}, function(e, res, body) {
      if (e) {
        logger.error('/reports failed - ' + agent + ' - ' + e.message);
        def.resolve({status: 'nok', description: e.message, reports: []});
        return;
      }
      if (res.statusCode !== 200) {
        def.resolve({status: 'nok', description: res.statusMessage, reports: []});
        return;
      }

      var objects = JSON.parse(body);
      var reports = [];
      objects.forEach(function(object) {
        var report = new BroadcastReport(object);
        report.agents = [agent];
        reports.push(report);
      });
      def.resolve({status: 'ok', description: 'ok', reports: reports});
    });
    promises.push(def.promise);
  });
  return promises;
};

Master.prototype.get_broadcast_reports = function() {
  var def = deferred();
  deferred.apply(null, this.fetch_broadcast_reports()).done(function(reports) {
    reports = wrap(reports).map(function(item) {
      return item.reports;
    }).reduce(function(a, b) {
      return a.concat(b);
    }, []);

    def.resolve(reports);
  }, function(e) {
    logger.error('shit happened: ' + e);
    def.resolve();
  });
  return def.promise;
};

Master.prototype.get_brief_broadcast_reports = function() {
  var def = deferred();
  deferred.apply(null, this.fetch_broadcast_reports()).done(function(reports) {
    reports = wrap(reports).map(function(item) {
      return item.reports;
    }).reduce(function(a, b) {
      return a.concat(b);
    }, []).reduce(function(r1, r2) {
      return r1.sum(r2);
    }, new BroadcastReport());

    def.resolve(reports);
  }, function(e) {
    logger.error('shit happened: ' + e);
    def.resolve();
  });
  return def.promise;
};

Master.prototype.flush_reports= function() {
  this.agents.forEach(function(agent) {
    var url = 'http://' + agent + '/reports/_flush';
    request.get(url, function(e, res, body) {
      if (e) {
        logger.error('/reports/_flush failed - ' + agent + ' - ' + e.message);
      }
    });
  });
};

module.exports = Master;
