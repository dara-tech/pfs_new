# HostPapa DNS: point `psfnew` to Vercel

## If you see “CNAME and other data” (line 133/134)

`psfnew` currently has **multiple records** (two A records + TXT SPF). Remove **all** `psfnew` lines, then keep **only one**:

```text
psfnew  300  IN  A  76.76.21.21
```

See `zone-psfnew-fix.txt` for copy/paste. **Do not** add CNAME until A and TXT on `psfnew` are gone.

## Vercel options

| Type | Name | Value |
|------|------|--------|
| **A** (easiest on HostPapa) | `psfnew` | `76.76.21.21` |
| **CNAME** (after cleanup) | `psfnew` | `5bad525f5025e224.vercel-dns-017.com` |

## Manual steps (cPanel on HostPapa)

1. Log in: **https://nchad459.hostpapavps.net:2083** (user `nchads3`).
2. Open **Domains** → **Zone Editor** (or **Advanced DNS Zone Editor**).
3. Select zone **`nchads.gov.kh`**.
4. Find existing **`psfnew`** records:
   - If there is an **A** record (e.g. `216.7.89.248`) → **Delete** it.  
     You cannot use A + CNAME for the same name.
   - If there is an old **CNAME** to HostPapa → **Delete** or **Edit**.
5. **Add Record**:
   - **Type:** CNAME  
   - **Name:** `psfnew` (not the full domain)  
   - **Record / CNAME:** `5bad525f5025e224.vercel-dns-017.com`  
   - **TTL:** 300 or default  
6. **Save** / **Save Zone**.
7. In **Vercel** → Domains → `psfnew.nchads.gov.kh` → **Refresh**.
8. After 5–30 minutes, open **https://psfnew.nchads.gov.kh** (should show the Vercel app).

## Script (same change via API)

```bash
cd pfs_new
cp deploy/hostpapa/.env.deploy.example deploy/hostpapa/.env.deploy
# Edit .env.deploy — set CPANEL_PASS=...

./deploy/hostpapa/configure-vercel-dns.sh
```

## Verify

```bash
dig +short psfnew.nchads.gov.kh CNAME
# should show something like: 5bad525f5025e224.vercel-dns-017.com.

curl -sI https://psfnew.nchads.gov.kh/api/health | head -5
```

## Notes

- **Frontend** is on Vercel; **API** is still on the VPS (`vercel.json` rewrites `/api` to `107.175.91.211`).
- You do **not** need files in `public_html/psfnew` for the admin app once DNS points to Vercel (questionnaire links on HostPapa can stay if you use another path/host).
- If Vercel shows a **new** CNAME target after you redeploy the domain, update the record to match the dashboard.
