var _ = require('underscore');

module.exports = {
  gen_empty: function() {
    return {
      no_received: 0,
      no_timeout: 0,
      min_rtt: Infinity,
      max_rtt: -Infinity,
      mean_rtt: null,
      agents: []
    };
  },
  sum: function(r1, r2) {
    return {
      no_received: r1.no_received + r2.no_received,
      no_timeout: r1.no_timeout + r2.no_timeout,
      min_rtt: Math.min(r1.min_rtt, r2.min_rtt),
      max_rtt: Math.max(r1.max_rtt, r2.max_rtt),
      mean_rtt: r1.no_received > 0 || r2.no_received > 0 ?
          (r1.mean_rtt * r1.no_received + r2.mean_rtt * r2.no_received) / (r1.no_received + r2.no_received) : null,
      agents: _.uniq(r1.agents.concat(r2.agents))
    }
  }
};
