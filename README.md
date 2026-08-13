# Água — controle de hidratação

Clone pessoal do WaterMinder para Android. Expo SDK 57 + TypeScript, dados 100% locais (SQLite no aparelho, sem backend e sem conta).

## Baixar

### [⬇️ APK — v1.0.0](https://github.com/TheusSales/water-tracker/releases/latest)

Android 7+. Como não vem da Play Store, o Android vai pedir autorização para "instalar apps desconhecidos" ao abrir o `.apk` pelo navegador ou gerenciador de arquivos.

Sem anúncios, sem paywall, sem conta e sem telemetria — o app não faz nenhuma chamada de rede e tudo vive no SQLite do aparelho.

> Uma ressalva honesta: o `AndroidManifest` **declara** `INTERNET`, `ACCESS_NETWORK_STATE` e permissões de badge/FCM. Nada disso é escolha do app — o React Native inclui `INTERNET` por padrão e o `expo-notifications` traz as demais. O código não exercita nenhuma delas; dá para conferir em `src/`, não há um único `fetch`.

## Funcionalidades

- **Hoje** — anel de progresso animado, atalhos de 1 toque para registrar, lista dos registros do dia com remoção.
- **Histórico** — gráfico de barras de 7 ou 30 dias com linha de meta, sequência de dias batendo a meta, média diária.
- **Ajustes** — meta diária, copos personalizados (nome, volume, ícone) e lembretes.

## Rodando em desenvolvimento

```bash
npm start          # Metro; escaneie o QR com o Expo Go
npm run typecheck  # tsc --noEmit
```

> Os lembretes **não disparam no Expo Go** no Android (limitação do SDK 53+). Para testá-los, use o APK.

## Gerando o APK

```bash
npm install -g eas-cli
eas login                          # conta Expo (gratuita)
eas build:configure                # só na primeira vez
eas build -p android --profile preview
```

O build roda na nuvem (~10–15 min) e o EAS devolve um link para baixar o `.apk`. Instale no celular liberando "fontes desconhecidas" para o navegador/gerenciador de arquivos.

Para reinstalar por cima mantendo os dados, use sempre a mesma conta Expo — a assinatura do APK precisa bater.

## Estrutura

```
app/
  _layout.tsx          SQLiteProvider + migrations + canal de notificação
  (tabs)/
    index.tsx          Hoje
    history.tsx        Histórico
    settings.tsx       Ajustes
src/
  db/schema.ts         schema, migrations (PRAGMA user_version) e seeds
  db/queries.ts        CRUD, agregações por dia e cálculo de sequência
  lib/date.ts          chaves de dia locais e formatação
  lib/notifications.ts agendamento dos lembretes
  lib/theme.ts         cores, espaçamentos, sombras
  components/          ProgressRing, BarChart
```

## Decisões que valem lembrar

- **Dia local, não UTC.** Cada registro guarda uma coluna `day` (`YYYY-MM-DD`) calculada no fuso do aparelho. As funções de data do SQLite rodam em UTC e virariam o dia na hora errada.
- **Um lembrete por horário, não intervalo repetido.** Um trigger `TIME_INTERVAL` com `repeats` continuaria tocando de madrugada; a janela ativa (ex.: 8h–22h a cada 2h) vira uma notificação `DAILY` por horário.
- **A sequência não quebra no dia corrente.** Só um "ontem" abaixo da meta zera o contador — o dia de hoje ainda está em andamento.
