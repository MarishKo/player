const {VueLoaderPlugin} = require('vue-loader'),
  path = require('path'),
  CopyWebpackPlugin = require('copy-webpack-plugin'),
  webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: {
    index: path.resolve(__dirname, './src/app.js'),
  },
  output: {
    filename: '[name].js',
    chunkFilename: "[name].js?" + Date.now(),
    path: path.resolve(__dirname, './../dist'),
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: {
          loader: 'vue-loader',
          options: {
            loaders: {
              js: [
                'babel-loader',
              ]
            }
          }
        },
      },
      {
        test: /\.css$/,
        use: ['css-loader']
      },
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: 'babel-loader'
      },
      {
        test: /\.scss$/,
        use: ['vue-style-loader', 'css-loader', {
          loader: 'postcss-loader',
          options: {
            parser: 'postcss-comment',
            plugins: [
              require('css-mqpacker'),
              require('cssnano')({
                discardComments: {
                  removeAll: true
                },
              }),
            ]
          }
        }, 'sass-loader']
      },
      {
        test: /\.(png|jpe?g|gif|ico)(\?.*)?$/,
        loader: "url-loader",
        options: {
          limit: 10000,
          name: "img/[name].[hash:16].[ext]"
        }
      },
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin({multiStep: true}),
    new VueLoaderPlugin(),
    new webpack.ProvidePlugin({
      'axios': 'axios',
      "Vue": ['vue/dist/vue.esm.js', 'default'],
      "Vuex": ['vuex/dist/vuex.esm.js', 'default'],
      "mapState": ['vuex/dist/vuex.esm.js', 'mapState'],
      "mapGetters": ['vuex/dist/vuex.esm.js', 'mapGetters'],
      "mapMutations": ['vuex/dist/vuex.esm.js', 'mapMutations'],
      "mapActions": ['vuex/dist/vuex.esm.js', 'mapActions'],
    }),
    new CopyWebpackPlugin([
      {
        from:'src/assets',
        to:'assets'
      }
    ]),
  ],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@js': path.resolve(__dirname, './src/js'),
      '@sass': path.resolve(__dirname, './src/sass'),
      '@store': path.resolve(__dirname, './src/js/store/modules'),
    },
  },
  devServer: {
    contentBase: path.join(__dirname, './dist'),
    port: 8099,
    host: '0.0.0.0',
    hot: true,
    compress: false,
    historyApiFallback: true,
  },
};