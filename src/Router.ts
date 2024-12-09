
interface RouteChangeEvent {
    /** 
     * Request path.  
     * Eg. `/settings/profile/edit` 
     */
    path: string
    /** 
     * URL parameters.  
     * Eg. `{ id: '123', page: 'edit' }` extracted from `/user/:id/:page`
     */
    params: Record<string, string>
    /** 
     * URL segments matched by wildcards (`*`).  
     * Eg. `['profile', 'edit']`  extracted from `/user/*`.  
     * **Note** - Wildcards in the middle of the route match single segments while
     * wildcards at the end of the route are recursive and match any number of them.
     */
    wildcards: Array<string>
    /** 
     * URL queries.  
     * Eg. `{ id: '123', page: 'edit' }` extracted from `/url/?id=123&page=edit`. 
     */
    queries: Record<string, string>
}

type NavigationHandler = (e: RouteChangeEvent) => void | Promise<void>

interface RouteEntry {
    /** Route as a string. */
    string: string
    /** Individual segments of the route. */
    segments: string[]
    /** Callbacks fired when the route is matched and is is being entered. */
    afterEnter: NavigationHandler
    /** Callbacks called before the location is left. */
    beforeExit: NavigationHandler
}


export default class Router {

    #routes: Record<string, RouteEntry> = {}
    #currentRoute: string | undefined

    /**
     * Creates a new Router instance.
     * @param startingRoute - Provide only if initializing the router when a route is already active.
     */
    constructor(startingRoute?: string) {
        this.#currentRoute = startingRoute
    }

    // API ====================================================================

    /**
     * Adds a new route handler.
     * The route handler will be registered for one of two events - `beforeExit` or `afterEnter`.
     * The choice of two different event types is to allow for programmatically playing page
     * transitions with based on whether the user is leaving a location or has just entered it.
     * @param route - String route to match.
     * @param handlers - Path handlers
     */
    add(hash: string, handlers: Record<'beforeExit' | 'afterEnter', NavigationHandler>) {
        const route = new Router.Route(hash)
        this.#routes[route.string] = {
            string: route.string,
            segments: route.segments,
            beforeExit: handlers.beforeExit,
            afterEnter: handlers.afterEnter
        }
    }

    /**
     * Removes a route handler.
     * @param hash - Hash as a string.
     */
    remove(hash: string) {
        delete this.#routes[hash]
    }

    /**
     * Set the current hash to the given string.
     * The hash is normalized by removing any leading hashes and slashes
     * @param hash - Hash as a string.
     */
    set(hash: string) {
        window.location.hash = `#/${hash.replace(/#\/|#/, '')}`
    }

    /**
     * Loads any route matching the current location hash.  
     * This method is aimed  mainly at navigating to the right location on page load.
     */
    load() {
        this.#handleHashChange(true)
    }

    #listener = (e: HashChangeEvent) => {
        this.#handleHashChange()
    }

    startListening() {
        window.addEventListener('hashchange', this.#listener)
        this.#handleHashChange(true)
    
    }

    stopListening() { 
        window.removeEventListener('hashchange', this.#listener)
    }

    // Live navigation ========================================================

    static Route = class {

        public string: string
        public segments: string[]
        public queries: Record<string, string>
    
        /**
         * Creates a new Hash instance used as part of the event chain
         * of the router. This class is purely for convenience and serves a similar
         * purpose to the native URL class.
         */
        constructor(hash: string) {
            const noHash = hash.replace(/#\/|#/, '')
            const noLead = noHash.startsWith('/') ? noHash.slice(1) : noHash
            const noTrail = noLead.endsWith('/') ? noLead.slice(0, -1) : noLead
            const [route, queryString] = noTrail.split('?')
            this.queries = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {}
            this.string = route
            this.segments = route.split('/')
        }
        
    } 

    async #handleHashChange(noLeave = false) {
        
        const entering      = new Router.Route(window.location.hash)
        const matchingRoute = this.#chooseBest(entering.segments)
        const match         = this.#routes[matchingRoute!] as RouteEntry | undefined
        const lastMatch     = this.#routes[this.#currentRoute!] as RouteEntry | undefined

        const details = this.#getUserRouteDetails(match ? match.segments : [], entering.segments)
        const event: RouteChangeEvent = {
            path: entering.string,
            params: details.params,
            wildcards: details.wildcards,
            queries: entering.queries,
        }

        const currentUrl = window.location.href.split('#')[0]
        history.replaceState(null, '', `${currentUrl}#/${entering.string}`)

        if (lastMatch && !noLeave) {
            await lastMatch.beforeExit(event)
        }

        if (match) {
            await match.afterEnter(event)
            this.#currentRoute = matchingRoute
        }
        else {
            const r404 = this.#routes['404']
            if (r404) await r404.afterEnter(event)
            this.#currentRoute = '404'
        }

    }

    // Ranking ================================================================

    #EXACT_MATCH     = 3 as const
    #PARAMETER_MATCH = 2 as const
    #WILDCARD_MATCH  = 1 as const

    /**
     * Assigns a score to the the user-provided path based on its similarity to a resource route.
     * 
     * Note that both parameters must be prepared by removing any leading or trailing slashes.
     * Failure to do so will result in a miscalculated score.
     * @param {string[]} route - Resource route segments.
     * @param {string[]} user - User route segments.
     * @returns {number} Route similarity score.
     */
    #rank(route: string[], user: string[]): number { 

        let score = 0

        for (let i = 0; i < route.length; i++) {

            const uc = user[i]
            const rc = route[i]

            // Exact match
            if (rc === uc) {
                score += this.#EXACT_MATCH
                continue
            }

            // Parameter match
            if (rc && rc.startsWith(':')) {
                score += this.#PARAMETER_MATCH
                continue
            }

            // Trailing wildcard match
            if (i === route.length - 1 && rc && rc === '*') {
                if (!uc) return 0
                const trailLength = user.length-1 - i
                score += trailLength * this.#WILDCARD_MATCH
                break
            }

            // Wildcard match 
            if (rc && rc === '*') {
                score += this.#WILDCARD_MATCH
            }

            return 0

        }
        
        return score

    }

    #chooseBest(user: string[]): string | undefined {

        let best: [number, string] = [0, '']

        for (const route in this.#routes) {
            const entry = this.#routes[route]
            const rank = this.#rank(entry.segments, user)
            if (rank > best[0]) best = [rank, route]
        }

        return best[0] ? best[1] : undefined

    }

    /**
     * Extracts all the parameters and wildcards from the user-provided route
     * based on the blueprint route.
     */
    #getUserRouteDetails(route: string[], user: string[]) {
        
        let wildcards: string[] = []
        let params: Record<string, string> = {}

        for (let i = 0; i < route.length; i++) {

            const rc = route[i]
            const uc = user[i]

            // Parameter match
            if (rc && rc.startsWith(':')) {
                params[rc.substring(1)] = uc
                continue
            }

            // Trailing wildcard match
            if (i === route.length - 1 && rc === '*') {
                wildcards.push(...user.slice(route.length-1, user.length))
                continue
            }

            // Wildcard match 
            if (rc === '*') {
                wildcards.push(uc)
            }

        }

        return {
            wildcards,
            params
        }

    }

}