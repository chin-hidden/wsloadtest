var ws = require('./ws');
var _ = require('underscore');
var PingReport = require('./report').PingReport;
var BroadcastReport = require('./report').BroadcastReport;

var Agent = function() {
  this.swarm = [];
  this.ping_stats = {};
  this.broadcast_stats = {};
};

Agent.prototype.start = function(host, ccu, tick) {
  var self = this;
  return ws.create_conn_swarm(host, ccu, tick).then(function(_swarm) {
    self.swarm = _swarm;
  });
};

Agent.prototype.stop = function() {
  this.swarm.forEach(function(conn) {
    conn.close();
  });
  this.swarm = [];
};

Agent.prototype.swarm_size = function() {
  return this.swarm.filter(function(conn) { return conn; }).length;
};

Agent.prototype.setup_ping = function() {
  var self = this;
  this.ping_stats = {};

  this.swarm.forEach(function(conn) {
    conn.onmessage = function(e) {
      var obj = JSON.parse(e.data);
      var now = new Date().getTime();

      if (obj.type === 'pong' && obj.data && typeof self.ping_stats[obj.data] === 'object') {
        self.ping_stats[obj.data].received_at = now;
      }
    };
  });
};

Agent.prototype.do_ping = function() {
  var self = this;
  this.swarm.forEach(function(conn) {
    var now = new Date().getTime();
    var key = conn.id + '.' + now + '.' + Math.floor((Math.random()) * 0x10000).toString(16);
    self.ping_stats[key] = {
      sent_at: now
    };
    conn.send(JSON.stringify({type: 'ping', data: key}));
  });
};

Agent.prototype.setup_broadcast = function() {
  var self = this;
  this.broadcast_stats = {};

  this.swarm.forEach(function(conn) {
    self.broadcast_stats[conn.id] = new BroadcastReport();
    conn.onmessage = function(e) {
      self.broadcast_stats[conn.id].no_received++;
    };
  });
};

Agent.prototype.request_for_broadcast = function(hits, tick) {
  var self = this;
  this.swarm.forEach(function(conn) {
    self.broadcast_stats[conn.id].no_expected = hits;

    conn.send(JSON.stringify({
      type: 'broadcast',
      data: {
        pwd: 'vnds$123',
        count: hits,
        interval: tick
      }
    }));
  });
};

Agent.prototype.make_ping_report = function() {
  var ping_list = _.values(this.ping_stats);
  var partitions = _.partition(ping_list, function(ping) {
    return ping.received_at;
  });

  var rtts = partitions[0].map(function(ping) {
    return ping.received_at - ping.sent_at;
  });

  return new PingReport({
    no_received: partitions[0].length,
    no_timeout: partitions[1].length,
    min_rtt: _.min(rtts),
    max_rtt: _.max(rtts),
    mean_rtt: rtts.reduce(function(rtt1, rtt2) { return rtt1 + rtt2; }, 0) / rtts.length
  });
};

Agent.prototype.make_broadcast_report = function() {
  return _.values(this.broadcast_stats).reduce(function(r1, r2) {
    return r1.sum(r2);
  }, new BroadcastReport());
};

module.exports = {
  Agent: Agent
};
