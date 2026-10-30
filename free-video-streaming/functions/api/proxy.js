const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, X-Proxy',
    'Access-Control-Max-Age': '86400',
    'X-Proxy': 'edge'
};

function json(body, status) {
    return new Response(JSON.stringify(body), {
        status: status || 200,
        headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS_HEADERS)
    });
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
    const request = context.request;
    const target = new URL(request.url).searchParams.get('url');

    if (!target) return json({ error: 'missing url parameter' }, 400);

    let parsed;
    try {
        parsed = new URL(target);
    } catch (e) {
        return json({ error: 'invalid url' }, 400);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return json({ error: 'unsupported protocol' }, 400);
    }

    const headers = new Headers();
    headers.set('User-Agent', UA);
    headers.set('Accept', request.headers.get('Accept') || '*/*');
    headers.set('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8');
    const range = request.headers.get('Range');
    if (range) headers.set('Range', range);

    let upstream;
    try {
        upstream = await fetch(parsed.toString(), {
            method: 'GET',
            headers: headers,
            redirect: 'follow'
        });
    } catch (e) {
        return json({ error: 'upstream fetch failed', detail: String(e && e.message || e) }, 502);
    }

    const outHeaders = new Headers(CORS_HEADERS);
    outHeaders.set('Content-Type', upstream.headers.get('Content-Type') || 'application/octet-stream');

    ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Last-Modified', 'ETag'].forEach(function (name) {
        const value = upstream.headers.get(name);
        if (value) outHeaders.set(name, value);
    });

    const contentType = outHeaders.get('Content-Type') || '';
    if (contentType.indexOf('json') !== -1 || contentType.indexOf('text') !== -1) {
        outHeaders.set('Cache-Control', 'public, max-age=60');
    } else {
        outHeaders.set('Cache-Control', 'public, max-age=3600');
    }

    return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders
    });
}
