/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Logger = require("meta-logger").facility("LocalBroker");

var MemoryQueue = require("./memoryQueue.js");
var Connection = require("./connection.js");

/*
 * Service not found error
 *
 * @param String serviceName
 */
var ServiceNotFound = function(serviceName){

	this.name = "ServiceNotFound";
	this.code = 404;
	this.message = "Service {" + serviceName + "} not found.";

};

ServiceNotFound.prototype = Object.create(Error.prototype);

/*
 * Local API broker
 *
 * Create API local broker
 */
var Broker = function(queueManagerPrototype, options){

	var self = this;

	if(!options) options = {};

	if(!queueManagerPrototype)
		queueManagerPrototype = MemoryQueue;

	this.queueManager = new queueManagerPrototype(function(queue, recipient, message){

		return self.handleQueueMessage(queue, recipient, message);

	}, options.queue || {});

	this.lastClientId = 0;
	this.connections = {};

	this.authProvider = options.authProvider || null;
	this.services = {};

	this.subscriptions = {};
	this.subscriptionsIndex = {};

};

/*
 * Create virtual connection to broker
 *
 * @param String|null serviceName
 * @param Function handleCall
 * @param Function handleMessage
 * @param Function handleQueueMessage
 */
Broker.prototype.connect = function(serviceName, credentials, handleCall, handleMessage, handleQueueMessage){

	var self = this;

	//Auth
	var authPromise;

	if(this.authProvider)
		authPromise = this.authProvider.auth(credentials);
	else
		authPromise = Promise.resolve();

	return authPromise.then(function(authSession){

		//Create onnection
		self.lastClientId++;

		var clientId = "local_" + self.lastClientId;
		var conn = new Connection(self, clientId, serviceName, handleCall, handleMessage, handleQueueMessage);

		conn.authSession = authSession;

		self.connections[clientId] = conn;

		if(serviceName)
			self.registerService(serviceName, conn);

		conn.on("close", function(){

			if(conn.serviceName)
				self.unregisterService(serviceName, conn);

			self.removeSubscriptions(conn);
			delete self.connections[clientId];

			Logger.info("Connection #" + clientId + " closed.");

		});

		Logger.info("New connection #" + clientId + ".");

		return conn;

	});

};

/*
 * Removes all indexed client subscriptions
 *
 * @param Connection connection
 */
Broker.prototype.removeSubscriptions = function(connection){

	var clientId = connection.clientId;

	if(!this.subscriptionsIndex[clientId]) return;

	for(var i in this.subscriptionsIndex[clientId])
		this.unsubscribe(this.subscriptionsIndex[clientId][i], connection);

};

/*
 * Register connection as service
 *
 * @param String serviceName
 * @param Connection connection
 */
Broker.prototype.registerService = function(serviceName, connection){

	if(!this.services[serviceName])
		this.services[serviceName] = [];

	this.services[serviceName].push(connection);

	Logger.info("Connection #%s registered as service {%s}", connection.clientId, serviceName);

};

/*
 * Unregister connection as service
 *
 * @param String serviceName
 * @param Connection connection
 */
Broker.prototype.unregisterService = function(serviceName, connection){

	if(!this.services[serviceName]) return;

	var index = this.services[serviceName].indexOf(connection);

	if(index >= 0)
		this.services[serviceName].splice(index, 1);

	if(this.services[serviceName].length === 0)
		delete this.services[serviceName];

	Logger.info("Service {%s} registration for connection #%s removed.", serviceName, connection.clientId);

};

/*
 * Resolve service by name
 *
 * @param String serviceName
 * @return Promise
 * @resolve Connection
 */
Broker.prototype.resolveService = function(serviceName){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			//Service not found
			if(!self.services[serviceName])
				return reject(new ServiceNotFound(serviceName));

			//Round robin selection
			var serviceConnection = self.services[serviceName].shift();
			self.services[serviceName].push(serviceConnection);

			resolve(serviceConnection);

		} catch(e){
			reject(e);
		}

	});

};

/*
 * Call to service
 *
 * @param String serviceName
 * @return Promise
 * @resolve Connection
 */
Broker.prototype.call = function(service, endpoint, method, params){

	var self = this;

	return this.resolveService(service).then(function(serviceConnection){

		return serviceConnection.receiveCall(endpoint, method, params);

	});

};

/*
 * Subscribe connection to channel
 *
 * @param String channel
 * @param Connection connection
 */
Broker.prototype.subscribe = function(channel, connection){

	if(!this.subscriptions[channel])
		this.subscriptions[channel] = [];

	var i = this.subscriptions[channel].indexOf(connection);

	if(i >= 0) return Promise.resolve(true);

	//Add to stack
	this.subscriptions[channel].push(connection);

	//Add to index
	if(!this.subscriptionsIndex[connection.clientId])
		this.subscriptionsIndex[connection.clientId] = [];

	this.subscriptionsIndex[connection.clientId].push(channel);

	Logger.debug("Connection #%s subscribed for channel '%s'.", connection.clientId, channel);

	return Promise.resolve(true);

};

/*
 * Unsubscribe connection from channel
 *
 * @param String channel
 * @param Connection connection
 */
Broker.prototype.unsubscribe = function(channel, connection){

	if(!this.subscriptions[channel]) return Promise.resolve(true);

	//Remove from stack
	var i = this.subscriptions[channel].indexOf(connection);

	if(i >= 0)
		this.subscriptions[channel].splice(i, 1);

	if(this.subscriptions[channel].length === 0)
		delete this.subscriptions[channel];

	Logger.debug("Connection #%s unsubscribed from channel '%s'.", connection.clientId, channel);

	//Remove from index
	if(!this.subscriptionsIndex[connection.clientId]) return Promise.resolve(true);

	var j = this.subscriptionsIndex[connection.clientId].indexOf(channel);

	if(j >= 0)
		this.subscriptionsIndex[connection.clientId].splice(j, 1);

	if(this.subscriptionsIndex[connection.clientId].length === 0)
		delete this.subscriptionsIndex[connection.clientId];

	return Promise.resolve(true);

};

/*
 * Publishes message to channel
 *
 * @param String channel
 * @param Object message
 * @return Integer Subscriber count
 */
Broker.prototype.publish = function(connection, channel, message){

	Logger.debug("Connection #%s published message to channel '%s'.", connection.clientId, channel);

	if(!this.subscriptions[channel])
		return Promise.resolve(0);

	for(var i in this.subscriptions[channel])
		this.subscriptions[channel][i].receiveMessage(channel, message);

	return Promise.resolve(this.subscriptions[channel].length);

};

/*
 * Returns subscriber count
 *
 * @param String channel
 * @return Integer Subscriber count
 */
Broker.prototype.subscribers = function(connection, channel){

	if(!this.subscriptions[channel])
		return Promise.resolve(0);

	return Promise.resolve(this.subscriptions[channel].length);

};

/*
 * Subscribe service connection to queue messages
 *
 * @param String queue
 * @param Connection connection
 */
Broker.prototype.subscribeQueue = function(queue, connection){

	return this.queueManager.subscribe(queue, connection.serviceName).then(function(res){

		Logger.debug("Connection #%s subscribed service {%s} for queue '%s'.", connection.clientId, connection.serviceName, queue);
		return true;

	});

};

/*
 * Unsubscribe service connection from queue messages
 *
 * @param String queue
 * @param Connection connection
 */
Broker.prototype.unsubscribeQueue = function(queue, connection){

	return this.queueManager.unsubscribe(queue, connection.serviceName).then(function(res){

		Logger.debug("Connection #%s unsubscribed service {%s} from queue '%s'.", connection.clientId, connection.serviceName, queue);
		return true;

	});

};

/*
 * Publishes message to queue
 *
 * @param Connection connection
 * @param String queue
 * @param Object message
 * @param Integer|null ttl
 * @return Promise
 */
Broker.prototype.enqueue = function(connection, queue, message, ttl){

	var self = this;

	return this.queueManager.enqueue(queue, message, ttl).then(function(res){

		if(res)
			Logger.debug("Connection #%s published message to queue '%s' for [ %s ].", connection.clientId, queue);
		else
			Logger.debug("Connection #%s published message to queue '%s' but has NO recipients.", connection.clientId, queue);

		return true;

	});

};

/*
 * Queue manager message handler
 *
 * @param String queue
 * @param String recipient
 * @param Mixed message
 * @return Promise
 */
Broker.prototype.handleQueueMessage = function(queue, recipient, message){

	var self = this;

	return this.resolveService(recipient).then(function(serviceConnection){

		return serviceConnection.receiveQueueMessage(queue, message);

	});

};

/*
 * Starts queue manager
 */
Broker.prototype.start = function(){

	if(this.queueManager)
		this.queueManager.start();

};

/*
 * Stops queue manager
 */
Broker.prototype.terminate = function(){

	if(this.queueManager)
		this.queueManager.stop();

};

//EXPORT
module.exports = Broker;