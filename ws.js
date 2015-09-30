var SockJS = require('sockjs-client');
var deferred = require('deferred');
var logger = require('./logger.js');
var http = require('http');
var sockjs = require('sockjs');
var node_static = require('node-static');
var util = require('util');

var self = {

	open_connection: function(host, id){
		var def = deferred();
		var conn = SockJS(host);
		conn.id = id;
		conn.msg_count = 0;
		conn.onopen = function(){
			def.resolve(conn);
		}
		conn.onclose = function(e){
			logger.log(util.format('Connection %s closed, reason: %s, bye!', conn.id, e.reason));
			conn.status = 'close';
		}
		conn.time_received = [];
		conn.onmessage = function(e){
			conn.time_received.push(new Date().getTime());
			conn.msg_count += 1;
			time_last_msg = new Date();
		}
		return def.promise;
	},

	create_conn_swarm: function(host, count){
		var def = deferred();
		var swarms = [];
		var resolved = false;
		for(var i = 0; i < count; i++){
			// this is to preserve variable i for connection id
			(function(conn_id, delay){
				setTimeout(function(){
					self.open_connection(host, conn_id).done(function(conn){
						swarms.push(conn);
						logger.log(util.format('New connection open: %s, swarm size: %d', conn.id, swarms.length));
						if(!resolved){
							def.resolve(swarms);
							resolved = true;
						}
					});
				}, delay);
			})(i, i * 10);
		}
		return def.promise;
	},

	create_server: function(port){
		var sockjs_opts = {
			sockjs_url: 'http://cdn.jsdelivr.net/sockjs/0.3.4/sockjs.min.js',
			log: function(severity, msg) {
			}
		};
		var client_list = [];
		var client_map = {};
		var sockjs_echo = sockjs.createServer(sockjs_opts);

		sockjs_echo.on('connection', function(conn) {
			client_map[conn.id] = conn;
			client_list.push(conn);

			conn.on('close', function(){
				delete client_map[conn.id];
			});
		});
		// 3. Usual http stuff
		var server = http.createServer();
		var static_directory = new node_static.Server(__dirname);
		server.addListener('request', function(req, res) {
			static_directory.serve(req, res);
		});

		server.addListener('upgrade', function(req,res){
			res.end();
		});

		sockjs_echo.installHandlers(server, {prefix:'/echo'});

		logger.log(util.format('[*] Listening on 0.0.0.0:%d', port));

		server.listen(port, '0.0.0.0');

		return {
			'client_list': client_list,
			'client_map': client_map,
			'server': server,
			'sockjs': sockjs_echo
		}
	}
}

module.exports = self;
