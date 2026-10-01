# UniaoTv

Protótipo web de um reprodutor para Smart TVs, começando pela interface e navegação.

## Esta versão
- Tela inicial com TV ao vivo, Filmes, Séries e Favoritos.
- Navegação com setas, Enter e Esc/Backspace para voltar.
- Layout adaptável para TV, computador e celular.
- Identificador local persistido no navegador quando o armazenamento está disponível.
- Importação local de arquivo M3U/M3U8 de até 100 MB pela tela Importar lista.
- Importação por link M3U, com limite de 100 MB e tempo limite de 120 segundos.
- Importação Xtream por servidor, usuário e senha usando a exportação M3U get.php do provedor.
- Classificação por grupos, links e nomes em TV ao vivo, Filmes e Séries; episódios individuais.
- Pastas automáticas de canais: Globos, SBTs, Abertos, Filmes, Notícias, Adultos, Esportes, Infantis, Documentários, Música, Religiosos e Outros.
- Filmes e séries: gêneros, filtro de streaming e grupos originais.
- Busca por nome/grupo, correção manual de categoria/pasta/gênero e exibição em lotes de 100.
- Botões Importar lista e Excluir lista na página inicial.
- Player HTML5 para formatos suportados, com HLS.js 1.7.3 carregado sob demanda para HLS.
- Lista fictícia para testar a interface sem um arquivo próprio.

As listas importadas ficam apenas em memória até recarregar a página. O arquivo é processado no navegador, sem envio ao servidor. A classificação do M3U é uma estimativa, pois nem toda lista define o tipo do conteúdo. Categorias sem pistas suficientes ficam em TV ao vivo, e podem ser corrigidas no seletor de cada item. Não inclui autenticação própria ou ativação remota. O identificador local não é uma licença, um MAC ou uma credencial de autenticação.

Links e credenciais são enviados diretamente ao servidor indicado pelo usuário, sem proxy e sem armazenamento local pelo app. O provedor recebe usuário/senha nos parâmetros da exportação Xtream. O GitHub Pages usa HTTPS: o servidor deve oferecer HTTPS e permitir CORS. Servidores sem exportação get.php não são compatíveis com esta integração inicial. Não há integração de catálogo, EPG ou episódios pela API Xtream nesta versão.

## Testar
Abra index.html no navegador, ou use um servidor estático na raiz do projeto.

## GitHub Pages
Em Settings > Pages, escolha Deploy from a branch, selecione main e / (root) e salve.
Após a publicação, o endereço esperado é:
https://felipekingx-maker.github.io/smart-tv-player/

Os caminhos dos arquivos são relativos para funcionar no subdiretório do GitHub Pages.

## Próximas etapas
1. Integração dos catálogos Xtream e organização de temporadas.
2. Publicar o backend HTTPS privado e validar com o provedor.
3. Backend e pareamento seguro de dispositivos.
4. Adaptação e testes em Samsung Tizen e LG webOS.

O protótipo web ainda não é um pacote instalável de TV. Reprodução e navegação precisarão de testes nos aparelhos de destino.

## Limitações de reprodução
O player reproduz diretamente a origem: streams HTTP são bloqueados no site HTTPS, inclusive depois de importar o arquivo. HLS exige CORS quando usa HLS.js; codecs, DRM e formatos como MPEG-TS direto podem não funcionar no navegador. O backend de conexão está em backend/worker.mjs; precisa ser publicado e configurado na tela Importar lista para funcionar. Importar uma lista não garante que cada vídeo seja reproduzível.

## Organização e conexão HTTPS
Os grupos originais são preservados (group-title e EXTGRP), seguindo o modelo documentado pelo OTTPlayer: https://ottplayer.tv/support . A identificação automática não consulta catálogos externos: gêneros e streaming são extraídos do grupo; quando ausentes aparecem como não informados, com ajuste manual de gênero/pasta. Um título pode pertencer a mais de uma pasta/gênero. Os rótulos de streaming indicam o texto informado na lista, não acesso integrado aos serviços oficiais.

Instruções de publicação do servidor privado: backend/README.md. O servidor encaminha playlists HTTP/HTTPS, vídeos, Range e HLS com tickets cifrados. Sem a publicação/configuração, permanece o bloqueio de HTTP no site HTTPS. Esta implementação não converte formatos ou codecs.
