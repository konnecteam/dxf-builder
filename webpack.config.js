const webpack = require('webpack');
const path = require('path');
const nodeExternals = require('webpack-node-externals');
//const BabiliPlugin = require("babili-webpack-plugin");
const fs = require('fs-extra');
const typings = require("typings-core");



const outputDirectory = path.join(__dirname, 'dist/commonjs/');

console.log('Generating typings........');
typings.bundle({
  cwd: "build/",
  out: path.join(outputDirectory, "typings", "konnect-dxf-builder.d.ts")
});
console.log('Typings generated');

module.exports = {
  entry: "build/index.js",
  target: 'node',
  node: {
    __dirname: false,
    __filename: false
  },
  output: {
    path: outputDirectory,
    filename: 'konnect-dxf-builder.js',
	  libraryTarget : "commonjs"
  },
  externals: [nodeExternals({
  })], // in order to ignore all modules in node_modules folder
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          presets: ['babili'],
          comments: false
        }
      }
    ]
  },
  plugins: [
    //new BabiliPlugin(),
    new webpack.IgnorePlugin(/\.(css|less)$/),
    /*new webpack.BannerPlugin('require("source-map-support").install();',
                             { raw: true, entryOnly: false }),*/
    new webpack.DefinePlugin({
      '__WEBPACK__': true
    })
  ],
  devtool: 'sourcemap',
  resolve: {
	  modules: ['./', 'node_modules'],
    alias: {
      '@konnect/dxf-builder': 'build/'
    }
	}
}
