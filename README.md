# UniaoTv

Protótipo web de um reprodutor para Smart TVs, começando pela interface e navegação.

## Esta versão
- Tela inicial com TV ao vivo, Filmes, Séries e Favoritos.
- Navegação com setas, Enter e Esc/Backspace para voltar.
- Layout adaptável para TV, computador e celular.
- Identificador local persistido no navegador quando o armazenamento está disponível.
- Importação local de arquivo M3U/M3U8 de até 2 MB em TV ao vivo.
- Importação por link M3U, com limite de 2 MB e tempo limite de 20 segundos.
- Importação Xtream por servidor, usuário e senha usando a exportação M3U get.php do provedor.
- Nomes e grupos dos canais, apresentados em lotes de 100.
- Lista fictícia para testar a interface sem um arquivo próprio.

As listas importadas ficam apenas em memória até recarregar a página. O arquivo é processado no navegador, sem envio ao servidor. Nesta etapa, todas as entradas são exibidas em TV ao vivo; a separação entre filmes e séries virá depois. Não inclui reprodução, autenticação ou ativação remota. O identificador local não é uma licença, um MAC ou uma credencial de autenticação.

Links e credenciais são enviados diretamente ao servidor indicado pelo usuário, sem proxy e sem armazenamento local pelo app. O provedor recebe usuário/senha nos parâmetros da exportação Xtream. O GitHub Pages usa HTTPS: o servidor deve oferecer HTTPS e permitir CORS. Servidores sem exportação get.php não são compatíveis com esta integração inicial. Não há integração de catálogo, EPG ou episódios pela API Xtream nesta versão.

## Testar
Abra index.html no navegador, ou use um servidor estático na raiz do projeto.

## GitHub Pages
Em Settings > Pages, escolha Deploy from a branch, selecione main e / (root) e salve.
Após a publicação, o endereço esperado é:
https://felipekingx-maker.github.io/smart-tv-player/

Os caminhos dos arquivos são relativos para funcionar no subdiretório do GitHub Pages.

## Próximas etapas
1. Classificação do conteúdo e integração dos catálogos Xtream.
2. Reprodução e validação dos formatos suportados.
3. Backend e pareamento seguro de dispositivos.
4. Adaptação e testes em Samsung Tizen e LG webOS.

O protótipo web ainda não é um pacote instalável de TV. Reprodução e navegação precisarão de testes nos aparelhos de destino.
