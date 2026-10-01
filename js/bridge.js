(function (root) {
  'use strict';
  var config = null;
  var revision = 0;
  async function call(path, payload, settings) {
    var connection = settings || config;
    if (!connection) throw new Error('Configure a Conexão HTTPS na tela Importar lista para usar servidores HTTP ou que bloqueiam CORS.');
    var headers = {Authorization: 'Bearer ' + connection.token};
    var options = {method: payload ? 'POST' : 'GET', headers: headers, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(120000)};
    if (payload) { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(payload); }
    var response;
    try { response = await root.fetch(new URL(path, connection.base).href, options); }
    catch (error) { throw new Error('Não foi possível acessar a Conexão HTTPS. Verifique o endereço e se o servidor foi publicado.'); }
    if (!response.ok) {
      var message = 'Falha na Conexão HTTPS (HTTP ' + response.status + ').';
      try { var data = await response.json(); if (data.error) message = data.error; } catch (error) { /* Use safe fallback. */ }
      throw new Error(message);
    }
    return response;
  }
  async function configure(base, token) {
    var parsed;
    try { parsed = new URL(base.trim()); } catch (error) { throw new Error('Informe o endereço HTTPS do servidor de conexão.'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('Use a raiz HTTPS do seu servidor, por exemplo https://uniaotv-conexao.conta.workers.dev.');
    if (token.length < 32) throw new Error('A chave de conexão precisa ter pelo menos 32 caracteres.');
    var current = ++revision;
    var candidate = {base: parsed.origin, token: token};
    await call('/health', null, candidate);
    if (current !== revision) throw new Error('Configuração cancelada ou substituída.');
    config = candidate;
  }
  var api = {
    configured: function () { return !!config; }, configure: configure, clear: function () { revision++; config = null; },
    playlist: function (url) { return call('/playlist', {url: url.href}); },
    playback: async function (info) { var response = await call('/ticket', {url: info.url, hls: info.hls}); var body = await response.json(); var target = new URL(body.url); if (target.origin !== config.base || target.protocol !== 'https:') throw new Error('Resposta inválida da Conexão HTTPS.'); return {url: target.href, hls: info.hls}; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Bridge = api;
}(typeof window !== 'undefined' ? window : this));
