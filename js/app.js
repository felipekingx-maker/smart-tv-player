(function () {
  'use strict';
  var home = document.getElementById('home');
  var category = document.getElementById('category');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var back = document.getElementById('back');
  var selected = 0;
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
