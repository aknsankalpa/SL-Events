# Putting the website live on Hostinger

This guide puts `apps/web` (the website, the organizer and admin portals, and the API the mobile app uses) on a
Hostinger **Business** web hosting plan as a Node.js web app, with a MySQL (MariaDB) database and a mailbox in
the same account. Allow about an hour the first time.

What happens on every deployment, without anyone doing it by hand:

1. Hostinger pulls the `main` branch from GitHub and installs the packages in `apps/web`.
2. `npm run build` runs `scripts/deploy-db.mjs` first: it applies any new database migrations and makes sure the
   owner's account (`ADMIN_EMAIL`) is an admin. If that fails, the build stops and the site that was already live
   keeps running.
3. Next.js builds the site. Hostinger runs it as a standalone server and switches to it when the build succeeds.

Uploaded files (payment screenshots, organizer documents, event pictures) are kept in `~/sl-events-uploads` in the
hosting account's home folder. They are not in the build folder, so a deployment never deletes them.

---

## 1. Create the live database

hPanel → **Websites** → your website → **Databases** → **Management**:

- Create a database and its user, for example `slevents_live`, with a long, random password. Save the password in
  your password manager.
- Do **not** turn on Remote MySQL for this database. The website reaches it on the same server as `localhost`.
- Leave the database empty. The first deployment creates every table. Don't run `npm run db:seed` against it: that
  is demo data for the dev database only.

Write the connection address down. You'll need it in step 4:

```
mysql://DATABASE_USER:PASSWORD@localhost:3306/DATABASE_NAME
```

If the password contains `@`, `:`, `/`, `#` or `?`, write those characters as `%40`, `%3A`, `%2F`, `%23` and `%3F`.

## 2. Create the mailbox that sends codes

hPanel → **Emails** → your domain → create a mailbox such as `no-reply@your-domain`. Save its password.

When the domain's DNS is at Hostinger, the mail records (MX, SPF, DKIM) are set for you. Check them under
**Emails → Email deliverability** (or **DNS records**). Otherwise codes may land in spam.

## 3. Put the code on GitHub

The repository is `github.com/aknsankalpa/SL-Events`. Hostinger deploys whatever is on the `main` branch, so push
`main` with the latest commits. Keep the repository **private**.

## 4. Create the Node.js web app

hPanel → **Websites** → **Add website** → **Node.js web app** → **Import Git repository** → **Connect with
GitHub**. Allow the Hostinger app access to the `SL-Events` repository only, then choose it.

Build settings:

| Setting            | Value                                     |
| ------------------ | ----------------------------------------- |
| Branch             | `main`                                    |
| Root directory     | `apps/web`                                |
| Framework          | Next.js                                   |
| Node.js version    | 22                                        |
| Package manager    | npm                                       |
| Build script       | `build`                                   |
| Output directory   | `.next`                                   |
| Entry file         | leave empty (ignored for Next.js)         |

Under **Set environment variables**, add the following. You can also put them in a text file and use **Import
.env**. Never commit that file.

| Name            | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| `DATABASE_URL`  | the address from step 1                                      |
| `SMTP_HOST`     | `smtp.hostinger.com`                                         |
| `SMTP_PORT`     | `465`                                                        |
| `SMTP_USER`     | `no-reply@your-domain`                                       |
| `SMTP_PASS`     | the mailbox password                                         |
| `MAIL_FROM`     | `SL Events <no-reply@your-domain>`                           |
| `ADMIN_EMAIL`   | the platform owner's own email address                       |

Optional settings:

- `UPLOAD_DIR` changes where uploads are kept. The default is `~/sl-events-uploads`.
- `DATABASE_POOL_SIZE` sets how many database connections the site keeps open. The default is 5.

All the settings are described in `apps/web/.env.example`.

Click **Deploy** and open the build log. A good build shows, near the top:

```
[deploy-db] Database is up to date (6 migrations applied).
[deploy-db] Created the admin account you@example.com. Use "Forgot password" on the website to set its password.
[deploy-db] you@example.com is an admin.
```

and ends with Next.js listing the routes. The build is allowed 15 minutes. A normal build takes a few.

## 5. Connect the domain and HTTPS

In the website's dashboard, connect your domain if it isn't already. Then go to **Security → SSL** and make sure the
free SSL certificate is active. The site must be opened over `https://`, because sign-in cookies only work there.

## 6. First sign-in and settings

1. Open `https://your-domain/forgot-password` and enter the `ADMIN_EMAIL` address. The code arrives by email. Use
   it to choose a password, then sign in and open `/admin`.
2. **Admin → Settings: set the bank account customers pay into.** Until you do, the site shows the sample account
   (KB Kookmin Bank 123401-04-567890), and customers would transfer money to it. Also fill in the support
   email and look through the other platform settings.
3. Try it end to end. Create a customer account with another email, apply as an organizer, approve the application
   in Admin, create and publish an event, book it, upload a screenshot, and confirm the payment.

## 7. The mobile app

The app needs the website's address at build time. In `apps/mobile/eas.json`, add it to the `preview` and
`production` build profiles:

```json
"env": { "EXPO_PUBLIC_WEB_URL": "https://your-domain" }
```

Then build with EAS (`npm run build:android` / `npm run build:ios` in `apps/mobile`). Store submission is a
separate step.

## Updating the live site

Push to `main`. Hostinger builds and switches over by itself, and new migrations run during the build. Watch the
deployment's log in hPanel → **Deployments**.

When the database changes (a new migration in `apps/web/drizzle`), keep the change additive where possible: new
tables and new columns with defaults. The migration runs before the new code goes live, so the old code briefly
runs against the new database.

## Backups

- Hostinger's daily backups include the files in your home folder and the databases. In hPanel → **Backups**, check
  that both appear.
- What must never be lost is the database and `~/sl-events-uploads`. Before a big change, make an extra
  backup: hPanel → **Databases → phpMyAdmin → Export**, and download the uploads folder with **File Manager**.

## When something goes wrong

| What you see                                              | What to check                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Build stops at `[deploy-db] Failed: Access denied ...`    | `DATABASE_URL` user, password, database name; special characters in the password encoded          |
| Build stops at `[deploy-db] Failed: connect ECONNREFUSED` | the host in `DATABASE_URL` (should be `localhost`) and that the database exists                   |
| Build fails fetching Google Fonts                         | a network hiccup on the build server: redeploy                                                    |
| Sign-up says it sent a code but none arrives              | spam folder; `SMTP_*` values; the runtime log shows `[mail] sending to ... failed: <reason>`      |
| Pages work but uploads fail                               | the runtime log; the uploads folder must be writable (`UPLOAD_DIR` if you changed it)             |
| Changed an environment variable but nothing changed       | saving environment variables redeploys; wait for that deployment to finish                         |

Runtime logs: the website's dashboard → **Runtime logs**. Build logs: **Deployments**, which keeps the last 10.
