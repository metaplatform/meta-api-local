/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var http = require("http");
var ws = require("ws");
var express = require("express");

var logger = require("meta-logger").facility("BrokerServer");

var protocol = require("meta-api-shared").protocol;

 /*
  * Local broker API server
  *
  * Constructs HTTP server for local broker
  *
  * @param Broker broker
  * @param Object options
  */
var Server = function(broker, options){

	var self = this;

	/*
	 * Config
	 */
	if(!options) options = {};

	this.port = options.port || 5010;

	/*
	 * Create instances
	 */
	this.broker = broker;
	this.http = http.createServer();
	this.ws = new ws.Server({ server: this.http });
	this.app = express();

	this.http.on('request', this.app);

	/*
	 * Handlers
	 */
	this.app.use(function(req, res, next){

		res.status(400).send("Use '/ws' endpoint to access API.");

	});

	this.ws.on('connection', function connection(ws){

		self.handleConnection(ws);

	});

};

/*
 * Starts server
 */
Server.prototype.start = function(){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			self.instance = self.http.listen(self.port, function(){

				var host = self.instance.address().address;
				var port = self.instance.address().port;

				logger.info('Server listening at http://%s:%s', host, port);

				resolve(self.instance);

			});

		} catch(e) {
			reject(e);
		}

	});

};

Server.prototype.handleConnection = function(ws){

	//State variables
	var self = this;
	var conn = null;

	var requests = {};
	var resId = 0;

	/*
	 * Respond function
	 */
	var respond = function(rid, data, command){

		var res;

		if(data instanceof Error)
			res = { r: rid, c: protocol.commands.error, e: { code: data.code || 500, message: data.message }};
		else
			res = { r: rid, c: command || protocol.commands.response, d: data };

		logger.debug("Sending response to %s, RID: %s, Command: %s", ws.upgradeReq.connection.remoteAddress, rid, res.c);

		ws.send(JSON.stringify(res));

	};

	var sendRequest = function(command, params, cb){

		resId++;
		var rid = "s" + resId;

		requests[rid] = cb;

		logger.debug("Sending request to %s, RID: %s, Command: %s", ws.upgradeReq.connection.remoteAddress, rid, command);

		ws.send(JSON.stringify({
			r: rid,
			c: command,
			p: params || {}
		}));

	};

	/*
	 * Connection functions
	 */
	 var HandleCall = function(endpoint, method, params){

	 	return new Promise(function(resolve, reject){

	 		try {

	 			sendRequest(protocol.commands.cliCall, {
	 				endpoint: endpoint,
	 				method: method,
	 				params: params
	 			}, function(err, res){
	 				
					if(err)
						reject(err);
					else
						resolve(res);

	 			});

	 		} catch(e){
	 			reject(e);
	 		}

	 	});

	 };

	 var HandleMessage = function(channel, message){

	 	return new Promise(function(resolve, reject){

	 		try {

	 			sendRequest(protocol.commands.cliMessage, {
	 				channel: channel,
	 				message: message
	 			}, function(err, res){
	 				
					if(err)
						reject(err);
					else
						resolve(res);

	 			});

	 		} catch(e){
	 			reject(e);
	 		}

	 	});

	 };

	 var HandleQueueMessage = function(queue, message){

	 	return new Promise(function(resolve, reject){

	 		try {

	 			sendRequest(protocol.commands.cliQueueMessage, {
	 				queue: queue,
	 				message: message
	 			}, function(err, res){
	 				
					if(err)
						reject(err);
					else
						resolve(res);

	 			});

	 		} catch(e){
	 			reject(e);
	 		}

	 	});

	 };

	 var HandleResponse = function(rid, err, data){

	 	if(!requests[rid])
	 		return;

	 	var cb = requests[rid];
	 	delete requests[rid];

	 	cb(err, data);

	 };

	 Auth = function(params){

	 	return new Promise(function(resolve, reject){

	 		try {

	 			conn = self.broker.connect(params.service, function(endpoint, method, params){

	 				return HandleCall(endpoint, method, params);

	 			}, function(channel, message){

	 				return HandleMessage(channel, message);

	 			}, function(queue, message){

	 				return HandleQueueMessage(queue, message);

	 			});

	 			resolve(true);

	 		} catch(e) {
	 			reject(e);
	 		}

	 	});

	 };

	/*
	 * Handlers
	 */
	ws.on("message", function(msg){

		try {

			var data = JSON.parse(msg);
			var req = null;

			if(!data.c)
				return respond(null, new Error("Invalid request."));

			logger.debug("Request from %s, RID: %s, Command: %d", ws.upgradeReq.connection.remoteAddress, data.r, data.c);

			switch(data.c){

				case protocol.commands.response:
					if(data.r)
						HandleResponse(data.r, null, data.d);
					return;
				case protocol.commands.error:
					if(data.r)
						HandleResponse(data.r, new Error(data.e.message));
					return;

				case protocol.commands.auth:
					req = Auth(data.p);
					break;

				case protocol.commands.srvCall:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.service || !data.p.endpoint || !data.p.method) return respond(data.r, new Error("Invalid request params."));
					req = conn.call(data.p.service, data.p.endpoint, data.p.method, data.p.params || {});
					break;

				case protocol.commands.srvSubscribe:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.channel) return respond(data.r, new Error("Invalid request params."));
					req = conn.subscribe(data.p.channel);
					break;

				case protocol.commands.srvUnsubscribe:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.channel) return respond(data.r, new Error("Invalid request params."));
					req = conn.unsubscribe(data.p.channel);
					break;

				case protocol.commands.srvPublish:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.channel || ! data.p.message) return respond(data.r, new Error("Invalid request params."));
					req = conn.publish(data.p.channel, data.p.message);
					break;

				case protocol.commands.srvSubscribers:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.channel) return respond(data.r, new Error("Invalid request params."));
					req = conn.subscribers(data.p.channel);
					break;

				case protocol.commands.srvSubscribeQueue:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.queue) return respond(data.r, new Error("Invalid request params."));
					req = conn.subscribeQueue(data.p.queue);
					break;

				case protocol.commands.srvUnsubscribeQueue:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.queue) return respond(data.r, new Error("Invalid request params."));
					req = conn.unsubscribeQueue(data.p.queue);
					break;

				case protocol.commands.srvEnqueue:
					if(!conn) return respond(data.r, new Error("Session not estabilished."));
					if(!data.p.queue || !data.p.message) return respond(data.r, new Error("Invalid request params."));
					req = conn.enqueue(data.p.queue, data.p.message);
					break;

				default:
					return respond(data.r, new Error("Undefined command."));

			}

			req.then(function(res){

				respond(data.r, res);

			}, function(err){

				respond(data.r, err);

			});

		} catch(e){

			respond(null, new Error("Invalid request format. Cannot parse JSON."));

		}

	});

	ws.on("close", function(){

		if(conn) conn.close();

		logger.info("WS connection from %s closed.", ws.upgradeReq.connection.remoteAddress);

		requests = {};

	});

	logger.info("New WS connection from %s", ws.upgradeReq.connection.remoteAddress);

	//Check endpoint
	if(ws.upgradeReq.url != "/ws"){

		respond(null, new Error("Invalid endpoint URL."));
		ws.close();

		return;

	}

	//Send hello message
	respond(null, {
		version: "1.0",
		auth: true
	}, protocol.commands.hello);

};

//EXPORT
module.exports = Server;