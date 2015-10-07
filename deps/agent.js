var ws = require('./ws');
var _ = require('underscore');

var Agent = function() {
  this.swarm = [];
  this.ping_stats = {};
};

Agent.prototype.start = function(host, ccu, tick) {
  var self = this;
  ws.create_conn_swarm(host, ccu, tick).done(function(_swarm) {
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
    var key = conn.id + '.' + now;
    self.ping_stats[key] = {
      sent_at: now
    };
    conn.send(JSON.stringify({type: 'ping', data: key}));
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

  return report = {
    no_received: partitions[0].length,
    no_timeout: partitions[1].length,
    min_rtt: _.min(rtts),
    max_rtt: _.max(rtts),
    mean_rtt: rtts.reduce(function(rtt1, rtt2) { return rtt1 + rtt2; }, 0) / rtts.length
  };
};

module.exports = {
  Agent: Agent
};
