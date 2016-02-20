/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var crypto = require("crypto");
var Client = require("meta-api-shared").Client;

/*
 * Local API client
 *
 * Create API interface for local communication
 *
 * @param String serviceName
 */
var LocalClient = function(serviceName){

	Client.call(this, serviceName);

};

LocalClient.prototype = Object.create(Client.prototype);

/*
 * Creates virtual connection to broker
 *
 * @param Broker broker
 * @return Promise
 * @resolve true
 */
LocalClient.prototype.connect = function(broker, secret){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(self.connection)
				return reject(new Error("API client already connected."));

			var now = new Date();
			var timestr = now.getFullYear() + ":" + now.getMonth() + ":" + now.getDate() + ":" + now.getHours();
			var token = crypto.createHash("sha256").update(self.serviceName + secret + timestr).digest("hex");

			broker.connect(self.serviceName, { serviceName: self.serviceName, token: token}, function(endpoint, method, params){

				return self.handleCall(endpoint, method, params);

			}, function(channel, message){

				return self.handleMessage(channel, message);

			}, function(queue, message){

				return self.handleQueueMessage(queue, message);

			}).then(function(conn){

				self.connection = conn;
				resolve(true);

			}, reject)

		} catch(e){
			reject(e);
		}

	});

};

/*
 * Closes virtual connection - removes all subscriptions
 *
 * @return Promise
 * @resolve true
 */
LocalClient.prototype.close = function(){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.connection)
				return reject(new Error("API client not connected."));
		
			self.connection.close();
			self.subscriptions = {};
			self.queueSubscriptions = {};

			resolve(true);

		} catch(e){
			reject(e);
		}

	});

};

//EXPORT
module.exports = LocalClient;