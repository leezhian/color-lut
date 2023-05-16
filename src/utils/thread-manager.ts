/*
 * @Author: kim
 * @Date: 2023-05-16 23:20:43
 * @Description: 线程管理器
 */
class ThreadManager {
  private threads: Map<string, Worker>
  readonly maxThreadCount: number

  constructor(maxThreadCount: number) {
    this.threads = new Map()
    this.maxThreadCount = maxThreadCount
  }

  getThreads() {
    return this.threads
  }
}