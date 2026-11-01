# API de Gerenciamento de Pedidos

API REST para gerenciamento de pedidos de uma pequena loja, desenvolvida para a disciplina **Tópicos Avançados em Sistemas de Informação II**.

**Stack:** Node.js (≥ 18) · Express · Jest · Supertest · Postman
**Armazenamento:** em memória (os dados são perdidos ao reiniciar o servidor).

---

## Instalação e execução

```bash
git clone https://github.com/daviisoares-cmd/api-pedidos.git
cd api-pedidos
npm install
npm start            # http://localhost:3000
```

Outra porta: `PORT=4000 npm start` (Linux/macOS) ou `set PORT=4000 && npm start` (Windows CMD).

> **Windows / PowerShell:** se aparecer o erro *"a execução de scripts foi desabilitada neste sistema"*, use `npm.cmd` no lugar de `npm` (ex.: `npm.cmd install`, `npm.cmd start`, `npm.cmd test`).

Testes automatizados:

```bash
npm test
```

---

## Rotas

| Método | Rota                  | Descrição                    | Respostas                                          |
|--------|-----------------------|------------------------------|----------------------------------------------------|
| POST   | `/pedidos`            | Cadastra um pedido (RF01)    | 201 criado · 400 dados inválidos                   |
| GET    | `/pedidos`            | Lista os pedidos (RF02)      | 200                                                |
| GET    | `/pedidos/:id`        | Consulta por id (RF03)       | 200 encontrado · 404 inexistente                   |
| PATCH  | `/pedidos/:id/status` | Atualiza o status (RF04)     | 200 atualizado · 400 inválido · 404 inexistente    |

Qualquer outra rota retorna **404** em JSON. Erros inesperados retornam **500**.

### Valores aceitos

| Campo        | Regra                                                                 |
|--------------|-----------------------------------------------------------------------|
| `cliente`    | Texto obrigatório, não vazio após `trim()`. É salvo sem os espaços das extremidades. |
| `tipo`       | `entrega` ou `retirada`                                               |
| `valor`      | Número (tipo `number`) maior que zero. Decimais permitidos. A string `"350"` é rejeitada. |
| `prioridade` | `baixa`, `normal` ou `alta`                                           |
| `status`     | `recebido`, `em_preparacao`, `enviado`, `entregue`, `cancelado`       |

- O `id` é gerado pelo servidor (inteiro sequencial a partir de 1).
- Todo pedido nasce com status `recebido`; um `status` enviado no POST é ignorado.
- Campos extras no corpo são ignorados.
- Um `id` que não seja inteiro positivo (ex.: `abc`, `0`, `1.5`) não corresponde a nenhum pedido e retorna **404**.

### Transições de status

```
recebido ──► em_preparacao ──► enviado ──► entregue
   │               │
   └──► cancelado ◄┘
```

| Status atual    | Pode ir para                    |
|-----------------|---------------------------------|
| `recebido`      | `em_preparacao`, `cancelado`    |
| `em_preparacao` | `enviado`, `cancelado`          |
| `enviado`       | `entregue`                      |
| `entregue`      | — (estado final)                |
| `cancelado`     | — (estado final)                |

Justificativa: um pedido já enviado não pode ser cancelado pela loja (já saiu), e estados finais não voltam atrás. Repetir o status atual também é tratado como transição inválida (400). As regras ficam em `src/config/regras.js`.

---

## Exemplos

**Criar pedido**

```http
POST /pedidos
Content-Type: application/json

{ "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal" }
```

```json
201 Created
{ "id": 1, "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal", "status": "recebido" }
```

**Dados inválidos**

```json
400 Bad Request
{
  "erro": "Dados do pedido inválidos.",
  "detalhes": [
    { "campo": "cliente", "mensagem": "Cliente é obrigatório e deve ser um texto não vazio." },
    { "campo": "valor", "mensagem": "Valor deve ser numérico e maior que zero." }
  ]
}
```

**Atualizar status**

```http
PATCH /pedidos/1/status
Content-Type: application/json

{ "status": "em_preparacao" }
```

```json
200 OK
{ "id": 1, "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal", "status": "em_preparacao" }
```

**Transição não permitida**

```json
400 Bad Request
{ "erro": "Transição de \"recebido\" para \"entregue\" não é permitida. Transições possíveis: em_preparacao, cancelado." }
```

**Pedido inexistente**

```json
404 Not Found
{ "erro": "Pedido com id 999 não encontrado." }
```

---

## Arquitetura

Arquitetura em camadas: cada camada conhece apenas a camada imediatamente abaixo.

```
src/
├── server.js                  # Sobe o servidor (app.listen)
├── app.js                     # Monta o Express: middlewares, rotas, tratamento de erros
├── routes/pedidosRoutes.js    # Mapeia método + URL para o controller
├── controllers/               # Camada HTTP: lê req, chama o service, define status da resposta
├── services/                  # Regras de negócio: criação, busca, transições de status
├── repositories/              # Acesso a dados (array em memória)
├── validators/                # Validação do formato dos dados de entrada
├── config/regras.js           # Tipos, prioridades, status e transições permitidas
├── errors/AppError.js         # Erros de domínio: ValidationError (400), NotFoundError (404)
└── middlewares/errorHandler.js# Tratamento centralizado de erros e rota não encontrada
tests/                         # Testes Jest (integração com supertest + unitários do service)
postman/                       # Coleção Postman importável
evidencias/                    # Prints dos testes manuais
```

**Fluxo de uma requisição:** `routes → controller → service → (validator) → repository`.
Se algo falhar, o erro sobe até o controller, que chama `next(err)`, e o middleware `tratarErros` converte em resposta JSON.

**Pastas adicionais (além de routes/controllers/services):**
- `repositories/`: isola o armazenamento. Trocar o array por um banco exige mudar só esse arquivo.
- `validators/`: separa "o dado tem formato válido?" (validator) de "a operação é permitida?" (service).
- `config/`: os valores aceitos ficam num único lugar, usados na validação e nas mensagens de erro.
- `errors/` + `middlewares/`: padronizam as respostas de erro e separam erros do usuário de falhas internas.
- `app.js` separado de `server.js`: permite testar a API com supertest sem abrir uma porta.

### Padrões implementados

- **Arquitetura em camadas** (Controller–Service–Repository).
- **Repository Pattern** para abstrair a persistência em memória.
- **Middleware centralizado de erros** com hierarquia de erros customizados (`AppError` → `ValidationError` / `NotFoundError`).
- **Máquina de estados** simples (tabela `TRANSICOES`) para os status do pedido.

### Tratamento de erros

| Situação                                         | HTTP |
|--------------------------------------------------|------|
| Campos inválidos, status inválido, transição proibida, JSON malformado | 400 |
| Pedido ou rota inexistente                        | 404 |
| Qualquer erro não previsto (bug, falha interna)   | 500 — mensagem genérica, detalhe só no log do servidor |

Erros inesperados **não** são apresentados como erro de validação: só instâncias de `AppError` viram 400/404; o resto vira 500.

---

## Testes

### Automatizados (Jest + Supertest)

```bash
npm test
```

- `tests/pedidos.api.test.js` — integração: todas as rotas, casos de sucesso, validações (cliente vazio/com espaços, valor zero/negativo/string, tipo e prioridade desconhecidos), JSON malformado, IDs inexistentes e não numéricos, fluxo completo de status, transições proibidas, rota inexistente e erro 500 simulado.
- `tests/pedidosService.test.js` — unitários da camada de serviço.

O repositório é limpo antes de cada teste (`beforeEach`), então os testes são independentes entre si.

### Manuais (Postman)

Importe `postman/API-Pedidos.postman_collection.json` no Postman. A variável `baseUrl` aponta para `http://localhost:3000`. Execute as requisições na ordem (01 a 05); os prints estão em `evidencias/`:

| Arquivo                       | Cenário                     |
|-------------------------------|-----------------------------|
| `01-criacao.png`              | POST válido → 201           |
| `02-validacao.png`            | POST inválido → 400         |
| `03-listagem.png`             | GET /pedidos → 200          |
| `04-consulta-inexistente.png` | GET /pedidos/999 → 404      |
| `05-atualizacao.png`          | PATCH status válido → 200   |

---

## Uso de IA

Utilizei IA no desenvolvimento deste projeto:
- **Claude (Anthropic):** gerou a estrutura em camadas, o código da API, os testes Jest, a coleção do Postman e o rascunho deste README, além de me orientar passo a passo na execução.
- **IA do Postman (Postbot):** apareceu sugerindo correções durante os testes manuais.

Rodei o projeto na minha máquina, executei os testes automatizados (`npm test`, 41 testes passando) e fiz os testes manuais no Postman, registrando as evidências na pasta `evidencias/`.

**Sugestão aceita:** separar `app.js` de `server.js`. Justificativa: permite que o supertest use a aplicação sem abrir uma porta, deixando os testes mais rápidos e sem conflito de porta.

**Sugestão modificada:** as instruções de execução usavam `npm install` e `npm start`. No meu Windows, o PowerShell bloqueou o comando `npm` (erro *"a execução de scripts foi desabilitada neste sistema"*). Adaptei para `npm.cmd install` / `npm.cmd start`, que funcionou sem precisar mudar configurações de segurança do sistema, e adicionei essa observação na seção de instalação do README.

**Sugestão rejeitada:** ao enviar a requisição "02 - Validação" no Postman, a IA do Postman interpretou o retorno **400** como erro e sugeriu trocar o corpo por dados válidos (`"cliente": "João Silva"`, `"valor": 150.50` etc.). Recusei (Decline), porque essa requisição envia dados inválidos de propósito: o objetivo é comprovar que a API rejeita cliente vazio, tipo e prioridade desconhecidos e valor negativo. Aceitar a sugestão eliminaria a evidência do teste de validação.
