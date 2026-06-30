# Quick Test Guide

## Testing the Questionnaire URL

### Your URL:
```
http://localhost:5173/client/ABC123/kh
```

### Steps to Test:

1. **Make sure both servers are running:**

   **Terminal 1 - Backend:**
   ```bash
   cd pfs_new/backend
   npm run dev
   ```
   Should see: `🚀 Server running on port 3001`

   **Terminal 2 - Frontend:**
   ```bash
   cd pfs_new/frontend
   npm run dev
   ```
   Should see: `Local: http://localhost:5173`

2. **Verify token exists in database:**
   ```sql
   SELECT code FROM tokens WHERE code = 'ABC123';
   ```
   
   If token doesn't exist, create one:
   ```sql
   INSERT INTO tokens (code, username, site_en, site_kh) 
   VALUES ('ABC123', 'testuser', 'Test Site EN', 'Test Site KH');
   ```

3. **Test the API directly:**
   ```bash
   # Test if backend is responding
   curl http://localhost:3001/api/health
   
   # Test token endpoint
   curl http://localhost:3001/api/questionnaire/token/ABC123
   
   # Test client page endpoint
   curl http://localhost:3001/api/questionnaire/client/ABC123/kh
   ```

4. **Open in browser:**
   ```
   http://localhost:5173/client/ABC123/kh
   ```

### Expected Behavior:

1. **First Visit** (`/client/ABC123/kh`):
   - Should show loading skeleton
   - Then redirect to: `/client/ABC123/kh/{uuid}/consent`
   - Shows consent form

2. **After Consent**:
   - If "Yes" → Redirects to section1
   - If "No" → Redirects to thank page

### Common Issues:

**Issue: "Invalid token" or "Token not found"**
- **Solution**: Token doesn't exist in database
- **Fix**: Create token in `tokens` table

**Issue: "Failed to load page" or Network Error**
- **Solution**: Backend not running or CORS issue
- **Fix**: 
  - Check backend is running on port 3001
  - Check browser console for CORS errors
  - Verify proxy in `vite.config.js`

**Issue: Page shows blank/loading forever**
- **Solution**: Check browser console for errors
- **Fix**: 
  - Open DevTools (F12)
  - Check Console tab for errors
  - Check Network tab for failed requests

**Issue: 404 Not Found**
- **Solution**: Route not matching
- **Fix**: Verify route in `App.jsx` matches URL pattern

### Debug Checklist:

- [ ] Backend server running on port 3001
- [ ] Frontend server running on port 5173
- [ ] Token exists in database
- [ ] Database connection working
- [ ] No CORS errors in browser console
- [ ] API proxy configured correctly

### Quick Test Commands:

```bash
# Test backend health
curl http://localhost:3001/api/health

# Test token endpoint
curl http://localhost:3001/api/questionnaire/token/ABC123

# Test client page (should return JSON)
curl http://localhost:3001/api/questionnaire/client/ABC123/kh

# Get all tokens
curl http://localhost:3001/api/questionnaire/tokens
```

### Browser Console Check:

Open browser DevTools (F12) and check:
1. **Console tab** - Look for errors
2. **Network tab** - Check if API calls are successful
3. **Application tab** - Check localStorage for any stored data

### If Still Not Working:

1. Check backend logs for errors
2. Check frontend console for errors
3. Verify database connection
4. Verify token exists in `tokens` table
5. Check CORS configuration in backend




