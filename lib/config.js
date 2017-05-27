var path = require('path');
var fs = require('fs');
var co = require('co');

function readConfigFile(filepath) {

	return function(done) {
		fs.readFile(filepath, function(err, data) {
			done(err, data);
		});
	};
}

function readJSON(filename, settings) {
	return function(done) {
		co(function *() {

			var category = path.basename(filename).split('.')[0];

			var data;
			try {
				// Load specific configuration file
				data = yield readConfigFile(filename);
			} catch(e) {

				try {
					data = yield readConfigFile(filename + '.default');
					console.warn('[warning]', 'No configuration file exists, using default settings.');
				} catch(e) {
					return done(new Error('Failed to load settings: ' + filename));
				}
			}

			settings[category] = JSON.parse(data);

			if (category == 'general') {
				if (!settings.general.features)
					settings.general.features = {};
			}

			done(null);
		});
	};
}

module.exports = function(configPath) {

	return function(done) {

		var settings = {};

		fs.readdir(configPath, function(err, files) {

			co(function *() {
				for (var index in files) {
					var filename = files[index];

					// Skip non-json file
					if (path.extname(filename) != '.json')
						continue;

					if (process.env.NODE_ENV == 'develop') {
						try {
							yield readJSON(path.join(configPath, 'general.develop.json'), settings);
						} catch(e) {
							return done(e);
						}
					}

					if (process.env.NODE_ENV == 'test') {
						try {
							yield readJSON(path.join(configPath, 'general.test.json'), settings);
						} catch(e) {
							return done(e);
						}
					}

					if (process.env.NODE_ENV == 'production' || !process.env.NODE_ENV) {
						try {
							yield readJSON(path.join(configPath, 'general.json'), settings);
						} catch(e) {
							return done(e);
						}
					}

					// try {
					// 	yield readJSON(path.join(configPath, filename), settings);
					// } catch(e) {
					// 	return done(e);
					// }
				}

				try {
					if (!settings.general) {
						if (process.env.NODE_ENV == 'develop') {
							yield readJSON(path.join(configPath, 'general.develop.json'), settings);
						}
						if (process.env.NODE_ENV == 'test') {
							yield readJSON(path.join(configPath, 'general.test.json'), settings);
						}
						if (process.env.NODE_ENV == 'production' || !process.env.NODE_ENV) {
							yield readJSON(path.join(configPath, 'general.json'), settings);
						}
					}
				} catch(e) {
					return done(e);
				}

				done(null, settings);
			});
		});
	};
};
