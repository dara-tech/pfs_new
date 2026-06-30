# How to Access Questionnaires

## Quick Access Guide

### Step 1: Get a Valid Token

You need a token from your database `tokens` table. Here are ways to get one:

#### Option A: Query Database Directly
```sql
SELECT code, username, site_en, site_kh FROM tokens LIMIT 1;
```

#### Option B: Use API Endpoint
```bash
# Get all available tokens
curl http://localhost:3001/api/questionnaire/tokens
```

#### Option C: Check Database via MySQL
```bash
mysql -u your_username -p your_database
mysql> SELECT code FROM tokens LIMIT 1;
```

### Step 2: Access Client Questionnaire

**URL Format:**
```
http://localhost:5173/client/{TOKEN}/{LOCALE}
```

**Examples:**
- Khmer (default): `http://localhost:5173/client/ABC123/kh`
- English: `http://localhost:5173/client/ABC123/en`
- Without locale (defaults to Khmer): `http://localhost:5173/client/ABC123`

**Replace `{TOKEN}` with an actual token from your database!**

### Step 3: Access Provider Questionnaire

**URL Format:**
```
http://localhost:5173/provider/{TOKEN}/{LOCALE}
```

**Examples:**
- Khmer: `http://localhost:5173/provider/ABC123/kh`
- English: `http://localhost:5173/provider/ABC123/en`

## Questionnaire Flow

### Client Questionnaire Flow:
1. **Start**: `/client/{token}/{locale}` → Shows consent form
2. **Consent**: User accepts/declines → Redirects to section1 or thank page
3. **Section 1a**: `/client/{token}/{locale}/{uuid}/section1a`
4. **Section 1a1**: `/client/{token}/{locale}/{uuid}/section1a1`
5. **Section 1b**: `/client/{token}/{locale}/{uuid}/section1b`
6. **Section 1c**: `/client/{token}/{locale}/{uuid}/section1c`
7. **Section 5c**: `/client/{token}/{locale}/{uuid}/section5c`
8. **Section 6c**: `/client/{token}/{locale}/{uuid}/section6c`
9. **Thank You**: `/client/{token}/{locale}/{uuid}/thank`

### Provider Questionnaire Flow:
1. **Start**: `/provider/{token}/{locale}` → Shows consent form
2. **Consent**: User accepts/declines → Redirects to section1 or thank page
3. **Section 1**: `/provider/{token}/{locale}/{uuid}/section1`
4. **Thank You**: `/provider/{token}/{locale}/{uuid}/thank`

## Testing Steps

### 1. Start Your Servers

**Terminal 1 - Backend:**
```bash
cd pfs_new/backend
npm run dev
```
Backend runs on: `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd pfs_new/frontend
npm run dev
```
Frontend runs on: `http://localhost:5173`

### 2. Get a Token

**Method 1: Using API (Recommended)**
```bash
# Get all tokens
curl http://localhost:3001/api/questionnaire/tokens

# Response will be:
# {
#   "tokens": [
#     { "code": "TOKEN123", "username": "user1" },
#     { "code": "TOKEN456", "username": "user2" }
#   ]
# }
```

**Method 2: Direct Database Query**
```sql
-- Connect to your database
mysql -u root -p psf_db

-- Get a token
SELECT code FROM tokens LIMIT 1;
```

### 3. Access the Questionnaire

Open your browser and navigate to:
```
http://localhost:5173/client/YOUR_TOKEN_HERE/kh
```

Replace `YOUR_TOKEN_HERE` with the actual token code from step 2.

## Example URLs

Assuming you have a token `TEST123`:

**Client Questionnaire:**
- Khmer: `http://localhost:5173/client/TEST123/kh`
- English: `http://localhost:5173/client/TEST123/en`

**Provider Questionnaire:**
- Khmer: `http://localhost:5173/provider/TEST123/kh`
- English: `http://localhost:5173/provider/TEST123/en`

## API Endpoints for Testing

### Get Token Info
```bash
GET http://localhost:3001/api/questionnaire/token/{TOKEN}
```

### Get All Tokens
```bash
GET http://localhost:3001/api/questionnaire/tokens
```

### Get All Sites
```bash
GET http://localhost:3001/api/questionnaire/sites
```

## Troubleshooting

### Error: "Invalid token"
- **Solution**: Make sure the token exists in your `tokens` table
- Check: `SELECT * FROM tokens WHERE code = 'YOUR_TOKEN';`

### Error: "Token not found"
- **Solution**: The token doesn't exist in the database
- Create a token: `INSERT INTO tokens (code, username) VALUES ('NEWTOKEN', 'testuser');`

### Error: "Page not found"
- **Solution**: Make sure both backend and frontend servers are running
- Check backend: `curl http://localhost:3001/api/health`
- Check frontend: Open `http://localhost:5173` in browser

### Error: CORS Error
- **Solution**: Make sure backend CORS is configured correctly
- Check `pfs_new/backend/src/app.js` - CORS should allow `http://localhost:5173`

## Quick Test Script

Create a file `test-questionnaire.sh`:

```bash
#!/bin/bash

# Get a token from API
TOKEN=$(curl -s http://localhost:3001/api/questionnaire/tokens | grep -o '"code":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ No tokens found. Please add tokens to your database."
    exit 1
fi

echo "✅ Found token: $TOKEN"
echo ""
echo "🌐 Client Questionnaire (Khmer):"
echo "   http://localhost:5173/client/$TOKEN/kh"
echo ""
echo "🌐 Client Questionnaire (English):"
echo "   http://localhost:5173/client/$TOKEN/en"
echo ""
echo "🌐 Provider Questionnaire (Khmer):"
echo "   http://localhost:5173/provider/$TOKEN/kh"
echo ""
echo "🌐 Provider Questionnaire (English):"
echo "   http://localhost:5173/provider/$TOKEN/en"
```

Run it:
```bash
chmod +x test-questionnaire.sh
./test-questionnaire.sh
```

## Notes

- **No Authentication Required**: Questionnaire routes are public (no login needed)
- **Token-Based Access**: Uses tokens from database for access control
- **Multi-Language**: Supports Khmer (kh) and English (en)
- **UUID Generation**: UUIDs are automatically generated for each session
- **Data Persistence**: All responses are saved to `userdata` or `providerdata` tables




