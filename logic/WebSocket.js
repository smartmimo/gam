import { w3cwebsocket as W3CWebSocket } from "websocket";

import eventEmitter from "../utils/EventEmitter";
import listeners from "./events";

export default class extends W3CWebSocket {
    constructor(url) {
        super(url)
        this.eventEmitter = new eventEmitter()
        this.eventEmitter.on(listeners);
        
        this.hooked = []
        this.onmessage = payload => {
            const { message, data } = JSON.parse(payload.data);
            this.eventEmitter.emit(message, {socket: this, data})
        }

        this.sendMessage = (message, data = null) => {
            this.send(JSON.stringify({ message, data }))
        }
    }


    
}
