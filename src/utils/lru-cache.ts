/*
 * @Author: kim
 * @Date: 2023-05-15 10:15:54
 * @Description: 缓存
 */
class LRUCache {
  readonly maxCacheSize: number
  private data: Map<string, any>
  
  constructor(maxCacheSize = 10) {
    if(Number.isNaN(+maxCacheSize) || +maxCacheSize <= 0) {
      throw new Error('Illegal cache size!')
    }

    this.maxCacheSize = maxCacheSize
    this.data = new Map()
  }

  /**
   * @description: 更新缓存
   * @param {string} key cache key
   * @param {any} info 信息
   * @return {void}
   */  
  put(key: string, info: any): void {
    if(this.data.has(key)) {
      this.data.delete(key)
      this.data.set(key, info)
      return
    }

    // 超出缓存数目
    if(this.data.size >= this.maxCacheSize){
      const firstKey = this.data.keys().next().value
      this.data.delete(firstKey)
    }

    this.data.set(key, info)
  }

  /**
   * @description: 获取缓存
   * @param {string} key cache key
   * @return {any}
   */  
  get(key: string): any {
    if(!this.data.has(key)) {
      // 没有缓存
      return
    }

    // 使用缓存则需要 更新顺序
    const info = this.data.get(key)
    this.put(key, info)
    return info
  }
}

export default LRUCache