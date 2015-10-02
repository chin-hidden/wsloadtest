var _ = require('underscore');

module.exports = {
  gen_empty: function() {
    return {
      no_received: 0,
      no_timeout: 0,
      min_rtt: null,
      max_rtt: null,
      mean_rtt: null,
      agents: []
    };
  },
  sum: function(r1, r2) {
    var value_map = {};

    ['min_rtt', 'max_rtt'].forEach(function(k) {
      value_map[k] = [];
      if (Number.isFinite(r1[k])) {
        value_map[k].push(r1[k]);
      }
      if (Number.isFinite(r2[k])) {
        value_map[k].push(r2[k]);
      }
    });

    return {
      no_received: r1.no_received + r2.no_received,
      no_timeout: r1.no_timeout + r2.no_timeout,
      min_rtt: Math.min.apply(null, value_map.min_rtt),
      max_rtt: Math.max.apply(null, value_map.max_rtt),
      mean_rtt: r1.no_received > 0 || r2.no_received > 0 ?
          (r1.mean_rtt * r1.no_received + r2.mean_rtt * r2.no_received) / (r1.no_received + r2.no_received) : null,
      agents: _.uniq(r1.agents.concat(r2.agents))
    }
  }
};
