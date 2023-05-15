// import del from 'rollup-plugin-delete'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import babel from '@rollup/plugin-babel'

function createUMDConfig(input, output) {
  let name = 'colorLut'
  const fileName = output.slice('dist/'.length)
  const capitalize = (s) => s.slice(0, 1).toUpperCase() + s.slice(1)
  if (fileName !== 'index') {
    name += fileName.replace(/(\w+)\W*/g, (_, p) => capitalize(p))
  }

  return {
    input,
    output: {
      file: `${output}.js`,
      format: 'es',
      name
    },
    plugins: [
      typescript(),
      babel(),
      terser()
    ]
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
    createUMDConfig(`src/${c}.ts`, `dist/${c}`)
  ]
}
