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

var wsHandler = require("meta-api-shared").wsHandler;

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

	var self = this;

	//Check endpoint
	if(ws.upgradeReq.url != "/ws"){

		ws.close();
		return;

	}

	wsHandler(ws, logger, function(serviceName, credentials, handleCall, handleMessage, handleQueueMessage){

		return self.broker.connect(serviceName, credentials, handleCall, handleMessage, handleQueueMessage);

	});

};

//EXPORT
module.exports = Server;