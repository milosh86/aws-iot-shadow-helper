var path = require('path');

module.exports = {
  devtool: 'source-map',
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'index.js',
    library: "ShadowHelper",
    libraryTarget: "umd",
    umdNamedDefine: true
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        // exclude: /.*node_modules((?!z3-base|mixwith).)*$/, // name here all modules that need to be compiled
        loader: 'babel-loader',
      }
    ]
  }
};
