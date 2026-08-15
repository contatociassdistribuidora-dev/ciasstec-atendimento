# CIASSTEC Atendimento

Central de atendimento responsiva para assistência técnica, construída com Next.js, TypeScript, Tailwind CSS e Supabase. Esta primeira versão inclui dashboard, clientes, conversas no estilo WhatsApp Web, equipamentos, ordens de serviço, orçamentos, histórico, base de conhecimento, relatórios, configurações, autenticação preparada e PWA.

## Requisitos

- Node.js 20.9 ou superior
- npm
- Um projeto Supabase para persistência e autenticação

## Instalação e execução

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`. A raiz redireciona para `/dashboard`; sem uma sessão válida, o middleware redireciona para `/login`. As variáveis públicas do Supabase precisam estar configuradas para autenticar.

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No painel, abra **SQL Editor**, crie uma consulta e cole todo o conteúdo de `supabase/full_setup.sql`.
3. Execute a consulta. Ela cria tipos, tabelas, índices, gatilhos, RLS, políticas e exemplos da base de conhecimento.
4. Em **Authentication > Providers**, mantenha Email habilitado. Crie os usuários administrador e atendentes. O gatilho do banco cria automaticamente o registro correspondente em `profiles`.
5. Em **Project Settings > API**, copie a URL e a chave pública (`anon`).
6. Crie `.env.local` a partir de `.env.example` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE
```

A chave `service_role` é exclusivamente de servidor e nunca deve ser prefixada com `NEXT_PUBLIC_`. O navegador usa somente URL e chave `anon`; a sessão é persistida e renovada por cookies SSR. Depois do primeiro cadastro, altere o campo `role` do perfil para `admin` pelo Table Editor, se necessário.

## Estrutura principal

- `app/`: páginas, login e APIs internas
- `components/atendimento-app.tsx`: módulos e interface responsiva
- `lib/supabase/`: clientes browser e servidor
- `lib/whatsapp.ts`, `lib/openai.ts`, `lib/gmail.ts`: integrações preparadas
- `supabase/full_setup.sql`: configuração completa do PostgreSQL
- `public/manifest.webmanifest`: base para instalação PWA

## Verificação

```bash
npm run lint
npm run build
npm start
```

## Publicação na Vercel

1. Envie o repositório para GitHub, GitLab ou Bitbucket.
2. Importe-o em [vercel.com](https://vercel.com/new).
3. Adicione todas as variáveis necessárias em **Settings > Environment Variables**.
4. Use o framework preset Next.js e publique. A Vercel executará `npm run build`.
5. Cadastre a URL publicada nas configurações de autenticação do Supabase.

## Integração futura com WhatsApp Business

A rota `app/api/webhooks/whatsapp/route.ts` já possui o `GET` de verificação e um `POST` simulado. Para ativar:

1. Crie um app Business na Meta for Developers e configure o produto WhatsApp.
2. Cadastre `https://seu-dominio.com/api/webhooks/whatsapp` como callback e use o mesmo valor de `WHATSAPP_VERIFY_TOKEN` na Meta e na Vercel.
3. Configure `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`.
4. Implemente a validação de `X-Hub-Signature-256`, persistência dos eventos e envio pela Graph API em `lib/whatsapp.ts`.

Use somente a API oficial da Meta e revise as regras de consentimento e templates antes do envio em produção.

## Integração futura com OpenAI

A API `app/api/ai/suggest/route.ts` devolve uma resposta simulada. Depois, instale/configure o SDK oficial, defina `OPENAI_API_KEY` somente no servidor e substitua a simulação por uma chamada com a conversa e a base de conhecimento. Preserve o fluxo de revisão: a IA sugere, o atendente edita e apenas o atendente envia.

## Integração futura com Gmail

Crie credenciais OAuth 2.0 no Google Cloud Console, configure `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` e complete `lib/gmail.ts` usando a Gmail API. Tokens de atualização devem ser armazenados criptografados no servidor, nunca no navegador ou no repositório.

## Segurança

Nunca envie `.env.local` ao controle de versão. Revise as políticas RLS antes de produção, use usuários individuais para a equipe e mantenha chaves administrativas somente em rotas de servidor.
