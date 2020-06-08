import { setTimeout, setImmediate } from 'timers'
import { EventEmitter } from 'events'

export type Timer = NodeJS.Immediate | NodeJS.Timeout
export type Callback = (...args: any[]) => void

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
    private countdown: number
    private remaining: number
    private callback: Callback
    private args!: any[]
    private timer!: Timer
    private startedAt!: Date
    private endedAt!: Date
    private paused = false
    private finished = false
    private inmediate = false
    private errors: Error[]
    //#endregion

    constructor(callback: Callback, config: any, ...args: any[]) {
        super()
        Task.id++
        this.id = Task.id
        this.callback = callback
        this.countdown = this.remaining = config.countdown
        this.args = args
        this.errors = new Array<Error>()

        this.config()
    }

    //#region public interface
    public isPaused(): boolean {
        return this.paused
    }

    public isFinished(): boolean {
        return this.finished
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
        this.startedAt = new Date()
        this.timer = this.getTimer()
        this.emit("start")
    }

    public pause(): void {
        let running = Math.round((new Date().getTime() - this.startedAt.getTime()) / 1000) * 1000
        if (!this.isFinished() || !this.isPaused()) {
            this.remaining -= running

            this.clear()
            this.paused = true
            this.emit("pause")
        }
    }

    public resume(): void {
        if (!this.isFinished() && this.isPaused()) {
            this.timer = this.getTimer()
            this.paused = false
            this.emit("resume")
        }
    }

    public terminate() {
        this.clear()

        this.endedAt = new Date()
        this.finished = true
        this.emit("end")
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
        }
        return setTimeout(            
            (args: any[]) => this.resolve(args),
            this.remaining,
            this.args
        )
    }

    private clear(): void {
        if (this.isInmediate()) clearImmediate(<NodeJS.Immediate>this.timer)
        else clearTimeout(<NodeJS.Timeout>this.timer)
    }

    private config(): void {
        if (this.countdown < 0) throw new Error(`The countdown must be a number equal or greater than 0; ${this.countdown} given`)
        if (this.countdown === 0) this.inmediate = true
    }

    private resolve(args: any[]): void {
        try {
            this.callback(args)
            this.emit("result")
        } catch(error) {
            this.errors.push(error)
            this.emit("error", error)
        } finally {
            this.end()
        }
    }

    private end(): void {
        this.clear()
        this.endedAt = new Date()
        this.finished = true
        this.emit("end")
    }
    //#endregion
}