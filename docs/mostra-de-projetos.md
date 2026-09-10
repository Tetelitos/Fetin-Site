# Mostra de Projetos

## Visão geral

O modo da mostra é separado do turismo normal. Ele reutiliza o usuário autenticado, o tema e o leitor de QR Code, mas usa as coleções `eventTeams`, `eventQrTokens`, `eventVisitProofs`, `eventVisits` e `eventRanking`.

As quatro plantas ficam em:

- `assets/feira/predio-2.png`
- `assets/feira/predio-3.png`
- `assets/feira/predio-4-terreo.png`
- `assets/feira/predio-4-primeiro-piso.png`

Os marcadores são componentes React Native sobre a imagem. Eles não fazem parte do arquivo PNG.

Enquanto `eventTeams` estiver vazia ou não puder ser lida, a tela mostra os dados de demonstração de `src/data/eventTeams.mock.ts`. Equipes mock não registram visita nem concedem XP. Assim que houver ao menos uma equipe ativa no Firestore, a tela passa a usar os dados reais.

## Cadastro de uma equipe

Crie um documento em `eventTeams`. O ID do documento e o campo `id` devem ser iguais. Exemplo para `eventTeams/equipe-01`:

```js
{
  id: "equipe-01",
  nome: "Equipe 01",
  projeto: "Sistema de irrigação inteligente",
  descricao: "Projeto que utiliza sensores para reduzir o consumo de água.",
  curso: "Engenharia de Computação",
  predio: "predio-2",
  andar: null,
  mesa: "08",
  x: 23,
  y: 37,
  qrPrefix: "MOSTRA2026_EQ01",
  ativo: true
}
```

Valores aceitos:

- `predio`: `predio-2`, `predio-3` ou `predio-4`;
- `andar`: `null` nos prédios II e III; `terreo` ou `primeiro-piso` no prédio IV;
- `x` e `y`: números entre 0 e 100;
- `qrPrefix`: de 6 a 64 caracteres, usando somente letras maiúsculas, números, `_` e `-`.

Cadastre também o segredo em `eventQrTokens/equipe-01`:

```js
{
  teamId: "equipe-01",
  token: "MOSTRA2026_EQ01_yT0ip6dZM3gHXkQbw9aPKS6V",
  updatedAt: Timestamp
}
```

O token completo fica nessa coleção separada e não pode ser lido pelos visitantes. `eventTeams` expõe somente o prefixo necessário para o aplicativo identificar a equipe; as regras comparam o valor completo durante a gravação atômica.

Para gerar um sufixo aleatório com Node.js:

```powershell
node -e "const c=require('crypto'); console.log(c.randomBytes(18).toString('base64url'))"
```

Una o prefixo, `_` e o sufixo gerado. O sufixo precisa ter pelo menos 16 caracteres. Use um token diferente para cada equipe.

## Geração do QR Code

O conteúdo do QR deve ser exatamente o `token` completo salvo em `eventQrTokens`, sem texto adicional. Como o projeto já possui a dependência `qrcode`, uma imagem pode ser gerada assim:

```powershell
node -e "require('qrcode').toFile('equipe-01.png','MOSTRA2026_EQ01_yT0ip6dZM3gHXkQbw9aPKS6V',{width:512,margin:2},e=>{if(e)throw e})"
```

Imprima a imagem gerada e coloque-a na mesa correspondente. Não publique os tokens em código, planilhas públicas ou na coleção `eventTeams`.

## Posicionamento com `x` e `y`

`x` mede a posição horizontal a partir da borda esquerda e `y` mede a posição vertical a partir do topo:

- canto superior esquerdo: aproximadamente `x: 0`, `y: 0`;
- centro: `x: 50`, `y: 50`;
- canto inferior direito: aproximadamente `x: 100`, `y: 100`.

Comece com uma estimativa, abra o mapa no aparelho e ajuste os valores do documento no Firestore. O listener em tempo real reposiciona o marcador sem recompilar o aplicativo. Para evitar que o marcador encoste nas bordas, valores entre 3 e 97 costumam funcionar melhor.

## Dados criados automaticamente

Não crie manualmente os documentos abaixo. Na primeira leitura válida, uma única transação cria:

```text
eventVisitProofs/UID_equipe-01
eventVisits/UID_equipe-01
eventRanking/UID
```

`eventVisits` guarda a visita de 100 XP. O ID determinístico impede uma segunda visita à mesma equipe. `eventRanking` guarda os pontos acumulados e a quantidade de equipes visitadas. `eventVisitProofs` liga a visita ao token completo validado pelas regras e não pode ser lido pelo usuário comum.

O ranking e os marcadores usam `onSnapshot`, portanto a tela é atualizada sem reiniciar o aplicativo.

## Regras e administrador

As regras novas estão em `firestore.rules`, nos blocos de `eventTeams`, `eventQrTokens`, `eventVisitProofs`, `eventVisits` e `eventRanking`.

O UID definido em `PROJECT_OWNER_UID` continua sendo o administrador do projeto. Nas coleções do evento ele pode cadastrar/remover equipes e tokens, consultar provas e visitas e fazer manutenção nos rankings. Visitantes autenticados podem ler equipes e ranking, consultar as próprias visitas e criar somente o conjunto atômico de documentos correspondente a uma primeira visita válida.

Antes da publicação, a compilação local pode ser repetida sem deploy:

```powershell
npx firebase-tools deploy --only firestore:rules --dry-run --non-interactive
```

Quando as regras forem aprovadas, a publicação deve ser feita manualmente pelo responsável do projeto. Esta implementação não executa deploy automaticamente.

### Limitação sem backend

As regras impedem pontos arbitrários, documentos duplicados e tokens inventados. Ainda assim, quem fotografar ou compartilhar um QR verdadeiro poderá apresentar o mesmo token em outro aparelho. Firestore Rules não consegue comprovar presença física nem distinguir o scanner oficial de um cliente próprio. Mitigações mais fortes exigiriam token rotativo, validação presencial ou um backend confiável/Cloud Function. Nenhuma infraestrutura paga foi adicionada.

## Roteiro de teste

1. Entre no aplicativo com o usuário administrador e confirme que login, mapa e ranking do turismo continuam funcionando.
2. Cadastre uma equipe ativa em `eventTeams` e o token correspondente em `eventQrTokens`.
3. Abra **Mostra de Projetos**, escolha o prédio/andar e confirme o marcador na posição cadastrada.
4. Toque no marcador e confirme os dados, o botão de fechar e o botão **Ler QR Code**.
5. Leia o QR correto. Confirme o feedback de `+100 XP`, o marcador verde, o progresso e o ranking.
6. Leia o mesmo QR novamente. Confirme que nenhum XP adicional foi concedido.
7. Leia o QR de outra equipe a partir do card selecionado. Confirme que o aplicativo recusa a incompatibilidade.
8. Tente criar ou alterar manualmente pontos com uma conta comum. As regras devem negar a operação.
9. Edite nome ou foto nas configurações e confirme a atualização nos rankings normal e da mostra.
10. Teste tema claro/escuro e os quatro mapas em uma tela pequena e outra maior.

