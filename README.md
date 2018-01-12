

Install

npm install
npm install -g browserify watchify uglify-js


To compile

watchify game.js -o bundle.js -t [ babelify --presets [ env ] ]


