# AJB AutoFlow — Plano de Testes Codex / CLI

## Objetivo

Validar o roadmap SaaS comercial de ponta a ponta sem depender de teste manual do proprietário do produto. O executor deve interromper a promoção para produção se qualquer cenário crítico falhar.

## Princípios

- Nunca usar `prisma migrate reset`.
- Nunca usar `prisma db push` em produção.
- Testes de banco devem usar PostgreSQL descartável ou ambiente de QA.
- Nunca apontar automação destrutiva para banco de produção.
- Nunca usar dados Demo como fallback em tenant real.
- Toda verificação de dados deve considerar `companyId`.

## 1. Gate estático e build

```bash
npm ci --no-audit --no-fund
npx prisma generate
npx prisma validate
npx prisma migrate status
npm run build
```

Aceite:

- Todos os comandos retornam código 0.
- Nenhum erro TypeScript/Next.js.
- Prisma schema válido.
- Nenhuma migration inválida.

## 2. Migration em PostgreSQL limpo

Subir PostgreSQL 16 descartável e definir `DATABASE_URL` de QA.

```bash
npx prisma migrate deploy
npx prisma migrate status
```

Aceite:

- Todas as migrations aplicadas em ordem.
- Estado final sem migrations pendentes.
- Migration de billing cria colunas aditivas em `Subscription`, `PaymentHistory` e `BillingWebhookEvent`.
- Nenhuma tabela/linha preexistente é removida.

## 3. Autenticação e tenant

Preparar duas empresas de QA: Empresa A e Empresa B, cada uma com usuário próprio.

Cenários:

1. Login do usuário A cria sessão com `companyId=A`.
2. `GET /api/company/me` retorna somente A.
3. Criar cliente, veículo, produto, serviço, OS, fornecedor, funcionário, lançamento financeiro, lembrete e financiamento em A.
4. Login em B e listar cada módulo.
5. Tentar consultar/alterar IDs conhecidos de A autenticado como B.

Aceite:

- B nunca lista dados de A.
- Acesso direto a IDs de outro tenant retorna 404/403 e não altera registros.
- `businessType`/perfil vem da sessão e banco, não de localStorage.

## 4. Cadastro real x Demo

Cenários:

1. Criar nova empresa real.
2. Abrir dashboard e cadastros.
3. Confirmar ausência de clientes, veículos, OS e dados fictícios.
4. Acessar tenant Demo.
5. Confirmar dados Demo somente no tenant Demo.
6. Tentar checkout pago no tenant Demo.

Aceite:

- Tenant real começa vazio.
- Demo não aparece em MRR.
- Demo não consegue iniciar checkout e recebe HTTP 403.
- Reset Demo exige administrador MASTER.

## 5. Fluxo operacional

Cenários:

1. Criar cliente.
2. Criar veículo para esse cliente.
3. Criar OS.
4. Mover OS pelos status permitidos.
5. Finalizar/entregar OS.
6. Consultar histórico do veículo.
7. Confirmar que OS finalizada sai do pátio ativo.

Aceite:

- Persistência em PostgreSQL.
- Relações cliente/veículo/OS consistentes.
- Histórico mostra OS finalizada.
- Pátio não mantém item entregue como ativo.

## 6. Financiamento, gravame e ILA

Dados de referência:

- Valor financiado: R$ 100.000,00.
- Retorno: 4%.
- ILA: 26%.

Esperado:

- Retorno bruto: R$ 4.000,00.
- Desconto ILA: R$ 1.040,00.
- Retorno líquido: R$ 2.960,00.

Cenários:

1. Selecionar cliente e veículo existentes.
2. Confirmar autopreenchimento.
3. Informar valores acima.
4. Salvar.
5. Reabrir em outra sessão/navegador.
6. Marcar retorno como recebido.

Aceite:

- Cálculo é consistente no servidor e UI.
- Dados persistem no PostgreSQL.
- Somente o tenant dono acessa o financiamento.
- Alteração crítica gera auditoria.

## 7. Financeiro e comissões

Cenários:

1. Criar conta a pagar.
2. Liquidar conta a pagar.
3. Criar conta a receber.
4. Liquidar conta a receber.
5. Gerar/editar comissão conforme fluxo implementado.
6. Confirmar integração de comissão com financeiro quando aplicável.

Aceite:

- Persistência em `FinancialEntry`.
- Status e datas de liquidação coerentes.
- Nenhum `localStorage` é autoridade para registros reais.
- Auditoria registra ações críticas.

## 8. Auditoria

Executar:

- alteração de licença;
- bloqueio/liberação;
- mudança relevante de OS;
- lançamento financeiro;
- financiamento/retorno recebido.

Consultar `/admin/auditoria` e API correspondente.

Aceite:

- Evento contém ator, empresa, entidade, ação e timestamp.
- Quando aplicável, valores anterior/novo estão presentes.
- Tenant comum não acessa auditoria administrativa da plataforma.

## 9. Health e hardening

```bash
curl -fsS "$APP_URL/api/health"
curl -fsS "$APP_URL/api/health/db"
```

Verificar também autenticação/admin pelo smoke test HTTP/browser.

Aceite:

- Health geral HTTP 200.
- PostgreSQL reportado como disponível.
- Login tenant funciona.
- Login AJBSYSTEMS continua separado.
- Bloqueio envia operação para `/licenca`.
- `/assinatura` continua acessível ao tenant autenticado bloqueado para permitir regularização.

## 10. Mercado Pago — segurança do webhook

Executar contra ambiente de teste/staging com credenciais de teste.

Cenários:

1. POST no webhook sem `x-signature`.
2. POST com assinatura inválida.
3. POST com assinatura válida e recurso existente.
4. Repetir o mesmo evento válido.

Aceite:

- Sem assinatura: HTTP 401.
- Assinatura inválida: HTTP 401.
- Assinatura válida: backend consulta Mercado Pago server-to-server antes de alterar licença.
- Evento repetido é idempotente.
- Pagamento não duplica `PaymentHistory`.

## 11. Mercado Pago — mensal

Pré-condição: empresa QA real, sem `providerSubscriptionId`.

1. Abrir `/assinatura`.
2. Iniciar MONTHLY.
3. Confirmar criação de preapproval e redirecionamento.
4. Aprovar usando ambiente de teste Mercado Pago.
5. Receber webhook.

Aceite:

- `billingCycle=MONTHLY`.
- Valor corresponde a `AJB_PLAN_MONTHLY_CENTS`.
- `providerSubscriptionId` gravado.
- Após confirmação autorizada: `Subscription.status=ACTIVE`, `Company.subscriptionStatus=ACTIVE`, `accessBlocked=false`.
- Pagamento registrado em `PaymentHistory`.

## 12. Mercado Pago — anual

Repetir em outra empresa QA com YEARLY.

Aceite:

- Preapproval criada com frequência de 12 meses.
- Valor corresponde a `AJB_PLAN_YEARLY_CENTS`.
- `billingCycle=YEARLY`.
- Confirmação libera empresa e registra pagamento.
- MRR administrativo usa equivalente mensal do plano anual.

## 13. Inadimplência e cancelamento

Em ambiente de teste, gerar estado paused/past due e canceled quando suportado.

Aceite:

- Pausada/pendente => `PAST_DUE` e acesso bloqueado.
- Cancelada => `CANCELED` e acesso bloqueado.
- `lockedReason` explica origem Mercado Pago.
- Liberação manual continua possível como contingência administrativa.

## 14. Smoke test de preview/deploy

Validar visualmente e por HTTP:

- `/planos`
- `/cadastro`
- `/entrar`
- `/dashboard`
- `/clientes`
- `/ordens-servico`
- `/patio`
- `/financiamentos-gravames`
- `/contas-pagar`
- `/contas-receber`
- `/lembretes`
- `/assinatura`
- `/admin/entrar`
- `/admin`
- `/admin/auditoria`

Aceite:

- Sem erro 500.
- Navegação preserva perfil do tenant.
- Sidebar mantém logout visível.
- Admin exibe provedor/ciclo/próxima cobrança.
- Página de planos mostra opções mensal/anual coerentes.

## 15. Gate de release

Somente aprovar merge/deploy de produção quando:

- GitHub Actions = success.
- Vercel Preview = success.
- `prisma migrate deploy` validado em PostgreSQL limpo.
- Smoke tests críticos aprovados.
- Credenciais Mercado Pago de produção configuradas somente na Vercel.
- Webhook de produção cadastrado e validado.

## Evidências esperadas do executor Codex/CLI

Para cada cenário, registrar:

- comando ou request executado;
- status HTTP/código de saída;
- IDs de QA usados (sem segredos);
- resultado esperado x obtido;
- logs relevantes em caso de falha;
- commit testado;
- conclusão PASS/FAIL.

Qualquer FAIL crítico em tenant isolation, migration, autenticação, billing/webhook ou build bloqueia release.
