import { getLUTs } from './utils/fetch-lut.ts'
import LRUCache from './utils/lru-cache.ts'
import { getImageData } from './utils/utils.ts'
import { TRANSFORM_RGB_SUCCESS, TRANSFORM_RGB_ERROR, TRANSFORM_RGB } from './utils/event-types.ts'
import { mixer } from './middleware.ts'
import WebWorker from 'web-worker:./worker.ts'

export type RGB = [number, number, number]
export type ChannelIdxList = RGB
export type ColorTable = RGB[][][]
export interface ColorLUT {
  table: ColorTable
  size: number
}
export type ApprColors = Record<string, RGB> // 近似的颜色值
export type MiddlewareHandler = (colors: ApprColors, channelIdxList: ChannelIdxList) => RGB

class LUT {
  private cache: LRUCache
  private middleware: MiddlewareHandler
  constructor() {
    this.cache = new LRUCache()
    this.middleware = mixer
  }

  /**
   * @description: 全局中间件
   * @return {void}
   */
  // use(middleware: MiddlewareHandler): void {
  //   if (!middleware) {
  //     throw new Error('Middleware is not function.')
  //   }
  //   this.middleware = middleware
  // }

  /**
   * @description: 查找颜色
   * @param {RGB} rgb 像素 rgb
   * @param {ColorTable} table 查找表
   * @param {number} size 查找表长度
   * @return {{ colors: ApprColors, channelIdxList: ChannelIdxList }}
   */
  // private lut3d(rgb: RGB, table: ColorTable, size: number): { colors: ApprColors, channelIdxList: ChannelIdxList } {
  //   const [r, g, b] = rgb || []

  //   // 转换为表中取值
  //   const tr = r / 255
  //   const tg = g / 255
  //   const tb = b / 255

  //   const n = size - 1
  //   const [rIdx, rFloorIdx, rCeilIdx] = mulToRound(tr, n)
  //   const [gIdx, gFloorIdx, gCeilIdx] = mulToRound(tg, n)
  //   const [bIdx, bFloorIdx, bCeilIdx] = mulToRound(tb, n)
  //   // 找出对应 b 的索引块，共两块，有可能两块是一样的
  //   const bCeilBlock = table[bCeilIdx]
  //   const bFloorBlock = table[bFloorIdx]
  //   // 找出每块中 g 的索引行
  //   const gCeilRowInCeilBlock = bCeilBlock[gCeilIdx]
  //   const gCeilRowInFloorBlock = bFloorBlock[gCeilIdx]
  //   const gFloorRowInCeilBlock = bCeilBlock[gFloorIdx]
  //   const gFloorRowInFloorBlock = bFloorBlock[gFloorIdx]

  //   const colors = {
  //     [`${rFloorIdx}_${gFloorIdx}_${bFloorIdx}`]: gFloorRowInFloorBlock[rFloorIdx],
  //     [`${rCeilIdx}_${gFloorIdx}_${bFloorIdx}`]: gFloorRowInFloorBlock[rCeilIdx],
  //     [`${rFloorIdx}_${gCeilIdx}_${bFloorIdx}`]: gCeilRowInFloorBlock[rFloorIdx],
  //     [`${rCeilIdx}_${gCeilIdx}_${bFloorIdx}`]: gCeilRowInFloorBlock[rCeilIdx],
  //     [`${rFloorIdx}_${gFloorIdx}_${bCeilIdx}`]: gFloorRowInCeilBlock[rFloorIdx],
  //     [`${rCeilIdx}_${gFloorIdx}_${bCeilIdx}`]: gFloorRowInCeilBlock[rCeilIdx],
  //     [`${rFloorIdx}_${gCeilIdx}_${bCeilIdx}`]: gCeilRowInCeilBlock[rFloorIdx],
  //     [`${rCeilIdx}_${gCeilIdx}_${bCeilIdx}`]: gCeilRowInCeilBlock[rCeilIdx]
  //   }

  //   return {
  //     colors,
  //     channelIdxList: [rIdx, gIdx, bIdx]
  //   }
  // }

  /**
   * @description: 转换图片数据
   * @param {ImageData} imageData 图片数据
   * @param {ColorLUT} colorLUT
   * @param {MiddlewareHandler} middleware
   * @return {Promise<ImageData>}
   */
  private transformImageData(imageData: ImageData, colorLUT: ColorLUT, middleware: MiddlewareHandler): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      try {
        const pixelData = imageData.data

        const worker = new WebWorker({ type: 'module' })
        worker.onmessage = ((event: MessageEvent<any>) => {
          const { type, message, data } = event.data
          switch (type) {
            case TRANSFORM_RGB_SUCCESS: {
              const pixelDataAfterLUT = new ImageData(data, imageData.width, imageData.height)
              resolve(pixelDataAfterLUT)
              break
            }
            case TRANSFORM_RGB_ERROR: {
              worker.terminate()
              reject(message)
            }
          }
        })

        worker.onmessageerror = (() => {
          worker.terminate()
          reject('Thread data error')
        })

        worker.onerror = (() => {
          worker.terminate()
          reject('An unknown error occurred in the thread.')
        })

        worker.postMessage({
          type: TRANSFORM_RGB,
          data: {
            pixelData,
            colorLUT
          }
        })
      } catch (error) {
        reject(error)
      }
    })
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
      if(this.cache.get(lut)) {
        colorLUT = this.cache.get(lut)
      } else {
        const lutStr = await getLUTs(lut)
        colorLUT = /\.csp$/i.test(lut) ? this.formatColorLUTFromCSP(lutStr) : this.formatColorLUTFromCube(lutStr)
        this.cache.put(lut, colorLUT)
      }
    } else {
      colorLUT = lut
    }
    
    return this.transformImageData(imageData, colorLUT, middleware ?? this.middleware)
  }

  /**
   * @description: 格式化查找表
   * @param {string} lutStr cube文件返回的字符串格式
   * @return {{table: RGB[][][], size: number}}
   */
  formatColorLUTFromCube(lutStr: string): ColorLUT {
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
      if (!str || !str.trim() || /(?!e)[a-z]/i.test(str)) return

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

  /**
   * @description: 格式化 CSP 格式文件
   * @param {string} str CSP文件返回的字符串格式
   * @return {ColorLUT}
   */  
  formatColorLUTFromCSP(str: string): ColorLUT {
    const rows = str.split('\n')
    let lutSize = 0 // lut大小
    let start = -1 // 相对 lut文件，色彩数据开始的索引
    const tableFor3d: RGB[][][] = []

    rows.forEach((str, index) => {
      // 将空节点与文件头过滤掉
      if (!str || !str.trim() || /(?!e)[a-z]/i.test(str)) return
      // 分割rgb的值
      const rgb = str.split(' ').map(s => Number(s)) as RGB
      if(rgb.length !== 3) return

      // 判断是否是标识 lut 文件大小的字段
      if(rgb[0] > 1 && rgb.every(v => v === rgb[0])) {
        lutSize = rgb[0]
        return
      }

      if (start === -1) {
        start = index
      }

      // 计算色彩数据真实的索引
      const rgbIdx = index - start

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

export default LUT