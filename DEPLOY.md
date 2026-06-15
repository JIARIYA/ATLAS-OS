# Deploy Atlas to Railway

Railway runs Atlas as a normal Node server with a persistent volume, so SQLite and
uploaded files keep working with no code migration.

## One-time setup

1. Install the CLI and log in:
   ```
   npm i -g @railway/cli
   cd atlas
   railway login
   railway init        # create a new project
   ```

2. In the Railway dashboard for the service:
   - **Variables** → add:
     - `DATABASE_URL` = `file:/data/dev.db`
     - `UPLOADS_DIR` = `/data/uploads`
     - `AUTH_SECRET` = (generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
   - **Volumes** → add a volume mounted at **`/data`** (holds the DB + uploads).

3. Deploy:
   ```
   railway up
   ```
   `railway.json` builds the app and runs `prisma db push` on start to create the
   tables on the volume. The first deploy gives you a public URL under
   `*.up.railway.app` (Settings → Networking → Generate Domain).

## Notes
- No demo data is seeded in production — open the URL and **Sign up** to create an
  account (it auto-creates your life domains + your member).
- To load the demo dataset instead: `railway run npm run db:seed`.
- `trustHost: true` is set so auth works on the Railway domain.
- Engine target `debian-openssl-3.0.x` is included for Railway's Linux runtime.
