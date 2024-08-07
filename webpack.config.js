/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check
'use strict';

const resolve = require('path').resolve;
const terser = require('terser-webpack-plugin');

/** @typedef {import('webpack').Configuration} WebpackConfig **/

/**
 * @param { 'production' | 'development' | 'none' } mode
 * @returns {WebpackConfig}
 */
function getBaseConfig(mode) {
  return {
    mode,
    externals: {
      vscode: 'commonjs vscode'
    },
    devtool: mode === 'development' && 'inline-source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': resolve('src'),
        '@w': resolve('webview'),
        'luogu-api': resolve('luogu-api-docs', 'luogu-api.d.ts')
      }
    },
    optimization:
      mode == 'production'
        ? {
            minimize: true,
            usedExports: true,
            innerGraph: true,
            minimizer: [
              new terser({
                parallel: true,
                terserOptions: {
                  format: { comments: false }
                },
                extractComments: false
              })
            ]
          }
        : {},
    plugins: [
      // new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
      //   analyzerPort: 'auto'
      // })
    ]
  };
}

/**
 * @param { 'production' | 'development' | 'none' } mode
 * @returns {WebpackConfig}
 */
function getExtensionConfig(mode) {
  return {
    ...getBaseConfig(mode),
    target: ['node', 'es2020'],
    entry: './src/extension.ts',
    output: {
      filename: 'extension.js',
      path: resolve('dist'),
      libraryTarget: 'commonjs2'
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: resolve('tsconfig.extension.json')
              }
            }
          ]
        }
      ]
    },
    plugins: [
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)()
    ]
  };
}

/**
 * @param { 'production' | 'development' | 'none' } mode
 * @returns {WebpackConfig}
 */
function getOldWebviewConfig(mode) {
  return {
    ...getBaseConfig(mode),
    target: ['web', 'es2020'],
    entry: './src/webview/main.ts',
    output: {
      filename: 'webview.js',
      path: resolve('dist')
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: resolve('tsconfig.json')
              }
            }
          ]
        }
      ]
    }
  };
}

/**
 * @param { 'production' | 'development' | 'none' } mode
 * @param {WebpackConfig['entry']} entry
 * @returns {WebpackConfig}
 */
function GetWebviewConfig(mode, entry) {
  return {
    ...getBaseConfig(mode),
    entry,
    target: ['web', 'es2020'],
    output: {
      filename: '[name].js',
      path: resolve('dist')
    },
    module: {
      rules: [
        {
          exclude: /node_modules/,
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: resolve('tsconfig.webview.json')
            }
          }
        },
        {
          exclude: /node_modules/,
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    }
  };
}

module.exports =
  /**
   * @param {{ mode: 'production' | 'development' | 'none' | undefined; }} argv
   * @returns { Promise<WebpackConfig[]> }
   */
  function (env, argv) {
    const mode = argv.mode || 'none';
    return Promise.all([
      getExtensionConfig(mode),
      getOldWebviewConfig(mode),
      GetWebviewConfig(mode, {
        benben: './webview/benben',
        login: './webview/login'
      })
    ]);
  };
