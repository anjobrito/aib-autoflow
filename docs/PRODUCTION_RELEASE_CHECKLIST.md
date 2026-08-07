# AJB AutoFlow — Checklist de Release Comercial

## Banco e migrations

- [ ] Confirmar backup/snapshot do PostgreSQL antes da janela de release.
- [ ] Executar `npx prisma migrate status` contra o ambiente alvo.
- [ ] Aplicar migrations somente com `npx prisma migrate deploy`.
- [ ] Nunca executar `prisma migrate reset` em produção.
- [ ] Nunca executar `prisma db push` em produção.
- [ ] Confirmar que migrations novas são aditivas e não removem dados reais.

## Variáveis de ambiente

- [ ] `DATABASE_URL` configurada para o banco correto.
- [ ] `AUTH_SECRET` ou `NEXTAUTH_SECRET` configurado com valor forte e exclusivo de produção.
- [ ] `APP_URL` aponta para o domínio HTTPS público correto.
- [ ] `AJB_DEMO_PASSWORD` configurado somente se a empresa Demo for utilizada.
- [ ] Credenciais de e-mail configuradas quando notificações estiverem habilitadas.
- [ ] `MERCADO_PAGO_ACCESS_TOKEN` configurado somente no ambiente correto.
- [ ] `MERCADO_PAGO_WEBHOOK_SECRET` configurado com a assinatura secreta do webhook correspondente.
- [ ] `AJB_PLAN_MONTHLY_CENTS` e `AJB_PLAN_YEARLY_CENTS` conferidos com a tabela comercial vigente.

## Saúde da aplicação

- [ ] `GET /api/health` retorna HTTP 200 e `ok: true`.
- [ ] `GET /api/health/db` confirma conexão com PostgreSQL.
- [ ] Build da Vercel concluído com status success.
- [ ] CI conclui `prisma generate`, `prisma validate`, `prisma migrate deploy`, `prisma migrate status` e `npm run build`.
- [ ] Não existem migrations pendentes.
- [ ] Logs de runtime não mostram falhas recorrentes de conexão/autenticação.

## Segurança SaaS / tenant

- [ ] Login cliente resolve `companyId` pela sessão.
- [ ] Login administrativo AJBSYSTEMS permanece separado do tenant.
- [ ] Empresa A não consegue consultar IDs pertencentes à Empresa B.
- [ ] Cadastro de empresa real nova inicia sem clientes, veículos, OS ou dados fictícios.
- [ ] Empresa Demo é marcada com `isDemo = true` e não compõe MRR/faturamento.
- [ ] Empresa Demo não consegue iniciar checkout pago.
- [ ] Reset da Demo permanece restrito ao MASTER.

## Fluxos críticos

- [ ] Criar cliente e veículo.
- [ ] Criar OS, mover status, finalizar e consultar histórico.
- [ ] Criar conta a pagar e marcar como paga.
- [ ] Criar conta a receber e marcar como recebida.
- [ ] Criar financiamento e validar cálculo de retorno/ILA/líquido.
- [ ] Marcar retorno do financiamento como recebido.
- [ ] Bloquear empresa no Admin e confirmar redirecionamento para `/licenca`.
- [ ] Liberar empresa e confirmar retorno do acesso.
- [ ] Consultar `/admin/auditoria` e confirmar eventos das ações críticas.

## Mercado Pago

- [ ] Configurar Webhook em `https://SEU-DOMINIO/api/billing/mercadopago/webhook`.
- [ ] Habilitar eventos de assinatura/preapproval, authorized payment e payment usados pela integração.
- [ ] Confirmar que webhook sem assinatura válida recebe HTTP 401.
- [ ] Confirmar que o backend consulta o recurso no Mercado Pago antes de alterar a licença.
- [ ] `/assinatura` mostra valores mensal e anual esperados.
- [ ] Checkout mensal cria `providerSubscriptionId` e redireciona ao Mercado Pago.
- [ ] Pagamento mensal aprovado registra `PaymentHistory` e libera a empresa.
- [ ] Checkout anual cria assinatura com frequência de 12 meses.
- [ ] Pagamento anual aprovado registra histórico e libera a empresa.
- [ ] Assinatura pausada/pendente marca `PAST_DUE` e bloqueia operação.
- [ ] Assinatura cancelada marca `CANCELED` e bloqueia operação.
- [ ] Evento duplicado não duplica pagamento nem efeitos de licença.
- [ ] Contingência manual pelo `/admin` continua operacional.

## Release

- [ ] Revisar diff entre a branch candidata e `main` antes do merge.
- [ ] Preservar commits existentes de `main`; nunca forçar sobrescrita.
- [ ] Fazer merge somente com CI e deploy de preview verdes.
- [ ] Aplicar migrations de produção com `prisma migrate deploy`.
- [ ] Validar `/api/health` imediatamente após o deploy.
- [ ] Executar smoke test de login cliente, admin, OS, licença e `/assinatura`.

## Rollback

- [ ] Em falha de aplicação, reverter o deploy para o último commit verde.
- [ ] Não executar rollback destrutivo de banco automaticamente.
- [ ] Migrations corretivas devem ser aditivas sempre que possível.
- [ ] Em incidente de dados, preservar evidências e restaurar apenas a partir de snapshot validado.
