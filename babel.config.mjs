export default {
  babelrc: false,
  ignore: ['node_modules'],
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false,
        targets: {
          ie: 11,
        },
      },
    ],
  ],
  plugins: ['@babel/plugin-transform-typescript'],
}
