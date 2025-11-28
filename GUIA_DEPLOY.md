# Guia de Deploy Simplificado (Render + Supabase)

Este guia vai te ajudar a colocar seu web app no ar da forma mais simples possível, usando o **Render** para hospedar o site e o **Supabase** para o banco de dados e arquivos.

## Pré-requisitos

1.  Uma conta no [GitHub](https://github.com/).
2.  Uma conta no [Render](https://render.com/).
3.  Seu projeto no [Supabase](https://supabase.com/).

## Passo 1: Configurar o Supabase (Arquivos)

Como seu app permite upload de arquivos, precisamos configurar o "Storage" do Supabase.

1.  Acesse seu projeto no **Supabase Dashboard**.
2.  No menu lateral, clique em **Storage**.
3.  Clique em **New Bucket**.
4.  Nomeie o bucket como `uploads`.
5.  **Desmarque** a opção "Public bucket" (vamos usar URLs assinadas para segurança).
6.  Clique em **Save**.

## Passo 2: Enviar código para o GitHub

Se você ainda não tem seu código no GitHub:

1.  Crie um novo repositório no GitHub.
2.  Envie os arquivos do seu projeto para lá.

## Passo 3: Criar o Serviço no Render

1.  Acesse o [Dashboard do Render](https://dashboard.render.com/).
2.  Clique em **New +** e selecione **Web Service**.
3.  Conecte sua conta do GitHub e selecione o repositório do seu projeto.
4.  Configure os seguintes campos:
    *   **Name**: Escolha um nome para seu app (ex: `meu-app-glassflow`).
    *   **Region**: Escolha a mais próxima (ex: Ohio ou Frankfurt).
    *   **Branch**: `main` (ou a branch que você está usando).
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm run start`
    *   **Plan**: Free (Gratuito).

5.  Role para baixo até **Environment Variables** e adicione as seguintes variáveis (copie os valores do Supabase):

    | Key | Value | Onde encontrar |
    | :--- | :--- | :--- |
    | `NODE_ENV` | `production` | Digite `production` |
    | `DATABASE_URL` | `postgres://...` | Supabase > Project Settings > Database > Connection String (Nodejs) |
    | `SUPABASE_URL` | `https://...` | Supabase > Project Settings > API > Project URL |
    | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase > Project Settings > API > Project API keys (`service_role` secret) |
    | `SESSION_SECRET` | `...` | Digite uma senha longa e aleatória (ex: bata no teclado) |

    > **Atenção**: Para o `SUPABASE_SERVICE_ROLE_KEY`, certifique-se de copiar a chave `service_role` (secreta), não a `anon` (pública), pois o servidor precisa de permissão para upload.

6.  Clique em **Create Web Service**.

## Passo 4: Finalizar

O Render vai começar a construir seu app. Isso pode levar alguns minutos. Acompanhe os logs na tela.
Quando terminar, você verá uma mensagem de sucesso e o link do seu site (ex: `https://meu-app-glassflow.onrender.com`).

Acesse o link e teste seu app!
