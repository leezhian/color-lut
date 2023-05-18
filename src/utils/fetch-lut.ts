/*
 * @Author: kim
 * @Date: 2023-05-13 16:38:21
 * @Description: 获取颜色查找表
 */
export const getLUTs = async (url: string) => {
  if (!url) {
    throw new Error('The getLUTs function parameter URL is empty.')
  }

  return await (await fetch(url)).text()
}