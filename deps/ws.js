var SockJS = require('sockjs-client');
var deferred = require('deferred');
var logger = require('./logger.js');
var http = require('http');
var sockjs = require('sockjs');
var node_static = require('node-static');
var util = require('util');
var EventEmitter = require('events');

var self = {

	open_connection: function(host, id){
		var def = deferred();
		var conn = SockJS(host);
		conn.id = id;
		conn.msg_count = 0;
		conn.onopen = function(e){
			logger.info(util.format('Connection %s has just connected. It\'s on!', conn.id));
			def.resolve(conn);
		};
		conn.onclose = function(e){
			logger.info(util.format('Connection %s closed, bye!', conn.id));
			logger.info(JSON.stringify(e));
			conn.status = 'close';
		};
		conn.time_received = [];
		conn.onmessage = function(e){
			conn.time_received.push(new Date().getTime());
			conn.msg_count += 1;
			time_last_msg = new Date();
		};
		return def.promise;
	},

	create_conn_swarm: function(host, count, tick){
		var def = deferred();
		var swarm = [];
		var resolved = false;
		tick || (tick = 30);
		for(var i = 0; i < count; i++){
			// this is to preserve variable i for connection id
			(function(conn_id, delay){
				setTimeout(function(){
					self.open_connection(host, conn_id).done(function(conn){
						swarm.push(conn);
						logger.info(util.format('New connection open: %s, swarm size: %d', conn.id, swarm.length));

						var listener = conn.onclose;
						conn.onclose = function(e) {
							if (typeof listener === 'function') {
								listener.apply(null, [e]);
							}

							for (var j = 0; j < swarm.length; j++) {
								if (swarm[j].id === conn.id) {
									swarm.splice(j, 1);
									break;
								}
							}
						};

						if(!resolved){
							def.resolve(swarm);
							resolved = true;
						}
					});
				}, delay);
			})(i, i * tick);
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
		var emitter = new EventEmitter();

		sockjs_echo.on('connection', function(conn) {
			client_map[conn.id] = conn;
			client_list.push(conn);

			conn.on('close', function(){
				delete client_map[conn.id];
			});
		});
		// 3. Usual http stuff
		var server = http.createServer();

		server.addListener('request', function(req, res) {
			logger.info('Request received at: ' + req.url);

			if (req.url.match(/^\/stop/)) {
				emitter.emit('stop');
			}

			if (req.url.match(/^\/start/)) {
				emitter.emit('start');
			}

			res.end('ok');
		});
		server.addListener('upgrade', function(req,res){
			res.end();
		});

		sockjs_echo.installHandlers(server, {prefix:'/echo'});

		logger.info(util.format('[*] Listening on 0.0.0.0:%d', port));

		server.listen(port, '0.0.0.0');

		return {
			client_list: client_list,
			client_map: client_map,
			server: server,
			sockjs: sockjs_echo,
			emitter: emitter
		}
	}
}

module.exports = self;
