var CLIENT_NUMBER = 3;
var HOST = 'http://localhost:9999';
var SockJS = require('sockjs-client');


for(var i = 0; i < CLIENT_NUMBER; i++){
var client = SockJS(HOST + '/echo');

client.onopen = function(){
	console.log('[INFO] Socket Open...');
};

client.onclose = function(){
	console.log('[INFO] Socket Close...');
};

client.onmessage = function(e){
	console.log('[INFO] Received' + e.data);
}

setTimeout(function(){
	client.send('Hello');
}, 500);
}

