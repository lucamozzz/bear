/* eslint-env node */

const CopyWebpackPlugin = require('copy-webpack-plugin');
const { DefinePlugin } = require('webpack');

const path = require('path');

const basePath = '.';
const absoluteBasePath = path.resolve(path.join(__dirname, basePath));

module.exports = (env, argv) => {
  // Imposta la modalità di compilazione, che può essere 'development' o 'production'
  const mode = argv.mode || 'development';

  // Imposta lo strumento di sviluppo in base alla modalità scelta
  const devtool = mode === 'development' ? 'eval-source-map' : 'source-map';

  return {
    mode,
    // Definisce i punti di ingresso dell'applicazione
    entry: {
      viewer: './example/viewer.js',
      modeler: './example/modeler.js'
    },
    // Specifica dove mettere i file di output generati
    output: {
      filename: '[name].bundle.js',
      path: __dirname + '/example'
    },
    // Definisce le regole per il caricamento dei diversi tipi di file
    module: {
      rules: [
        // Carica i file JavaScript utilizzando Babel
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              plugins: [
                ['@babel/plugin-transform-react-jsx', {
                  'importSource': '@bpmn-io/properties-panel/preact',
                  'runtime': 'automatic'
                }]
              ]
            }
          }
        },
        // Carica i file BPMN come sorgenti
        {
          test: /\.bpmn$/,
          type: 'asset/source'
        },
        // Carica i file XML come testo grezzo
        {
          test: /\.xml$/i,
          use: 'raw-loader',
        },
        // Carica i file SVG utilizzando file-loader
        {
          test: /\.svg$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]'
              }
            }
          ]
        }
      ]
    },
    // Specifica come Webpack dovrebbe risolvere i moduli
    resolve: {
      mainFields: [
        'browser',
        'module',
        'main'
      ],
      // Definisce un alias per 'react' che punta alla versione di Preact compatibile con il pannello delle proprietà
      alias: {
        'react': '@bpmn-io/properties-panel/preact/compat'
      },
      // Aggiunge la cartella 'node_modules' e la cartella radice come percorsi di ricerca per i moduli
      modules: [
        'node_modules',
        absoluteBasePath
      ],
      fallback: {
        "path": require.resolve("path-browserify")
      }
    },
    // Aggiunge plugin a Webpack
    plugins: [
      // Copia i file necessari durante la compilazione
      new CopyWebpackPlugin({
        patterns: [
          { from: 'bpmn-js/dist/assets', context: 'node_modules', to: 'dist/vendor/bpmn-js/assets' },
          { from: 'bpmn-js-properties-panel/dist/assets', context: 'node_modules', to: 'dist/vendor/bpmn-js-properties-panel/assets' }
        ]
      }),
      // Definisce variabili globali
      new DefinePlugin({
        'process.env.TOKEN_SIMULATION_VERSION': JSON.stringify(require('./package.json').version)
      })
    ],
    // Imposta lo strumento di sviluppo
    devtool
  };
};
