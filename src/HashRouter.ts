


export default interface HopperHashRouter {
    
    /**
     * Subscribes to route change events.
     * There are two types of events - `enter` and `exit`.  
     * All types of events do not use standard event names, instead events
     * are emitted in a `type:route` format. Eg:
     * ```
     * Router.addeventListener('enter:/hello/world', e => console.log(e))
     * Router.addEventListener('exit:/hello/world', e => console.log(e))
     * ```
     * `exit` and `enter` are emitted whenever a given path is left and entered respectively.
     */
    addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void

    /**
     * Unsubscribes from route change events.  
     * There are two types of events - `enter` and `exit`.  
     * All types of events do not use standard event names, instead events
     * are emitted in a `type:route` format. Eg:
     * ```
     * Router.addeventListener('enter:/hello/world', e => console.log(e))
     * Router.addEventListener('exit:/hello/world', e => console.log(e))
     * ```
     * `exit` and `enter` are emitted whenever a given path is left and entered respectively.
     */
    removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void

}
export default class HopperHashRouter extends EventTarget {

    constructor() {
        super()
    }

}