/**
 * Calculate tolls for a route by detecting toll roads using Overpass API
 * Uses OpenStreetMap toll data via Valhalla map matching and Overpass queries
 */
export const onRequest = async ({request, env}, cf) => {
    // Get positions from Traccar
    const url = new URL(request.url.replace('reports/tolls', 'positions'))
    const positions = await fetch(new Request(url, request), cf).then(r => r.json())

    if (!positions || positions.length === 0) {
        return new Response(JSON.stringify( []))
    }

    // Extract deviceId and country from URL params
    const urlParams = new URL(request.url).searchParams
    const deviceId = urlParams.get('deviceId')
    const country = urlParams.get('country') || 'BR'

    if (!deviceId) {
        return new Response(JSON.stringify({
            error: 'deviceId parameter is required'
        }), { status: 400 })
    }

    // Get way IDs from Valhalla map matching
    const candidateWays = await getWayIds(positions, country)

    // Get toll booth nodes from the ways
    const tollBooths = candidateWays.length > 0
        ? await getTollBoothNodesFromWays(candidateWays)
        : []

    return new Response(JSON.stringify(tollBooths), {
        headers: {'Content-Type': 'application/json; charset=utf-8'}
    })
}


async function getWayIds (route, country='PT') {
    const chunk = 200
    const candidateWays = []
    if (route.length === 0) {
        return []
    }

    for (let i = 0; i < route.length; i += chunk) {
        const result = await invokeValhalla(route, i, chunk, country)
        if (!result) continue

        const {
            matched_points,
            edges
        } = result

        const slice = route.slice(i, i + chunk)

        // Map edges to positions
        if (edges && Array.isArray(edges)) {
            edges.forEach((edge, edgeIndex) => {
                if (edge.way_id !== undefined && edge.way_id !== null) {
                    // Get the corresponding position for this edge
                    // Edges typically map to matched_points by index
                    const matchedPoint = matched_points && matched_points[edgeIndex]
                        ? matched_points[edgeIndex]
                        : null
                    const originalPosition = slice[edgeIndex]

                    candidateWays.push({
                        wayId: edge.way_id,
                        originalPosition: originalPosition,
                        matchedPosition: matchedPoint || originalPosition
                    })
                }
            })
        }
    }

    if (candidateWays.length === 0) {
        return []
    }

    return candidateWays
}

/**
 * Get toll booth nodes from ways
 * Queries Overpass to find nodes with barrier=toll_booth that belong to the ways
 */
async function getTollBoothNodesFromWays(tollWays) {
    if (!tollWays || tollWays.length === 0) {
        return []
    }

    const OVERPASS_SERVER = 'http://overpass.fleetmap.org:8080/api/interpreter'

    // Get unique way IDs
    const wayIds = [...new Set(tollWays.map(w => w.wayId))]

    // Step 1: Find all toll booth nodes on these ways
    const tollBoothNodes = await findTollBoothNodes(wayIds, OVERPASS_SERVER)

    if (tollBoothNodes.length === 0) {
        return []
    }

    // Step 2: For each toll booth, find which way it belongs to
    const tollBoothsWithWays = await findWaysForNodes(tollBoothNodes, OVERPASS_SERVER)

    // Step 3: Match ways to our candidate ways to get original positions
    return tollBoothsWithWays.map(booth => {
        const matchingWay = tollWays.find(w => w.wayId === booth.way.id)
        return {
            node: booth.node,
            way: booth.way,
            originalPosition: matchingWay?.originalPosition || null,
            matchedPosition: matchingWay?.matchedPosition || null
        }
    })
}

async function findTollBoothNodes(wayIds, OVERPASS_SERVER) {
    const tollBooths = []
    const batchSize = 50

    for (let i = 0; i < wayIds.length; i += batchSize) {
        const batch = wayIds.slice(i, i + batchSize)
        const wayIdList = batch.join(',')

        const query = `[out:json][timeout:25];
way(id:${wayIdList});
node(w)["barrier"="toll_booth"];
out body;`

        let retries = 3
        let success = false

        while (retries > 0 && !success) {
            try {
                const response = await fetch(OVERPASS_SERVER, {
                    method: 'POST',
                    body: query,
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                })

                if (response.ok) {
                    const contentType = response.headers.get('content-type')

                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json()

                        if (data.elements && Array.isArray(data.elements)) {
                            const nodes = data.elements.filter(el =>
                                el.type === 'node' &&
                                el.tags?.barrier === 'toll_booth'
                            )
                            tollBooths.push(...nodes)
                        }
                        success = true
                    } else {
                        const text = await response.text()
                        if (text.includes('duplicate_query')) {
                            const delay = (4 - retries) * 2000
                            console.warn(`Duplicate query detected, retrying in ${delay}ms...`)
                            await new Promise(resolve => setTimeout(resolve, delay))
                            retries--
                        } else {
                            console.error('Overpass API returned non-JSON response:', text.substring(0, 200))
                            success = true
                        }
                    }
                } else {
                    console.error('Overpass API error:', response.status, response.statusText)
                    success = true
                }
            } catch (error) {
                console.error('Error querying Overpass API:', error)
                success = true
            }
        }

        if (i + batchSize < wayIds.length) {
            await new Promise(resolve => setTimeout(resolve, 2000))
        }
    }

    console.log('Found toll booth nodes:', tollBooths.length)
    return tollBooths
}

async function findWaysForNodes(nodes, OVERPASS_SERVER) {
    const result = []
    const batchSize = 50

    for (let i = 0; i < nodes.length; i += batchSize) {
        const batch = nodes.slice(i, i + batchSize)
        const nodeIdList = batch.map(n => n.id).join(',')

        // Query to find ways that contain these nodes
        const query = `[out:json][timeout:25];
node(id:${nodeIdList});
way(bn);
out body;`

        let retries = 3
        let success = false

        while (retries > 0 && !success) {
            try {
                const response = await fetch(OVERPASS_SERVER, {
                    method: 'POST',
                    body: query,
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                })

                if (response.ok) {
                    const contentType = response.headers.get('content-type')

                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json()

                        if (data.elements && Array.isArray(data.elements)) {
                            const ways = data.elements.filter(el => el.type === 'way')

                            // Match each node to its way
                            batch.forEach(node => {
                                const way = ways.find(w => w.nodes && w.nodes.includes(node.id))
                                if (way) {
                                    result.push({
                                        node: node,
                                        way: way
                                    })
                                }
                            })
                        }
                        success = true
                    } else {
                        const text = await response.text()
                        if (text.includes('duplicate_query')) {
                            const delay = (4 - retries) * 2000
                            console.warn(`Duplicate query detected (ways), retrying in ${delay}ms...`)
                            await new Promise(resolve => setTimeout(resolve, delay))
                            retries--
                        } else {
                            console.error('Overpass API returned non-JSON response:', text.substring(0, 200))
                            success = true
                        }
                    }
                } else {
                    console.error('Overpass API error:', response.status, response.statusText)
                    success = true
                }
            } catch (error) {
                console.error('Error querying Overpass API:', error)
                success = true
            }
        }

        if (i + batchSize < nodes.length) {
            await new Promise(resolve => setTimeout(resolve, 2000))
        }
    }

    console.log('Matched nodes to ways:', result.length)
    return result
}

let  countError = 0, countSuccess = 0
async function invokeValhalla (route, i, chunk, country, retry = 3) {
    const slice = route.slice(i, i + chunk)
    const url = `https://valhalla-${country}.fleetmap.org/trace_attributes`
    const body = {
        costing: 'auto',
        shape_match: 'map_snap',
        shape: slice.map(p => ({
            lon: p.longitude,
            lat: p.latitude
        }))
    }
    console.log(url)
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body)
    })
    if (!response.ok) {
        try {
            const e = await response.json()
            if (e.error_code === 444 || e.error_code === 171) {
                console.warn(countSuccess, i, i + chunk, e)
                return
            }
            if (--retry) {
                console.error('retry', retry, e.message, (e.response && e.response.data) || url, 'deviceId',
                    slice[0] && slice[0].deviceId, slice[0] && slice[0].address, slice[0] && slice[0].fixTime, country, 'chunk', chunk,
                    'success', countSuccess, 'error', countError)
                return invokeValhalla(route, i, chunk, country, retry)
            } else {
                console.error(e.message, (e.response && e.response.data) || url, 'deviceId',
                    slice[0] && slice[0].deviceId, slice[0] && slice[0].address, slice[0] && slice[0].fixTime, country, 'chunk', chunk, 'success', countSuccess, 'error', countError)
            }
        } catch (e) {
            console.error(e)
        }
        countError++
    } else {
        countSuccess++
        return response.json()
    }
}