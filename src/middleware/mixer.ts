/*
 * @Author: kim
 * @Date: 2023-05-16 12:12:04
 * @Description: 混合生成新值
 */
import type { MiddlewareHandler, RGB } from '../index.ts'
import { toRound } from '../utils/utils.ts'

type ChannelVals = [number, number, number, number, number, number, number, number]
type OffsetValList = [number, number, number]

const isNonUndefined = (value: any): boolean => {
  return value !== undefined
}

/**
 * @description: 某个区间生成新值
 * @param {number} left 左边界
 * @param {number} right 右边距
 * @param {number} ratio 比值
 * @return {number}
 */
const generateChannelVal = (left: number, right: number, ratio: number): number => {
  return left * (1 - ratio) + right * ratio
}

/**
 * @description: 混合计算新的通道值（归一化）
 * @param {ChannelVals} channelVals 通道值列表
 * @param {OffsetValList} idxOffsetValList 索引偏移值
 * @return {number} 新的通道值（归一化）
 */
const mixin = (channelVals: ChannelVals, idxOffsetValList: OffsetValList): number => {
  if (!channelVals.every(isNonUndefined) || channelVals.length !== 8) {
    throw new Error('Missing channel values. Please check if a sufficient number of channel values have been passed in.(required 8)')
  }

  let newchannelVals: number[] = channelVals
  idxOffsetValList.forEach(item => {
    const temp: number[] = []
    for (let index = 0; index < newchannelVals.length; index += 2) {
      temp.push(generateChannelVal(newchannelVals[index], newchannelVals[index + 1], item))
    }
    newchannelVals = temp
  })

  return newchannelVals[0]
}

export const mixer: MiddlewareHandler = (colors, channelIdxList) => {
  const [rIdx, gIdx, bIdx] = channelIdxList
  const [rFloorIdx, rCeilIdx] = toRound(rIdx)
  const [gFloorIdx, gCeilIdx] = toRound(gIdx)
  const [bFloorIdx, bCeilIdx] = toRound(bIdx)

  // 各通道索引偏移值
  const idxOffsetValList: OffsetValList = [rIdx - rFloorIdx, gIdx - gFloorIdx, bIdx - bFloorIdx]
  //   c1------c2
  //  /.       /|
  // c5------c6 |
  // | c3....|.c4
  // |.      | / 
  // c7------c8
  // 输出顺序为 c1,c2,c3,c4,c5,c6,c7,c8
  const sortedColors = [
    colors[`${rFloorIdx}_${gFloorIdx}_${bFloorIdx}`],
    colors[`${rCeilIdx}_${gFloorIdx}_${bFloorIdx}`],
    colors[`${rFloorIdx}_${gCeilIdx}_${bFloorIdx}`],
    colors[`${rCeilIdx}_${gCeilIdx}_${bFloorIdx}`],
    colors[`${rFloorIdx}_${gFloorIdx}_${bCeilIdx}`],
    colors[`${rCeilIdx}_${gFloorIdx}_${bCeilIdx}`],
    colors[`${rFloorIdx}_${gCeilIdx}_${bCeilIdx}`],
    colors[`${rCeilIdx}_${gCeilIdx}_${bCeilIdx}`]
  ]
  const rgb = channelIdxList.map((item, index) => {
    const normalOfChannelVal = mixin(sortedColors.map(color => color?.[index]) as ChannelVals, idxOffsetValList)

    return normalOfChannelVal * 255
  }) as RGB

  return rgb
}