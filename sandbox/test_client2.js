var Api = require(__dirname + "/../index.js");
var Endpoints = require("meta-api-shared").Endpoints;
var logger = require("meta-logger");
 
//Setup targets 
logger.toConsole({
	level: "debug",
	timestamp: true,
	colorize: true
});

//var broker = new Api.Broker();

var client1 = new Api.LocalClient("serviceA");

client1.endpoint("test", Endpoints.Test.$);

client1.endpoint("template", Endpoints.Template({
	
	schema: {
		title: "Template endpoint",
		icon: "user"
	},
	
	properties: {
		"_": Endpoints.Template.Property({
			title: "Universal access",
			description: "Returns wildcard property"
		}, Endpoints.Template({
			schema: {
				title: "Subproperty"
			},
			init: function(id){

				this.ok = true;
				this._schema.title+= " / " + id;

				return Promise.resolve(true);

			},
			methods: {
				test: function(){

					return Promise.resolve(this.ok);

				}
			}
		}).$)
	},

	methods: {
		"time": Endpoints.Template.Method({
			title: "Time",
			description: "Returns current time"
		}, function(){

			return Promise.resolve( new Date().getTime() );

		})
	}

}).$);

///--------

client1.handleCall("/template", "schema", { hello: "world" }).then(function(res){

	console.log("RES", res);

}, function(err){

	console.log("ERR", err, err.stack);

});