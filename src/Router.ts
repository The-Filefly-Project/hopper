

export default class Router {

    #listening = false

    constructor() {
        console.log('Router');
    }

    mount() {
        const hash = window.location.hash
        if (!hash.startsWith('#/')) window.location.hash = hash.replace('#', '#/')
        setTimeout(() => this.listen(), 0)
    }

    listen() {
        if (!this.#listening) {
            this.#listening = true
            window.addEventListener('hashchange', e => this.#handleHashChange(e))
        }
    }

    off() {
        if (this.#listening) {
            this.#listening = false
            window.removeEventListener('hashchange', e => this.#handleHashChange(e))
        }
    }

    #handleHashChange(e: HashChangeEvent) {
        const [route, queryString] = window.location.hash.replace(/#\/|#/, '').split('?')
        const queries = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {}
        console.log(route, queries)
    } 
}