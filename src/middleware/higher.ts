/*
 * @Author: kim
 * @Date: 2023-05-15 11:53:32
 * @Description: 向上取值
 */
import type { MiddlewareHandler } from '../index.ts'

export const higher: MiddlewareHandler = (colors, channelIdxList) => {
  const [rIdx, gIdx, bIdx] = channelIdxList
  const [r, g, b] = colors[`${Math.ceil(rIdx)}_${Math.ceil(gIdx)}_${Math.ceil(bIdx)}`]


  return [r * 255, g * 255, b * 255]
}