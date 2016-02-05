var Api = require(__dirname + "/../index.js");
var RemoteApi = require("meta-api-remote");
var Endpoints = require("meta-api-shared").Endpoints;
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
 * Remote client
 */
var connect = function(){

	var client = new RemoteApi.Client("serviceAbc");
	client.endpoint("test", Endpoints.Test.$);

	client.connect('ws://127.0.0.1:5010/ws').then(function(){

		console.log("Remote connected!");

	}).then(function(){

		return client.subscribe("q", function(msg){

			console.log("Remote MSG", msg);

			return Promise.resolve(false);

		}).then(function(){

			console.log("Remote subscribed.");

		});

	}).catch(function(err){
		console.log("Remote ERR", err);
	});

};

/*
 * Local client
 */
var test = function(){

	var localClient = new Api.Client();
	
	localClient.connect(broker).then(function(){

		console.log("Local connected!");

	}).then(function(){

		return localClient.publish("q", { hello: "world" }).then(function(res){

			console.log("Local RES", res);

		});

	}).catch(function(err){

		console.log("Local ERR", err);

	});

};

setTimeout(connect, 300);
setTimeout(test, 500);