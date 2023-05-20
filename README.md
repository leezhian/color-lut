# <h1 align="center">Color LUT</h1>

<div align="center">

颜色查找表“图片”处理程序。

[![Version](https://img.shields.io/npm/v/color-lut?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/color-lut)
[![Downloads](https://img.shields.io/npm/dt/color-lut.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/color-lut)
[![Build Size](https://img.shields.io/bundlephobia/minzip/color-lut?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/result?p=color-lut)

</div>



> **V0.5.x 版** 为主线程版，会阻塞页面渲染，但浏览器支持度最高。
>
> **V1.0.x 版** 为 web worker版，因为使用 `type: module` 的原因，目前 Firefox 和 Safari 暂不支持。而且 worker 不能传递函数的原因，导致中间件参数也相继废除（正在努力解决中，看后续是否能解决掉）。
>
> 使用 web worker 的原因是处理图片像素数据映射时，是一个非常大的循环处理，比如一张图片是 `1280 * 720` 的尺寸，就高达 921600 个数据要处理，是非常消耗时间的，使用 **V0.5.0-alpha 版** 就会发现很明显的页面阻塞。
>
> 如果你有好的解决方案思路可以提 issue 或 email 来分享你的想法！！！

📝 [在线demo](https://codepen.io/leezhian/pen/jOeQKPW)



## ✨ 特性

- 目前仅支持图片处理。
- 使用 web worker 处理颜色映射。
- 支持 `cube` 文件、`CSP` 文件解析。



*后续会支持更多文件解析，及多线程处理*。



## 🖥 兼容环境

| [![Edge](https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png)](http://godban.github.io/browsers-support-badges/) Edge | [![Firefox](https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png)](http://godban.github.io/browsers-support-badges/) Firefox | [![Chrome](https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png)](http://godban.github.io/browsers-support-badges/) Chrome | [![Safari](https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png)](http://godban.github.io/browsers-support-badges/) Safari | [![Electron](https://raw.githubusercontent.com/alrra/browser-logos/master/src/electron/electron_48x48.png)](http://godban.github.io/browsers-support-badges/) Electron |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Edge                                                         | /                                                            | last 2 versions                                              | /                                                            | last 2 versions                                              |

暂不支持小程序



## 📦 安装

```bash
npm install color-lut --save
```

```bash
yarn add color-lut
```

```bash
pnpm add color-lut
```



## 🔨 示例

```typescript
// 伪代码
import LUT from 'color-lut'
import { higher } from 'color-lut/middleware'

const lut = new LUT()
lut.use(higher)
const imageData = lut.transform('https://image.png', 'https://lut.cube')
console.log(imageData)
// do something
```



## 🧰 API

<font color="ff0000">注意：在V1.0.0-alpha 版 Middleware 参数全部移除！内部默认使用 mixer 中间件。 
</font>

*暂时没有对 Middleware 的TS类型提示进行移除，只是传入后不生效。*



### `LUT.use(middleware: MiddlewareHandler): void` 

- `middleware`：中间件处理函数。



设置全局中间件，用于对每个像素点的转换处理 `transform`。

*中间件的作用：因为 LUT文件采样不同的问题，不是所有色值都能精确命中，因此需要中间件对最后结果的取值处理，一般越精细相对耗时约长*。

```typescript
import { higher } from 'color-lut/middleware'
const lut = new LUT()
lut.use(higher)
```

**依赖包中提供了三个中间件**：

- `higher`：对最后的结果进行向上取整。
- `lower`：对最后的结果进行向下取整。
- `mixer`：对最后的结果进行融合计算，生成新值。（默认使用）



### `LUT.transform(img: string | ImageData, lutData: string | ColorLUT, middleware?: MiddlewareHandler): ImageData`

- `img`：支持图片URL 及 图片像数数据对象 `ImageData`（[可通过 `Canvas getImageData` 获取](https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D/getImageData)）。
- `lutData`：支持LUT URL（支持 `cube` 格式、`CSP`格式文件） 及 `ColorLUT` 格式对象（详情可看[ `ColorLUT` 类型](#`ColorLUT` 类型) 解析）。

- `middleware`：局部中间件，只影响单次转换；功能与全局中间件一致，优先级比全局中间件高。



对图片数据进行颜色映射转换，返回转换后的图片像素数据 `ImageData`。



### `LUT.formatColorLUTFromCube(lutStr: string): ColorLUT`

- `lutStr`：`cube` 格式的LUT 文件内容字符串。



格式化查找表，用于内部映射使用。如果 `transform` 传入是 LUT URL 时，内部会自动调用。



### `LUT.formatColorLUTFromCSP(str: string): ColorLUT`

- `str`：`CSP` 格式的LUT 文件内容字符串。



### `ColorLUT` 类型

*不一定使用 `formatColorLUT` 进行格式化，你也可以自定义方法进行 LUT 文件解析，最后格式化为这种类型对象即可*。

可以理解为是一个**三维数组** `number[][][]`，注意最后的值还是一个数组，因此很容易看成四维数组。

```js
// 假如是一个 2*2*2 的 cube 文件，即 size 为 2
// 0,0.1,0.2
// 0.2,0.1,0.3
// 0.3,0.4,0.5
// ...共8条
// 最终格式化为
[
  [
    [
      [0, 0.1, 0.2], [0.2, 0.1, 0.3]
    ],
    [
      [0.3, 0.4, 0.5], ...
    ]
  ],
  [
    [
      [],[]
    ],
    [
      [],[]
    ]
  ]
]
```



### 自定义中间件

- `colors`： 像素近似点的颜色 RGB，`key` 为 `${r索引值}_${g索引值}_${b索引值}`，`value` 为对应点的 RGB；最少1个，最多时存在8个，如 `{ "0_1_0": [0.3, 0.4, 0.5] }`。
- `channelIdxList`：每个通道的映射索引， 如 `[1, 2, 3]`。

> `colors` 为什么会存在多个呢？因为映射的索引值可能不是整数，在 LUT 文件中并没有映射到精确的值，因此会给出近似点的值。
>
> 可以通过 `channelIdxList` 查看每个通道的精确索引（不一定为整数），从 `colors` 获取近似点进行计算，也就是中间件的作用。



```typescript
import type { MiddlewareHandler } from 'color-lut'

const lut = new LUT()
// 自定义中间件
const customMiddleware: MiddlewareHandler = (colors, channelIdxList) {
  // do something, but in the end, you need to return the calculated rgb value
  return [r, g, b]
}
lut.use(customMiddleware)
```

