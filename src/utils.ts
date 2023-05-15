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
export const createOffscreenCanvas = (width: number, height: number) =>  {
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
export const mulToRound = (a: number, b: number) => {
  const result = a * b
  return [result, Math.floor(result), Math.ceil(result)]
}