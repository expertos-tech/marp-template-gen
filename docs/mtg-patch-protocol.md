# MTG Patch Protocol

## 1. Objetivo do protocolo

O MTG Patch Protocol define um formato textual revisavel para descrever mudancas locais no repositorio. O foco e permitir que instrucoes geradas no ChatGPT Web sejam salvas em Markdown, revisadas por humano, simuladas e aplicadas localmente por um script Node dedicado.

## 2. Fluxo ChatGPT Web -> agente local -> script Node -> relatorio

1. Usuario ou agente gera um arquivo de protocolo em Markdown.
2. O arquivo e revisado localmente antes da execucao.
3. O agente local chama o comando planejado:
   `npm --prefix scripts run apply-patch -- <arquivo.md> [--dry-run] [--force]`.
4. O executor valida seguranca, estado Git e operacoes.
5. O executor simula ou aplica mudancas.
6. O executor gera um relatorio textual pronto para colar no chat.

## 3. Formato geral de um arquivo de protocolo

Um arquivo de protocolo deve conter:

- metadados minimos da execucao;
- lista ordenada de operacoes;
- alvos de arquivo e conteudo da mudanca;
- secoes opcionais de validacao recomendada.

Formato recomendado:

```md
# MTG Patch Protocol

version: 1
target_repo: owner/repo

## operations

- op: insert-after
  file: path/alvo.md
  match: "texto ancora"
  content: |
    novo bloco
```

## 4. Operacoes planejadas da v1

- `insert-before`
- `insert-after`
- `insert-after-line`
- `append-file`
- `create-file`

## 5. Regras de seguranca

- Bloquear caminho absoluto.
- Bloquear uso de `..` no caminho.
- Bloquear escrita fora da raiz do repositorio.
- Bloquear protocolo invalido.
- Bloquear aplicacao quando houver estado Git inseguro que nao seja coberto por `--force`.

## 6. Regra de Git limpo

Na execucao com gravacao, o comportamento padrao exige working tree limpa. Se houver mudancas locais, a execucao deve falhar com orientacao objetiva.

## 7. Regra de branch temporaria

Toda execucao com gravacao deve criar branch temporaria antes de aplicar mudancas. O nome pode seguir prefixo tecnico do protocolo e incluir identificador unico.

## 8. Regra de `--dry-run`

`--dry-run` valida entrada, resolve alvos e simula operacoes sem gravar arquivos e sem criar branch temporaria.

## 9. Regra de `--force`

`--force` ignora somente a validacao de working tree limpa.

`--force` nao ignora:

- merge em andamento;
- rebase em andamento;
- cherry-pick em andamento;
- revert em andamento;
- conflitos;
- protocolo invalido;
- caminho inseguro.

## 10. Regra de nao executar comandos shell do protocolo

Na v1, o executor nao deve executar comandos shell contidos no protocolo. Esses comandos podem ser apenas listados no relatorio como validacao recomendada.

## 11. Formato esperado do relatorio

O relatorio textual deve incluir no minimo:

- arquivo de protocolo usado;
- modo de execucao (`dry-run` ou `apply`);
- resumo de validacoes;
- lista de operacoes processadas;
- lista de arquivos afetados;
- erros e bloqueios, quando existirem;
- proximos passos recomendados.

## 12. Limitacoes da v1

- Nao executa shell embutido no protocolo.
- Nao implementa estrategias de merge semantico.
- Nao resolve conflitos automaticamente.
- Nao aplica operacoes fora da lista suportada da v1.

## 13. Exemplo simples de protocolo

```md
# MTG Patch Protocol

version: 1
target_repo: expertos-tech/marp-template-gen

## operations

- op: create-file
  file: docs/exemplo.md
  content: |
    # Exemplo
    Conteudo inicial.

- op: append-file
  file: docs/exemplo.md
  content: |
    Linha adicional.
```

## Comando no chat e comando npm planejado

- Nome no chat: `*apply-patch <arquivo.md> [--dry-run] [--force]`
- Comando npm planejado: `npm --prefix scripts run apply-patch -- <arquivo.md> [--dry-run] [--force]`
- Implementacao do executor: etapa posterior (`scripts/apply-patch-protocol.mjs`)
