/*
 * @Author: kim
 * @Date: 2023-05-15 11:53:32
 * @Description: 向下取值
 */
import type { MiddlewareHandler } from '../index'

export const lower: MiddlewareHandler = (colors, channelIdxList) => {
  const [rIdx, gIdx, bIdx] = channelIdxList
  const [r, g, b] = colors[`${Math.floor(rIdx)}_${Math.floor(gIdx)}_${Math.floor(bIdx)}`]

  return [r * 255, g * 255, b * 255]
}