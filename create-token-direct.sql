-- Run this SQL directly in your MySQL database
-- This will create the token ABC123

INSERT INTO tokens (code, username, site_en, site_kh) 
VALUES ('ABC123', 'testuser', 'Test Site English', 'Test Site Khmer')
ON DUPLICATE KEY UPDATE 
  username = VALUES(username),
  site_en = VALUES(site_en),
  site_kh = VALUES(site_kh);

-- Verify it was created
SELECT * FROM tokens WHERE code = 'ABC123';




