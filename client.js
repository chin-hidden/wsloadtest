var CLIENT_NUMBER = 5000;
var HOST = 'http://localhost:9999';
var NEW_CONN = 100;  // number of new connection per sec
var SockJS = require('sockjs-client');


var new_conn_interval = 1000 / NEW_CONN;
var count = 0;

for(var i = 0; i < CLIENT_NUMBER; i++){
  setTimeout(function(){
var client = SockJS(HOST + '/echo');

client.onopen = function(){
	count += 1;
	console.log('[INFO] Socket Open, now total: ' + count);
	client.send('Hello');
};

client.onclose = function(){
	console.log('[INFO] Socket Close...');
};

client.onmessage = function(e){
	console.log('Message: ' + e.data);
}
  }, i * new_conn_interval);
}

