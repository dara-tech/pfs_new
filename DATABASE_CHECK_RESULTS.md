# Database Check Results

## ✅ Database Connection: SUCCESS

**Database:** `psf_db`  
**User:** `root`  
**Status:** Connected and operational

---

## Token Status

### ✅ Token ABC123: EXISTS
```
Code: ABC123
Username: testuser
Site EN: Test Site English
Site KH: Test Site Khmer
```

### Database Statistics:
- **Total Tokens:** 76 tokens
- **Client Responses:** 15,479 records in `userdata` table
- **Provider Responses:** 2,864 records in `providerdata` table

### Sample Tokens Available:
- `ABC123` (test token) ✅
- `Ak2l6PJA` (art_1212)
- `Al6z6ZUA` (art_701)
- `Be3a6VVQ` (art_2401)
- And 72 more...

---

## Test Session Found

### UUID: `240db693-fdcc-413a-a8ef-cfa179078118`
```
_URI: 240db693-fdcc-413a-a8ef-cfa179078118
ACKNOWLEDGE: 1 (Consent given)
START: 2025-12-25 04:15:28
USERNAME: testuser
```

This UUID exists in the database, meaning someone has already started a questionnaire with this token.

---

## Database Schema Notes

### Column Name Case Sensitivity:
- Database uses: `Q3c_1`, `Q3c_2`, `Q6c_1`, `Q6c_2` (lowercase 'c')
- Sequelize model updated to match database column names
- Q3C fields are DECIMAL type
- Q6C fields are DECIMAL type

### Fixed Issues:
✅ Updated Sequelize model to use correct column names (`Q3c_1` not `Q3C_1`)
✅ Updated data types (DECIMAL for Q3C and Q6C fields)

---

## Access URLs

**Test Token ABC123:**
- Client: `http://localhost:5173/client/ABC123/kh`
- Provider: `http://localhost:5173/provider/ABC123/kh`

**Existing Session:**
- `http://localhost:5173/client/ABC123/kh/240db693-fdcc-413a-a8ef-cfa179078118/consent`

---

## Status: ✅ READY

- Database is connected
- Token ABC123 exists
- Models match database schema
- Ready for testing




