var path = require('path');
var events = require('events');
var util = require('util');
var co = require('co');
var koa = require('koa');
var config = require('./config');
var Plugins = require('./plugins');

var App = module.exports = function(options) {
	this.context = options.worker ? null : koa();
	this.appPath = options.appPath || './';
	this.apiPath = options.apiPath || path.join(this.appPath, 'apis');
	this.libPath = options.libPath || path.join(this.appPath, 'lib');
	this.modelPath = options.modelPath || path.join(this.appPath, 'models');
	this.configPath = options.configPath || path.join(this.appPath, 'configs');
	this.localePath = options.localePath || path.join(this.appPath, 'locales');
	this.apis = new Plugins(this.apiPath);
	this.libs = new Plugins(this.libPath);
	this.models = new Plugins(this.modelPath);
	this.onload = false;
	this.settings = {};
};

util.inherits(App, events.EventEmitter);

App.prototype.configure = function() {
	var self = this;

	return new Promise(function(resolve, reject) {

		co(function *() {

			try {
				self.settings = yield config(self.configPath);
			} catch(e) {
				return reject(e);
			}

			try {
				// Loading plugins
				yield self.models.configure(self);
				yield self.libs.configure(self);

				self.onload = true;

				// Initializing plugins
				yield self.models.init(self);
				yield self.libs.init(self);

				if (self.context) {
					yield self.apis.configure(self);
					yield self.apis.init(self);
				}

			} catch(e) {
				return reject(e);
			}

			resolve();
		});
	});
}

App.prototype.log = function() {
	var args = Array.prototype.slice.call(arguments);
	args.unshift('log');
	this.emit.apply(this, args);
};

App.prototype.getLibrary = function(name) {
	if (!this.onload)
		throw Error('Cannot get library before app is ready. You probably call \"getLibrary()\" or \"getLibraries()\" before \"configure()\".');

	return this.libs.getPlugin(name);
};

App.prototype.getLibraries = function() {
	if (!this.onload)
		throw Error('Cannot get library before app is ready. You probably call \"getLibrary()\" or \"getLibraries()\" before \"configure()\".');

	return this.libs.getPlugins();
};

App.prototype.getModel = function(name) {
	if (!this.onload)
		throw Error('Cannot get library before app is ready. You probably call \"getModel()\" or \"getModels()\" before \"configure()\".');

	return this.models.getPlugin(name);
};

App.prototype.getModels = function() {
	if (!this.onload)
		throw Error('Cannot get library before app is ready. You probably call \"getModel()\" or \"getModels()\" before \"configure()\".');

	return this.models.getPlugins();
};

App.prototype.getKoaApp = function() {
	return this.context;
};

App.prototype.useAPIs = function() {

	var plugins = this.apis.getPlugins();
	for (var name in plugins) {
		var router = plugins[name];

		if (!router || !router.middleware)
			throw new Error(name + ' is not a valid router');

		this.use(this.getRouter(router));
	}
};

App.prototype.getRouter = function(router) {
	return router.middleware();
};

App.prototype.use = function(middleware) {
	this.context.use(middleware);
};
