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
- [ ] `AJB_DEMO_PASSWORD` configurado somente se a empresa Demo for utilizada.
- [ ] Credenciais de e-mail configuradas quando notificações estiverem habilitadas.
- [ ] Credenciais do Mercado Pago configuradas somente no ambiente correspondente (teste x produção).

## Saúde da aplicação

- [ ] `GET /api/health` retorna HTTP 200 e `ok: true`.
- [ ] Build da Vercel concluído com status success.
- [ ] Não existem migrations pendentes.
- [ ] Logs de runtime não mostram falhas recorrentes de conexão/autenticação.

## Segurança SaaS / tenant

- [ ] Login cliente resolve `companyId` pela sessão.
- [ ] Login administrativo AJBSYSTEMS permanece separado do tenant.
- [ ] Empresa A não consegue consultar IDs pertencentes à Empresa B.
- [ ] Cadastro de empresa real nova inicia sem clientes, veículos, OS ou dados fictícios.
- [ ] Empresa Demo é marcada com `isDemo = true` e não compõe MRR/faturamento.
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

## Release

- [ ] Revisar diff entre a branch candidata e `main` antes do merge.
- [ ] Preservar commits existentes de `main`; nunca forçar sobrescrita.
- [ ] Fazer merge somente com deploy de preview verde.
- [ ] Aplicar migrations de produção com `prisma migrate deploy`.
- [ ] Validar `/api/health` imediatamente após o deploy.
- [ ] Executar smoke test de login cliente, admin, OS e licença.

## Rollback

- [ ] Em falha de aplicação, reverter o deploy para o último commit verde.
- [ ] Não executar rollback destrutivo de banco automaticamente.
- [ ] Migrations corretivas devem ser aditivas sempre que possível.
- [ ] Em incidente de dados, preservar evidências e restaurar apenas a partir de snapshot validado.
