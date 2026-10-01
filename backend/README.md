# Conexão HTTPS do UniaoTv

Worker privado que recebe playlists e vídeos HTTP/HTTPS do provedor e os entrega por HTTPS ao navegador. O código está preparado; precisa ser publicado na sua conta Cloudflare antes de funcionar. O GitHub Pages não executa este backend.

## Publicar pelo painel (sem instalar programas)
1. Na Cloudflare, abra Workers & Pages e crie um Worker chamado uniaotv-conexao.
2. No editor, substitua o código pelo conteúdo de worker.mjs e publique.
3. Em Settings > Variables and Secrets, configure:
   - APP_ORIGIN: https://felipekingx-maker.github.io
   - ALLOWED_HOSTS: domínios exatos do seu provedor e CDN, separados por vírgula, sem http://, portas, usuário ou senha.
   - ALLOWED_PORTS: 80,443,8080,8443 (inclua uma porta diferente somente se seu provedor a utilizar).
   - ACCESS_TOKEN: segredo aleatório de pelo menos 32 caracteres. Crie como Secret, nunca como variável pública ou arquivo do repositório.
4. Desative logs de requisições/observabilidade para não registrar tickets e dados do provedor.
5. No UniaoTv, abra Importar lista > Conexão HTTPS, cole o endereço HTTPS do Worker e a chave ACCESS_TOKEN. Os dados de conexão ficam apenas na memória desta sessão.
6. Importe a lista por link ou Xtream, ou abra os vídeos de uma lista importada por arquivo.

## Publicar por CLI (alternativa)
Na pasta backend, use Wrangler: configure os domínios em wrangler.toml, faça login, defina ACCESS_TOKEN com wrangler secret put ACCESS_TOKEN e publique com wrangler deploy. Nunca adicione o segredo a wrangler.toml ou a um commit.

## Funcionamento
- /health: verifica a configuração, exige Bearer ACCESS_TOKEN.
- /playlist: importa uma URL autorizada; exige Bearer ACCESS_TOKEN.
- /ticket: cria um endereço HTTPS temporário para reprodução; exige Bearer ACCESS_TOKEN.
- /stream: transmite o conteúdo usando um ticket cifrado, válido por 6 horas. Rotacionar ACCESS_TOKEN invalida os tickets anteriores.
- HLS: reescreve manifestos, sublistas, segmentos, legendas e chaves com URI HTTP/HTTPS para passar pelo mesmo Worker.
- MP4: transmissão em fluxo e suporte a Range para avançar/retroceder.

Não é um proxy público: só acessa domínios e portas autorizados e exige a chave ou um ticket válido. Não encaminha cookies, Authorization do navegador ou cabeçalhos privados. Credenciais do provedor continuam sendo enviadas ao provedor de origem (em HTTP, sem criptografia nesse trecho). Tickets cifram o endereço da origem, mas permitem acesso a quem os possuir até a expiração; não os compartilhe.

O relay resolve HTTP/CORS no navegador; não converte codecs, MPEG-TS direto em HLS, nem remove DRM. Conteúdo HTTPS misto em HLS também precisa ter todos os hosts na lista autorizada. Variáveis HLS em URIs não são suportadas nesta primeira versão. Vídeos longos além de 6 horas precisam ser reabertos.

Verifique os limites e condições da sua conta Cloudflare para o tráfego de vídeo antes de uso em produção. Não há promessa de hospedagem de vídeo ilimitada ou gratuita. A origem pode restringir conexões por IP ou sessões.

## Verificação local
node --test test.mjs
