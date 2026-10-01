(function (root) {
  'use strict';
  function parseM3U(text) {
    var lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    if (!/^#EXTM3U(?:\s|$)/i.test(lines[0].trim())) {
      throw new Error('Arquivo inválido: a lista deve começar com #EXTM3U.');
    }
    var channels = [];
    var pending = null;
    lines.forEach(function (raw) {
      var line = raw.trim();
      if (/^#EXTINF:/i.test(line)) {
        // The title delimiter is the first comma outside quoted attributes.
        var quoted = false;
        var comma = -1;
        for (var i = 0; i < line.length; i++) {
          if (line[i] === '"') quoted = !quoted;
          if (line[i] === ',' && !quoted) { comma = i; break; }
        }
        var group = /group-title="([^"]*)"/i.exec(line.slice(0, comma));
        pending = {name: comma >= 0 ? line.slice(comma + 1).trim() : '', group: group ? group[1] : 'Sem categoria'};
      } else if (line && line[0] !== '#') {
        if (pending && /^https?:\/\/\S+$/i.test(line)) {
          try {
            var url = new URL(line);
            if (url.hostname) channels.push({name: pending.name || 'Canal sem nome', group: pending.group || 'Sem categoria', url: url.href});
          } catch (error) { /* Ignore invalid stream addresses. */ }
        }
        pending = null;
      }
    });
    if (!channels.length) throw new Error('Nenhum canal com endereço HTTP ou HTTPS foi encontrado.');
    return channels;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = parseM3U;
  else root.parseM3U = parseM3U;
}(typeof window !== 'undefined' ? window : this));
