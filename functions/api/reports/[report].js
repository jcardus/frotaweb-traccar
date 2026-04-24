export const onRequest = async ({request, env}, cf) => {
    const url = new URL(request.url.replace('/traccar/', '/'))
    const oldest = new Date().setDate(new Date().getDate() - parseInt(env.DATABASE_RETENTION_WEEKS || '2') * 7)
    const forward = url.searchParams.get('from') && new Date(url.searchParams.get('from')) < new Date(oldest)
    url.host =  forward?
        (env.TRACCAR_REPORTS_SERVER || 'aadobrygc6wsyawaleatkimjjm0cczwu.lambda-url.us-east-1.on.aws') :
        (env.TRACCAR_SERVER || 'gps.frotaweb.com')
    url.protocol = forward ? 'https:' : 'http:'
    url.port = forward ? 443 : 80
    console.log(url)
    const response = await fetch(new Request(url, request), cf)
    const origin = request.headers.get('Origin') || '*'
    const headers = new Headers(response.headers)
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers})
}
