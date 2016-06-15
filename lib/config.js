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

					var category = filename.split('.')[0];
					
					var data;
					try {
						// Load specific configuration file
						data = yield readConfigFile(path.join(configPath, filename));
					} catch(e) {

						try {
							data = yield readConfigFile(path.join(configPath, filename + '.default'));
							console.warn('[warning]', 'No configuration file exists, using default settings.');
						} catch(e) {
							return done(new Error('Failed to load settings: ' + path.join(configPath, filename)));
						}
					}

					settings[category] = JSON.parse(data);

					if (category == 'general') {
						if (!settings.general.features)
							settings.general.features = {};
					}
				}

				done(null, settings);
			});
		});
	};
};
