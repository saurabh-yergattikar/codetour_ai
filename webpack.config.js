const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const config = {
  entry: "./src/extension.ts",
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode"
  },
  resolve: {
    fallback: {
      os: require.resolve("os-browserify/browser"),
      path: require.resolve("path-browserify"),
      fs: false
    },
    extensions: [".ts", ".js", ".json"]
  },
  node: {
    __filename: false,
    __dirname: false
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader"
          }
        ]
      },
      {
        test: /\.wasm$/,
        type: "asset/resource"
      }
    ]
  },
  plugins: [
    new webpack.SourceMapDevToolPlugin({
      test: /\.ts$/,
      noSources: false,
      module: true,
      columns: true
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "node_modules/web-tree-sitter/tree-sitter.wasm",
          to: "tree-sitter.wasm"
        },
        {
          from: "node_modules/tree-sitter-wasms/out",
          to: "grammars",
          globOptions: {
            ignore: ["**/*.md", "**/*.txt"]
          }
        }
      ]
    })
  ]
};

const nodeConfig = {
  ...config,
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension-node.js',
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  }
};

const webConfig = {
  ...config,
  target: 'webworker',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension-web.js',
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  }
};

// Build both node and web versions (web-tree-sitter works in both!)
module.exports = [nodeConfig, webConfig];