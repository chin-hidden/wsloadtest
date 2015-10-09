const deferred = require('deferred');
const _ = require('underscore');
const request = require('request');

const ws = require('./ws');
const logger = require('./logger');
const PingReport = require('./report').PingReport;
const BroadcastReport = require('./report').BroadcastReport;

let wrap = function(obj) {
  if (!_.isArray(obj)) {
    return [obj];
  }
  return obj;
};

class Master {
  constructor(agents = []) {
    this.agents = agents;
  }

  start(host, ccu, tick) {
    this.agents.forEach(agent => {
      var url = 'http://' + agent + '/swarm/_start';
      request.get({url: url, qs: {host, ccu, tick}}, (e, res, body) => {
        if (e) {
          logger.error('/agents/_start failed - ' + agent + ' - ' + e.message);
        }
      });
    });
  }

  stop() {
    this.agents.forEach((agent) => {
      var url = 'http://' + agent + '/swarm/_stop';
      request.get({url: url}, (e, res, body) => {
        if (e) {
          logger.error('/agents/_start failed - ' + agent + ' - ' + e.message);
        }
      });
    });
  }

  ping(hits, tick, wait) {
    this.agents.forEach(agent => {
      var url = 'http://' + agent + '/swarm/_ping';
      request.get({url: url, qs: {hits, tick, wait}}, (e, res, body) => {
        if (e) {
          logger.error('/agents/_ping failed - ' + agent + ' - ' + e.message);
        }
      });
    });
  }

  broadcast(hits, tick, wait) {
    this.agents.forEach(agent => {
      var url = 'http://' + agent + '/swarm/_broadcast';
      request.get({url: url, qs: {hits, tick, wait}}, (e, res, body) => {
        if (e) {
          logger.error('/agents/_broadcast failed - ' + agent + ' - ' + e.message);
        }
      });
    });
  }

  fetch_raw_stats() {
    var promises = [];
    this.agents.forEach(agent => {
      var def = deferred();

      var url = 'http://' + agent + '/swarm/_stats';
      request.get({url: url, timeout: 1000}, (e, res, body) => {
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
  }

  get_stats() {
    var def = deferred();
    deferred.apply(null, this.fetch_raw_stats()).done(stats => {
      def.resolve(wrap(stats));
    }, e => {
      logger.error('shit happened: ' + e);
      def.resolve();
    });
    return def.promise;
  }

  get_brief_stats() {
    var def = deferred();
    deferred.apply(null, this.fetch_raw_stats()).done(stats => {
      stats = wrap(stats);
      var no_dead = stats.filter(item => item.status !== 'ok').length;
      var no_alive = stats.length - no_dead;

      stats = stats.map(item => {
        var el = {};
        el[item.agent] = item.swarm_size;
        return el;
      });

      def.resolve({
        no_alive: no_alive,
        no_dead: no_dead,
        swarm_stats: stats
      });
    }, e => {
      logger.error('shit happened: ' + e);
      def.resolve();
    });
    return def.promise;
  }

  fetch_ping_reports() {
    var promises = [];
    this.agents.forEach(agent => {
      var def = deferred();
      request.get({url: 'http://' + agent + '/reports/ping', timeout: 2000}, (e, res, body) => {
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
        objects.forEach(object => {
          var report = new PingReport(object);
          report.agents = [agent];
          reports.push(report);
        });
        def.resolve({status: 'ok', description: 'ok', reports: reports});
      });
      promises.push(def.promise);
    });
    return promises;
  }

  get_ping_reports() {
    var def = deferred();
    deferred.apply(null, this.fetch_ping_reports()).done(reports => {
      reports = wrap(reports).map(item => item.reports).reduce((a, b) => a.concat(b), []);
      def.resolve(reports);
    }, e => {
      logger.error('shit happened: ' + e);
      def.resolve();
    });
    return def.promise;
  }

  get_brief_ping_reports() {
    var def = deferred();
    deferred.apply(null, this.fetch_ping_reports()).done(reports => {
      reports = wrap(reports).map(item => item.reports)
        .reduce((a, b) => a.concat(b), [])
        .reduce((r1, r2) => r1.sum(r2), new PingReport());

      def.resolve(reports);
    }, e => {
      logger.error('shit happened: ' + e);
      def.resolve();
    });
    return def.promise;
  }

  fetch_broadcast_reports() {
    var promises = [];
    this.agents.forEach(agent => {
      var def = deferred();
      request.get({url: 'http://' + agent + '/reports/broadcast', timeout: 2000}, (e, res, body) => {
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
        objects.forEach(object => {
          var report = new BroadcastReport(object);
          report.agents = [agent];
          reports.push(report);
        });
        def.resolve({status: 'ok', description: 'ok', reports: reports});
      });
      promises.push(def.promise);
    });
    return promises;
  }

  get_broadcast_reports() {
    var def = deferred();
    deferred.apply(null, this.fetch_broadcast_reports()).done(reports => {
      reports = wrap(reports).map(item => item.reports).reduce((a, b) => a.concat(b), []);

      def.resolve(reports);
    }, e => {
      logger.error('shit happened: ' + e);
      def.resolve();
    });
    return def.promise;
  }

  get_brief_broadcast_reports() {
    var def = deferred();
    deferred.apply(null, this.fetch_broadcast_reports()).done(reports => {
      reports = wrap(reports).map(item => item.reports)
        .reduce((a, b) => a.concat(b), [])
        .reduce((r1, r2) => r1.sum(r2), new BroadcastReport());

      def.resolve(reports);
    }, e => {
      logger.error('shit happened: ' + e);
      def.resolve();
    });
    return def.promise;
  }

  flush_reports() {
    this.agents.forEach(agent => {
      var url = 'http://' + agent + '/reports/_flush';
      request.get(url, (e, res, body) => {
        if (e) {
          logger.error('/reports/_flush failed - ' + agent + ' - ' + e.message);
        }
      });
    });
  }
}

module.exports = Master;
