# Quick Access Guide - Questionnaire

## 🚀 Quick Start

### 1. Make sure servers are running:

**Backend (Terminal 1):**
```bash
cd pfs_new/backend
npm run dev
```
Backend: `http://localhost:3001`

**Frontend (Terminal 2):**
```bash
cd pfs_new/frontend
npm run dev
```
Frontend: `http://localhost:5173`

### 2. Get a Token

**Option A: Check if test token exists**
```bash
# The test token should be: ABC123
```

**Option B: Get token from database**
```bash
mysql -u root -ppassword123 psf_db -e "SELECT code FROM tokens LIMIT 1;"
```

**Option C: Use API**
```bash
curl http://localhost:3001/api/questionnaire/tokens
```

### 3. Access Questionnaire

Open in your browser:

**Client Questionnaire (Khmer):**
```
http://localhost:5173/client/ABC123/kh
```

**Client Questionnaire (English):**
```
http://localhost:5173/client/ABC123/en
```

**Provider Questionnaire (Khmer):**
```
http://localhost:5173/provider/ABC123/kh
```

**Provider Questionnaire (English):**
```
http://localhost:5173/provider/ABC123/en
```

## 📋 Questionnaire Sections

### Client Questionnaire Flow:
1. **Consent** → `/client/{token}/{locale}` or `/client/{token}/{locale}/{uuid}/consent`
2. **Section 1a** → `/client/{token}/{locale}/{uuid}/section1a` (5 questions: q1a-q5a)
3. **Section 1a1** → `/client/{token}/{locale}/{uuid}/section1a1` (4 questions: q6a, q7a, q8a, q10a)
4. **Section 1b** → `/client/{token}/{locale}/{uuid}/section1b` (5 questions: q1b-q5b)
5. **Section 1c** → `/client/{token}/{locale}/{uuid}/section1c` (4 questions: q1c-q4c)
6. **Section 5c** → `/client/{token}/{locale}/{uuid}/section5c` (3 questions: q5c1-q5c3)
7. **Section 6c** → `/client/{token}/{locale}/{uuid}/section6c` (9 questions: q6c-q14c)
8. **Thank You** → `/client/{token}/{locale}/{uuid}/thank`

### Provider Questionnaire Flow:
1. **Consent** → `/provider/{token}/{locale}` or `/provider/{token}/{locale}/{uuid}/consent`
2. **Section 1** → `/provider/{token}/{locale}/{uuid}/section1`
3. **Thank You** → `/provider/{token}/{locale}/{uuid}/thank`

## 🔧 Create Test Token

If token `ABC123` doesn't exist, create it:

```bash
cd pfs_new/backend
node create-token.js
```

Or manually:
```sql
INSERT INTO tokens (code, username) VALUES ('ABC123', 'testuser');
```

## ✅ What You Should See

1. **Consent Page**: Radio buttons for Yes/No consent
2. **Question Sections**: Actual form fields with:
   - Radio buttons for single-choice questions
   - Checkboxes for multi-choice questions
   - Text inputs for open-ended questions
3. **Navigation**: Automatic redirect to next section after submission
4. **Thank You Page**: Confirmation message after completion

## 🐛 Troubleshooting

**"Token not found" error:**
- Create the token: `cd pfs_new/backend && node create-token.js`

**"404 Not Found" error:**
- Check both servers are running
- Check URL format: `/client/{TOKEN}/{LOCALE}`

**Form fields not showing:**
- Check browser console for errors
- Verify translations.js is loaded correctly
- Check network tab for API responses

**Questions showing as placeholder text:**
- Make sure you're accessing a section URL (e.g., `/section1a`)
- Check that `index` parameter is set correctly in URL

## 📝 Example Complete URL

For testing section 1a directly:
```
http://localhost:5173/client/ABC123/kh/240db693-fdcc-413a-a8ef-cfa179078118/section1a
```

Note: The UUID is auto-generated on first visit. Start with:
```
http://localhost:5173/client/ABC123/kh
```




