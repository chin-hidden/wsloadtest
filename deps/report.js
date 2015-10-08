var _ = require('underscore');

var PingReport = function(options) {
  options || (options = {});
  this.no_received = _.isNumber(options.no_received) ? options.no_received: 0;
  this.no_timeout = _.isNumber(options.no_timeout) ? options.no_timeout: 0;
  this.min_rtt = _.isNumber(options.min_rtt) ? options.min_rtt: Infinity;
  this.max_rtt = _.isNumber(options.max_rtt) ? options.max_rtt: -Infinity;
  this.mean_rtt = _.isNumber(options.mean_rtt) ? options.mean_rtt: null;
  this.agents = _.isArray(options.agents) ? options.agents : [];
};

PingReport.prototype.sum = function(that) {
  var ret = new PingReport();
  ret.no_received = this.no_received + that.no_received;
  ret.no_timeout = this.no_timeout + that.no_timeout;
  ret.min_rtt = Math.min(this.min_rtt, that.min_rtt);
  ret.max_rtt = Math.max(this.max_rtt, that.max_rtt);
  ret.mean_rtt = this.no_received > 0 || that.no_received > 0 ?
          (this.mean_rtt * this.no_received + that.mean_rtt * that.no_received) / (this.no_received + that.no_received) : null;
  ret.agents = _.uniq(this.agents.concat(that.agents));
  return ret;
};

PingReport.prototype.to_json = function() {
  return {
    no_received: this.no_received,
    no_timeout: this.no_timeout,
    min_rtt: this.min_rtt,
    max_rtt: this.max_rtt,
    mean_rtt: this.mean_rtt,
    agents: this.agents
  };
};

var BroadcastReport = function(options) {
  options || (options = {});
  this.no_expected = _.isNumber(options.no_expected) ? options.no_expected: 0;
  this.no_received = _.isNumber(options.no_received) ? options.no_received: 0;
  this.agents = _.isArray(options.agents) ? options.agents : [];
};

BroadcastReport.prototype.sum = function(that) {
  var ret = new BroadcastReport();
  ret.no_expected = this.no_expected + that.no_expected;
  ret.no_received = this.no_received + that.no_received;
  ret.agents = _.uniq(this.agents.concat(that.agents));
  return ret;
};

BroadcastReport.prototype.to_json = function() {
  return {
    no_expected: this.no_expected,
    no_received: this.no_received,
    agents: this.agents
  };
};

module.exports = {
  PingReport: PingReport,
  BroadcastReport: BroadcastReport
};
