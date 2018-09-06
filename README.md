# Creative Leaps game, optimized for tablet

A port of the "Creative Leaps" game to study creativity, ported from RedWire to an optimized version using Pixi.js. 

Programmed by Jesse Himmelstein, supported by Allyson Mackey and Jasmine Forde from the University of Pennsylvania, and Yuval Hart from Harvard University.


## Architecture

This is a HTML5 browser-based game, written entirely in JavaScript. The source code is directly readable in modern browsers supporting ECMAScript modules. We use Rollup to make a version for browsers without module support, Babel to support older browsers without recent JavaScript features, and UglifyJS to compress the JavaScript. 

A Gulp script automates the building process.


## Development

Install npm and gulp-cli if you don't have them.

Next, clone the repository and move to the directory where you cloned it. 

Install the dependencies with `npm install`. 

Use `gulp build` to compile to a version for older browsers in the `build` directory. Use `gulp watch` to automatically re-compile when you change a file. 

To generate minified version in the `dist` directory, use `gulp dist`.


## Copyright

Copyright University of Pennsylvania, 2017.


## License

Released under an MIT License.
