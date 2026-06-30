-- Create a test token for questionnaire testing
-- Run this SQL in your database

INSERT INTO tokens (code, username, site_en, site_kh) 
VALUES ('ABC123', 'testuser', 'Test Site English', 'Test Site Khmer')
ON DUPLICATE KEY UPDATE 
  username = VALUES(username),
  site_en = VALUES(site_en),
  site_kh = VALUES(site_kh);

-- Verify the token was created
SELECT * FROM tokens WHERE code = 'ABC123';

-- Or create a different token
-- INSERT INTO tokens (code, username, site_en, site_kh) 
-- VALUES ('TEST001', 'testuser', 'Test Site EN', 'Test Site KH');




