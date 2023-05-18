/**
 * @description: 生成图片元素
 * @param {string} imgUrl 图片地址
 * @return {Promise<HTMLImageElement>}
 */
export const createImage = (imgUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const imgElement = document.createElement('img')
    imgElement.crossOrigin = 'anonymous'
    imgElement.onload = () => {
      resolve(imgElement)
    }
    imgElement.onerror = (e) => {
      reject(e)
    }
    imgElement.src = imgUrl
  })
}

/**
 * @description: 创建离屏 canvas
 * @param {number} width 宽度
 * @param {number} height 高度
 * @return {OffscreenCanvas}
 */
export const createOffscreenCanvas = (width: number, height: number) => {
  const ratio = window.devicePixelRatio || 1
  const canvas = new OffscreenCanvas(width * ratio, height * ratio)

  return canvas
}

/**
 * @description: 获取图片数据
 * @param {string} imgUrl
 * @return {ImageData}
 */
export const getImageData = async (imgUrl: string): Promise<ImageData> => {
  const img = await createImage(imgUrl)
  const canvas = createOffscreenCanvas(img.width, img.height)
  const context = canvas.getContext('2d')
  context?.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)
  return context?.getImageData(0, 0, canvas.width, canvas.height) as ImageData
}

/**
 * @description: 乘法及取整
 * @param {number} a
 * @param {number} b
 * @return {number[]}
 */
export const mulToRound = (a: number, b: number): number[] => {
  const result = a * b
  return [result, ...toRound(result)]
}

/**
 * @description: 取整
 * @param {number} value
 * @return {number[]}
 */
export const toRound = (value: number): number[] => {
  return [Math.floor(value), Math.ceil(value)]
}

export interface FnStrStruct {
  name: string,
  args: string,
  body: string
}

/**
 * @description: 函数转字符串
 * @param {Function} fn
 * @return {{ name: string, args: string, body: string }}
 */
// export const fnToStrStruct = (fn: Function): FnStrStruct => {
//   const name = fn.name
//   const fnStr = fn.toString()

//   return {
//     name,
//     args: fnStr.substring(fnStr.indexOf("(") + 1, fnStr.indexOf(")")),
//     body: fnStr.substring(fnStr.indexOf("{") + 1, fnStr.lastIndexOf("}"))
//   }
// }

/**
 * @description: 字符串转函数
 * @param {Function} fn
 * @return {{ name: string, args: string, body: string }}
 */
// export const strStructToFn = (struct: FnStrStruct): Function => {
//   const fn = new Function(struct.args, struct.body)
//   return fn
// }