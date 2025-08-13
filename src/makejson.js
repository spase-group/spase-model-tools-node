#!/usr/bin/env node
"use strict";
/**
 * Read information model specification files and generate corresponding JSON files.
 * 
 * @author Todd King
 **/
const fs = require('fs');
const yargs = require('yargs');
const path = require('path');
const lineByLine = require('n-readlines');

var options  = yargs
	.version('1.0.3')
    .usage('Read information model specification files and generate corresponding JSON files.')
	.usage('$0 [args] <folder>')
	.example('$0 example', 'Read the information model specification files in the folder "example"')
	.epilog('copyright 2020')
	.showHelpOnFail(false, "Specify --help for available options")
	.help('h')
	
	// version
	.options({
		// Verbose flag
		'v' : {
			alias: 'verbose',
			describe : 'show information while processing files',
			type: 'boolean',
			default: false
		},
		
		// help text
		'h' : {
			alias : 'help',
			description: 'show information about the app.'
		},
		
		// Also history
		'a' : {
			alias: 'history',
			describe : 'Output history.json file.',
			type: 'string',
			default: null
		},
		
		// Config
		'c' : {
			alias: 'config',
			describe : 'Config file.',
			type: 'string',
			default: 'config.json'
		},
		
		// Base folder
		'b' : {
			alias: 'base',
			describe : 'Base folder containg config, data, outline file.',
			type: 'string',
			default: '.'
		},
				
		// Name
		'n' : {
			alias: 'name',
			describe : 'Name of the information model.',
			type: 'string',
			default: null
		},
		
		// (Version) number. We use 'number' because 'version' is used internally by yargs
		'e' : {
			alias: 'number',
			describe : 'Version number (m.n.r) of the release.',
			type: 'string',
			default: null
		},
		
		// Namespace of model this epc extends
		'x' : {
			alias: 'extend',
			describe : 'Namespace of model this spec extends.',
			type: 'string',
			default: ''
		},
		
		// Released
		'r' : {
			alias: 'released',
			describe : 'The release date of the version in yyyy-mm-dd format.',
			type: 'string',
			default: null
		},

		// Description
		'd' : {
			alias: 'description',
			describe : 'Description of the information model.',
			type: 'string',
			default: null
		},
		
		// Namespace
		's' : {
			alias: 'namespace',
			describe : 'Namespace for the information model.',
			type: 'string',
			default: null
		},
		
		
		// Schema URL
		'u' : {
			alias: 'schemaurl',
			describe : 'Schema URL for the information model.',
			type: 'string',
			default: null
		},
		
		// Output file
		'o' : {
			alias: 'output',
			describe : 'Output file name for generated JSON file.',
			type: 'string',
			default: null
		},
	})
	.argv
	;

var args = options._;	// Unprocessed command line arguments
var outputFile = null;	// None defined.

// Today's date with zero padding in month and day
function now() {
	var today = new Date();
	var dd = String(today.getDate()).padStart(2, '0');
	var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
	var yyyy = today.getFullYear();

	today = yyyy + '-' + mm + '-' + dd;
	return(today);
}

// Sort and object by key value
function sortByKey(obj) {
  return Object.keys(obj).sort().reduce(function (result, key) {
    result[key] = obj[key];
    return result;
  }, {});
}

/** 
 * Write to output file if defined, otherwise to console.log()
 **/
var outputWrite = function(indent, str) {
	if(outputFile == null) {
		var prefix = "";
		for(var i = 0; i < indent; i++) { prefix += "   "; }
		console.log(prefix + str);
	} else {
		outputFile.write(str);
	}
}

/**
 * Close an output file if one is assigned.
 **/
var outputEnd = function() {
	if(outputFile) { outputFile.end(); outputFile = null }
}

function readConfig(pathname) {
	var data=fs.readFileSync(pathname, 'utf8');
	var model=JSON.parse(data);
	return model;	
}

function readHistory(pathname) {
	const liner = new lineByLine(pathname);

	let line;
	let lineNumber = 0;
	var dictionary = [];
	
	while (line = liner.next()) {
		lineNumber++;
		if(lineNumber == 1) continue; // Skip first line which contains field names
		var text = line.toString('ascii').replace("\r", "");  // Convert and remove CR is present
		if(text.charAt(0) == '#') continue;	// comment 
		var part = text.split("\t");	// Tab separated elements
		if(part.length < 6) { console.log("History: Invalid record at line " + lineNumber); continue; }
		var definition = {	"id": part[0], 
							"version": part[1],
							"updated": part[2],
							"changedBy": part[3],
							"description": part[4],
							"note": part[5]
						};
		dictionary.push(definition);
	}

	return dictionary;	
}

function readType(pathname) {
	const liner = new lineByLine(pathname);

	let line;
	let lineNumber = 0;
	var dictionary = {};
	
	while (line = liner.next()) {
		lineNumber++;
		if(lineNumber == 1) continue; // Skip first line which contains field names
		var text = line.toString('ascii').replace("\r", "");  // Convert and remove CR is present
		if(text.charAt(0) == '#') continue;	// comment 
		var part = text.split("\t");	// Tab separated elements
		if(part.length < 4) { console.log("Type: Invalid record at line " + lineNumber); continue; }
		var definition = {	"version": part[0], 
							"since": part[1],
							"type": part[2],
							"definition": part[3]
						};
		dictionary[definition.type] = definition;
	}

	return dictionary;	
}

function readDictionary(pathname) {
	const liner = new lineByLine(pathname);

	let line;
	let lineNumber = 0;
	var dictionary = {};
	
	while (line = liner.next()) {
		lineNumber++;
		if(lineNumber == 1) continue; // Skip first line which contains field names
		var text = line.toString('ascii').replace("\r", "");  // Convert and remove CR is present
		if(text.charAt(0) == '#') continue;	// comment 
		var part = text.split("\t");	// Tab separated elements
		if(part.length < 8) { console.log("Dictionary: Invalid record at line " + lineNumber); continue; }
		var definition = {	"version": part[0], 
							"since": part[1],
							"term": part[2],
							"type": part[3],
							"list": part[4],
							"element": part[5],
							"attributes": part[6],
							"definition": part[7]
						};
		dictionary[definition.term] = definition;
	}

	return dictionary;	
}

function readList(pathname) {
	const liner = new lineByLine(pathname);

	let line;
	let lineNumber = 0;
	var dictionary = {};
	
	while (line = liner.next()) {
		lineNumber++;
		if(lineNumber == 1) continue; // Skip first line which contains field names
		var text = line.toString('ascii').replace("\r", "");  // Convert and remove CR is present
		if(text.charAt(0) == '#') continue;	// comment 
		var part = text.split("\t");	// Tab separated elements
		if(part.length < 6) { console.log("List: Invalid record at line " + lineNumber); continue; }
		var definition = {	"version": part[0], 
							"since": part[1],
							"name": part[2],
							"type": part[3],
							"reference": part[4],
							"definition": part[5]
						};
		dictionary[definition.name] = definition;
	}

	return dictionary;	
}

function readMember(pathname) {
	const liner = new lineByLine(pathname);

	let line;
	let lineNumber = 0;
	var dictionary = {};
	var currentObjectName = "";
	var currentObject = {};
	
	while (line = liner.next()) {
		lineNumber++;
		if(lineNumber == 1) continue; // Skip first line which contains field names
		var text = line.toString('ascii').replace("\r", "");  // Convert and remove CR is present
		if(text.charAt(0) == '#') continue;	// comment 
		var part = text.split("\t");	// Tab separated elements
		if(part.length < 4) { console.log("Member: Invalid record at line " + lineNumber); continue; }
		var definition = {	"version": part[0], 
							"since": part[1],
							"list": part[2],
							"item": part[3]
						};
		if(currentObjectName != definition.list) {	// New object
			if(currentObjectName.length != 0) { dictionary[currentObjectName] = currentObject; }
			currentObjectName = definition.list;
			currentObject = {};
		}
		currentObject[definition.item] = definition;
	}
	
	// Save last definition
	if(currentObjectName.length != 0) { dictionary[currentObjectName] = currentObject; }

	return dictionary;	
}

function readOntology(pathname) {
	const liner = new lineByLine(pathname);

	let line;
	let lineNumber = 0;
	var dictionary = {};
	var currentObjectName = "";
	var currentObject = {};
	
	while (line = liner.next()) {
		lineNumber++;
		if(lineNumber == 1) continue; // Skip first line which contains field names
		var text = line.toString('ascii').replace("\r", "");  // Convert and remove CR is present
		if(text.charAt(0) == '#') continue;	// comment 
		var part = text.split("\t");	// Tab separated elements
		if(part.length < 8) { console.log("Ontology: Invalid record at line " + lineNumber); continue; }
		var definition = {	"version": part[0], 
							"since": part[1],
							"object": part[2],
							"element": part[3],
							"reference": parseInt(part[4]),
							"occurrence": part[5],
							"group": part[6],
							"type": part[7],
							"fixed_val": part[8]  
						};
		if(currentObjectName != definition.object) {	// New object
			if(currentObjectName.length != 0) { dictionary[currentObjectName] = currentObject; }
			currentObjectName = definition.object;
			currentObject = {};
		}
		currentObject[definition.element] = definition;
	}
	
	// Save last definition
	if(currentObjectName.length != 0) { dictionary[currentObjectName] = currentObject; }

	return dictionary;	
}

function buildEnumeration(dictionary, member, prefix, list) {
	var names = [];
	
	if( ! list) return names;
	
	var keys = Object.keys(list);
	for (var i = 0; i < keys.length; i++) {
		var term = keys[i];
		if( ! dictionary[term]) {
			console.log("Reference error: Term '" + term + "' is not defined.");
		} else {
			names.push(prefix + term);
			var nested = buildEnumeration(dictionary, member, prefix + term + ".", member[term]);
			for( var j = 0; j < nested.length; j++) {
				names.push(nested[j]);
			}
		}
	}
	return names;
}

function buildListUnion(member, list) {
	if( ! list) return member;
	
	var keys = Object.keys(list);
	for (var i = 0; i < keys.length; i++) {
		var term = keys[i];
		if( list[term].type == 'Union') {   // Create member item from union
			// console.log("List '" + term + "' is a union.");
         // Add members in each list as members of this list
         var items = {};
         var part = list[term].reference.split(",");
			for( var j = 0; j < part.length; j++) {
				// console.log("    " + part[j]);
          	var names = Object.keys(member[part[j]]);
            for (var k = 0; k < names.length; k++) {
               // console.log("        " + names[k]);
               items[names[k]] = member[part[j]][names[k]];
            }
			}
         //Sort items alphabetically by 
         items = sortByKey(items);
         member[term] = items;
         list[term].type = "Closed";  // Change to "Closed" after doing union. Helps with docs.
		}
	}
	return member;
}

/**
 *  @brief Perform task.
 *  
 *  @param [in] args command line arguments after processing options.
 *  @return nothing
 */
function main(args) {

	// Change to base folder
	process.chdir(options.base);
	
	// Output
	if(options.output) {
		outputFile = fs.createWriteStream(options.output);
	}

	// Model outline
	var model = {
		"name" : "",
		"version" : "",
		"released" : "",
		"description" : "",
		"namespace": "",
		"schemaurl": "",
		"extend": "",
		"history" : {},
		"type" : {},
		"dictionary" : {},
		"list" : {},
		"member" : {},
		"ontology" : {}
	}
	
	// var root = options.base; // args[0];

	// Read and parse config file (if it exists)
	if(options.config) {
		var pathname = options.config;
		if( fs.existsSync(pathname) ) {
			var config = readConfig(pathname);
			if(config.name) { model.name = config.name; }
			if(config.version) { model.version = config.version; }
			if(config.released) { model.released = config.released; }
			if(config.description) { model.description = config.description; }
			if(config.namespace) { model.namespace = config.namespace; }
			if(config.schemaurl) { model.schemaurl = config.schemaurl; }
			if(config.extend) { model.extend = config.extend; }
		} else {	// Inform about options
			console.log('Config file "' + options.config + '" does not exist.');
			console.log('Use command line options to set overview information');
			console.log('or provide a valid overview file.');
		}
	}
	
	// Read and parse type info
	var type = readType("type.tab");
/*
	console.log("#----- Type ----")
	console.log(JSON.stringify(type, null, 3));
	console.log("/----- Type ----")
*/

	// Read and parse dictionary
	var dictionary = readDictionary("dictionary.tab");
/*
	console.log("#----- Dictionary ----")
	console.log(JSON.stringify(dictionary, null, 3));
	console.log("/----- Dictionary ----")
*/
	
	// Read and parse list info
	var list = readList("list.tab");
/*
	console.log("#----- List ----")
	console.log(JSON.stringify(list, null, 3));
	console.log("/----- List ----")
*/

	// Read and parse member info
	var member = readMember("member.tab");
/*
	console.log("#----- Member ----")
	console.log(JSON.stringify(member, null, 3));
	console.log("/----- Member ----")
*/

	// Read and parse history info
	var history = readHistory("history.tab");
   history.reverse();   // Newest first
/*
	console.log("#----- History ----")
	console.log(JSON.stringify(history, null, 3));
	console.log("/----- History ----")
*/

	// Read and parse ontology
	var ontology = readOntology("ontology.tab");
/*
	console.log("#----- Ontology ----")
	console.log(JSON.stringify(ontology, null, 3));
	console.log("/----- Ontology ----")
*/

	var terms = Object.keys(dictionary);
	var ont = Object.keys(ontology);
	
   // Build lists that are unions of other lists
   member = buildListUnion(member, list);
   
	// Build "usedBy" and "subElements" list
	for (var i = 0; i < terms.length; i++) {
		var term = terms[i];
		dictionary[term].usedBy = [];
		// usedBy
		for (var j = 0; j < ont.length; j++) {
			var item = ont[j];
			var members = Object.keys(ontology[item]);
			if(members.indexOf(term) != -1) { dictionary[term].usedBy.push(item); }
		}
		// subElements
		if(ontology[term]) {
			dictionary[term].subElements = Object.keys(ontology[term]);
		}
	}
		
	// Build "allowedValues" list
	for (var i = 0; i < terms.length; i++) {
		var term = terms[i];
		dictionary[term].allowedValues = [];
		if(dictionary[term].list.length > 0) {
			if( ! member[dictionary[term].list] && ! list[dictionary[term].list]) {
				console.log("Reference error: Term '" + term + "' refers to list '" + dictionary[term].list + "' which does not exist.");
			} else {
				dictionary[term].allowedValues = buildEnumeration(dictionary, member, "", member[dictionary[term].list]); // Object.keys(member[dictionary[term].list]);
			}
		}
	}
	
	// Check for internal references
	terms = Object.keys(member);
	for (var i = 0; i < terms.length; i++) {
		var items = Object.keys(member[terms[i]]);
		for(var j = 0; j < items.length; j++) {
			if( ! dictionary[items[j]]) {
				console.log("Error in list '" + terms[i] + "' - member '" + items[j] +"' is not defined in dictionary.");
			}
		}
	}
	
/*
	console.log("#----- Ontology ----")
	console.log(JSON.stringify(ontology, null, 3));
	console.log("/----- Ontology ----")
*/

	// Override 
	if(options.name) { model.name = options.name; }
	if(options.number) { model.version = options.number; }
	if(options.released) { model.released = options.released; }
	if(options.description) { model.description = options.description; }
	if(options.namespace) { model.namespace = options.namespace; }
	if(options.schemaurl) { model.schemaurl = options.schemaurl; }
	if(options.extend) { model.extend = options.extend; }

	// Default release date = today
	if(model.released.length == 0) model.released = now();

	// Define elements
	model.history = history;
	model.type = type;
	model.dictionary = dictionary;
	model.list = list;
	model.member = member;
	model.ontology = ontology;

   if(options.history) {   // Write history
   	var outFile = fs.createWriteStream(options.history);
      outFile.write(JSON.stringify(history, null, 3));      
      outFile.end(); 
      outFile = null;
   }
   
   // Write model
   outputWrite(0, JSON.stringify(model, null, 3));
	
	outputEnd();

}

main(options._);