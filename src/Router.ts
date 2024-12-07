
type NavigationHandler = () => void | Promise<void>

interface RouteEntry {
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

    constructor() {}

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

    remove(hash: string) {
        delete this.#routes[hash]
    }

    listen() {
        window.addEventListener('hashchange', e => {
            this.#handleHashChange(e)
        })
    }

    // Live navigation ========================================================

    static Route = class {

        public string: string
        public segments: string[]
        public queries: Record<string, string>
    
        /**
         * Instantiates a new Hash instance used as part of the event chain
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

    async #handleHashChange(e: HashChangeEvent) {
        
        const entering = new Router.Route(new URL(e.newURL).hash)
        const match = this.#chooseBest(entering.segments)

        console.log('entering:', entering)
        console.log('match:', match)

        // if (!match) {
        //     // todo Handle 404
        // }


        // const leavingEntry = this.#routes[leavingRoute.route]
        // const enteringEntry = this.#routes[enteringRoute.route]

        // if (leavingEntry) {
        //     try { for (const callback of leavingEntry.beforeExit) await callback() } 
        //     catch (error) { console.error(`An error occurred while leaving "${leavingRoute.route}"`, error); this.#listeningPaused = false  }
        // }

        // if (enteringEntry) {
        //     try { for (const callback of enteringEntry.afterEnter) await callback() } 
        //     catch (error) { console.error(`An error occurred while entering "${enteringRoute.route}"`, error); this.#listeningPaused = false }
        // }
        // // Handle 404 client-side
        // else {

        // }


        // console.log(leavingRoute, enteringRoute)

    }

    // Ranking ================================================================

    #EXACT_MATCH     = 3 as const
    #PARAMETER_MATCH = 2 as const
    #WILDCARD_MATCH  = 1 as const

    /**
     * Assigns a score to the the user-provided path based on its similarity to a resource route.
     * The score is calculated as follows:
     *  - Exact match: 3 points
     *  - Parameter match: 2 points
     *  - Wildcard match: 1 point
     *  - Non-match: 0 points, scoring stops
     * 
     * Note that both parameters must be prepared by removing any leading or trailing slashes.
     * Failure to do so will in a miscalculated score.
     * @param {string[]} route - Resource route segments.
     * @param {string[]} user - User route segments.
     * @returns {number} Score.
     */
    rank(route: string[], user: string[]): number { 

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
                continue
            }

            return 0

        }
        
        return score

    }

    #chooseBest(user: string[]): string {

        let best: [number, string] = [0, '']

        for (const route in this.#routes) {
            const entry = this.#routes[route]
            const rank = this.rank(entry.segments, user)
            if (rank > best[0]) best = [rank, route]
        }

        return best[1]

    }

}

// const r = new Router()
// const routes = [
//     'user/:id',
//     'user/*',
//     'user/*/test/*',
//     'user/settings/:page',
//     'user/*/hello',
//     '*/*/hello',
//     '*//hello',
//     'user/102954782/hello/*',
// ]

// console.log(routes.map(route => [
//     r.rank(
//         route.split('/'), 
//         'user/102954782/hello'.split('/')
//     ), 
//     route
// ]))