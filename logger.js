/**
	My own logger, better timestamp
*/
var timestamp = require('console-timestamp');

module.exports = {
	log: function(msg){
	    console.log('[inf] ' + timestamp('DD-MM-YYYY hh:mm:ss:iii') + ' :: ' + msg);
	}
}
