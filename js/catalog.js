(function (root) {
  'use strict';
  function normalized(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function classify(item) {
    var path = new URL(item.url).pathname.toLowerCase();
    if (/\/series\//.test(path)) return 'series';
    if (/\/(?:movie|movies|vod)\//.test(path)) return 'movies';
    if (/\/live\//.test(path)) return 'live';
    var group = normalized(item.group);
    if (/\b(series|serie|seriados|temporadas|episodes|episodios|shows)\b/.test(group)) return 'series';
    if (/\b(filmes|filme|movies|movie|vod|cinema)\b/.test(group)) return 'movies';
    if (/\b(tv|live|canais|channels|esportes|sports|noticias|news)\b/.test(group)) return 'live';
    if (/\b(?:s\d{1,3}\s*e\d{1,3}|\d{1,2}x\d{1,3})\b/i.test(item.name)) return 'series';
    if (/\.(?:mp4|mkv|avi|webm|mov)$/i.test(path)) return 'movies';
    return 'live';
  }
  function prepare(items) {
    return items.map(function (item) {
      return {name: item.name, group: item.group, url: item.url, type: classify(item)};
    });
  }
  function filter(items, type, query) {
    var term = normalized(query);
    return items.filter(function (item) {
      return item.type === type && (!term || normalized(item.name + ' ' + item.group).indexOf(term) !== -1);
    });
  }
  var api = {classify: classify, prepare: prepare, filter: filter};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Catalog = api;
}(typeof window !== 'undefined' ? window : this));
