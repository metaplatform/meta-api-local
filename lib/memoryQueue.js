/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var logger = require("meta-logger").facility("MemoryQueue");

/*
 * Memory queue manager
 *
 * Create memory queue manager
 */
var MemoryQueue = function(handler, options){

	var self = this;

	if(!options) options = {};

	this.defaultTTL = options.defaultTTL || 18;
	this.maxTTL = options.maxTTL || 32;
	this.timeout = options.timeout || 5000;
	this.errorRatio = options.errorTimeout || 1000;
	this.interval = options.flushInterval || 1000;

	this.handler = handler;

	this.lastId = 0;
	this.messages = [];

	this.subscribers = {};

	this.checker = setInterval(function(){

		self.flushQueue();

	}, this.interval);

};

MemoryQueue.prototype.subscribe = function(channel, serviceName){

	if(!this.subscribers[channel])
		this.subscribers[channel] = [];

	var i = this.subscribers[channel].indexOf(serviceName);

	if(i >= 0) return Promise.resolve(true);

	//Add to stack
	this.subscribers[channel].push(serviceName);

	return Promise.resolve(true);

};

MemoryQueue.prototype.unsubscribe = function(channel, serviceName){

	if(!this.subscribers[channel]) return Promise.resolve(true);

	//Remove from stack
	var i = this.subscribers[channel].indexOf(serviceName);

	if(i >= 0)
		this.subscribers[channel].splice(i, 1);

	if(this.subscribers[channel].length === 0)
		delete this.subscribers[channel];

	return Promise.resolve(true);

};

/*
 * Add message to queue
 *
 * @param Mixed message
 * @param Array recipients
 * @param Integer ttl
 * @return Promise
 * @resolve true
 */
MemoryQueue.prototype.enqueue = function(channel, message, ttl){

	var self = this;

	return new Promise(function(resolve, reject){

		try {

			if(!self.subscribers[channel] || self.subscribers[channel].length === 0)
				return resolve(false);

			self.lastId++;

			var messageId = "m" + self.lastId;

			self.messages[messageId] = {
				id: messageId,
				channel: channel,
				message: message,
				recipients: self.subscribers[channel].slice(),
				ttl: Math.max(0, Math.min(ttl, self.maxTTL)) || self.defaultTTL,
				locked: false,
				lockTimestamp: null,
				lockOwner: null,
				errors: 0
			};

			logger.debug("Message #%s enqueued.", messageId);

			self.flushQueue();

			resolve(true);

		} catch(e){
			reject(e);
		}

	});

};

/*
 * Flushes current queue
 */
MemoryQueue.prototype.flushQueue = function(){

	var currentTimestamp = (new Date()).getTime();

	logger.debug("Flushing queue.");

	for(var i in this.messages){

		var msg = this.messages[i];

		if(msg.locked && (msg.lockTimestamp + Math.pow(2, msg.errors - 1) * this.errorRatio) > currentTimestamp - this.timeout ) continue;

		this.handleMessage(i);

	}

};

/*
 * Handles message delivery
 *
 * @param String messageId
 */
MemoryQueue.prototype.handleMessage = function(messageId){

	var self = this;
	var msg = this.messages[messageId];

	if(!msg) return;

	logger.debug("Handling message #%s, lock: %s, TTL: %d", messageId, ( msg.locked ? msg.lockOwner : "no" ), msg.ttl);

	//Check ttl
	if(msg.ttl < 0){
		logger.debug("Message #%s TTL expired.", messageId);
		return this.removeMessage(messageId);
	}

	var currentTimestamp = (new Date()).getTime();

	//Check if timed-out
	if(msg.locked && (msg.lockTimestamp + Math.pow(2, msg.errors - 1) * this.errorRatio) < currentTimestamp - this.timeout){

		//Pass owner to recipients end
		msg.recipients.push(msg.lockOwner);
		msg.errors++;
		msg.ttl--;

		logger.debug("Message #%s timed-out.", messageId);

	} else if(msg.locked){

		//Locked and OK, return
		return;

	}

	var recipient = msg.recipients.shift();

	msg.locked = true;
	msg.lockTimestamp = currentTimestamp;
	msg.lockOwner = recipient;

	var deliver = function(localRecipient){

		self.handler(msg.channel, localRecipient, msg.message).then(function(remove){

			if(!self.messages[messageId]){

				logger.warn("Message #%s got confirmation from {%s} but already deleted.", messageId, localRecipient);
				return;

			}

			if(localRecipient != msg.lockOwner){

				logger.warn("Message #%s got confirmation but from invalid recipient {%s}.", messageId, localRecipient);
				return;

			}

			logger.debug("Message #%s successfully delivered to {%s}.", messageId, localRecipient);

			msg.locked = false;
			msg.lockTimestamp = null;
			msg.lockOwner = null;
			msg.errors = 0;

			//Remove?
			if(remove === true || msg.recipients.length === 0)
				self.removeMessage(messageId);
			else
				self.handleMessage(messageId);

		}, function(err){

			logger.warn("Failed to deliver message #%s to {%s}, reason: %s.", messageId, localRecipient, err, err.stack);

			//Pass owner and reset
			msg.recipients.push(localRecipient);
			msg.locked = false;
			msg.lockTimestamp = null;
			msg.lockOwner = null;
			msg.errors++;
			msg.ttl--;

		});

	};

	//Try to deliver
	deliver(recipient);

};

/*
 * Removes message from queue
 *
 * @param String messageId
 */
MemoryQueue.prototype.removeMessage = function(messageId){

	var msg = this.messages[messageId];
	if(!msg) return;

	delete this.messages[messageId];

	logger.debug("Message #%s removed from queue.", messageId);

};

//EXPORT
module.exports = MemoryQueue;