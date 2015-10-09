const ws = require('./ws');
const _ = require('underscore');
const PingReport = require('./report').PingReport;
const BroadcastReport = require('./report').BroadcastReport;

class Agent {
  constructor() {
    this.swarm = [];
    this.ping_stats = {};
    this.broadcast_stats = {};
  }

  start(host, ccu, tick) {
    return ws.create_conn_swarm(host, ccu, tick).then(_swarm => {
      this.swarm = _swarm;
    });
  }

  stop() {
    this.swarm.forEach(conn => {
      conn.close();
    });
    this.swarm = [];
  }

  swarm_size() {
    return this.swarm.filter(conn => conn).length;
  }

  setup_ping() {
    this.ping_stats = {};

    this.swarm.forEach(conn => {
      conn.onmessage = e => {
        let obj = JSON.parse(e.data);
        let now = new Date().getTime();

        if (obj.type === 'pong' && obj.data && typeof this.ping_stats[obj.data] === 'object') {
          this.ping_stats[obj.data].received_at = now;
        }
      };
    });
  }

  do_ping() {
    this.swarm.forEach(conn => {
      let now = new Date().getTime();
      let key = conn.id + '.' + now + '.' + Math.floor((Math.random()) * 0x10000).toString(16);
      this.ping_stats[key] = {
        sent_at: now
      };
      conn.send(JSON.stringify({type: 'ping', data: key}));
    });
  }

  setup_broadcast() {
    this.broadcast_stats = {};

    this.swarm.forEach(conn => {
      this.broadcast_stats[conn.id] = new BroadcastReport();
      conn.onmessage = e => {
        this.broadcast_stats[conn.id].no_received++;
      };
    });
  }

  request_for_broadcast(hits, tick) {
    this.swarm.forEach(conn => {
      this.broadcast_stats[conn.id].no_expected = hits;

      conn.send(JSON.stringify({
        type: 'broadcast',
        data: {
          pwd: 'vnds$123',
          count: hits,
          interval: tick
        }
      }));
    });
  }

  make_ping_report() {
    let ping_list = _.values(this.ping_stats);
    let partitions = _.partition(ping_list, ping => ping.received_at);

    let rtts = partitions[0].map(ping => ping.received_at - ping.sent_at);

    return new PingReport({
      no_received: partitions[0].length,
      no_timeout: partitions[1].length,
      min_rtt: _.min(rtts),
      max_rtt: _.max(rtts),
      mean_rtt: rtts.reduce((rtt1, rtt2) => rtt1 + rtt2, 0) / rtts.length
    });
  }

  make_broadcast_report() {
    return _.values(this.broadcast_stats).reduce((r1, r2) => r1.sum(r2), new BroadcastReport());
  }
}

module.exports = {
  Agent: Agent
};
