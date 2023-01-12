# SPASE model-tools

A collection of command line tools for working with SPASE information model specifications.

## Installation

`npm install spase-model-tools -g`

## Tools

**spase-model-xsd** : Generate the XML schema document to match the information model specification.

**spase-model-json** : Generate the JSON data files to match the information model specification.

**spase-model-pdf** : Generate PDF documentation for the information model.

# Notes 

## PDF Maker

Generate PDF documentation with jsreport. Templates are witten in HTML with Handlerbars mark-up.
A table of contents and cover sheet can be added to the document.

## File organization

   css : stylesheets
   
   helpers: Code for Handlebars helpers
   
   images: Images used in the document generation.
   
   scripts: Functions run during the document generation (by jsreports)
   
   templates: HTML with Handlerbar markup for generating pages, table of contents, title page and dictionary entries.
  
## Required packages 

npm install handlebars --save
npm install puppeteer --save
npm install webpack --save
npm install jsreport-core --save
npm install jsreport-assets --save
npm install jsreport-scripts --save
npm install jsreport-pdf-utils --save
npm install jsreport-templates --save
npm install jsreport-child-templates --save
npm install jsreport-handlebars --save
