# Continuação do projeto — Asfalto: Noite em Movimento

## Estado atual
- Projeto recuperado do pacote `asfalto.zip`.
- Entrada principal: `src/main.ts`; loop 3D em `src/game/race-game.ts`.
- Carro do jogador usa o modelo GLB original em `assets/models/carro-protagonista.glb`.
- O trânsito agora tem 14 veículos procedurais no pool, com quatro silhuetas: sedã, SUV, van e picape.
- Colisão considera largura e comprimento de cada veículo.
- Pista recebeu material de asfalto mais escuro/brilhante e marcadores refletivos.
- Interface, áudio, controles de toque e placar local foram preservados.

## Evolução de tráfego — versão 3
- Ondas de dois veículos aparecem gradualmente: nenhuma nos primeiros 8 segundos, chance moderada depois e maior nas corridas longas.
- Cada onda só é criada quando as três faixas estão livres na região de surgimento; duas faixas são ocupadas e uma permanece como rota de escape.
- A velocidade e o intervalo de surgimento recebem pequena variação para reduzir repetição.
- Teste unitário adicionado para a progressão das ondas.

## Validação pendente
A instalação de dependências não terminou neste ambiente por timeout de rede. Portanto, não foi possível executar `npm run typecheck`, `npm run build` nem o teste de navegador.

## Próxima etapa sugerida
1. Instalar dependências com `pnpm install` (ou `npm install`) em ambiente com acesso ao registry.
2. Rodar `pnpm typecheck`, `pnpm build`, `pnpm test` e `pnpm smoke`.
3. Ajustar eventuais erros de tipagem/build encontrados.
4. Evoluir o tráfego com comboios, variação de velocidade e padrões de faixa.
5. Depois, adicionar chuva, reflexos dinâmicos e seleção de veículos do jogador.

## Observação
Placar online e Stripe constam no TODO original, mas não foram conectados nem ativados. Não há cobrança ou ranking online implementados.
