const paths = require('./paths');

process.env.NODE_ENV = 'production';

module.exports = function (webpackEnv) {
    const isEnvDevelopment = webpackEnv === 'development';
    const isEnvProduction = webpackEnv === 'production';

    return {
        mode: "development",
        bail: isEnvProduction,
        devtool: isEnvProduction ? 'source-map' : 'cheap-module-source-map',
        entry: {
            'PluginBridge': './src/PluginBridge.ts',
            'ParentMessage': './src/ParentMessage.ts'
        },
        output: {
            filename: '[name].js',
            path: paths.buildPath,
        },
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts'],
            fallback: {
                "crypto": false
            }
        },
        module: {
            rules: [
                {
                    test: /\.(js|mjs|jsx|ts|tsx)$/,
                    include: paths.pluginPackagePath,
                    loader: require.resolve('babel-loader'),
                    options: {
                        presets: [
                            [
                                require.resolve('babel-preset-react-app')
                            ],
                        ],
                        sourceMaps: true,
                        inputSourceMap: true
                    },
                },
            ]
        },
    }
};
