import { setTimeout, setImmediate, setInterval } from 'timers'
import { EventEmitter } from 'events'

export type Timer = NodeJS.Immediate | NodeJS.Timeout
export type Callback = (...args: any[]) => void

export interface Config {
    times: number
    countdown: number
}

/**
 * events.EventEmitter
 * 1. start
 * 2. pause
 * 3. resume
 * 4. error
 * 5. end
 */
export class Task extends EventEmitter {
    //#region properties
    private static id = 0
    readonly id: number
    // create a count variable for executions
    private executions: number
    private times: number
    private countdown: number
    private remaining: number
    private callback: Callback
    private args!: any[]
    private timer!: Timer
    private startedAt!: Date
    private endedAt!: Date
    private paused = false
    private finished = false
    private loop = false
    private inmediate = false
    private errors: Error[]
    //#endregion

    constructor(callback: Callback, config: Config, ...args: any[]) {
        super()
        Task.id++
        this.id = Task.id
        this.callback = callback
        this.executions = this.times = config.times
        this.countdown = this.remaining = config.countdown
        this.args = args
        this.errors = new Array<Error>()
    }

    //#region public interface
    public isPaused(): boolean {
        return this.paused
    }

    public isFinished(): boolean {
        return this.finished
    }

    public isLoop(): boolean {
        return this.loop
    }

    public isInmediate(): boolean {
        return this.inmediate
    }

    public hasErrors(): boolean {
        return this.errors.length > 0
    }

    public errorsSize(): number {
        return this.errors.length
    }

    public run(): void {
        if (this.config()) {
            this.startedAt = new Date()
            this.timer = this.getTimer()
            this.emit('start')
        }
    }

    public pause(): void {
        // before pause check wether is runnable or not
        let running = Math.round((new Date().getTime() - this.startedAt.getTime()) / 1000) * 1000
        if (!this.isFinished() || !this.isPaused()) {
            this.remaining -= running

            this.clear()
            this.paused = true
            this.emit('pause')
        }
    }

    public resume(): void {
        // before resume check wether is runnable or not
        if (!this.isFinished() && this.isPaused()) {
            this.timer = this.getTimer()
            this.paused = false
            this.emit('resume')
        }
    }

    public terminate() {
        this.times = 0
        this.end()
    }

    public duration(): number {
        return (this.endedAt.getTime() - this.startedAt.getTime())
    }

    public getErrors(): Error[] {
        return this.errors
    }

    public toString(): string {
        return JSON.stringify(this)
    }
    //#endregion

    //#region private methods
    private getTimer(): Timer {
        if (this.isInmediate()) {
            return setImmediate(            
                (args: any[]) => this.resolve(args),
                this.args
            )
        } else if (this.isLoop()) {
            return setInterval(
                (args: any[]) => this.resolve(args),
                this.remaining,
                this.args
            )
        }
        return setTimeout(            
            (args: any[]) => this.resolve(args),
            this.remaining,
            this.args
        )
    }

    private clear(): void {
        if (this.isLoop()) clearInterval(<NodeJS.Timeout>this.timer)
        else if (this.isInmediate()) clearImmediate(<NodeJS.Immediate>this.timer)
        else clearTimeout(<NodeJS.Timeout>this.timer)
    }

    private config(): boolean {
        if (this.executions < 0) this.emit('error', new Error(`The number of executions must be equal or greater than 0; ${this.executions} given`))
        else if (this.executions > 1) this.loop = true
        if (this.countdown < 0) this.emit('error', new Error(`The countdown must be a number equal or greater than 0; ${this.countdown} given`))
        else if (this.countdown === 0) this.inmediate = true
        if (this.times >= 0 && this.countdown >= 0) return true
        return false
    }

    private resolve(args: any[]): void {
        try {
            this.callback(args)
            this.emit('result')
        } catch(error) {
            this.errors.push(error)
            this.emit('error', error)
        } finally {
            this.end()
        }
    }

    private end(): void {
        // try to reset next iteration of setInterval if remaining time is different of the original countdown
        this.times--
        if (this.times === 0) {
            this.clear()
            this.endedAt = new Date()
            this.finished = true
            this.emit('end')
        }
    }
    //#endregion
}