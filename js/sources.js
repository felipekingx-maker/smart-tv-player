(function (root) {
  'use strict';
  var MAX_BYTES = 100 * 1024 * 1024;
  function validateURL(value, pageProtocol) {
    var url;
    try { url = new URL(value.trim()); }
    catch (error) { throw new Error('Digite um endereço completo, começando com https:// ou http://.'); }
    if (!/^https?:$/.test(url.protocol) || !url.hostname || url.username || url.password) {
      throw new Error('Use um endereço HTTP ou HTTPS válido, sem usuário e senha no domínio.');
    }
    if (pageProtocol === 'https:' && url.protocol === 'http:' && !(root.Bridge && root.Bridge.configured())) {
      throw new Error('Configure a Conexão HTTPS na tela Importar lista para carregar este servidor HTTP.');
    }
    return url;
  }
  function xtreamURL(server, user, password, pageProtocol) {
    var url = validateURL(server, pageProtocol);
    if (!user.trim() || !password) throw new Error('Informe o usuário e a senha do Xtream.');
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.replace(/\/(?:get\.php|player_api\.php)\/?$/i, '').replace(/\/$/, '') + '/get.php';
    url.searchParams.set('username', user.trim());
    url.searchParams.set('password', password);
    url.searchParams.set('type', 'm3u_plus');
    url.searchParams.set('output', 'm3u8');
    return url;
  }
  async function download(url, fetcher, onProgress) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 120000);
    try {
      var response = root.Bridge && root.Bridge.configured() ? await root.Bridge.playlist(url) : await fetcher(url.href, {signal: controller.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer'});
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error('Acesso negado. Verifique os dados e a validade da conta.');
        throw new Error('O servidor não retornou a lista (HTTP ' + response.status + ').');
      }
      if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('A lista excede o limite de 100 MB desta versão.');
      var text;
      if (response.body && response.body.getReader) {
        var reader = response.body.getReader();
        var decoder = new TextDecoder('utf-8');
        var size = 0;
        var chunks = [];
        while (true) {
          var part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > MAX_BYTES) { await reader.cancel(); throw new Error('A lista excede o limite de 100 MB desta versão.'); }
          if (onProgress) onProgress(size);
          chunks.push(decoder.decode(part.value, {stream: true}));
        }
        text = chunks.join('') + decoder.decode();
      } else {
        text = await response.text();
        if (new TextEncoder().encode(text).byteLength > MAX_BYTES) throw new Error('A lista excede o limite de 100 MB desta versão.');
      }
      return text;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('O servidor demorou demais. Tente novamente.');
      if (error instanceof TypeError) throw new Error('Não foi possível acessar o servidor. Verifique o endereço, a conexão e se o provedor permite acesso pelo navegador (CORS).');
      throw error;
    } finally { clearTimeout(timer); }
  }
  var api = {validateURL: validateURL, xtreamURL: xtreamURL, download: download};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlaylistSources = api;
}(typeof window !== 'undefined' ? window : this));
