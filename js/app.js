(function () {
  'use strict';
  var el = function (id) { return document.getElementById(id); };
  var home = el('home'), category = el('category'), importPage = el('import-page');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var channels = [], filtered = [], shown = 0, selected = 0, importVersion = 0;
  var list = el('channel-list'), search = el('catalog-search'), status = el('playlist-status'), more = el('more-channels');
  var fileInput = el('playlist-file'), panel = el('player-panel'), shell = document.querySelector('.app'), returnFocus;
  var player = window.UniaoPlayer.create(el('video-player'), function (text) { el('player-status').textContent = text; });
  var descriptions = {
    live: ['TV ao vivo', 'Nenhum canal nesta categoria', 'Importe sua lista pela página inicial ou ajuste sua busca.'],
    movies: ['Filmes', 'Nenhum filme nesta categoria', 'Importe sua lista pela página inicial ou ajuste sua busca.'],
    series: ['Séries', 'Nenhuma série nesta categoria', 'Os episódios são listados individualmente nesta versão.'],
    favorites: ['Favoritos', 'Você ainda não tem favoritos', 'Esta função será adicionada em uma próxima etapa.']
  };
  function type() { return cards[selected].getAttribute('data-category'); }
  function announce(text) { status.textContent = text; if (!importPage.hidden) status.scrollIntoView({block: 'nearest'}); }
  function counts() {
    var totals = {live: 0, movies: 0, series: 0};
    channels.forEach(function (item) { totals[item.type]++; });
    cards.slice(0, 3).forEach(function (card) { card.querySelector('.card-description').textContent = totals[card.getAttribute('data-category')] + ' itens disponíveis'; });
    el('home-summary').textContent = channels.length + ' itens importados · ' + totals.live + ' canais · ' + totals.movies + ' filmes · ' + totals.series + ' episódios';
  }
  function closePlayer() {
    player.stop(); panel.hidden = true; shell.inert = false; document.body.style.overflow = '';
    if (returnFocus && returnFocus.isConnected) returnFocus.focus(); else el('back').focus();
  }
  function playItem(item, button) {
    returnFocus = button; panel.hidden = false; shell.inert = true; document.body.style.overflow = 'hidden';
    el('player-title').textContent = item.name; el('close-player').focus(); player.open(item, window.location.protocol);
  }
  el('close-player').addEventListener('click', closePlayer);
  function render(reset) {
    if (reset) { list.textContent = ''; shown = 0; filtered = window.Catalog.filter(channels, type(), search.value); }
    var limit = Math.min(shown + 100, filtered.length);
    for (var i = shown; i < limit; i++) {
      (function (item) {
        var li = document.createElement('li'), button = document.createElement('button'); button.className = 'channel-play';
        var name = document.createElement('strong'), group = document.createElement('span');
        name.textContent = '▶ ' + item.name; group.textContent = item.group;
        button.appendChild(name); button.appendChild(group); button.addEventListener('click', function () { playItem(item, button); }); li.appendChild(button);
        var label = document.createElement('label'), select = document.createElement('select'); label.textContent = 'Categoria ';
        [['live', 'TV ao vivo'], ['movies', 'Filmes'], ['series', 'Séries']].forEach(function (pair) {
          var option = document.createElement('option'); option.value = pair[0]; option.textContent = pair[1]; select.appendChild(option);
        });
        select.value = item.type;
        select.addEventListener('change', function () {
          item.type = select.value; counts(); render(true);
          var first = list.querySelector('.channel-play'); if (first) first.focus(); else el('back').focus();
        });
        label.appendChild(select); li.appendChild(label); list.appendChild(li);
      }(filtered[i]));
    }
    shown = limit; more.hidden = shown >= filtered.length;
    el('catalog-count').textContent = filtered.length + ' itens nesta categoria · ' + shown + ' exibidos';
    el('empty-state').hidden = filtered.length > 0;
  }
  function setCatalog(items) {
    channels = window.Catalog.prepare(items); search.value = ''; counts(); render(true);
    announce(el('home-summary').textContent + '. Volte ao início para escolher o que assistir.');
    el('clear-list').disabled = false;
  }
  el('clear-list').addEventListener('click', function () {
    importVersion++;
    if (!panel.hidden) closePlayer();
    channels = []; filtered = []; search.value = ''; fileInput.value = '';
    ['m3u-link', 'xtream-server', 'xtream-user', 'xtream-password'].forEach(function (id) { el(id).value = ''; });
    counts(); render(true); announce('Lista excluída. Importe outra lista quando desejar.');
    el('home-summary').textContent = 'Lista excluída. Nenhum conteúdo carregado.';
    el('clear-list').disabled = true; el('open-import').focus();
  });
  async function importRemote(makeURL, sourceName) {
    var version = ++importVersion; announce('Conectando ao servidor de ' + sourceName + '… Aguarde até 120 segundos.');
    try {
      var url = makeURL();
      var text = await window.PlaylistSources.download(url, window.fetch.bind(window), function (bytes) {
        if (version === importVersion) status.textContent = 'Baixando lista: ' + (bytes / 1024 / 1024).toFixed(1) + ' MB recebidos…';
      });
      if (version !== importVersion) return;
      status.textContent = 'Lista recebida. Organizando os itens…';
      await new Promise(function (resolve) { setTimeout(resolve, 0); });
      if (version !== importVersion) return;
      var parsed;
      try { parsed = window.parseM3U(text); } catch (error) { throw new Error('O servidor não retornou uma lista M3U válida. Verifique o link ou os dados da conta.'); }
      setCatalog(parsed);
    } catch (error) { if (version === importVersion) announce(error.message + (channels.length ? ' Sua lista anterior foi mantida.' : '')); }
  }
  el('m3u-link-form').addEventListener('submit', function (event) {
    event.preventDefault(); importRemote(function () { return window.PlaylistSources.validateURL(el('m3u-link').value, window.location.protocol); }, 'link M3U');
  });
  el('xtream-form').addEventListener('submit', function (event) {
    event.preventDefault(); importRemote(function () { return window.PlaylistSources.xtreamURL(el('xtream-server').value, el('xtream-user').value, el('xtream-password').value, window.location.protocol); }, 'Xtream');
  });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0]; if (!file) return;
    var version = ++importVersion;
    if (file.size > 100 * 1024 * 1024) { announce('Selecione um arquivo de até 100 MB.'); fileInput.value = ''; return; }
    announce('Importando e classificando a lista…'); var reader = new FileReader();
    reader.onload = function () {
      if (version !== importVersion) return;
      try { setCatalog(window.parseM3U(reader.result)); } catch (error) { announce(error.message + (channels.length ? ' Sua lista anterior foi mantida.' : '')); }
      fileInput.value = '';
    };
    reader.onerror = function () { if (version === importVersion) { announce('Não foi possível ler o arquivo. Tente novamente.'); fileInput.value = ''; } };
    reader.readAsText(file);
  });
  el('demo-list').addEventListener('click', function () {
    importVersion++;
    setCatalog(window.parseM3U('#EXTM3U\n#EXTINF:-1 group-title="Canais",Canal de exemplo\nhttps://example.com/live/1.m3u8\n#EXTINF:-1 group-title="Filmes",Filme de exemplo\nhttps://example.com/movie/1.mp4\n#EXTINF:-1 group-title="Séries",Série de exemplo S01E01\nhttps://example.com/series/1.mp4'));
    announce(status.textContent + ' Lista fictícia, sem transmissão.');
  });
  more.addEventListener('click', function () { render(false); if (more.hidden) el('back').focus(); });
  var searchTimer;
  search.addEventListener('input', function () { clearTimeout(searchTimer); searchTimer = setTimeout(function () { render(true); }, 150); });
  function goHome(focusImport) {
    if (!panel.hidden) closePlayer(); category.hidden = true; importPage.hidden = true; home.hidden = false;
    if (focusImport) el('open-import').focus(); else cards[selected].focus();
  }
  function openCategory(index) {
    selected = index; search.value = ''; var content = descriptions[type()];
    el('category-title').textContent = content[0]; el('empty-title').textContent = content[1]; el('empty-description').textContent = content[2];
    el('playlist-tools').hidden = type() === 'favorites'; home.hidden = true; importPage.hidden = true; category.hidden = false; render(true); el('back').focus();
  }
  cards.forEach(function (card, index) {
    card.addEventListener('click', function () { openCategory(index); }); card.addEventListener('focus', function () { selected = index; });
  });
  el('back').addEventListener('click', function () { goHome(false); });
  el('back-import').addEventListener('click', function () { goHome(true); });
  el('open-import').addEventListener('click', function () { home.hidden = true; category.hidden = true; importPage.hidden = false; el('back-import').focus(); });
  function generateId() {
    var bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').toUpperCase();
  }
  var deviceId;
  try {
    deviceId = window.localStorage.getItem('smart-tv-player.device-id');
    if (!deviceId || !/^[A-F0-9]{12}$/.test(deviceId)) { deviceId = generateId(); window.localStorage.setItem('smart-tv-player.device-id', deviceId); }
  } catch (error) { deviceId = generateId(); el('device-note').textContent = 'Identificador temporário · armazenamento indisponível'; }
  el('device-id').textContent = deviceId;
  document.addEventListener('keydown', function (event) {
    var key = event.key, tag = event.target.tagName;
    if (key === 'Escape' || event.keyCode === 10009 || (key === 'Backspace' && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag))) {
      if (!panel.hidden) { event.preventDefault(); closePlayer(); }
      else if (!home.hidden) return;
      else { event.preventDefault(); goHome(!importPage.hidden); } return;
    }
    if (!panel.hidden || /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(key) === -1) return;
    var buttons, grid;
    if (!home.hidden) { buttons = cards; grid = document.querySelector('.menu'); }
    else if (!category.hidden) { buttons = Array.prototype.slice.call(list.querySelectorAll('.channel-play')); grid = list; }
    else return;
    var index = buttons.indexOf(document.activeElement);
    if (index < 0) { if (key === 'ArrowDown' && buttons.length) { event.preventDefault(); buttons[0].focus(); } return; }
    event.preventDefault(); var columns = window.getComputedStyle(grid).gridTemplateColumns.split(/\s+/).length, next = index;
    if (key === 'ArrowLeft' && index % columns > 0) next--;
    if (key === 'ArrowRight' && index % columns < columns - 1) next++;
    if (key === 'ArrowUp') next -= columns;
    if (key === 'ArrowDown') next += columns;
    if (next >= 0 && next < buttons.length) buttons[next].focus();
    else if (!home.hidden && key === 'ArrowDown') el('open-import').focus();
    else if (!category.hidden && key === 'ArrowUp') el('back').focus();
  });
  cards[0].focus();
}());
