import { Closed } from "src/app/core/utils/closed"

interface Writer {
    writeln(text: string): void
    write(text: string): void
}
export class Listener {
    constructor(public readonly url: string,
        public readonly writer: Writer
    ) {
        this._connect()
    }
    pause = false
    close() {
        if (this.closed_.isClosed) {
            return
        }
        this.closed_.close()
        if (this.websocket_) {
            this.websocket_.close()
            this.websocket_ = undefined
        }
        if (this.timeout_) {
            clearTimeout(this.timeout_)
            this.timeout_ = null
        }
        if (this.interval_) {
            clearInterval(this.interval_)
            this.interval_ = null
        }
    }
    private websocket_: WebSocket | undefined
    private closed_ = new Closed()
    private delay_ = 1
    private timeout_: any
    private interval_: any
    private _connect() {
        if (this.closed_.isClosed) {
            return
        }
        const ws = new WebSocket(this.url)
        ws.binaryType = "arraybuffer"
        this.websocket_ = ws
        ws.onopen = () => {
            this._onopen(ws)
        }
        ws.onerror = (evt) => {
            ws.close()
            this._onclose(ws, evt)
        }
        ws.onclose = (evt) => {
            this._onclose(ws, evt)
        }
    }
    private _onopen(ws: WebSocket) {
        if (ws != this.websocket_ || this.closed_.isClosed) {
            ws.close()
            return
        }
        this.delay_ = 1
        if (!this.interval_) {
            this.interval_ = setInterval(() => {
                try {
                    if (this.websocket_) {
                        this.websocket_.send(`{}`)
                    }
                } catch (e) {
                }
            }, 1000 * 40)
        }
        this.writer.writeln(`attach logger console`)
        ws.onmessage = (evt) => {
            if (ws != this.websocket_) {
                ws.close()
                return
            }
            this._onmessage(ws, evt)
        }
    }
    private _onclose(ws: WebSocket, evt: Event) {
        if (this.websocket_ != ws) {
            return
        }
        console.warn(evt)
        this.websocket_ = undefined
        if (!this.pause) {
            this.writer.writeln(`reconnect on ${this.delay_} second after`)
        }
        this.timeout_ = setTimeout(() => {
            this.timeout_ = null
            this._connect()
        }, this.delay_ * 1000)
        if (this.delay_ < 16) {
            this.delay_ *= 2
        }
    }
    private _onmessage(ws: WebSocket, evt: MessageEvent) {
        if (typeof evt.data === "string") {
            const str = evt.data.replace(/\n/g, "\r\n")
            this.writer.write(str)
        } else {
            this.writer.writeln(`not supported data type : ${typeof evt.data}`)
            console.log(`not supported data type : ${typeof evt.data}`, evt.data)
        }
    }
}
