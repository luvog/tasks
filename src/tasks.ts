import { setTimeout } from 'timers'
import { EventEmitter } from 'events'

export class Task extends EventEmitter {
    //#region properties
    private static id = 0
    private id: number
    private countdown: number
    private callback: (...args: any[]) => void
    private args!: any[]
    private timer!: NodeJS.Timeout
    private startedAt!: Date
    private endedAt!: Date
    private paused = false
    private finished = false
    private errors: Error[]
    //#endregion

    constructor(callback: (...args: any[]) => void, config: any, ...args: any[]) {
        super()
        Task.id++
        this.id = Task.id
        this.callback = callback
        this.countdown = config.countdown
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

    public hasErrors(): boolean {
        return this.errors.length > 0
    }

    public errorsSize(): number {
        return this.errors.length
    }

    public run(): void {
        this.startedAt = new Date()
        this.timer = setTimeout(
            (args: any[]) => this.resolve(args),
            this.countdown,
            this.args
        )
        this.emit("start")
    }

    public pause(): void {
        if (!this.isFinished || !this.isPaused()) {
            clearTimeout(this.timer)
            this.paused = true
            this.emit("pause")
        }
    }

    public resume(): void {
        if (!this.isFinished() && this.isPaused()) {
            this.timer = setTimeout(
                (args: any[]) => this.resolve(args),
                this.countdown,
                this.args
            )
            this.paused = false
            this.emit("resume")
        }
    }

    public terminate() {
        clearTimeout(this.timer)
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
    private resolve(args: any[]): void {
        try {
            this.callback(args)
            this.emit("result")
        } catch(error) {
            this.errors.push(error)
            this.emit("error", error)
        } finally {
            this.endedAt = new Date()
            this.finished = true
            this.emit("end")
        }
    }
    //#endregion
}