# Friends Included finance system

## Deploy

1. Create a Supabase project and run `supabase/migrations/001_finance.sql` in its SQL editor.
2. Create a Google Sheet with tabs named **Sales** and **Expenses**, then share it as Editor with the Google service-account email.
3. Copy `.env.example` to `.env.local` and enter the server-side values. `GOOGLE_SERVICE_ACCOUNT_JSON` is the complete service-account JSON on one line.
4. Run `npm install && npm run dev`. Deploy the repository to Vercel with the same environment variables.
5. In Telegram set the webhook to `https://YOUR-VERCEL-URL/api/telegram?secret=YOUR_SECRET`, then open the bot and send `/start`.
6. As Svetlana, open **Manager setup** and link each Telegram user ID to a fictional employee. Use the dashboard's **Demonstration role** selector for web testing.

The website and Telegram webhook both call the same `submitTransaction` database function. Database row-level rules independently enforce roles, amounts, unique references, and one-time manager decisions.
