const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      background: './src/background/background.js',
      content: './src/content/content.js',
      popup: './src/popup/popup.js',
      options: './src/options/options.js'
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name]/[name].js',
      publicPath: '',
      clean: true,
      // Configurações específicas para extensões
      globalObject: 'this',
      environment: {
        arrowFunction: false,
        bigIntLiteral: false,
        const: false,
        destructuring: false,
        dynamicImport: false,
        forOf: false,
        module: false
      }
    },
    
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name][ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name][ext]'
          }
        }
      ]
    },
    
    plugins: [
      new CleanWebpackPlugin(),
      
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(argv.mode || 'development'),
        'process.env.VERSION': JSON.stringify(require('./package.json').version)
      }),
      
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'manifest.json',
            to: 'manifest.json'
          },
          {
            from: 'src/assets',
            to: 'assets'
          },
          {
            from: 'src/popup/popup.css',
            to: 'popup/popup.css'
          },
          {
            from: 'src/options/options.css',
            to: 'options/options.css'
          },
          {
            from: 'src/popup/popup.html',
            to: 'popup/popup.html'
          },
          {
            from: 'src/options/options.html',
            to: 'options/options.html'
          }
        ]
      })
    ],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      },
      // Evitar eval() para compatibilidade com CSP
      minimizer: isProduction ? [
        new (require('terser-webpack-plugin'))({
          terserOptions: {
            mangle: false,
            compress: {
              drop_console: false,
              drop_debugger: false
            },
            format: {
              comments: false
            }
          }
        })
      ] : []
    },
    
    devtool: isProduction ? false : 'source-map',
    
    watch: !isProduction,
    watchOptions: {
      ignored: /node_modules/,
      poll: 1000
    }
  };
};
