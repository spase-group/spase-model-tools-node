const fs = require('fs');
const path = require('path');

// Read a JSON configuration file and return the parsed results.
module.exports.readConfig = function (pathname) {
	var model = "";
	
	if(fs.existsSync(pathname)) {	
		var data=fs.readFileSync(pathname, 'utf8');
		var model=JSON.parse(data);
	}
	
	return model;	
}

// Load a file
module.exports.loadFile = function(pathname) {
	if(fs.existsSync(pathname)) {	
		return fs.readFileSync(pathname, 'utf8'); 
	}
	
	return "";
}

// Load all files from a folder that have a given extension - if any exist 
module.exports.loadAll = function (folder, extension) {
	var contents = "";
	
	if(fs.existsSync(folder)) {	
		var files = fs.readdirSync(folder);
		for(var i = 0; i < files.length; i++) {
			if(files[i].endsWith(extension)) {
				contents += fs.readFileSync(path.join(folder, files[i]), 'utf8');
			}
		}
	}
	
	return contents;
}
