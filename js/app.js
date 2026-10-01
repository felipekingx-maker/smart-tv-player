(function () {
  'use strict';
  var home = document.getElementById('home');
  var category = document.getElementById('category');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var back = document.getElementById('back');
  var selected = 0;
  var channels = [];
  var shownChannels = 0;
  var importVersion = 0;
  var list = document.getElementById('channel-list');
  var status = document.getElementById('playlist-status');
  var fileInput = document.getElementById('playlist-file');
  var more = document.getElementById('more-channels');

  function announce(message) {
    status.textContent = message;
    status.scrollIntoView({block: 'nearest'});
  }

  async function importRemote(makeURL, sourceName) {
    var version = ++importVersion;
    announce('Conectando ao servidor de ' + sourceName + '… Aguarde até 120 segundos.');
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
      try { parsed = window.parseM3U(text); }
      catch (error) { throw new Error('O servidor não retornou uma lista M3U válida. Verifique o link ou os dados da conta.'); }
      channels = parsed;
      renderChannels(true);
      announce(status.textContent + ' · Origem: ' + sourceName);
    } catch (error) {
      if (version === importVersion) announce(error.message + (channels.length ? ' Sua lista anterior foi mantida.' : ''));
    }
  }
  document.getElementById('m3u-link-form').addEventListener('submit', function (event) {
    event.preventDefault();
    importRemote(function () {
      return window.PlaylistSources.validateURL(document.getElementById('m3u-link').value, window.location.protocol);
    }, 'link M3U');
  });
  document.getElementById('xtream-form').addEventListener('submit', function (event) {
    event.preventDefault();
    importRemote(function () {
      return window.PlaylistSources.xtreamURL(document.getElementById('xtream-server').value, document.getElementById('xtream-user').value, document.getElementById('xtream-password').value, window.location.protocol);
    }, 'Xtream');
  });

  function renderChannels(reset) {
    if (reset) { list.textContent = ''; shownChannels = 0; }
    var limit = Math.min(shownChannels + 100, channels.length);
    for (var i = shownChannels; i < limit; i++) {
      var item = document.createElement('li');
      var name = document.createElement('strong');
      var group = document.createElement('span');
      name.textContent = channels[i].name;
      group.textContent = channels[i].group;
      item.appendChild(name);
      item.appendChild(group);
      list.appendChild(item);
    }
    shownChannels = limit;
    status.textContent = channels.length + ' canais importados · ' + shownChannels + ' exibidos';
    more.hidden = shownChannels >= channels.length;
    document.getElementById('empty-state').hidden = selected === 0 && channels.length > 0;
  }

  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0];
    if (!file) return;
    var version = ++importVersion;
    if (file.size > 100 * 1024 * 1024) {
      announce('Selecione um arquivo de até 100 MB.');
      fileInput.value = '';
      return;
    }
    announce('Importando lista…');
    var reader = new FileReader();
    reader.onload = function () {
      if (version !== importVersion) return;
      try { channels = window.parseM3U(reader.result); renderChannels(true); }
      catch (error) { status.textContent = error.message + ' Sua lista anterior foi mantida.'; }
      fileInput.value = '';
    };
    reader.onerror = function () {
      if (version !== importVersion) return;
      status.textContent = 'Não foi possível ler o arquivo. Tente novamente.';
      fileInput.value = '';
    };
    reader.readAsText(file);
  });
  document.getElementById('demo-list').addEventListener('click', function () {
    importVersion++;
    channels = window.parseM3U('#EXTM3U\n#EXTINF:-1 group-title="Exemplo",Canal de exemplo 1\nhttps://example.com/demo1.m3u8\n#EXTINF:-1 group-title="Exemplo",Canal de exemplo 2\nhttps://example.com/demo2.m3u8\n#EXTINF:-1 group-title="Exemplo",Canal de exemplo 3\nhttps://example.com/demo3.m3u8');
    renderChannels(true);
    status.textContent += ' · Lista fictícia, sem transmissão.';
  });
  more.addEventListener('click', function () { renderChannels(false); if (more.hidden) back.focus(); });
  var descriptions = {
    live: ['TV ao vivo', 'Nenhum canal cadastrado', 'Seus canais aparecerão aqui quando uma playlist for adicionada.'],
    movies: ['Filmes', 'Nenhum filme cadastrado', 'Os filmes disponíveis na sua playlist aparecerão aqui.'],
    series: ['Séries', 'Nenhuma série cadastrada', 'As séries disponíveis na sua playlist aparecerão aqui.'],
    favorites: ['Favoritos', 'Você ainda não tem favoritos', 'Os canais e títulos que você marcar como favoritos aparecerão aqui.']
  };

  function generateId() {
    var bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.prototype.map.call(bytes, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('').toUpperCase();
  }

  var deviceId;
  try {
    deviceId = window.localStorage.getItem('smart-tv-player.device-id');
    if (!deviceId || !/^[A-F0-9]{12}$/.test(deviceId)) {
      deviceId = generateId();
      window.localStorage.setItem('smart-tv-player.device-id', deviceId);
    }
  } catch (error) {
    deviceId = generateId();
    document.getElementById('device-note').textContent = 'Identificador temporário · armazenamento indisponível';
  }
  document.getElementById('device-id').textContent = deviceId;
  // Local identifier only: never use it as an authentication or activation secret.

  function openCategory(index) {
    selected = index;
    var content = descriptions[cards[index].getAttribute('data-category')];
    document.getElementById('category-title').textContent = content[0];
    document.getElementById('empty-title').textContent = content[1];
    document.getElementById('empty-description').textContent = content[2];
    var isLive = cards[index].getAttribute('data-category') === 'live';
    document.getElementById('playlist-tools').hidden = !isLive;
    document.getElementById('empty-state').hidden = isLive && channels.length > 0;
    home.hidden = true;
    category.hidden = false;
    back.focus();
  }

  function goHome() {
    category.hidden = true;
    home.hidden = false;
    cards[selected].focus();
  }

  cards.forEach(function (card, index) {
    card.addEventListener('click', function () { openCategory(index); });
    card.addEventListener('focus', function () { selected = index; });
  });
  back.addEventListener('click', goHome);

  document.addEventListener('keydown', function (event) {
    var key = event.key;
    if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (key === 'Escape' || key === 'Backspace' || event.keyCode === 10009) {
      if (!category.hidden) {
        event.preventDefault();
        goHome();
      }
      return;
    }
    if (home.hidden || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(key) === -1) return;
    event.preventDefault();
    var columns = window.getComputedStyle(document.querySelector('.menu')).gridTemplateColumns.split(/\s+/).length;
    var next = selected;
    if (key === 'ArrowLeft' && selected % columns > 0) next--;
    if (key === 'ArrowRight' && selected % columns < columns - 1) next++;
    if (key === 'ArrowUp') next -= columns;
    if (key === 'ArrowDown') next += columns;
    if (next >= 0 && next < cards.length) cards[next].focus();
  });
  cards[0].focus();
}());
