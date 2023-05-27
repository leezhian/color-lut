import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import babel from '@rollup/plugin-babel'
import webWorkerLoader from 'rollup-plugin-web-worker-loader'

const extensions = ['.js', '.ts']

function getBabelConfig() {
  return {
    extensions, 
    babelHelpers: 'bundled'
  }
}

function createDeclarationConfig(input, output) {
  return {
    input,
    output: {
      dir: output,
    },
    plugins: [
      typescript({
        declaration: true,
        emitDeclarationOnly: true,
        declarationDir: output,
      }),
    ],
  }
}

function createCommonJSConfig(input, output) {
  return {
    input,
    output: [
      {
        file: `${output}.js`,
        format: 'cjs',
        esModule: false,
      },
    ],
    plugins: [babel(getBabelConfig()), webWorkerLoader(), terser()],
  }
}

function createESMConfig(input, output) {
  return {
    input,
    output: { file: `${output}.js`, format: 'esm' },
    plugins: [babel(getBabelConfig()), webWorkerLoader(), terser()],
  }
}

function createUMDConfig(input, output, env) {
  let name = 'LUT'
  const fileName = output.slice('dist/umd/'.length)
  const capitalize = (s) => s.slice(0, 1).toUpperCase() + s.slice(1)
  if (fileName !== 'index') {
    name += fileName.replace(/(\w+)\W*/g, (_, p) => capitalize(p))
  }

  return {
    input,
    output: {
      file: `${output}.${env}.js`,
      format: 'umd',
      name,
    },
    plugins: [
      babel(getBabelConfig()),
      webWorkerLoader(),
      ...(env === 'production' ? [terser()] : []),
    ],
  }
}

export default (args) => {
  let c = Object.keys(args).find((key) => key.startsWith('config-'))
  if (c) {
    // 表示使用了 --config-*
    c = c.slice('config-'.length).replace(/_/g, '/')
  } else {
    // 表示默认打包
    c = 'index'
  }

  return [
    ...(c === 'index' ? [createDeclarationConfig(`src/${c}.ts`, 'dist')] : []),
    createCommonJSConfig(`src/${c}.ts`, `dist/${c}`),
    createESMConfig(`src/${c}.ts`, `dist/esm/${c}`),
    createUMDConfig(`src/${c}.ts`, `dist/umd/${c}`, 'development'),
    createUMDConfig(`src/${c}.ts`, `dist/umd/${c}`, 'production'),
  ]
}
