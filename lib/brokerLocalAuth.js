/*
 * META API
 *
 * @author META Platform <www.meta-platform.com>
 * @license See LICENSE file distributed with this source code
 */

var fs = require("fs");
var crypto = require("crypto");
var logger = require("meta-logger").facility("BrokerLocalAuth");

var BrokerLocalAuth = function(dbFilename){

	this.credentials = {};

	this.loadDb(dbFilename);

};

BrokerLocalAuth.prototype.loadDb = function(filename){

	if(!fs.existsSync(filename))
		throw new Error("Credentials DB file '" + filename + "' not exists.");

	var data = fs.readFileSync(filename, { encoding: 'utf8' });

	try {

		this.credentials = JSON.parse(data);

	} catch(err) {
		
		throw new Error("Cannot read DB file.");

	}

};

BrokerLocalAuth.prototype.auth = function(credentials){

	var self = this;

	return new Promise(function(resolve, reject){

		if(!self.credentials[credentials.serviceName]){
			logger.warn("Invalid login try for service {" + credentials.serviceName + "}: Service not found");
			return reject(new Error("Unkown service '" + credentials.serviceName + "'."));
		}

		var now = new Date();
		var timestr = now.getFullYear() + ":" + now.getMonth() + ":" + now.getDate() + ":" + now.getHours();
		var localToken = crypto.createHash("sha256").update( credentials.serviceName + self.credentials[credentials.serviceName] + timestr ).digest("hex");

		if(localToken == credentials.token){
			logger.info("Service {" + credentials.serviceName + "} authorized.");
			resolve();
		} else {
			logger.warn("Invalid login try for service {" + credentials.serviceName + "}: Invalid token");
			return reject(new Error("Invalid token."));
		}

	});

};

//EXPORT
module.exports = BrokerLocalAuth;