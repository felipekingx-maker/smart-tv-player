(function (root) {
  'use strict';
  function normalized(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  var liveRules = [
    ['Globos', /\b(globo|globos|rbs|eptv|rpc|tv bahia|inter tv)\b/],
    ['SBTs', /\b(sbt|sbts)\b/],
    ['Abertos', /\b(abertos?|globo|sbt|record|band|rede tv|redetv|tv brasil|cultura|gazeta|rede vida|aparecida)\b/],
    ['Filmes', /\b(filmes?|cinema|telecine|hbo|cinemax|megapix|paramount|studio universal|tnt|space|amc)\b/],
    ['Notícias', /\b(noticias|news|cnn|jovem pan|bandnews|globonews|record news|bbc|bloomberg)\b/],
    ['Adultos', /\b(adultos?|adult|xxx|18\+|18|playboy|sexy|sex|hot|venus|penthouse)\b/],
    ['Esportes', /\b(esportes?|sports?|sportv|espn|premiere|combate|dazn|bandsports|tnt sports|futebol)\b/],
    ['Infantis', /\b(infantis|infantil|kids|cartoon|discovery kids|nick|nickelodeon|gloob|baby|tooncast|boomerang)\b/],
    ['Documentários', /\b(documentarios?|discovery|history|animal planet|national geographic|nat geo|geographic)\b/],
    ['Música', /\b(musica|music|mtv|bis|multishow)\b/],
    ['Religiosos', /\b(religiosos?|gospel|igreja|rede vida|aparecida|novo tempo|cancao nova)\b/]
  ];
  var genreRules = [
    ['Ação', /\b(acao|action)\b/], ['Aventura', /\b(aventura|adventure)\b/],
    ['Comédia', /\b(comedia|comedy)\b/], ['Drama', /\b(drama)\b/],
    ['Romance', /\b(romance|romantico|romantica)\b/], ['Terror', /\b(terror|horror)\b/],
    ['Suspense', /\b(suspense|thriller)\b/], ['Ficção científica', /\b(ficcao|sci.?fi|science fiction)\b/],
    ['Fantasia', /\b(fantasia|fantasy)\b/], ['Animação', /\b(animacao|animation|desenhos?)\b/],
    ['Infantis', /\b(infantis|infantil|kids|familia|family)\b/], ['Documentários', /\b(documentarios?|documentary)\b/],
    ['Crime', /\b(crime|policial)\b/], ['Guerra', /\b(guerra|war)\b/],
    ['Anime', /\b(anime|animes)\b/], ['Novelas', /\b(novelas?|telenovelas?)\b/],
    ['Reality', /\b(reality)\b/], ['Adultos', /\b(adultos?|xxx|18)\b/]
  ];
  var serviceRules = [
    ['Netflix', /\bnetflix\b/], ['Prime Video', /\b(amazon|prime video|prime)\b/],
    ['Disney+', /\b(disney|star\+)\b/], ['HBO / Max', /\b(hbo|max)\b/],
    ['Globoplay', /\bgloboplay\b/], ['Apple TV+', /\b(apple|appletv)\b/],
    ['Paramount+', /\bparamount\b/], ['Discovery+', /\bdiscovery\b/],
    ['Crunchyroll', /\bcrunchyroll\b/], ['Telecine', /\btelecine\b/], ['Hulu', /\bhulu\b/]
  ];
  function matches(rules, text, fallback) {
    var found = rules.filter(function (rule) { return rule[1].test(text); }).map(function (rule) { return rule[0]; });
    return found.length ? found : [fallback];
  }
  function classify(item) {
    var path = new URL(item.url).pathname.toLowerCase(), group = normalized(item.group);
    if (/\/series\//.test(path)) return 'series';
    if (/\/(?:movie|movies|vod)\//.test(path)) return 'movies';
    if (/\/live\//.test(path)) return 'live';
    if (/\b(?:s\d{1,3}\s*e\d{1,3}|\d{1,2}x\d{1,3})\b/i.test(item.name)) return 'series';
    if (/\b(series|serie|seriados|temporadas|episodes|episodios|shows)\b/.test(group)) return 'series';
    if (/\b(canais|channels|live|ao vivo)\b/.test(group)) return 'live';
    if (/\b(filmes|filme|movies|movie|vod|cinema)\b/.test(group)) return 'movies';
    if (/\.(?:mp4|mkv|avi|webm|mov)$/i.test(path)) return 'movies';
    return 'live';
  }
  function decorate(item) {
    var group = normalized(item.group), text = group + ' ' + normalized(item.name);
    item.folders = item.manualFolder ? [item.manualFolder] : matches(liveRules, text, 'Outros');
    // Brand matches can overlap; remove unrelated broad folders (e.g. TNT Sports vs film TNT).
    if (/\btnt sports\b/.test(text)) item.folders = item.folders.filter(function (x) { return x !== 'Filmes'; });
    if (/\b(globonews|globo news)\b/.test(text)) item.folders = ['Notícias'];
    if (/\b(discovery kids)\b/.test(text)) item.folders = ['Infantis'];
    item.genres = item.manualGenre ? [item.manualGenre] : matches(genreRules, group, 'Gênero não informado');
    item.services = matches(serviceRules, group, 'Streaming não informado');
    return item;
  }
  function prepare(items) { return items.map(function (item) { return decorate({name: item.name, group: item.group, url: item.url, type: classify(item)}); }); }
  function filter(items, type, query, folder, service, originalGroup) {
    var term = normalized(query);
    return items.filter(function (item) {
      var folders = type === 'live' ? item.folders : item.genres;
      return item.type === type && (!term || normalized(item.name + ' ' + item.group).indexOf(term) !== -1)
        && (!folder || folders.indexOf(folder) !== -1) && (!service || item.services.indexOf(service) !== -1)
        && (!originalGroup || item.group === originalGroup);
    });
  }
  function facets(items, type, field) {
    var counts = {};
    items.forEach(function (item) {
      if (item.type !== type) return;
      var values = field === 'group' ? [item.group] : item[field];
      values.forEach(function (value) { counts[value] = (counts[value] || 0) + 1; });
    });
    return Object.keys(counts).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }).map(function (name) { return {name: name, count: counts[name]}; });
  }
  var api = {classify: classify, prepare: prepare, decorate: decorate, filter: filter, facets: facets,
    liveFolders: liveRules.map(function (x) { return x[0]; }).concat('Outros'), genres: genreRules.map(function (x) { return x[0]; }).concat('Gênero não informado')};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Catalog = api;
}(typeof window !== 'undefined' ? window : this));
