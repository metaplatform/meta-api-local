/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var EventEmitter = require('events').EventEmitter;
var Utils = require("meta-api-shared").Utils;

/*
 * Virtual broker connections
 *
 * @param Broker broker
 * @param String clientId
 */
var Connection = function(broker, clientId, serviceName, handleCall, handleMessage, handleQueueMessage){

	this.broker = broker;
	this.clientId = clientId;
	this.serviceName = serviceName;

	this.callHandler = handleCall;
	this.messageHandler = handleMessage;
	this.queueMessageHandler = handleQueueMessage;

};

Connection.prototype = Object.create(EventEmitter.prototype);

/*
 * Closes connection
 */
Connection.prototype.close = function(){

	this.emit("close");

};

/*
 * Request method call
 *
 * @param String endpoint
 * @param String method
 * @param Object params
 * @return Promise
 * @resolve Mixed
 */
Connection.prototype.receiveCall = function(endpoint, method, params){

	return this.callHandler(endpoint, method, Utils.clone(params));

};

/*
 * Request publish
 *
 * @param String channel
 * @param Object message
 * @void
 */
Connection.prototype.receiveMessage = function(channel, message){

	return this.messageHandler(channel, Utils.clone(message));

};

/*
 * Request queue publish
 *
 * @param String queue
 * @param Object message
 * @return Promise
 * @resolve Boolean if true, then message is removed otherwise message is passed to another receiver
 */
Connection.prototype.receiveQueueMessage = function(queue, message){

	return this.queueMessageHandler(queue, Utils.clone(message));

};

/*
 * RPC call
 *
 * @param String service
 * @param String endpoint
 * @param String method
 * @param Object params
 * @return Promise
 * @resolve Object
 */
Connection.prototype.call = function(service, endpoint, method, params){

	var self = this;

	return this.broker.resolveService(service).then(function(serviceConnection){

		return serviceConnection.receiveCall(endpoint, method, params);

	});

};

/*
 * Subscribe to channel
 *
 * @param String channel
 * @return Promise
 */
Connection.prototype.subscribe = function(channel){

	var self = this;

	return new Promise(function(resolve, reject){

		try {
			
			self.broker.subscribe(channel, self);

			return resolve(true);

		} catch(e){
			reject(e);
		}

	});

};

/*
 * Unsubscribe from channel
 *
 * @param String channel
 * @return Promise
 * @resolve true
 */
Connection.prototype.unsubscribe = function(channel){

	var self = this;

	return new Promise(function(resolve, reject){

		try {
		
		self.broker.unsubscribe(channel, self);
		return resolve(true);

		} catch(e) {
			reject(e);
		}

	});

};

/*
 * Publish message
 *
 * @param String channel
 * @param Object message
 * @return Promise
 * @resolve true
 */
Connection.prototype.publish = function(channel, message){

	var self = this;

	return new Promise(function(resolve, reject){

		try {
		
			var s = self.broker.publish(self, channel, message);
			return resolve(s);

		} catch(e){
			reject(e);
		}

	});
	
};

/*
 * Subscribe to queue messages
 *
 * @param String queue
 * @return Promise
 */
Connection.prototype.subscribeQueue = function(queue){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.serviceName)
				return reject(new Error("Connection is not registered as a service."));
		
			self.broker.subscribeQueue(queue, self);

			return resolve(true);

		} catch(e) {
			reject(e);
		}

	});

};

/*
 * Unsubscribe from queue messages
 *
 * @param String queue
 * @return Promise
 * @resolve true
 */
Connection.prototype.unsubscribeQueue = function(queue){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.serviceName)
				return reject(new Error("Connection is not registered as a service."));
			
			self.broker.unsubscribeQueue(queue, self);
			return resolve(true);

		} catch(e) {
			reject(e);
		}

	});

};

/*
 * Enqueue message
 *
 * @param String queue
 * @param Object message
 * @param Integer|null ttl
 * @return Promise
 * @resolve true
 */
Connection.prototype.enqueue = function(queue, message, ttl){

	return this.broker.enqueue(this, queue, message, ttl);
	
};

//EXPORT
module.exports = Connection;