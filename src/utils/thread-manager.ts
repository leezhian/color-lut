/*
 * @Author: kim
 * @Date: 2023-05-16 23:20:43
 * @Description: 线程管理器
 */
import { THREAD_IDLE_EVENT, AUTO_CLOSE_THREAD_EVENT } from './event-types.ts'
import WebWorker from 'web-worker:./worker.ts'

export type ThreadPool = Set<Worker>
export interface ThreadStateEvent {
  worker: Worker
}
export type ThreadStateListener = (e: ThreadStateEvent) => void

class ThreadManager {
  private threadPool: ThreadPool
  private idleThreadsInRunning: Worker[]
  private eventCallback: Set<ThreadStateListener>
  readonly maxThreadCount: number

  constructor(maxThreadCount: number) {
    this.maxThreadCount = maxThreadCount // 最大线程数
    this.threadPool = new Set() // 线程池
    this.idleThreadsInRunning = []
    this.eventCallback = new Set()
  }

  private handleThreadMessage(e: MessageEvent<any>) {
    const { type } = e.data

    switch (type) {
      case THREAD_IDLE_EVENT:
        this.idleThreadsInRunning.push(e.target as Worker)
        // 广播通知
        this.dispatchThread()
        break

      case AUTO_CLOSE_THREAD_EVENT:
        this.removeThreadRecord(e.target as Worker)
        break
    }
  }

  private handleThreadError(e: ErrorEvent) {
    this.removeThreadRecord(e.target as Worker)
  }

  /**
   * @description: 移除线程记录
   * @param {Worker} worker 线程实例对象
   * @return {void}
   */  
  private removeThreadRecord(worker: Worker) {
    const targetIdx = this.idleThreadsInRunning.findIndex(t => t === worker)
    if (targetIdx > 0) {
      this.idleThreadsInRunning.splice(targetIdx, 1)
    }

    this.threadPool.delete(worker)
  }

  /**
   * @description: 初始化线程
   * @return {Worker}
   */
  private initThread(): Worker {
    const worker = new WebWorker({ type: 'module' })
    worker.addEventListener('message', this.handleThreadMessage.bind(this))
    worker.addEventListener('error', this.handleThreadError.bind(this))

    return worker
  }

  /**
   * @description: 分配线程给订阅者
   * @return {void}
   */
  private dispatchThread() {
    // 线程池已经分配满了，并且运行中的线程也没有空闲
    if (this.threadPool.size === this.maxThreadCount && !this.idleThreadsInRunning.length) {
      return
    }

    let worker: Worker
    // 优先分配空闲线程
    if (this.idleThreadsInRunning.length) {
      worker = this.idleThreadsInRunning.shift() as Worker
    } else {
      worker = this.initThread()
      this.threadPool.add(worker)
    }

    // 广播事件
    this.eventCallback.forEach(fn => {
      fn && fn({ worker })
    })
  }

  /**
   * @description: 请求分配线程
   * @return {void}
   */
  requestDispatchThread() {
    this.dispatchThread()
  }

  /**
   * @description: 返回当前开启的线程池
   * @return {ThreadPool}
   */
  getThreads(): ThreadPool {
    return this.threadPool
  }

  /**
   * @description: 监听线程状态改变
   * @param {ThreadStateListener} callback 回调
   * @return {void}
   */
  addThreadStateListener(callback: ThreadStateListener) {
    this.eventCallback.add(callback)
  }

  removeThreadStateListener(callback: ThreadStateListener) {
    if(this.eventCallback.has(callback)) {
      this.eventCallback.delete(callback)
    }
  }

  /**
   * @description: 销毁所有线程
   * @return {void}
   */
  destroy() {
    this.eventCallback.clear()
    this.threadPool.forEach(worker => {
      worker.terminate()
    })
  }
}

export default ThreadManager