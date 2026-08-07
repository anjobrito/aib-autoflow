# AJB AutoFlow — Mercado Pago Billing

## Objetivo

O AJB AutoFlow suporta cobrança recorrente mensal e anual com Mercado Pago, mantendo liberação manual pelo painel AJBSYSTEMS como contingência.

## Variáveis de ambiente

Configure no ambiente de produção, nunca no repositório:

- `MERCADO_PAGO_ACCESS_TOKEN`: access token da aplicação Mercado Pago.
- `MERCADO_PAGO_WEBHOOK_SECRET`: assinatura secreta da configuração de Webhooks.
- `APP_URL`: URL pública do AJB AutoFlow, sem barra final.
- `AJB_PLAN_MONTHLY_CENTS`: valor mensal em centavos. Padrão atual: `4990`.
- `AJB_PLAN_YEARLY_CENTS`: valor anual em centavos. Padrão atual: `49900`.

## Webhook

Endpoint do AJB AutoFlow:

`POST /api/billing/mercadopago/webhook`

Na configuração da integração Mercado Pago, use a URL pública:

`https://SEU-DOMINIO/api/billing/mercadopago/webhook`

Habilite os eventos de assinaturas e pagamentos relevantes, em especial preapproval/assinatura, authorized payment e payment.

O endpoint:

1. valida `x-signature` com HMAC-SHA256 e `MERCADO_PAGO_WEBHOOK_SECRET`;
2. registra o evento para idempotência;
3. consulta o recurso novamente na API do Mercado Pago;
4. somente então altera assinatura/licença local;
5. retorna erro em falhas de processamento para permitir retry do provedor.

## Fluxo comercial

1. Cliente cadastra a empresa.
2. Cliente entra no AJB AutoFlow.
3. Acessa `/assinatura`.
4. Escolhe mensal ou anual.
5. O backend cria uma preapproval no Mercado Pago.
6. O cliente é redirecionado para o checkout do Mercado Pago.
7. O webhook recebe a alteração.
8. O backend confirma o estado diretamente na API do Mercado Pago.
9. Quando autorizado, `Subscription` e `Company.subscriptionStatus` passam para `ACTIVE` e o acesso é liberado.
10. Pagamentos ficam registrados em `PaymentHistory`.

## Ciclos

- Mensal: `frequency = 1`, `frequency_type = months`.
- Anual: `frequency = 12`, `frequency_type = months`.

## Contingência

Se Mercado Pago não estiver configurado ou estiver indisponível, a AJBSYSTEMS pode continuar liberando/bloqueando a licença manualmente em `/admin`.

## Segurança

- Nunca commitar access token ou webhook secret.
- Nunca liberar licença confiando somente no JSON recebido pelo webhook.
- Sempre confirmar o recurso server-to-server no Mercado Pago.
- Tenant Demo não pode contratar plano pago.
- `companyId` nunca é aceito do cliente como autoridade: ele vem da sessão ou da `external_reference` criada pelo backend.

## Teste antes da produção

1. Use credenciais/test users de teste do Mercado Pago.
2. Configure uma URL HTTPS de preview/staging para o webhook.
3. Crie uma empresa exclusiva de QA, não use o tenant Demo comercial.
4. Faça checkout mensal.
5. Confirme criação de `providerSubscriptionId`.
6. Simule/confirme pagamento aprovado.
7. Verifique `Company.subscriptionStatus = ACTIVE` e `accessBlocked = false`.
8. Verifique `PaymentHistory`.
9. Teste assinatura pausada/cancelada e confirme bloqueio.
10. Repita com ciclo anual.
