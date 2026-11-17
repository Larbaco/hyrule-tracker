# Hyrule Tracker

**Acompanhe sua jornada no remake de Ocarina of Time para Nintendo Switch 2.**

Hyrule Tracker é um aplicativo portátil para Windows que lê a partida local e atualiza o checklist, o mapa e os contadores conforme você joga. Funciona em português, inglês e espanhol. Criado por **Joao Victor Prado**, a partir do [Boomerang Tracker](https://github.com/LucieTheFool/boomerang-tracker).

[Primeiro uso](#primeiro-uso) · [Recursos](#recursos) · [Compatibilidade](#compatibilidade) · [Dados locais](#dados-locais) · [Desenvolvimento](#desenvolvimento)

## Primeiro uso

1. Abra o jogo em um ambiente compatível e carregue uma partida com pelo menos um save.
2. Abra `Hyrule-Tracker-1.0.2-portable.exe`. O tracker procura os saves automaticamente nas instalações conhecidas.
3. Confira o estado ao lado do nome da instalação. **Save conectado** em verde indica que o tracker leu a partida do disco. **Ao vivo** em verde indica leitura da partida em execução.
4. Se a busca não encontrar sua partida, abra **Configurações → Escolher pasta** e selecione a pasta que contém os diretórios `slot_*`. A pasta escolhida pode ser a do jogo ou a de dados do emulador se contiver um layout reconhecido.
5. Use **PT**, **EN** ou **ES** ao lado de **Atualizar agora** para mudar o idioma.

O executável é portátil. Quando houver uma versão publicada, ela estará na aba **Releases** do repositório. Para atualizar o aplicativo, baixe e abra o novo executável. O botão **Atualizar agora** relê o progresso da partida.

## Recursos

| Tela | O que você pode acompanhar |
| --- | --- |
| **Visão geral** | Percentual do checklist, corações, Skulltulas douradas, baús abertos, rupees e atividade recente. |
| **Mapa de Hyrule** | 32 regiões, mapas por andar, fotos de localização e filtros por idade de Link, tipo de coletável e estado de conclusão. **Seguir Link** acompanha a região disponível na leitura atual. |
| **Checklist 100%** | Corações, 100 Skulltulas douradas, canções, equipamento, trocas, masmorras e mais. Objetivos concluídos ficam riscados. **Disponível agora** indica o que pode ser obtido com os requisitos conhecidos. |
| **Fios do Tempo+** | Capítulos, etapas da história e sete missões secundárias. A reprodução de cenas usa vídeos que você seleciona no computador. |
| **Minijogos** | 18 atividades com vitórias, prêmios e pontuações disponíveis no save, como tiro ao alvo, Boliche de Bombchu, pesca e corridas. O Teatro Deku e os modos especialistas aceitam marcação manual. |
| **Salão dos Inimigos** | 84 estátuas, 25 revanches e três provações. Mostra os melhores tempos registrados no save e imagens de referência. |
| **Registro do dia e Meus dados** | Avanços observados enquanto o tracker está aberto, capturas locais e medalhas calculadas a partir da sua partida. |
| **Missões de rumores** | Caça fotográfica do tracker. Siga as pistas, visite a região e capture a janela do jogo com o modo **Ao vivo**. |
| **Estúdio de fotos e Quiz diário** | Use capturas e imagens locais no estúdio e teste seus conhecimentos sobre o jogo. |

O percentual geral usa os objetivos do **Checklist 100%**. Prêmios de minijogos que fazem parte dele, como pedaços de coração e melhorias de equipamento, já contribuem para o percentual. Vitórias e recordes têm contagem própria na página **Minijogos**.

O catálogo inclui 206 flags de baús, 196 localizações identificadas, 23 Pensamentos de Fada, 16 invocações de Pierre e 37 marcadores de entradas subterrâneas. Entradas sem detecção automática aceitam marcação manual. O mapa indica os baús cuja posição ainda precisa ser mapeada. Consulte as [fontes e detalhes de cobertura](docs/coverage-sources.md).

### Atualização durante o jogo

- **Ao vivo** consulta o progresso em intervalos de cerca de meio segundo depois que o tracker conecta a sessão em execução ao save recente.
- **Save conectado** acompanha o próximo salvamento ou autosave. O tracker monitora mudanças na pasta e verifica periodicamente se um slot foi atualizado.
- **Atualizar agora** força leitura imediata. Se o save estiver sendo gravado, o tracker tenta reler o arquivo antes de informar falha.
- **Seguir o save mais recente** permite leitura ao vivo. Fixar um slot exibe a leitura daquele save em disco.

### Painel durante o jogo

Ative **Mostrar painel no jogo** em Configurações. O painel pode mostrar contadores, objetivos restantes na região ou o que está disponível agora. Ajuste a opacidade e o bloqueio na própria interface.

| Atalho padrão | Ação |
| --- | --- |
| `Ctrl + Shift + O` | Mostrar ou ocultar o painel. |
| `Ctrl + Shift + L` | Bloquear ou liberar o painel para mover e redimensionar. |

## Compatibilidade

- Aplicativo desktop para **Windows x64**. Usa o formato de save do **remake para Nintendo Switch 2**.
- A busca reconhece instalações e saves compatíveis de **Triforce / NX2navi**, **Hookshot**, **Longshot**, **ReLink**, **Ocarina Reborn**, **Fritchii** e **Lichii**.
- A leitura ao vivo depende da versão do jogo e do layout de memória do port ou emulador. A [documentação do modo ao vivo](docs/live-memory.md) descreve os ambientes e versões investigados.
- Saves de outros ambientes podem ser selecionados manualmente se expuserem o mesmo formato. Saves do Nintendo 64, de Ocarina of Time 3D e de ports do jogo original usam formatos diferentes.

### Se a partida não aparecer

1. Confirme que você já salvou dentro do jogo. O tracker procura `progress.sav` dentro de um diretório `slot_*`.
2. Abra **Configurações → Buscar saves**. Em instalações portáteis ou em unidades secundárias, tente **Escolher pasta** e selecione a pasta do perfil que contém os slots.
3. Para leitura **Ao vivo**, deixe o jogo carregado e selecione **Seguir o save mais recente**. O indicador de disco muda para **Ao vivo** quando o tracker localiza a partida.
4. Se o estado permanecer **Save conectado**, salve no jogo ou clique em **Atualizar agora** para confirmar que a leitura em disco acompanha as mudanças.

## Dados locais

O aplicativo funciona offline e guarda preferências, marcações manuais e atividade em `%APPDATA%\Hyrule Tracker`. Os mapas, as fotos e os ícones em WebP vêm no pacote. Os links de referência abrem no navegador por ação do jogador.

A leitura do save e da memória do jogo é feita em modo somente leitura. Nos ambientes compatíveis, capturas de janela para o histórico podem ser desligadas em **Configurações**. As funções de progresso são locais e independem de conta Nintendo, banco de dados remoto ou VPS.

## Desenvolvimento

Esta versão usa **Electron**, **React**, **TypeScript**, **Vite** e **Vitest**. Use **Node.js 22 ou posterior** e npm. A primeira instalação de dependências e o empacotamento podem baixar ferramentas e binários de build.

```powershell
npm ci
npm run dev
```

| Comando | Resultado |
| --- | --- |
| `npm start` | Compila e abre o aplicativo. |
| `npm run typecheck` | Verifica os tipos TypeScript. |
| `npm test` | Executa a suíte automatizada. Alguns testes locais dependem de fixtures privadas e são pulados em clones públicos. |
| `npm run dist` | Gera o executável portátil de Windows x64 em `release/`. |

```text
src/main/        Processo do Electron, descoberta de saves, monitoramento e leitura ao vivo
src/preload/     Ponte IPC entre a janela e o processo principal
src/gamedata/    Leitura do formato binário e avaliação de flags
src/core/        Catálogo, regras de progresso, mapas e lógica de disponibilidade
src/renderer/    Interface React, traduções e imagens empacotadas
data/            Checklist, mapeamentos e dados do remake
test/            Testes automatizados
docs/            Referências e documentação técnica
```

Ao relatar um problema, inclua a versão do tracker, o port ou emulador, o estado de conexão e o objetivo observado. A descrição de passos e valores observados costuma ser suficiente para reproduzir problemas sem compartilhar seus arquivos de partida. Consulte [o formato dos saves](docs/save-format.md) e [as regras de mapeamento](docs/save-mapping.md) para contribuir com detecções.

## Créditos e licença

- **Joao Victor Prado** criou o Hyrule Tracker. O [Boomerang Tracker](https://github.com/LucieTheFool/boomerang-tracker) é a base do projeto.
- Mapas e fotos de locais vêm do Ocarina Atlas e do Nintendúo. Imagens de inimigos, regiões e itens têm atribuições na documentação. [Créditos de terceiros](THIRD_PARTY_NOTICES.md)
- O código segue a [licença MIT](LICENSE). As imagens e marcas do jogo pertencem aos respectivos titulares e têm condições próprias de uso. Hyrule Tracker é um projeto independente de fãs, sem afiliação com a Nintendo.
