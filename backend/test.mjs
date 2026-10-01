import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const env = {APP_ORIGIN: 'https://felipekingx-maker.github.io', ALLOWED_HOSTS: 'provider.example,cdn.example', ALLOWED_PORTS: '80,443,8080,8443', ACCESS_TOKEN: 'test-only-key-012345678901234567890123456789'};
const base = 'https://relay.example';
function request(path, body, extra = {}) {
  const headers = {Origin: env.APP_ORIGIN, Authorization: 'Bearer ' + env.ACCESS_TOKEN, ...extra};
  if (body) headers['Content-Type'] = 'application/json';
  return new Request(base + path, {method: body ? 'POST' : 'GET', headers, ...(body ? {body: JSON.stringify(body)} : {})});
}
test('requires valid key, exact origin and complete configuration', async () => {
  assert.equal((await worker.fetch(new Request(base + '/health'), env)).status, 401);
  assert.equal((await worker.fetch(request('/health', null, {Origin: 'https://other.example'}), env)).status, 403);
  assert.equal((await worker.fetch(request('/health'), {...env, ACCESS_TOKEN: ''})).status, 503);
  assert.equal((await worker.fetch(request('/health'), env)).status, 200);
});
test('refuses arbitrary hosts, IP destinations and unapproved ports', async () => {
  for (const url of ['http://other.example/video', 'http://provider.example:9999/video']) {
    assert.notEqual((await worker.fetch(request('/ticket', {url}), env)).status, 200);
  }
  const ipEnv = {...env, ALLOWED_HOSTS: '127.0.0.1'};
  assert.notEqual((await worker.fetch(request('/ticket', {url: 'http://127.0.0.1/video'}), ipEnv)).status, 200);
});
test('issues opaque media tickets; preserves Range and rejects tampering', async () => {
  const original = globalThis.fetch; let destination, options;
  globalThis.fetch = async (url, opts) => { destination = url; options = opts; return new Response('data', {status: 206, headers: {'Content-Type': 'video/mp4', 'Content-Range': 'bytes 0-3/100', 'Accept-Ranges': 'bytes'}}); };
  try {
    const issued = await worker.fetch(request('/ticket', {url: 'http://provider.example/movie/u/p/1.mp4'}), env);
    const {url} = await issued.json();
    assert.equal(new URL(url).protocol, 'https:'); assert.equal(url.includes('provider.example'), false);
    const response = await worker.fetch(new Request(url, {headers: {Origin: env.APP_ORIGIN, Range: 'bytes=0-3'}}), env);
    assert.equal(response.status, 206); assert.equal(options.headers.get('Range'), 'bytes=0-3');
    assert.equal(destination, 'http://provider.example/movie/u/p/1.mp4'); assert.equal(await response.text(), 'data');
    const tampered = new URL(url); tampered.searchParams.set('ticket', tampered.searchParams.get('ticket') + 'x');
    assert.equal((await worker.fetch(new Request(tampered), env)).status, 401);
    assert.equal((await worker.fetch(new Request(url), {...env, ACCESS_TOKEN: env.ACCESS_TOKEN + 'new'})).status, 401);
  } finally { globalThis.fetch = original; }
});
test('rewrites HLS segments, nested manifests, keys and subtitle URIs', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\n#EXT-X-MEDIA:TYPE=SUBTITLES,URI="http://cdn.example/subs.m3u8"\n#EXTINF:6,\nsegment.ts\nchild.m3u8', {headers: {'Content-Type': 'application/vnd.apple.mpegurl'}});
  try {
    const issued = await worker.fetch(request('/ticket', {url: 'http://provider.example/hls/master.m3u8', hls: true}), env);
    const {url} = await issued.json(); const response = await worker.fetch(new Request(url), env); const manifest = await response.text();
    assert.equal(response.status, 200); assert.equal(manifest.includes('provider.example'), false); assert.equal(manifest.includes('cdn.example'), false);
    const proxies = [...manifest.matchAll(/https:\/\/relay\.example\/stream\?ticket=[^"\n]+/g)]; assert.equal(proxies.length, 4);
    let fetched;
    globalThis.fetch = async target => { fetched = target; return new Response('segment', {headers: {'Content-Type': 'video/mp2t'}}); };
    const segment = await worker.fetch(new Request(proxies[2][0]), env); assert.equal(await segment.text(), 'segment'); assert.equal(fetched, 'http://provider.example/hls/segment.ts');
  } finally { globalThis.fetch = original; }
});
test('does not follow redirect outside host allowlist', async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, {status: 302, headers: {Location: 'http://private.example/secret'}}); };
  try {
    const response = await worker.fetch(request('/playlist', {url: 'http://provider.example/get.php?username=test&password=fake'}), env);
    assert.equal(response.status, 502); assert.equal(calls, 1); assert.equal((await response.text()).includes('password'), false);
  } finally { globalThis.fetch = original; }
});
test('streams playlists and blocks oversized upstream response', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('#EXTM3U\n#EXTINF:-1,Test\nhttp://provider.example/live/1.m3u8');
    const response = await worker.fetch(request('/playlist', {url: 'http://provider.example/get.php'}), env);
    assert.equal(response.status, 200); assert.match(await response.text(), /#EXTM3U/);
    globalThis.fetch = async () => new Response('x', {headers: {'Content-Length': '105906176'}});
    assert.equal((await worker.fetch(request('/playlist', {url: 'http://provider.example/get.php'}), env)).status, 413);
  } finally { globalThis.fetch = original; }
});
