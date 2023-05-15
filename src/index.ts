import { getLUTs } from './fetch-lut'
import LRUCache from './lru-cache'
import { getImageData, mulToRound } from './utils'
import { lower } from './middleware'

export type RGB = [number, number, number]
export type ChannelIdxList = RGB
export type ColorTable = RGB[][][]
export interface ColorLUT {
  table: ColorTable
  size: number
}
export type MiddlewareHandler = (colors: Record<string, RGB>, channelIdxList: ChannelIdxList) => RGB

class LUT {
  private cache: LRUCache
  private middleware: MiddlewareHandler
  constructor() {
    this.cache = new LRUCache()
    this.middleware = lower
  }

  /**
   * @description: 全局中间件
   * @return {void}
   */
  use(middleware: MiddlewareHandler): void {
    if (!middleware) {
      throw new Error('Middleware is not function.')
    }
    this.middleware = middleware
  }

  /**
   * @description: 查找颜色
   * @param {RGB} rgb 像素 rgb
   * @param {ColorTable} table 查找表
   * @param {number} size 查找表长度
   * @return {{ colors: Record<string, RGB>, channelIdxList: ChannelIdxList }}
   */
  private lut3d(rgb: RGB, table: ColorTable, size: number): { colors: Record<string, RGB>, channelIdxList: ChannelIdxList } {
    const [r, g, b] = rgb || []

    // 转换为表中取值
    const tr = r / 255
    const tg = g / 255
    const tb = b / 255

    const n = size - 1
    const [rIdx, rFloorIdx, rCeilIdx] = mulToRound(tr, n)
    const [gIdx, gFloorIdx, gCeilIdx] = mulToRound(tg, n)
    const [bIdx, bFloorIdx, bCeilIdx] = mulToRound(tb, n)
    // 找出对应 b 的索引块，共两块，有可能两块是一样的
    const bCeilBlock = table[bCeilIdx]
    const bFloorBlock = table[bFloorIdx]
    // 找出每块中 g 的索引行
    const gCeilRowInCeilBlock = bCeilBlock[gCeilIdx]
    const gCeilRowInFloorBlock = bFloorBlock[gCeilIdx]
    const gFloorRowInCeilBlock = bCeilBlock[gFloorIdx]
    const gFloorRowInFloorBlock = bFloorBlock[gFloorIdx]

    const colors = {
      [`${rFloorIdx}_${gFloorIdx}_${bFloorIdx}`]: gFloorRowInFloorBlock[rFloorIdx],
      [`${rCeilIdx}_${gFloorIdx}_${bFloorIdx}`]: gFloorRowInFloorBlock[rCeilIdx],
      [`${rFloorIdx}_${gCeilIdx}_${bFloorIdx}`]: gCeilRowInFloorBlock[rFloorIdx],
      [`${rCeilIdx}_${gCeilIdx}_${bFloorIdx}`]: gCeilRowInFloorBlock[rCeilIdx],
      [`${rFloorIdx}_${gFloorIdx}_${bCeilIdx}`]: gFloorRowInCeilBlock[rFloorIdx],
      [`${rCeilIdx}_${gFloorIdx}_${bCeilIdx}`]: gFloorRowInCeilBlock[rCeilIdx],
      [`${rFloorIdx}_${gCeilIdx}_${bCeilIdx}`]: gCeilRowInCeilBlock[rFloorIdx],
      [`${rCeilIdx}_${gCeilIdx}_${bCeilIdx}`]: gCeilRowInCeilBlock[rCeilIdx]
    }

    return {
      colors,
      channelIdxList: [rIdx, gIdx, bIdx]
    }
  }

  /**
   * @description: 转换图片数据
   * @param {ImageData} imageData 图片数据
   * @param {ColorLUT} colorLUT
   * @param {MiddlewareHandler} middleware
   * @return {ImageData}
   */  
  private transformImageData(imageData: ImageData, colorLUT: ColorLUT, middleware: MiddlewareHandler): ImageData {
    const pixelData = imageData.data
    const pixelCount = pixelData ? pixelData.length : 0 // 像素个数
    const pixelDataAfterLUT = new ImageData(imageData.width, imageData.height)

    for (let i = 0; i < pixelCount; i += 4) {
      // 素材单个像素的 rgba 值
      const vr = pixelData[i]
      const vg = pixelData[i + 1]
      const vb = pixelData[i + 2]
      const va = pixelData[i + 3]

      const { colors, channelIdxList } = this.lut3d([vr, vg, vb], colorLUT.table, colorLUT.size)
      const [r, g, b] = middleware(colors, channelIdxList)

      pixelDataAfterLUT.data[i] = r
      pixelDataAfterLUT.data[i + 1] = g
      pixelDataAfterLUT.data[i + 2] = b
      pixelDataAfterLUT.data[i + 3] = va
    }

    return pixelDataAfterLUT
  }

  /**
   * @description: 
   * @param {string | ImageData} imgUrl 图片url
   * @param {string | ColorLUT} lutUrl lut文件url
   * @param {MiddlewareHandler} middleware 中间件
   * @return {ImageData}
   */
  transform(imgUrl: string, lutUrl: string, middleware?: MiddlewareHandler): Promise<ImageData>
  transform(imgData: ImageData, lutUrl: string, middleware?: MiddlewareHandler): Promise<ImageData>
  transform(imgUrl: string, lut: ColorLUT, middleware?: MiddlewareHandler): Promise<ImageData>
  transform(imgData: ImageData, lut: ColorLUT, middleware?: MiddlewareHandler): Promise<ImageData>
  async transform(imgDataOrUrl: string | ImageData, lut: string | ColorLUT, middleware?: MiddlewareHandler): Promise<ImageData> {
    if (!middleware && !this.middleware) {
      throw new Error('Please set global middleware or pass in middleware parameters.')
    }

    const imageData = typeof imgDataOrUrl === 'string' ? await getImageData(imgDataOrUrl) : imgDataOrUrl
    if (!imageData) {
      throw new Error('Image data is empty.')
    }

    let colorLUT: ColorLUT
    if (typeof lut === 'string') {
      const lutStr = this.cache.get(lut) ? this.cache.get(lut) : await getLUTs(lut)
      colorLUT = this.formatColorLUT(lutStr)
    } else {
      colorLUT = lut
    }

    return this.transformImageData(imageData, colorLUT, middleware??this.middleware)
  }

  /**
   * @description: 格式化查找表
   * @param {string} lutStr cube文件返回的字符串格式
   * @return {{table: RGB[][][], size: number}}
   */
  formatColorLUT(lutStr: string): ColorLUT {
    const rows = lutStr.split('\n')

    let lutSize = 0 // lut大小
    let start = -1 // 相对 lut文件，色彩数据开始的索引
    const tableFor3d: RGB[][][] = []

    rows.forEach((str, index) => {
      if (str.includes('LUT_3D_SIZE')) {
        lutSize = +str.replace('LUT_3D_SIZE', '')
        return
      }

      // 将空节点与文件头过滤掉
      if (!str || /[a-z]/i.test(str)) return

      if (start === -1) {
        start = index
      }

      // 计算色彩数据真实的索引
      const rgbIdx = index - start

      // 分割rgb的值
      const rgb = str.split(' ').map(s => Number(s)) as RGB

      // 构造出三维数组
      const bIdx = Math.floor(rgbIdx / Math.pow(lutSize, 2))
      if (!tableFor3d[bIdx]) {
        tableFor3d[bIdx] = []
      }
      const gIdx = Math.floor((rgbIdx - bIdx * Math.pow(lutSize, 2)) / lutSize)
      if (!tableFor3d[bIdx][gIdx]) {
        tableFor3d[bIdx][gIdx] = []
      }
      tableFor3d[bIdx][gIdx].push(rgb)
    })

    return {
      table: tableFor3d,
      size: lutSize
    }
  }
}

export default new LUT()