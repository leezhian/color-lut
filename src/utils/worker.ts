/*
* @Author: kim
* @Date: 2023-05-16 19:01:09
* @Description: 线程管理
*/
/* 消息机制：
主线程 → 子线程 { type: 消息类型, data: 通信数据 }
子线程 → 主线程 { type: 消息类型, data?: 通信数据, message?: 消息字符串 }
*/
import { mulToRound } from './utils.ts'
import { THREAD_IDLE_EVENT, AUTO_CLOSE_THREAD_EVENT, TRANSFORM_RGB, TRANSFORM_RGB_SUCCESS, TRANSFORM_RGB_ERROR } from './event-types.ts'
import type { ColorLUT, RGB, ColorTable, ChannelIdxList, MiddlewareHandler } from '../index.ts'

let closeTimer: number
const AUTO_CLOSE_TIME = 3000 // 任务处理完成等待3秒自动关闭线程

addEventListener(
  'message',
  async function (e) {
    const { type } = e.data

    switch (type) {
      case TRANSFORM_RGB: {
        closeTimer && clearTimeout(closeTimer)
        self.postMessage({
          type: THREAD_IDLE_EVENT
        })
        const { pixelData, colorLUT, middleware, startIndex } = e.data.data
        // TODO middleware 需要转换
        await handleTransformRGB(pixelData, colorLUT, middleware, startIndex)
        break
      }
      default: {
        self.postMessage({
          type: 'unknownEvent',
          state: 'error'
        })
      }
    }
  },
  false
)

/**
 * @description: 查找颜色
 * @param {RGB} rgb 像素 rgb
 * @param {ColorTable} table 查找表
 * @param {number} size 查找表长度
 * @return {{ colors: Record<string, RGB>, channelIdxList: ChannelIdxList }}
 */
function lut3d(rgb: RGB, table: ColorTable, size: number): { colors: Record<string, RGB>, channelIdxList: ChannelIdxList } {
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

  // 近似 rgb，最多有8个点，最少1个
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

async function handleTransformRGB(pixelData: number[], colorLUT: ColorLUT, middleware: MiddlewareHandler, startIndex = 0) {
  try {
    const rgbaData: number[] = []
    for (let i = 0; i < pixelData.length; i += 4) {
      // 素材单个像素的 rgba 值
      const vr = pixelData[i]
      const vg = pixelData[i + 1]
      const vb = pixelData[i + 2]
      const va = pixelData[i + 3]

      const { colors, channelIdxList } = lut3d([vr, vg, vb], colorLUT.table, colorLUT.size)
      const [r, g, b] = await middleware(colors, channelIdxList)

      rgbaData.push(r, g, b, va)
    }

    // 表示数据缺少了
    if (rgbaData.length !== pixelData.length) {
      self.postMessage({
        type: TRANSFORM_RGB_ERROR,
        message: 'The worker data is lost.'
      })
      return
    }

    self.postMessage({
      type: TRANSFORM_RGB_SUCCESS,
      data: {
        processedData: rgbaData,
        startIndex
      }
    })
  } catch (e: any) {
    self.postMessage({
      type: TRANSFORM_RGB_ERROR,
      message: e?.message
    })
  } finally {
    // 关闭 worker
    closeTimer = setTimeout(() => {
      self.postMessage({
        type: AUTO_CLOSE_THREAD_EVENT
      })
      self.close()
    }, AUTO_CLOSE_TIME)
  }
}