/**
	My own logger, better timestamp
*/
var timestamp = require('console-timestamp');

module.exports = {
  log: function(msg, level) {
    console.log('[' + level + '] ' + timestamp('YYYY-MM-DD hh:mm:ss.iii') + ' :: ' + msg);
  },
  info: function(msg) {
    this.log(msg, 'inf');
  },
  error: function(msg) {
    this.log(msg, 'err');
  }
}
