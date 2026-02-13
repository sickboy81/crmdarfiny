# Auto Post em Grupos do Facebook – Guia de configuração

Esta função permite publicar a mesma mensagem em vários grupos do Facebook, com intervalo configurável entre cada postagem (estilo [FewFeed](https://v2.fewfeed.com/tool/auto-post-fb-group)).

## 1. Criar um App na Meta

1. Acesse [developers.facebook.com](https://developers.facebook.com) e faça login.
2. Vá em **Meus Apps** → **Criar App**.
3. Escolha o tipo **Consumidor** (ou **Negócios**, se preferir).
4. Preencha nome do app e email de contato; crie o app.

## 2. Adicionar o produto Facebook Login

1. No painel do app, em **Adicionar produtos**, clique em **Configurar** em **Facebook Login**.
2. Escolha **Web** e informe a URL do seu site (para desenvolvimento pode usar `http://localhost:5173` ou similar).
3. Nas configurações de **Facebook Login** → **Configurações**, adicione em **URIs de redirecionamento OAuth válidos** a URL onde o app roda (ex.: `http://localhost:5173`).

## 3. Solicitar permissões

Para postar em grupos e listá-los, o app precisa das seguintes permissões:

- **`publish_to_groups`** – publicar em grupos em nome do usuário.
- **`user_groups`** – listar grupos do usuário (a Meta pode restringir e retornar apenas grupos em que o app tem papel; nesse caso use “Adicionar grupo por ID”).

No painel do app: **Facebook Login** → **Permissões e recursos** → adicione as permissões acima. Para testes com sua conta, você pode autorizar o app em modo de desenvolvimento.

## 4. Obter o User Access Token

Para testes rápidos:

1. Acesse o [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Selecione seu app no dropdown **Meta App**.
3. Clique em **Gerar token de acesso** e escolha **User Token**.
4. Marque as permissões `publish_to_groups` e `user_groups`.
5. Faça login e autorize; copie o token gerado.
6. No CRM, vá em **Configurações** → aba **Facebook (Auto Post)** → cole o token e clique em **Salvar**.

**Aviso:** Esse token é pessoal e pode expirar. Para uso em produção com vários usuários seria necessário implementar o fluxo completo de Login com Facebook (OAuth) em um backend.

## 5. Descobrir o ID de um grupo

Se a opção **Carregar meus grupos** não listar o grupo desejado (restrições da Meta), use o ID do grupo:

1. Abra o grupo no Facebook.
2. A URL será algo como: `https://www.facebook.com/groups/123456789012345/`.
3. O número `123456789012345` é o **ID do grupo**.
4. Na tela **Auto Post**, use o campo **Adicionar grupo por ID** e informe esse número.

## 6. Uso da função Auto Post

1. No menu do CRM, clique em **Auto Post**.
2. Digite o **texto da publicação**.
3. Defina o **intervalo entre postagens** (recomendado: 3 segundos).
4. Adicione grupos:
   - **Carregar meus grupos** – lista grupos retornados pela API (quando disponíveis).
   - **Adicionar grupo por ID** – inclui um grupo pelo ID obtido na URL.
5. Clique em **Postar em todos**. A mesma mensagem será publicada em cada grupo, com o intervalo definido entre uma e outra.
6. O resultado (sucesso ou erro por grupo) aparece no painel à direita.

## Limites e políticas

- O uso do token e da API do Facebook é de sua responsabilidade; evite spam e respeite os [Termos e Políticas da Meta](https://developers.facebook.com/terms/).
- A Meta pode limitar a listagem de grupos (`user_groups`); a opção de adicionar grupo por ID garante uso mesmo nesses casos.
- Tokens de usuário podem expirar; se as postagens falharem, gere um novo token no Graph API Explorer e atualize nas Configurações.
