interface Route {
    segments: string[],
    callback: () => void
}

export default class Router {

    #routes: Route[] = []

    constructor() {}

    // API ====================================================================

    /**
     * Adds a new route handler.
     * @param {string} route - String route to match.
     * @param {() => void} callback - Route handler.
     * ```ts
     * // Example
     * router.add('/user/:id',            req => console.log(req.params.id))
     * router.add('/user/*',              req => console.log(req.wildcards[0]))
     * router.add('/user/settings/:page', req => console.log(req.params.page))
     * ```
     */
    add(route: string, callback: () => void) {
        this.#routes.push({
            segments: route.split('/'),
            callback
        })
    }

    remove(route: string) {
        this.#routes = this.#routes.filter(r => r.segments.join('/') !== route)
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
                const trailLength = user.length - i
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

}

const r = new Router()
const routes = [
    'user/:id',
    'user/*',
    'user/*/test/*',
    'user/settings/:page',
    'user/*/hello',
    '*/*/hello',
    '*//hello',
    'user/102954782/hello/*',
]

console.log(routes.map(route => [
    r.rank(
        route.split('/'), 
        'user/102954782/hello'.split('/')
    ), 
    route
]))