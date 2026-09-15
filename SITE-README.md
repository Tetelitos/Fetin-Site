# Site Turismo Santa Rita

Esta pasta contém a versão web do aplicativo de turismo.

## Versão pronta para publicação

Os arquivos finais estão em `dist`. Essa é a pasta que deve ser enviada para uma hospedagem estática.

## Abrir para desenvolvimento

1. Instale o Node.js.
2. Execute `npm install` nesta pasta.
3. Execute `npm run web`.

## Gerar novamente o site

Execute `npm run build:web`. O resultado atualizado será gravado em `dist`.

No site, a página inicial de rotas turísticas foi substituída pela Mostra de Projetos. Permanecem disponíveis o login, o cadastro e as configurações. A aba inferior Ranking agora mostra a classificação da Mostra de Projetos.

## Publicar no Vercel

Importe esta pasta como a raiz do projeto. O arquivo `vercel.json` configura automaticamente:

- comando de build: `npm run build:web`;
- pasta de saída: `dist`;
- URLs sem a extensão `.html`.

Depois de publicar, adicione o domínio fornecido pelo Vercel aos domínios autorizados do Firebase Authentication para que login e cadastro funcionem online.

### Configurar o painel `/admin`

No Firebase Console, abra **Configurações do projeto → Contas de serviço** e gere uma nova chave privada. No Vercel, em **Settings → Environment Variables**, crie `FIREBASE_SERVICE_ACCOUNT_JSON` e cole todo o conteúdo do arquivo JSON em uma única linha. Ative a variável para Production e Preview e faça um novo deploy.

Somente o proprietário configurado no projeto pode abrir `/admin`. A página lista nome, email e telefone e permite apagar contas; a conta do próprio administrador é protegida contra exclusão pelo painel.
