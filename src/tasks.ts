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
    private finished = false
    //#endregion

    constructor(callback: (...args: any[]) => void, config: any, ...args: any[]) {
        super()
        Task.id++
        this.id = Task.id
        this.callback = callback
        this.countdown = config.countdown
        this.args = args
    }

    public isFinished(): boolean {
        return this.finished
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

    public duration(): number {
        return (this.endedAt.getTime() - this.startedAt.getTime())
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
            this.emit("error", error)
        } finally {
            this.endedAt = new Date()
            this.finished = true
            this.emit("end")
        }
    }
    //#endregion
}