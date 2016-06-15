var co = require('co');

var Plugins = module.exports = function(dirpath) {
	this.path = dirpath;
	this.plugins = {};
	this.segments = {};
};

Plugins.prototype.configure = function(handleObject) {
	var self = this;

	return new Promise(function(resolve, reject) {

		co(function *() {

			try {
				// Loading files
				self.plugins = require(self.path);

			} catch(e) {
				return reject(e);
			}

			resolve();
		});
	});
};

Plugins.prototype.init = function(handleObject) {
	var self = this;

	return function(done) {

		// Getting plugin constructor and call it
		for (var name in self.plugins) {
			var p = self.plugins[name];

			if (!(p instanceof Function)) {
				self.segments[name] = p;
				continue;
			}

			var plugin = p(handleObject);

			if (!plugin)
				return done(new Error(name + ' is not a valid plugin'));

			self.segments[name] = plugin;
		}

		co(function *() {
			try {
				// Initializing by calling onload
				for (var segmentName in self.segments) {
					var segment = self.segments[segmentName];

					if (!segment.onload)
						continue;

					yield segment.onload(handleObject);
				}
			} catch(e) {
				return done(e);
			}

			done();
		});
	};
};

Plugins.prototype.getPlugin = function(name) {
	return this.segments[name];
};

Plugins.prototype.getPlugins = function() {
	return this.segments;
};
