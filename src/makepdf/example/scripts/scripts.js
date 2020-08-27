/*
const fs = require('fs');
const jsreport = require('jsreport-proxy');
const loader = require('loader.js');

const helpers = loader.loadAll('helpers', ".js");
const scripts = loader.loadAll('scripts', ".js");

const coverPage = loader.loadFile('templates/cover.html', 'utf8');
const toc = loader.loadFile('templates/toc.html', 'utf8');
*/

function beforeRender (req, res) {
    // req.data = req.data || {}
}

async function afterRender(req, res) {
	console.log("afterRender(): initialize");
	
    // after rendering with some pdf recipe we can use .parse to read the text in the pdf
    let $pdf = await jsreport.pdfUtils.parse(res.content, true)

    // Add a table of contents (if requested)
	if(toc.length > 0) {
		if ($pdf.pages[0] && $pdf.pages[0].text != null) {
			const appendRes = await jsreport.render({
				template: {
					content: toc,
					engine: 'handlebars',
					recipe: 'chrome-pdf',
					helpers: helpers,
				},
				data: {
					...req.data,
					$pdf
				}
			});

			res.content = await jsreport.pdfUtils.prepend(res.content, appendRes.content);
		}
	}

	if(coverPage.length > 0) {
		if ($pdf.pages[0] && $pdf.pages[0].text != null) {
			const coverRender = await jsreport.render({
				template: {
					content: coverPage,
					engine: 'handlebars',
					recipe: 'chrome-pdf',
					helpers: helpers
				},
				data: {
					$pdf
				}
			});

			// finally add a cover page
			res.content = await jsreport.pdfUtils.prepend(res.content, coverRender.content)
		}
	}
}