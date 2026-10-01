const encoder = new TextEncoder();
const decoder = new TextDecoder();
const json = (value, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json'}});
function hosts(env) { return String(env.ALLOWED_HOSTS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean); }
function target(value, env) {
  const url = new URL(value);
  const allowed = hosts(env);
  const ports = String(env.ALLOWED_PORTS || '80,443,8080,8443').split(',').map(x => x.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !allowed.includes(url.hostname.toLowerCase())) throw new Error('Destino não autorizado. Adicione o domínio às configurações do servidor.');
  if (url.hostname === 'localhost' || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':') || /\.(?:local|internal)$/.test(url.hostname)) throw new Error('Destino não autorizado.');
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  if (!ports.includes(port)) throw new Error('Porta não autorizada no servidor.');
  url.hash = ''; return url;
}
function encode(bytes) { let text = ''; for (const b of bytes) text += String.fromCharCode(b); return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function decode(value) { const text = atob(value.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(text, c => c.charCodeAt(0)); }
async function key(env) { const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(env.ACCESS_TOKEN)); return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function ticket(url, kind, expiry, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(JSON.stringify({url, kind, expiry}));
  const encrypted = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await key(env), data);
  return encode(iv) + '.' + encode(new Uint8Array(encrypted));
}
async function readTicket(value, env) {
  if (!value || value.length > 12000) throw new Error('Ticket inválido.');
  const parts = value.split('.'); if (parts.length !== 2) throw new Error('Ticket inválido.');
  const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: decode(parts[0])}, await key(env), decode(parts[1]));
  const payload = JSON.parse(decoder.decode(plain));
  if (!Number.isFinite(payload.expiry) || payload.expiry < Date.now()) throw new Error('A conexão expirou. Abra o vídeo novamente.');
  target(payload.url, env); return payload;
}
async function proxyURL(url, base, expiry, env, kind = 'auto') {
  const checked = target(url, env); const output = new URL('/stream', base);
  output.searchParams.set('ticket', await ticket(checked.href, kind, expiry, env)); return output.href;
}
async function upstream(url, env, requestHeaders = new Headers()) {
  let current = target(url, env);
  const headers = new Headers();
  if (requestHeaders.has('Range')) headers.set('Range', requestHeaders.get('Range'));
  headers.set('Accept', '*/*');
  for (let i = 0; i < 6; i++) {
    const response = await fetch(current.href, {redirect: 'manual', headers, signal: AbortSignal.timeout(30000), cache: 'no-store'});
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (!location) throw new Error('Redirecionamento inválido do provedor.');
      await response.body?.cancel();
      current = target(new URL(location, current).href, env); continue;
    }
    return {response, url: current};
  }
  throw new Error('Redirecionamentos demais no provedor.');
}
async function boundedText(response, max) {
  if (Number(response.headers.get('Content-Length')) > max) throw new Error('Manifesto HLS muito grande.');
  const reader = response.body.getReader(), parts = [], textDecoder = new TextDecoder(); let size = 0;
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > max) { await reader.cancel(); throw new Error('Manifesto HLS muito grande.'); } parts.push(textDecoder.decode(part.value, {stream: true})); }
  return parts.join('') + textDecoder.decode();
}
async function rewriteHls(text, source, base, expiry, env) {
  const lines = text.split(/\r?\n/);
  if (!/^#EXTM3U/.test(lines[0].replace(/^\uFEFF/, ''))) throw new Error('O provedor não retornou um manifesto HLS.');
  const rewritten = [];
  for (const line of lines) {
    if (!line.trim()) { rewritten.push(line); continue; }
    if (line[0] !== '#') { rewritten.push(await proxyURL(new URL(line.trim(), source).href, base, expiry, env)); continue; }
    const matches = [...line.matchAll(/URI="([^"]+)"/g)]; let output = line;
    for (const match of matches) {
      if (match[1].startsWith('data:')) continue;
      const replacement = await proxyURL(new URL(match[1], source).href, base, expiry, env);
      output = output.replace(match[0], 'URI="' + replacement + '"');
    }
    rewritten.push(output);
  }
  return rewritten.join('\n');
}
async function route(request, env) {
  if (!env.ACCESS_TOKEN || env.ACCESS_TOKEN.length < 32 || !env.APP_ORIGIN || !hosts(env).length) return json({error: 'Configure APP_ORIGIN, ALLOWED_HOSTS e o segredo ACCESS_TOKEN (mínimo de 32 caracteres).'}, 503);
  const url = new URL(request.url), origin = request.headers.get('Origin');
  if (origin && origin !== env.APP_ORIGIN) return json({error: 'Origem não autorizada.'}, 403);
  if (request.method === 'OPTIONS') return new Response(null, {status: 204});
  if (url.pathname === '/stream') {
    if (!['GET', 'HEAD'].includes(request.method)) return json({error: 'Método não permitido.'}, 405);
    let payload;
    try { payload = await readTicket(url.searchParams.get('ticket'), env); } catch { return json({error: 'Ticket inválido, expirado ou destino não autorizado.'}, 401); }
    const {response, url: source} = await upstream(payload.url, env, request.headers);
    if (!response.ok) { await response.body?.cancel(); return json({error: 'O provedor retornou HTTP ' + response.status + '.'}, response.status); }
    const headers = new Headers();
    for (const name of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) if (response.headers.has(name)) headers.set(name, response.headers.get(name));
    const hls = payload.kind === 'hls' || /\.m3u8$/i.test(source.pathname) || /(?:mpegurl)/i.test(response.headers.get('Content-Type') || '');
    if (hls) {
      const text = await boundedText(response, 2 * 1024 * 1024);
      const rewritten = await rewriteHls(text, source, request.url, payload.expiry, env);
      headers.delete('Content-Length'); headers.delete('Content-Range'); headers.set('Content-Type', 'application/vnd.apple.mpegurl');
      return new Response(request.method === 'HEAD' ? null : rewritten, {headers});
    }
    if (request.method === 'HEAD') { await response.body?.cancel(); return new Response(null, {status: response.status, headers}); }
    return new Response(response.body, {status: response.status, headers});
  }
  if (request.headers.get('Authorization') !== 'Bearer ' + env.ACCESS_TOKEN) return json({error: 'Chave de conexão inválida.'}, 401);
  if (url.pathname === '/health' && request.method === 'GET') return json({ready: true});
  if (!['/playlist', '/ticket'].includes(url.pathname) || request.method !== 'POST') return json({error: 'Rota não encontrada.'}, 404);
  if (Number(request.headers.get('Content-Length')) > 16000) return json({error: 'Solicitação muito grande.'}, 413);
  const bodyText = await boundedText(request, 16000);
  let body; try { body = JSON.parse(bodyText); } catch { return json({error: 'Solicitação inválida.'}, 400); }
  const destination = target(body.url, env);
  if (url.pathname === '/ticket') return json({url: await proxyURL(destination.href, request.url, Date.now() + 6 * 60 * 60 * 1000, env, body.hls ? 'hls' : 'auto')});
  const {response} = await upstream(destination.href, env);
  if (!response.ok) { await response.body?.cancel(); return json({error: 'O provedor retornou HTTP ' + response.status + '.'}, response.status); }
  if (Number(response.headers.get('Content-Length')) > 100 * 1024 * 1024) { await response.body?.cancel(); return json({error: 'A lista excede 100 MB.'}, 413); }
  return new Response(response.body, {headers: {'Content-Type': 'text/plain; charset=utf-8'}});
}
export default {
  async fetch(request, env) {
    let response;
    try { response = await route(request, env); } catch (error) {
      const safe = /não autorizado|não autorizada|demais|muito grande|manifesto HLS/.test(error.message) ? error.message : 'Falha ao conectar ao provedor. Verifique os domínios autorizados, as credenciais e a disponibilidade do servidor.';
      response = json({error: safe}, 502);
    }
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', env.APP_ORIGIN || 'https://felipekingx-maker.github.io');
    headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization,Content-Type,Range');
    headers.set('Access-Control-Expose-Headers', 'Content-Length,Content-Range,Accept-Ranges');
    headers.set('Cache-Control', 'no-store'); headers.set('Referrer-Policy', 'no-referrer'); headers.set('X-Content-Type-Options', 'nosniff'); headers.set('Vary', 'Origin');
    return new Response(response.body, {status: response.status, headers});
  }
};
