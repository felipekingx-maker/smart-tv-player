(function () {
  'use strict';
  var el = function (id) { return document.getElementById(id); };
  var home = el('home'), category = el('category'), importPage = el('import-page');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var channels = [], filtered = [], shown = 0, selected = 0, importVersion = 0;
  var list = el('channel-list'), search = el('catalog-search'), status = el('playlist-status'), more = el('more-channels');
  var fileInput = el('playlist-file'), panel = el('player-panel'), shell = document.querySelector('.app'), returnFocus;
  var activeFolder = '';
  var serviceFilter = el('service-filter'), groupFilter = el('group-filter');
  var player = window.UniaoPlayer.create(el('video-player'), function (text) { el('player-status').textContent = text; });
  var descriptions = {
    live: ['TV ao vivo', 'Nenhum canal nesta categoria', 'Importe sua lista pela página inicial ou ajuste sua busca.'],
    movies: ['Filmes', 'Nenhum filme nesta categoria', 'Importe sua lista pela página inicial ou ajuste sua busca.'],
    series: ['Séries', 'Nenhuma série nesta categoria', 'Os episódios são listados individualmente nesta versão.'],
    favorites: ['Favoritos', 'Você ainda não tem favoritos', 'Esta função será adicionada em uma próxima etapa.']
  };
  function type() { return cards[selected].getAttribute('data-category'); }
  function announce(text) { status.textContent = text; if (!importPage.hidden) status.scrollIntoView({block: 'nearest'}); }
  el('bridge-form').addEventListener('submit', async function (event) {
    event.preventDefault(); el('bridge-status').textContent = 'Verificando servidor de conexão…';
    try {
      var saved = await window.Bridge.configure(el('bridge-url').value, el('bridge-token').value);
      el('bridge-status').textContent = saved ? 'Conexão salva neste navegador. Será usada automaticamente.' : 'Conexão ativa nesta sessão. O navegador não permitiu salvar.';
      el('bridge-token').value = '';
      document.querySelector('.connection-settings').open = false;
      if (saved) document.querySelector('.connection-settings').hidden = true;
    } catch (error) { el('bridge-status').textContent = error.message; }
  });
  if (window.Bridge.restore()) {
    el('bridge-status').textContent = 'Conexão HTTPS salva · uso automático neste navegador.';
    document.querySelector('.connection-settings').hidden = true;
  }
  el('disconnect-bridge').addEventListener('click', function () {
    window.Bridge.clear(); el('bridge-token').value = ''; el('bridge-url').value = 'https://smart-tv-player.felipe-kingx.workers.dev';
    if (!panel.hidden) closePlayer();
    el('bridge-status').textContent = 'Conexão HTTPS desativada.';
  });
  function counts() {
    var totals = {live: 0, movies: 0, series: 0};
    channels.forEach(function (item) { totals[item.type]++; });
    cards.slice(0, 3).forEach(function (card) { card.querySelector('.card-description').textContent = totals[card.getAttribute('data-category')] + ' itens disponíveis'; });
    el('home-summary').textContent = channels.length + ' itens importados · ' + totals.live + ' canais · ' + totals.movies + ' filmes · ' + totals.series + ' episódios';
  }
  function closePlayer() {
    if (document.fullscreenElement === panel && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    player.stop(); panel.hidden = true; shell.inert = false; document.body.style.overflow = '';
    if (returnFocus && returnFocus.isConnected) returnFocus.focus(); else el('back').focus();
  }
  function playItem(item, button) {
    returnFocus = button; panel.hidden = false; shell.inert = true; document.body.style.overflow = 'hidden';
    el('player-title').textContent = item.name; el('close-player').focus(); player.open(item, window.location.protocol);
  }
  el('close-player').addEventListener('click', closePlayer);
  el('fullscreen-player').addEventListener('click', async function () {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (panel.requestFullscreen) await panel.requestFullscreen();
      else if (el('video-player').webkitEnterFullscreen) el('video-player').webkitEnterFullscreen();
      else throw new Error('Tela cheia indisponível neste navegador.');
    } catch (error) { el('player-status').textContent = 'Não foi possível abrir tela cheia. Tente a tecla F11 no computador.'; }
  });
  document.addEventListener('fullscreenchange', function () {
    el('fullscreen-player').textContent = document.fullscreenElement === panel ? '⛶ Sair da tela cheia' : '⛶ Tela cheia';
  });
  function selectOptions(select, options, title) {
    var previous = select.value;
    select.textContent = '';
    var all = document.createElement('option'); all.value = ''; all.textContent = title; select.appendChild(all);
    options.forEach(function (item) { var option = document.createElement('option'); option.value = item.name; option.textContent = item.name + ' (' + item.count + ')'; select.appendChild(option); });
    select.value = options.some(function (item) { return item.name === previous; }) ? previous : '';
  }
  function refreshFacets() {
    var folders = window.Catalog.facets(channels, type(), type() === 'live' ? 'folders' : 'genres');
    var container = el('folder-list'); container.textContent = '';
    el('folder-heading').textContent = type() === 'live' ? 'Pastas de canais' : 'Gêneros';
    el('service-control').hidden = type() === 'live';
    if (activeFolder && !folders.some(function (item) { return item.name === activeFolder; })) activeFolder = '';
    var total = channels.filter(function (item) { return item.type === type(); }).length;
    [{name: '', count: total}].concat(folders).forEach(function (item) {
      var button = document.createElement('button'); button.className = 'folder-button';
      button.textContent = (item.name || 'Todos') + ' (' + item.count + ')';
      button.setAttribute('aria-pressed', String(item.name === activeFolder));
      button.addEventListener('click', function () {
        activeFolder = item.name;
        Array.prototype.forEach.call(container.querySelectorAll('button'), function (node) { node.setAttribute('aria-pressed', String(node === button)); });
        render(true);
      });
      container.appendChild(button);
    });
    selectOptions(serviceFilter, window.Catalog.facets(channels, type(), 'services'), 'Todos os streamings');
    selectOptions(groupFilter, window.Catalog.facets(channels, type(), 'group'), 'Todos os grupos');
  }
  serviceFilter.addEventListener('change', function () { render(true); });
  groupFilter.addEventListener('change', function () { render(true); });
  el('reset-filters').addEventListener('click', function () {
    activeFolder = ''; serviceFilter.value = ''; groupFilter.value = ''; search.value = ''; refreshFacets(); render(true);
  });
  function render(reset) {
    if (reset) { list.textContent = ''; shown = 0; filtered = window.Catalog.filter(channels, type(), search.value, activeFolder, type() === 'live' ? '' : serviceFilter.value, groupFilter.value); }
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
          item.type = select.value; window.Catalog.decorate(item); counts(); refreshFacets(); render(true);
          var first = list.querySelector('.channel-play'); if (first) first.focus(); else el('back').focus();
        });
        label.appendChild(select); li.appendChild(label);
        var folderLabel = document.createElement('label'), folderSelect = document.createElement('select');
        folderLabel.textContent = item.type === 'live' ? 'Pasta ' : 'Gênero ';
        var automatic = document.createElement('option'); automatic.value = ''; automatic.textContent = 'Automático'; folderSelect.appendChild(automatic);
        (item.type === 'live' ? window.Catalog.liveFolders : window.Catalog.genres).forEach(function (value) {
          var option = document.createElement('option'); option.value = value; option.textContent = value; folderSelect.appendChild(option);
        });
        folderSelect.value = item.type === 'live' ? (item.manualFolder || '') : (item.manualGenre || '');
        folderSelect.addEventListener('change', function () {
          if (item.type === 'live') item.manualFolder = folderSelect.value; else item.manualGenre = folderSelect.value;
          window.Catalog.decorate(item); refreshFacets(); render(true);
          var first = list.querySelector('.channel-play'); if (first) first.focus(); else el('reset-filters').focus();
        });
        folderLabel.appendChild(folderSelect); li.appendChild(folderLabel); list.appendChild(li);
      }(filtered[i]));
    }
    shown = limit; more.hidden = shown >= filtered.length;
    el('catalog-count').textContent = filtered.length + ' itens nesta categoria · ' + shown + ' exibidos';
    el('empty-state').hidden = filtered.length > 0;
  }
  function setCatalog(items) {
    channels = window.Catalog.prepare(items); search.value = ''; activeFolder = ''; serviceFilter.value = ''; groupFilter.value = ''; counts(); refreshFacets(); render(true);
    announce(el('home-summary').textContent + '. Volte ao início para escolher o que assistir.');
    el('clear-list').disabled = false;
  }
  el('clear-list').addEventListener('click', function () {
    importVersion++;
    if (!panel.hidden) closePlayer();
    channels = []; filtered = []; search.value = ''; fileInput.value = '';
    ['m3u-link', 'xtream-server', 'xtream-user', 'xtream-password'].forEach(function (id) { el(id).value = ''; });
    activeFolder = ''; serviceFilter.value = ''; groupFilter.value = ''; counts(); refreshFacets(); render(true); announce('Lista excluída. Importe outra lista quando desejar.');
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
    var samples = [
      ['Globo SP', 'Canais | Globos', 'live'], ['SBT RS', 'Canais | SBTs', 'live'],
      ['TV Cultura', 'Canais | Abertos', 'live'], ['CNN Brasil', 'Canais | Notícias', 'live'],
      ['ESPN', 'Canais | Esportes', 'live'], ['Cartoon', 'Canais | Infantis', 'live'],
      ['Telecine', 'Canais | Filmes', 'live'], ['Canal adulto de exemplo', 'Canais | Adultos', 'live'],
      ['Filme de ação de exemplo', 'Filmes | Netflix | Ação', 'movie'],
      ['Comédia de exemplo', 'Filmes | Prime Video | Comédia', 'movie'],
      ['Série de exemplo S01E01', 'Séries | HBO Max | Drama', 'series'],
      ['Animação de exemplo S01E01', 'Séries | Disney+ | Animação', 'series']
    ];
    var demo = '#EXTM3U\n' + samples.map(function (sample, index) {
      return '#EXTINF:-1 group-title="' + sample[1] + '",' + sample[0] + '\nhttps://example.com/' + sample[2] + '/' + index + (sample[2] === 'live' ? '.m3u8' : '.mp4');
    }).join('\n');
    setCatalog(window.parseM3U(demo));
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
    selected = index; search.value = ''; activeFolder = ''; serviceFilter.value = ''; groupFilter.value = ''; var content = descriptions[type()];
    el('category-title').textContent = content[0]; el('empty-title').textContent = content[1]; el('empty-description').textContent = content[2];
    el('playlist-tools').hidden = type() === 'favorites'; home.hidden = true; importPage.hidden = true; category.hidden = false; refreshFacets(); render(true); el('back').focus();
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
