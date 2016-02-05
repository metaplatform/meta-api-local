/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var Broker = require("./lib/broker.js");
var Client = require("./lib/client.js");
var Connection = require("./lib/connection.js");
var MemoryQueue = require("./lib/memoryQueue.js");

module.exports = {
	
	//Libraries
	Broker: 		Broker,
	Client: 		Client,
	Connection: 	Connection,
	MemoryQueue: 	MemoryQueue

};