#!/usr/bin/env node
"use strict";
/**
 * Read information model specification file in JSON format and generate an XML schema document (XSD).
 * 
 * @author Todd King
 **/
const fs = require('fs');
const yargs = require('yargs');
const path = require('path');
const lineByLine = require('n-readlines');
const htmlEncode = require('js-htmlencode').htmlEncode;

var options  = yargs
	.version('1.0.1')
    .usage('Read information model specification file in JSON format and generate an XML schema document (XSD).')
	.usage('$0 [args] <folder>')
	.example('$0 -d example.json', 'Read the information model specification file "example.json"')
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
			
		// Config
		'c' : {
			alias: 'config',
			describe : 'Config file.',
			type: 'string',
			default: 'config.json'
		},
		
		// Data
		'd' : {
			alias: 'data',
			describe : 'File containing data.',
			type: 'string',
			default: 'data/data.json'
		},

		// base element name
		'b' : {
			alias : 'base',
			description: 'Base element name of document.',
			default: "Spase"
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

// Output
if(options.output) {
	outputFile = fs.createWriteStream(options.output);
}

var model = readModelSpec(options.data);

// outputWrite(0, "Base: " + options.base);

// outputWrite(0, JSON.stringify(model.dictionary[options.base], null, 3));
// outputWrite(0, JSON.stringify(model.ontology[options.base], null, 3));

makeXSD(model);

outputEnd();


/** 
 * Write to output file if defined, otherwise to console.log()
 **/
function outputWrite(indent, str) {
	var prefix = "";
	for(var i = 0; i < indent; i++) { prefix += "   "; }

	if(outputFile == null) {
		var prefix = "";
		for(var i = 0; i < indent; i++) { prefix += "   "; }
		console.log(prefix + str);
	} else {
		outputFile.write(prefix + str + "\n");
	}
}

/**
 * Concludes output.
 **/
function outputEnd() {
	if(outputFile != null) {
		outputFile.end();
	}
}
/**
 * Close an output file if one is assigned.
 **/
var outputEnd = function() {
	if(outputFile) { outputFile.end(); outputFile = null }
}

function today() {
	var stamp = new Date();
	var dd = String(stamp.getDate()).padStart(2, '0');
	var mm = String(stamp.getMonth() + 1).padStart(2, '0'); //January is 0!
	var yyyy = stamp.getFullYear();

	stamp = yyyy + '-' + mm + '-' + dd;
	return(stamp);
}

function readModelSpec(pathname) {
	var data=fs.readFileSync(pathname, 'utf8');
	var model=JSON.parse(data);
	
	return model;	
}

function makeXSD(model) {
	outputWrite(0, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
	outputWrite(0, "<!-- Automatically created based on the specification available at http://www.spase-group.org/model -->");
	if( model.extend.length != 0 ) {	// Indicate what it extends
		outputWrite(0, "<!-- Extends the schema contained in \"" + model.extend + "\" -->");			
	}
	outputWrite(0, "<!-- Version: " + model.version + " -->");
	outputWrite(0, "<!-- Generated: " + today() + " -->");
	outputWrite(0, "<xsd:schema");
	outputWrite(0, "	      targetNamespace=\"" + model.schemaurl + "\"");
	outputWrite(0, "	      xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"");
	outputWrite(0, "	      xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"");
	outputWrite(0, "	      xmlns:vc=\"http://www.w3.org/2007/XMLSchema-versioning\"");
	outputWrite(0, "	      xmlns:" + model.namespace + "=\"" + model.schemaurl + "\"");
	outputWrite(0, "	      elementFormDefault=\"qualified\"");
	outputWrite(0, "	      attributeFormDefault=\"unqualified\"");
	outputWrite(0, "	      vc:minVersion=\"1.1\"");
	outputWrite(0, "	      version=\"" + model.version + "\"");
	outputWrite(0, ">");
	outputWrite(0, "");
	
	if(model.extend.length == 0 ) {	// Only include in a base schema
		outputWrite(1, "<!-- Document root element -->");
		outputWrite(1, "<xsd:element name=\"Spase\" type=\"spase:Spase\" />");
		outputWrite(0, "");
	} 
	
	makeTree(model, "Spase", "", true);
	makeGroup(model);
	makeDictionary(model);
	makeLists(1, model);
	if(model.extend.length == 0 ) {   // Only include in a base schema
		makeTypes(model);
	}

	outputWrite(0, "</xsd:schema>");
}


function makeTree(model, term, addLang) {

	if(options.verbose) console.log("*** Generating schema ***");

	if( model.extend.length != 0 ) { // Override if not in a base schema
		outputWrite(1, "<!-- \"override\" does an implicit \"include\" of the referenced schema, then redfines the element -->");
		outputWrite(1, "<xsd:override schemaLocation=\"" + model.extend + "\">");
	}
	makeBranch(model, term, addLang);
	makeExtension(model, addLang);
	if( model.extend.length != 0 ) {	// Override if not in a base schema
		outputWrite(1, "</xsd:override>");
		outputWrite(0, "");
	}
	
	// Remove book keeping elements from ontology
	var keys = Object.keys(model.ontology);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var term = model.ontology[key];
		if(term['_written']) delete term['_written'];	// Remove
	}
}

function makeBranch(model, term, addLang) {
	if(options.verbose) console.log("   Element: " + term);

	var item = model.ontology[term];
	if(item['_written']) return; // Don't write twice
	item['_written'] = true;

	try {
		outputWrite(1, "<xsd:complexType name=\"" + getXSLName(term) + "\">");
		addAnnotation(2, model.dictionary[term].definition);
		outputWrite(2, "<xsd:sequence>");
	} catch(e) {
		console.log("Processing term: " + term);
		console.log(e.message);
	}

	var currentGroup = "";
	var inc = 0;
	var inChoice = false;
	var keys = Object.keys(model.ontology[term]);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		if(key == '_written') continue;	// Used to control output
		
		var member = item[key];
			
		if (currentGroup.length > 0) {	// In a choice
			if( member.group != currentGroup) {	// Close group
				outputWrite(3, "</xsd:choice>");
				inc--;
				inChoice = false;
				currentGroup = "";
			}
		}
		
		if (member.group.length > 0) {	// part of a choice
			if( member.group != currentGroup) {	// Start a new choice
				outputWrite(3, "<xsd:choice "
								+ getXSLOccurrence(member.occurrence)
								+ ">");
				inc++;
				inChoice = true;
			}
			currentGroup = member.group;
		}
		var type = member.element;
		if( ! model.dictionary[member.element]) {
			console.log("Definition of '" + member.element + "' missing from dictionary.");
		}
		if(model.dictionary[member.element].type == 'Enumeration') {
			type = model.dictionary[member.element].list;
		}
		var occur = "";
		if(!inChoice) occur = " " + getXSLOccurrence(member.occurrence);

		outputWrite(
				3 + inc,
				"<xsd:element name=\""	+ getXSLName(member.element) + "\""
						   + " type=\""	+ model.namespace + ":" + getXSLName(type) + "\""	
							+ occur
						   + " />"
				);
	}
		
	// Wrap up sequence/complexType
	if (currentGroup.length > 0) {	// In a choice
		outputWrite(3, "</xsd:choice>");
	}
	outputWrite(2, "</xsd:sequence>");
	if (addLang) {
		outputWrite(3,
				"<xsd:attribute name=\"lang\" type=\"xsd:string\" default=\"en\"/>");
	}
	outputWrite(1, "</xsd:complexType>");
	
	// Now output complexTypes used by this object
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		if(model.ontology[key]) makeBranch(model, key, addLang);
	}		
}

function makeExtension(model, addLang) {
	var term = 'Extension';

	try {	
		outputWrite(0, "");
		outputWrite(1, "<xsd:complexType name=\"" + getXSLName(term) + "\">");
		addAnnotation(2, model.dictionary[term].definition);
		outputWrite(2, "<xsd:sequence>");
		outputWrite(3, "<xsd:any minOccurs=\"0\" maxOccurs=\"unbounded\" processContents=\"lax\" namespace=\"##other\" />");
		outputWrite(2, "</xsd:sequence>");
		if (addLang) {
			outputWrite(3, "<xsd:attribute name=\"lang\" type=\"xsd:string\" default=\"en\"/>");
		}
		outputWrite(1, "</xsd:complexType>");
	} catch(e) {
		// "Extension" was introduced in 1.2.0 - Ignore error if 1.1.0
		if(model.version.localeCompare("1.1.0") != 0) {
			console.log("Processing term: " + term);
			console.log(e.message);
		}
	}
}

function makeGroup(model) {
	// Generate types for each list
	var currentGroup = "";

	if(options.verbose) console.log("*** Generating groups ***");

	outputWrite(0, "<!-- ================================");
	outputWrite(0, "      Groups");
	outputWrite(0, "     ================================ -->");
	
	
	var keys = Object.keys(model.ontology);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var container = model.ontology[key];
		var items = Object.keys(container);
		for (var j = 0; j < items.length; j++) {
			var item = items[j];
			var group = container[item].group;
			if(group.length == 0) continue;
			
			if (currentGroup.length > 0) {	// In a choice
				if( group != currentGroup) {	// Close group
					outputWrite(2, "</xsd:sequence>");
					outputWrite(1, "</xsd:group>");
				}
			}
			if( group != currentGroup) {	// Start a new choice
				if(options.verbose) console.log("   Group: " + group);
				outputWrite(1, "<xsd:group name=\"" + group + "\">");
				outputWrite(2, "<xsd:sequence>");
			}
			currentGroup = group;
			var term = container[item].element;
			outputWrite(3, "<xsd:element name=\"" + getXSLName(term) + "\""
					+ " type=\"" + model.namespace + ":" + getXSLName(term)	+ "\""
					+ " " + getXSLOccurrence(container[item].occurrence)
					+ " />");
		}							
	}
	
	// If group was started - finish it
	if (currentGroup.length > 0) {	// Indicates member of group - text after ">" is group name
		outputWrite(2, "</xsd:sequence>");
		outputWrite(1, "</xsd:group>");
	}
}

function makeDictionary(model) {
	if(options.verbose) console.log("*** Generating dictionary ***");

	outputWrite(0, "<!-- ================================");
	outputWrite(0, "      Dictionary Terms");
	outputWrite(0, "     ================================ -->");
	
	// Generate types for each list
	var keys = Object.keys(model.dictionary);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var term = model.dictionary[key].term;
		var type = model.dictionary[key].type;
		var desc = model.dictionary[key].definition;

		// Version and Extension are special instances and handled elsewhere.
		if(term == "Version") continue;
		if(term == "Extension") continue;

		if(options.verbose) console.log("   Term: " + key);

		if (type == "Item") {	// An item appears in enumerations
			// Do nothing
		} else if (type == "Enumeration") {	// Handled separately
			// Do nothing
		} else if (type == "Container") {	// A set of elements as defined in the ontology
			// Do nothing
		} else 	if(type == "Boundary") {	// Complex content
			outputWrite(1, "<xsd:complexType name=\"" + getXSLName(term) + "\">");
			addAnnotation(2, desc);
			outputWrite(2, "<xsd:complexContent>");					
			outputWrite(3, "<xsd:restriction base=\""	+ getXSLType(type, model.namespace, term) + "\""
					+ " />");
			outputWrite(1, "</xsd:complexContent>");					
			outputWrite(1, "</xsd:complexType>");
		} else 	if(type == "Value") {	// Simple content
			outputWrite(1, "<xsd:complexType name=\"" + getXSLName(term) + "\">");
			addAnnotation(2, desc);
			outputWrite(2, "<xsd:simpleContent>");					
			outputWrite(3, "<xsd:restriction base=\""	+ getXSLType(type, model.namespace, term) + "\""
					+ " />");
			outputWrite(1, "</xsd:simpleContent>");					
			outputWrite(1, "</xsd:complexType>");
		} else {	// Simple base type
			if(type.startsWith("+")) {	// Special case - use another class
				// don't write
			} else {
				outputWrite(1, "<xsd:simpleType name=\"" + getXSLName(term) + "\">");
				addAnnotation(2, desc);
				outputWrite(2, "<xsd:restriction base=\""	+ getXSLType(type, model.namespace, term) + "\""
					+ " />");
				outputWrite(1, "</xsd:simpleType>");
			}
		}
	}
}

/**
 * Generate XML schema description of every list item
 **/
function makeLists(indent, model) {
	if(options.verbose) console.log("*** Generating enumeration lists ***");

	outputWrite(0, "<!-- ================================");
	outputWrite(0, "     Lists");
	outputWrite(0, "     ================================ -->");

	if(model.extend.length == 0) {	// Only include in a base schema
		// Generate enumeration for version
		outputWrite(0, "<!-- ==========================");
		outputWrite(0, "     Version");
		outputWrite(0, "     ========================== -->");

		outputWrite(indent, "<xsd:simpleType name=\"Version\">");
		addAnnotation(indent + 1, "Version number.");
		outputWrite(indent + 1, "<xsd:restriction base=\"xsd:string\">");
		outputWrite(indent + 2, "<xsd:enumeration value=\"" + model.version + "\" />");
		outputWrite(indent + 1, "</xsd:restriction>");
		outputWrite(indent + 1, "</xsd:simpleType>");
	}
	
	// Generate types for each list
	var keys = Object.keys(model.list);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var listName = getXSLName(model.list[key].name);
		var desc = model.list[key].definition;
		if (model.list[key].type == "Open") {
			desc = "Open List. See: " + model.list[key].reference;
		}
		
		if(options.verbose) console.log("   List: " + key);

		outputWrite(0, "<!-- ==========================");
		outputWrite(0, "     List: " + model.list[key].name);
		outputWrite(0, "");
		outputWrite(0, "     " + model.list[key].definition);
		outputWrite(0, "     ========================== -->");

		if (model.list[key].type == "Open") {
			outputWrite(indent, "<xsd:element name=\"" + listName + "\" type=\"xsd:string\">");
			addAnnotation(indent + 1, model.list[key].definition);
			outputWrite(indent, "</xsd:element>");
		} else if (model.list[key].type == "Union") {
			outputWrite(indent, "<xsd:simpleType name=\"" + listName + "\">");
			addAnnotation(indent + 1, model.list[key].definition);
			outputWrite(indent, "<xsd:union");
			makeEnumUnion(model.namespace + ":", model.list[key].reference);
			outputWrite(indent, "/>");
			outputWrite(indent, "</xsd:simpleType>");
		} else { // Closed
			outputWrite(indent, "<xsd:simpleType name=\"" + listName + "\">");
			addAnnotation(indent + 1, model.list[key].definition);
			outputWrite(indent + 1, "<xsd:restriction base=\"xsd:string\">");
			makeEnum(indent + 2, model, "", model.list[key].name);
			outputWrite(indent + 1, "</xsd:restriction>");
			outputWrite(indent, "</xsd:simpleType>");
		}
	}
}

/**
 * Generate XML schema description of non-standard data types
 **/
function makeTypes(model) {
	if(options.verbose) console.log("*** Generating types ***");

	outputWrite(0, "<!-- ================================");
	outputWrite(0, "      Types");
	outputWrite(0, "     ================================ -->");

	outputWrite(0, "");

	if(options.verbose) console.log("   Type: Sequence");

	if(model.type["Sequence"]) {	// Introduced in version 1.2.0
		outputWrite(1, "<xsd:simpleType name=\"typeSequence\">");
		outputWrite(2, "<xsd:annotation>");
		outputWrite(3, "<xsd:documentation xml:lang=\"en\">");
		addAnnotation(4, model.type["Sequence"].definition);
		outputWrite(3, "</xsd:documentation>");
		outputWrite(2, "</xsd:annotation>");
		outputWrite(2, "<xsd:list itemType=\"xsd:integer\"/>");
		outputWrite(1, "</xsd:simpleType>");
	}

	outputWrite(0, "");
	
	if(options.verbose) console.log("   Type: ID");
	
	if(model.type["ID"]) {	// Introduced in version 2.2.3
		outputWrite(1, "<xsd:simpleType name=\"typeID\">");
		outputWrite(2, "<xsd:annotation>");
		outputWrite(3, "<xsd:documentation xml:lang=\"en\">");
		addAnnotation(4, model.type["ID"].definition);
		outputWrite(3, "</xsd:documentation>");
		outputWrite(2, "</xsd:annotation>");
		outputWrite(2, "<xsd:restriction base=\"xsd:string\">");
		outputWrite(3, "<xsd:pattern value=\"[^:]+://[^/]+/.+\"/>");
		outputWrite(2, "</xsd:restriction>");
		outputWrite(1, "</xsd:simpleType>");
	}

}

/**
 * Generate XML schema complextType for a type defined with an ontology
 **/
function defineType(model, name) {
	outputWrite(0, "");
	outputWrite(1, "<xsd:complexType name=\"type" + name + "\">");
	outputWrite(2, "<xsd:annotation>");
	outputWrite(3, "<xsd:documentation xml:lang=\"en\">");
	outputWrite(4, model.dictionary[name].definition);
	outputWrite(3, "</xsd:documentation>");
	outputWrite(2, "</xsd:annotation>");
	outputWrite(2, "<xsd:sequence>");
	// Generate types for each list
	var list = model.ontology[name];
	var keys = Object.keys(list);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var elem = getXSLName(key);
		var type = getXSLName(model.dictionary[key].type);
		if(type.isEmpty()) type =  model.namespace + ":" + key ;
		outputWrite(3, "<xsd:element name=\"" + elem + "\" type=\"" + type + "\" " + getXSLOccurrence(model.ontology[key].occurrence) + " />" );
	}
	outputWrite(2, "</xsd:sequence>");
	outputWrite(1, "</xsd:complexType>");
}

/**
 * Create an enumeration list.
 **/
function makeEnum(indent, model, prefix, list) {
	var buffer = "";
	if( ! model.member[list]) {
		console.log("List '" + list + "' has no members defined.");
		return;
	}
	
	try {
		var keys = Object.keys(model.member[list]);
		var term = "";
		for (var i = 0; i < keys.length; i++) {
			term = keys[i];
			buffer = prefix;
			if (prefix.length > 0) buffer += ".";
			buffer += getXSLName(term);
			outputWrite(indent + 1, "<xsd:enumeration value=\"" + buffer + "\">");
			if( ! model.dictionary[term]) console.log("Error in list '" + list + "' - member '" + term +"' is not defined.");
			addAnnotation(indent + 2, model.dictionary[term].definition);
			outputWrite(indent + 1, "</xsd:enumeration>");
			if (model.member[term])	{	// Nested Enumeration
				makeEnum(indent + 1, model, buffer, term);
			}
		}
	} catch(e) {
		console.log("Processing term '" + term + "' in list '" + list + "'");
		console.log(e.message);
	}
}

/**
 * Create an enumeration list.
 **/
function makeEnumUnion(prefix, list) {
	var part = list.split(",");

	enumList = "memberTypes=\"";
	
	for(var i = 0; i < part.length; i++) {
		var p = part[i];
		if(p.index(":") != -1) enumList += delim + p.trim();	// Namespace already defined
		else enumList += delim + prefix + p.trim();
		delim = " ";
	}
	enumList += "\"";
	outputWrite(enumList);
}

function getXSLName(term) {
	// Strip spaces, dashes and single quotes
	if( ! term ) return "";
	var buffer = "";

	buffer = term.replace(/-/g, "");
	buffer = buffer.replace(/'/g, "");
	buffer = buffer.replace(/ /g, "");

	return buffer;
}

function getElementGroup(term) {
	var buffer = "";
	
	return buffer;
}

function addAnnotation(indent, desc) {
	outputWrite(indent, "<xsd:annotation>");
	outputWrite(indent + 1, "<xsd:documentation xml:lang=\"en\">");
	outputWrite(indent + 1, htmlEncode(desc));
	outputWrite(indent + 1, "</xsd:documentation>");
	outputWrite(indent, "</xsd:annotation>");
}

function getXSLType(type, namespace, name) {
	// XML Schema internal types
	if (type == "Container") 			return namespace + ":" + name;
	
	// XML Schema built-in types
	if (type == "Count") 			return "xsd:integer";
	if (type == "DateTime")			return "xsd:dateTime";
	if (type == "Duration")			return "xsd:duration";
	if (type == "Numeric")			return "xsd:double";
	if (type == "Text")				return "xsd:string";
	if (type == "URL")				return "xsd:anyURI";
	
	// Internally defined types
	if (type == "Boundary")			return "spase:typeBoundary";
	if (type == "Value")			return "spase:typeValue";
	if (type == "Sequence")			return "spase:typeSequence";
	if (type == "StringSequence")	return "spase:typeStringSequence";
	if (type == "FloatSequence")	return "spase:typeFloatSequence";
	if (type == "ID")				return "spase:typeID";

	// Defined differently prior to version 1.2.0
	// Date was a xsd:dateTime and Time was xsd:duration. 
	if (type == "Date")				return "xsd:date";
	if (type == "Time")				return "xsd:time";

	return "xsd:string";	// Default
}

function getXSLOccurrence(occur) {
	occur = occur.trim();
	
	if (occur == "0")			return "minOccurs=\"0\" maxOccurs=\"1\""; // Optional
	if (occur == "1")			return "minOccurs=\"1\" maxOccurs=\"1\""; // One only
	if (occur == "+")			return "minOccurs=\"1\" maxOccurs=\"unbounded\""; // At least one, perhaps many
	if (occur, "*")				return "minOccurs=\"0\" maxOccurs=\"unbounded\""; // Any number

	return ""; // Default
}
