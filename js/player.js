(function (root) {
  'use strict';
  function source(value, pageProtocol) {
    var url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) throw new Error('Formato de endereço não suportado.');
    if (pageProtocol === 'https:' && url.protocol === 'http:' && !(root.Bridge && root.Bridge.configured())) {
      throw new Error('Configure a Conexão HTTPS na tela Importar lista para reproduzir este vídeo HTTP. O servidor privado precisa estar publicado.');
    }
    return {url: url.href, hls: /\.m3u8$/i.test(url.pathname) || url.searchParams.get('output') === 'm3u8'};
  }
  var library;
  function loadHls() {
    if (root.Hls) return Promise.resolve(root.Hls);
    if (!library) library = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      var timer = setTimeout(function () { reject(new Error('Não foi possível carregar o suporte HLS. Verifique sua conexão.')); }, 15000);
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js';
      script.referrerPolicy = 'no-referrer';
      script.onload = function () { clearTimeout(timer); if (root.Hls) resolve(root.Hls); else reject(new Error('Suporte HLS indisponível.')); };
      script.onerror = function () { clearTimeout(timer); reject(new Error('Não foi possível carregar o suporte HLS.')); };
      document.head.appendChild(script);
    }).catch(function (error) { library = null; throw error; });
    return library;
  }
  function create(video, onStatus) {
    var hls = null;
    var version = 0;
    var timer;
    var active = false;
    var failed = false;
    var resolvedURL;
    var diagnostic;
    function stop() {
      version++;
      active = false;
      failed = false;
      resolvedURL = null;
      if (diagnostic) { diagnostic.abort(); diagnostic = null; }
      clearTimeout(timer);
      if (hls) { hls.destroy(); hls = null; }
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    function fail(message) {
      failed = true; clearTimeout(timer); onStatus(message);
    }
    async function diagnose(current) {
      if (failed || current !== version || !active) return;
      fail('Verificando a falha de reprodução…');
      var code = video.error && video.error.code;
      var message = code === 3 ? 'O navegador não conseguiu decodificar este vídeo. Teste uma versão HD ou SD do canal.' :
        code === 4 ? 'O vídeo não carregou ou usa um formato incompatível com este navegador.' : 'A conexão com o vídeo falhou.';
      if (resolvedURL) {
        var controller = new AbortController(); diagnostic = controller;
        var timeout = setTimeout(function () { controller.abort(); }, 10000);
        try {
          var response = await root.fetch(resolvedURL, {headers: {Range: 'bytes=0-0'}, signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer'});
          if (!response.ok) {
            message = 'O servidor de vídeo retornou HTTP ' + response.status + '.';
            if (root.Bridge && root.Bridge.configured()) {
              try { var body = await response.json(); if (body.error) message = body.error; } catch (error) { /* Keep HTTP status. */ }
            }
          }
          if (response.body) await response.body.cancel();
        } catch (error) { /* Preserve the media error when diagnostics cannot connect. */ }
        finally { clearTimeout(timeout); if (diagnostic === controller) diagnostic = null; }
      }
      if (current === version && active) onStatus(message);
    }
    video.addEventListener('playing', function () { if (active) { failed = false; clearTimeout(timer); onStatus(''); } });
    video.addEventListener('waiting', function () { if (active && !failed) onStatus('Carregando vídeo…'); });
    video.addEventListener('error', function () { if (active) diagnose(version); });
    function play(current) {
      var promise = video.play();
      if (promise) promise.catch(function (error) {
        if (current !== version || !active || failed) return;
        if (error.name === 'NotAllowedError') onStatus('Pressione Play no vídeo para iniciar.');
        else if (error.name !== 'AbortError') diagnose(current);
      });
    }
    async function open(item, pageProtocol) {
      stop();
      var current = version;
      active = true;
      onStatus('Conectando ao vídeo…');
      try {
        var info = source(item.url, pageProtocol);
        if (root.Bridge && root.Bridge.configured()) {
          onStatus('Conectando pelo seu servidor HTTPS…');
          info = await root.Bridge.playback(info);
          if (current !== version || !active) return;
        }
        resolvedURL = info.url;
        timer = setTimeout(function () { if (current === version && active) onStatus('O vídeo não iniciou. Verifique se o servidor permite acesso pelo navegador (CORS), se a conta está ativa e se o formato é compatível.'); }, 25000);
        if (info.hls && !video.canPlayType('application/vnd.apple.mpegurl')) {
          var Hls = await loadHls();
          if (current !== version || !active) return;
          if (!Hls.isSupported()) throw new Error('Este navegador não suporta reprodução HLS.');
          hls = new Hls({debug: false});
          hls.on(Hls.Events.MANIFEST_PARSED, function () { play(current); });
          hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal && current === version && active) {
              clearTimeout(timer);
              var code = data.response && data.response.code;
              fail(code ? 'O servidor de vídeo retornou HTTP ' + code + '.' : 'Falha na reprodução HLS (' + data.details + '). Verifique a conexão e a compatibilidade do vídeo.');
              hls.destroy(); hls = null;
            }
          });
          hls.loadSource(info.url);
          hls.attachMedia(video);
        } else {
          video.src = info.url;
          play(current);
        }
      } catch (error) { if (current === version && active) { clearTimeout(timer); onStatus(error.message); } }
    }
    return {open: open, stop: stop};
  }
  var api = {source: source, create: create};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UniaoPlayer = api;
}(typeof window !== 'undefined' ? window : this));
