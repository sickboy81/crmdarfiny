# Extensão CRM Auto Post Facebook

Extensão para o navegador que recebe o rascunho do CRM (mensagem + grupos + fotos por URL) e exibe no Facebook para você postar nos grupos usando sua sessão (sem API).

## Como instalar

1. Abra o Chrome e acesse `chrome://extensions/`.
2. Ative **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta `extension` deste projeto (a pasta que contém `manifest.json`).

A extensão aparecerá na barra de ferramentas. Se o CRM estiver em outro domínio (não localhost), edite o `manifest.json` e adicione seu domínio em `content_scripts[0].matches` e em `host_permissions`.

## Uso

1. No **CRM**, em Auto Post, escolha **Postar via extensão** nas Configurações (aba Facebook).
2. Componha a publicação (texto, fotos por URL, grupos por ID) e clique em **Enviar para extensão**.
3. O CRM grava o rascunho e abre o Facebook. Com a extensão instalada, o rascunho é enviado para a extensão.
4. No **Facebook**, um botão **CRM** aparece no canto inferior direito. Clique para abrir o painel com a mensagem, links dos grupos e botões para copiar a mensagem ou abrir cada grupo em nova aba.
5. Você pode também clicar no ícone da extensão na barra do Chrome para ver o rascunho no popup e abrir o Facebook.

## Funcionalidade

- **Na página do CRM (localhost):** a extensão escuta o evento ao clicar em "Enviar para extensão" e guarda o rascunho no navegador.
- **Na página do Facebook:** exibe um botão flutuante "CRM" que abre um painel com o rascunho (mensagem, lista de grupos com links, URLs de fotos), "Copiar mensagem" e "Limpar rascunho".

A postagem em cada grupo continua manual no Facebook (você abre o grupo e cola/publica). A extensão só facilita ter o texto e os links dos grupos à mão.
