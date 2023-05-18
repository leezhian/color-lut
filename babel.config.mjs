export default {
  babelrc: false,
  ignore: ['node_modules'],
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false
      },
    ],
  ],
  plugins: ['@babel/plugin-transform-typescript'],
}
