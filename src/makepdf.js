const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const winston = require('winston');
const loader = require('./loader.js');
const process = require('process'); 

var options  = yargs
	.version('1.0.1')
    .usage('Read information model specification files and generate PDF documentation.')
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
		
		// Help text
		'h' : {
			alias : 'help',
			description: 'show information about the app.'
		},
		
		// Base folder
		'b' : {
			alias: 'base',
			describe : 'Base folder containg config, data, outline file.',
			type: 'string',
			default: '.'
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
		
		// Outline
		'l' : {
			alias: 'outline',
			describe : 'File containing the outline for the table of contents.',
			type: 'string',
			default: 'data/outline.json'
		},
		
		// Template
		't' : {
			alias: 'template',
			describe : 'File containing the template for the main part of the document.',
			type: 'string',
			default: 'templates/main.html'
		},
		
		// Cover page template
		'e' : {
			alias: 'cover',
			describe : 'File containing the template for the cover page of the document.',
			type: 'string',
			default: 'templates/cover.html'
		},
		
		// Table of contents template
		'i' : {
			alias: 'toc',
			describe : 'File containing the template for the table of contents of the document.',
			type: 'string',
			default: 'templates/toc.html'
		},

		// Margin
		'm' : {
			alias: 'margin',
			describe : 'Margin used in the document.',
			type: 'string',
			default: '0.5in'
		},

		// Header
		'r' : {
			alias: 'header',
			describe : 'File containing the template for the page header.',
			type: 'string',
			default: null
		},

		// Footer
		'f' : {
			alias: 'footer',
			describe : 'File containing the template for the page footer.',
			type: 'string',
			default: null
		},

		// Helpers
		'p' : {
			alias: 'helpers',
			describe : 'Folder containing helper scripts.',
			type: 'string',
			default: 'helpers'
		},
		
		// Scripts
		's' : {
			alias: 'scripts',
			describe : 'Folder containing generation scripts.',
			type: 'string',
			default: 'scripts'
		},
				
		// Output file
		'o' : {
			alias: 'output',
			describe : 'Output file name for generated JSON file.',
			type: 'string',
			default: 'generated.pdf'
		},
	})
	.argv
	;

var args = options._;	// Unprocessed command line arguments

// Set working directory
process.chdir(options.base);
console.log("Current directory: " + process.cwd());

// Initialize jsreport
const jsreport = require('jsreport-core')({
	"allowLocalFilesAccess": true,
	"rootDirectory": process.cwd(),
	"template": {
		"chrome": {
		  "marginTop": "50px",
		  "marginBottom": "50px",
		  "headerTemplate": '<html><head><style>html, body { font-size:12px;}</style></head><body><div style="text-align:center; width: 100%"><span class="title"></span></div></body></html>',
		  "footerTemplate": '<html><head><style>html, body { font-size:12px;}</style></head><body><div style="text-align:center; width:100%"><span class="pageNumber"></span></div></body></html>',
		  "displayHeaderFooter": true,
		},
	},
	"extensions": {
		"assets": {
			"allowedFiles": "**/*.*",
			"searchOnDiskIfNotFoundInStore": true
		},
	},
	"child-templates": {
		// controls how many child templates rendering can happen in parallel, defaults to 2
		"parallelLimit": 5
	},
	"logger": {
		"error": {
			"transport": "console",
			"level": "error",
		}
	},
});

// Necessary modules
jsreport.use(require('jsreport-handlebars')());
jsreport.use(require('jsreport-chrome-pdf')());
jsreport.use(require('jsreport-assets')());
jsreport.use(require('jsreport-templates')());
jsreport.use(require('jsreport-child-templates')());
jsreport.use(require('jsreport-pdf-utils')());
jsreport.use(require('jsreport-scripts')());

// Load various pieces

const data = JSON.parse(fs.readFileSync(options.data, 'utf8'));
const outline = JSON.parse(fs.readFileSync(options.outline, 'utf8'));
const templates = loader.loadFile(options.template);
const helpers = loader.loadAll(options.helpers, ".js");
const header = '<html><head><style>html, body { font-size:12px;}</style></head><body><div style="text-align:center; width: 100%; margin-left: ' + options.margin + '; margin-right: ' + options.margin + ';"><span class="title"></span></div></body></html>';
if(options.header) { header = loader.loadFile(options.header); }
const footer = '<html><head><style>html, body { font-size:12px;}</style></head><body><div style="text-align:right; width:100%; margin-left: ' + options.margin + '; margin-right: ' + options.margin + ';"><span class="pageNumber"></span></div></body></html>';
if(options.footer) { footer = loader.loadFile(options.footer); }

const scripts = loader.loadAll(options.scripts, ".js");
/*
const data = JSON.parse(fs.readFileSync(path.join(options.base, options.data), 'utf8'));
const outline = JSON.parse(fs.readFileSync(path.join(options.base, options.outline), 'utf8'));
const templates = loader.loadFile(path.join(options.base, options.template));
const helpers = loader.loadAll(path.join(options.base, options.helpers), ".js");
const header = '<html><head><style>html, body { font-size:12px;}</style></head><body><div style="text-align:center; width: 100%; margin-left: ' + options.margin + '; margin-right: ' + options.margin + ';"><span class="title"></span></div></body></html>';
if(options.header) { header = loader.loadFile(path.join(options.base, options.header)); }
const footer = '<html><head><style>html, body { font-size:12px;}</style></head><body><div style="text-align:right; width:100%; margin-left: ' + options.margin + '; margin-right: ' + options.margin + ';"><span class="pageNumber"></span></div></body></html>';
if(options.footer) { footer = loader.loadFile(path.join(options.base, options.footer)); }

const scripts = loader.loadAll(path.join(options.base, options.scripts), ".js");
*/
/*
var scripts = ' \
const fs = require("fs"); \
const jsreport = require("jsreport-proxy"); \
const loader = require("loader.js"); \
const helpers = loader.loadAll("' + path.join(options.base, options.helpers) + '", ".js"); \
const scripts = loader.loadAll("' + path.join(options.base, options.scripts) + '", ".js"); \
'
*/

// Set-up logging
if(options.verbose) {
	jsreport.logger.add(winston.transports.Console, {level: 'debug'} );
}

// Generate PDf
jsreport.init().then(() => {
	return jsreport.render({
		template: {
			content: templates,
			engine: 'handlebars',
			recipe: 'chrome-pdf',
			helpers: helpers,
			scripts: [ { content: scripts} ],
			chrome: {
			  marginTop: options.margin,
			  marginBottom: options.margin,
			  headerTemplate: header,
			  footerTemplate: footer,
			  displayHeaderFooter: true,
			},
		},
		data: { options: options, chapters: outline.chapters, data: data }
	}).then((resp) => {
	 	// prints pdf with headline Hello world
		// console.log(resp.content.toString());
		fs.writeFileSync(options.output, resp.content);
		console.log("Output written to: " + options.output);
 	});
}).then(() => {
	process.exit();
}).catch((e) => {
	console.error(e)
	process.exit(1);
})
