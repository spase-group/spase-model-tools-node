# Example

1. Create XML schema document (XSD)
node ../src/makexsd.js -d data/spase-base-2.3.2.json -o spase-base-2.3.2.xsd

2. Create PDF documentation
node ../src/makepdf.js -d data/spase-base-2.3.2.json -o spase-base-2.3.2.pdf