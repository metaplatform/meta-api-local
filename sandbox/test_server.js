var Api = require(__dirname + "/../index.js");
var Endpoints = require(__dirname + "/../../meta-api-endpoints/index.js");
var logger = require("meta-logger");
var ws = require("ws");
 
//Setup targets 
logger.toConsole({
	level: "info",
	timestamp: true,
	colorize: true
});

/*
 * Broker
 */
var broker = new Api.Broker();
var server = new Api.Server(broker);

server.start().then(function(){

	console.log("Server OK");

}, function(err){

	console.log("Server ERR", err);

});

/*
 * Local client
 */
var localClient = new Api.Client("serviceAbc");
localClient.endpoint("test", Endpoints.Test.$);

localClient.connect(broker).then(function(){

	console.log("Local connected!");

}).then(function(){

	return localClient.subscribeQueue("q", function(msg){

		console.log("Local MSG", msg);

		return Promise.resolve(false);

	}).then(function(){

		console.log("Local subscribed.");

	});

}).catch(function(err){

	console.log("Local ERR", err);

});

/*
 * Remote client
 */
var connect = function(){

	var client = new Api.RemoteClient("serviceDef");

	client.connect('ws://127.0.0.1:5010/ws').then(function(){

		console.log("Remote connected!");

	}).then(function(){

		return client.enqueue("q", { hello: "world" }).then(function(res){

			console.log("Remote RES", res);

		});

	}).then(function(){

		return client.close().then(function(res){

			console.log("Remote Closed");

		});

	}).catch(function(err){
		console.log("Remote ERR", err);
	});

};

setTimeout(connect, 300);