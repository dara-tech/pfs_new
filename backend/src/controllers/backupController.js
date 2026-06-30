import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';
import multer from 'multer';

// Configure multer for file upload
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB limit
  }
});

// Helper function to escape SQL strings
const escapeSQL = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return value.toString();
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  // Escape single quotes and backslashes
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
};

// Helper function to write to response stream
const writeToStream = (res, data) => {
  return new Promise((resolve, reject) => {
    if (!res.write(data)) {
      res.once('drain', resolve);
    } else {
      process.nextTick(resolve);
    }
  });
};

// Backup data - export all tables as SQL dump (streaming to avoid memory issues)
export const backupData = async (req, res) => {
  try {
    const dbName = process.env.DB_DATABASE;
    if (!dbName) {
      return res.status(500).json({ error: 'Database name not configured' });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    
    // Set headers for streaming response
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${dbName}-${timestamp}.sql"`);
    res.setHeader('Transfer-Encoding', 'chunked');

    // Write header
    await writeToStream(res, `-- MySQL dump 10.13  Distrib 8.0, for osx10.15 (x86_64)\n`);
    await writeToStream(res, `--\n`);
    await writeToStream(res, `-- Host: localhost    Database: ${dbName}\n`);
    await writeToStream(res, `-- ------------------------------------------------------\n`);
    await writeToStream(res, `-- Server version\t8.0.0\n\n`);
    await writeToStream(res, `/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\n`);
    await writeToStream(res, `/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;\n`);
    await writeToStream(res, `/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;\n`);
    await writeToStream(res, `/*!50503 SET NAMES utf8mb4 */;\n`);
    await writeToStream(res, `/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;\n`);
    await writeToStream(res, `/*!40103 SET TIME_ZONE='+00:00' */;\n`);
    await writeToStream(res, `/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;\n`);
    await writeToStream(res, `/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;\n`);
    await writeToStream(res, `/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;\n`);
    await writeToStream(res, `/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;\n\n`);

    // Get all tables in the database
    const tables = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' 
       ORDER BY TABLE_NAME`,
      { replacements: [dbName], type: QueryTypes.SELECT }
    );

    if (!tables || tables.length === 0) {
      res.end();
      return res.status(500).json({ error: 'No tables found in database' });
    }

    for (const table of tables) {
      const tableName = table.TABLE_NAME || table.table_name;
      
      if (!tableName) {
        console.warn('Skipping table with no name:', table);
        continue;
      }

      try {
        await writeToStream(res, `-- --------------------------------------------------------\n`);
        await writeToStream(res, `-- Table structure for table \`${tableName}\`\n`);
        await writeToStream(res, `-- --------------------------------------------------------\n\n`);
        await writeToStream(res, `DROP TABLE IF EXISTS \`${tableName}\`;\n`);

        // Get table structure
        const createTableResult = await sequelize.query(
          `SHOW CREATE TABLE \`${tableName}\``,
          { type: QueryTypes.SELECT }
        );
        
        const createTable = Array.isArray(createTableResult) && createTableResult.length > 0 
          ? createTableResult[0] 
          : createTableResult;
        const createTableSQL = createTable?.['Create Table'] || createTable?.['CREATE TABLE'] || createTable?.['create table'];
        
        if (createTableSQL) {
          await writeToStream(res, createTableSQL + ';\n\n');
        } else {
          await writeToStream(res, `-- Could not get table structure for \`${tableName}\`\n\n`);
        }

        // Get table data - use smaller batches and stream
        await writeToStream(res, `-- Dumping data for table \`${tableName}\`\n\n`);
        await writeToStream(res, `LOCK TABLES \`${tableName}\` WRITE;\n`);
        await writeToStream(res, `/*!40000 ALTER TABLE \`${tableName}\` DISABLE KEYS */;\n`);
        
        // Process data in smaller batches to reduce memory usage
        const batchSize = 500; // Reduced from 1000 to 500 rows per INSERT
        let offset = 0;
        let hasData = false;
        let columnNames = null;
        
        while (true) {
          // Get data in batches
          const rows = await sequelize.query(
            `SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`,
            { 
              replacements: [batchSize, offset],
              type: QueryTypes.SELECT 
            }
          );
          
          if (!rows || rows.length === 0) {
            break; // No more data
          }
          
          // Get column names from first batch
          if (!columnNames) {
            columnNames = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ');
          }
          
          // Build INSERT statement - more compact format like MySQL Workbench
          await writeToStream(res, `INSERT INTO \`${tableName}\` (${columnNames}) VALUES\n`);
          
          const valueRows = [];
          for (const row of rows) {
            const values = Object.keys(rows[0]).map(col => escapeSQL(row[col])).join(',');
            valueRows.push(`(${values})`);
          }
          
          // Write values in compact format (no extra spaces, single line per row)
          await writeToStream(res, valueRows.join(',\n') + ';\n');
          
          hasData = true;
          offset += batchSize;
          
          // If we got less than batchSize, we're done
          if (rows.length < batchSize) {
            break;
          }
        }
        
        if (hasData) {
          await writeToStream(res, `\n/*!40000 ALTER TABLE \`${tableName}\` ENABLE KEYS */;\n`);
        } else {
          await writeToStream(res, `-- No data for table \`${tableName}\`\n`);
        }
        await writeToStream(res, `UNLOCK TABLES;\n\n`);
      } catch (tableError) {
        console.warn(`Error processing table ${tableName}:`, tableError.message);
        await writeToStream(res, `-- Error processing table \`${tableName}\`: ${tableError.message}\n\n`);
        // Continue with next table
      }
    }

    // Write footer
    await writeToStream(res, `-- Dump completed on ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n`);
    await writeToStream(res, `/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;\n\n`);
    await writeToStream(res, `/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;\n`);
    await writeToStream(res, `/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;\n`);
    await writeToStream(res, `/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;\n`);
    await writeToStream(res, `/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n`);
    await writeToStream(res, `/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n`);
    await writeToStream(res, `/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n`);
    await writeToStream(res, `/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;\n`);

    res.end();
  } catch (error) {
    console.error('Backup error:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to create backup: ' + (error.message || 'Unknown error'),
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.end();
    }
  }
};

// Verify SQL dump file before restore
export const verifyRestore = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const dbName = process.env.DB_DATABASE;
    if (!dbName) {
      return res.status(500).json({ error: 'Database name not configured' });
    }

    // Read SQL file content
    const sqlContent = req.file.buffer.toString('utf-8');

    // Extract table structures from SQL dump
    const dumpTables = {};
    
    // Use a more efficient approach: split by CREATE TABLE first, then parse each
    const createTableMatches = sqlContent.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(/gi);
    
    if (createTableMatches && createTableMatches.length > 0) {
      // More robust regex to handle various SQL formats including IF NOT EXISTS, ENGINE, etc.
      const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\)\s*(?:ENGINE|DEFAULT|CHARACTER|COLLATE|AUTO_INCREMENT|COMMENT)[\s\S]*?;/gi;
      let match;
      let lastIndex = 0;
      
      // Reset regex lastIndex to avoid issues with global flag
      createTableRegex.lastIndex = 0;
      
      while ((match = createTableRegex.exec(sqlContent)) !== null) {
        // Prevent infinite loop
        if (match.index === lastIndex) {
          break;
        }
        lastIndex = match.index;
        
        const tableName = match[1];
        const tableDefinition = match[2];
        if (tableName && !dumpTables[tableName]) {
          dumpTables[tableName] = {
            definition: tableDefinition,
            columns: extractColumns(tableDefinition)
          };
        }
      }
    }
    
    // Fallback: try simpler regex if no tables found
    if (Object.keys(dumpTables).length === 0) {
      const simpleRegex = /CREATE\s+TABLE\s+[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\)\s*;/gi;
      let simpleMatch;
      let lastIndex = 0;
      
      simpleRegex.lastIndex = 0;
      while ((simpleMatch = simpleRegex.exec(sqlContent)) !== null) {
        // Prevent infinite loop
        if (simpleMatch.index === lastIndex) {
          break;
        }
        lastIndex = simpleMatch.index;
        
        const tableName = simpleMatch[1];
        const tableDefinition = simpleMatch[2];
        if (tableName && !dumpTables[tableName]) {
          dumpTables[tableName] = {
            definition: tableDefinition,
            columns: extractColumns(tableDefinition)
          };
        }
      }
    }

    // Get current database tables
    const currentTables = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' 
       ORDER BY TABLE_NAME`,
      { replacements: [dbName], type: QueryTypes.SELECT }
    );

    const currentTableNames = currentTables.map(t => t.TABLE_NAME || t.table_name);

    // Compare schemas
    const differences = {
      newTables: [], // Tables in dump but not in current DB
      missingTables: [], // Tables in current DB but not in dump
      modifiedTables: [], // Tables with schema differences
      matchingTables: [] // Tables that match
    };

    // Check each table in dump
    for (const [tableName, dumpTable] of Object.entries(dumpTables)) {
      if (!currentTableNames.includes(tableName)) {
        differences.newTables.push(tableName);
      } else {
        // Get current table structure
        try {
          const currentTableResult = await sequelize.query(
            `SHOW CREATE TABLE \`${tableName}\``,
            { type: QueryTypes.SELECT }
          );
          const currentTable = Array.isArray(currentTableResult) && currentTableResult.length > 0 
            ? currentTableResult[0] 
            : currentTableResult;
          const currentSQL = currentTable?.['Create Table'] || currentTable?.['CREATE TABLE'] || currentTable?.['create table'];
          
          if (currentSQL) {
            const currentColumns = extractColumns(currentSQL);
            const dumpColumns = dumpTable.columns;
            
            // Compare columns
            const columnDiff = compareColumns(dumpColumns, currentColumns);
            if (columnDiff.hasChanges) {
              differences.modifiedTables.push({
                table: tableName,
                changes: columnDiff
              });
            } else {
              differences.matchingTables.push(tableName);
            }
          }
        } catch (error) {
          console.warn(`Error checking table ${tableName}:`, error.message);
          differences.modifiedTables.push({
            table: tableName,
            error: error.message
          });
        }
      }
    }

    // Check for tables in current DB but not in dump
    for (const tableName of currentTableNames) {
      if (!dumpTables[tableName]) {
        differences.missingTables.push(tableName);
      }
    }

    res.json({
      valid: true,
      differences,
      summary: {
        totalDumpTables: Object.keys(dumpTables).length,
        totalCurrentTables: currentTableNames.length,
        newTables: differences.newTables.length,
        missingTables: differences.missingTables.length,
        modifiedTables: differences.modifiedTables.length,
        matchingTables: differences.matchingTables.length
      }
    });
  } catch (error) {
    console.error('Verify restore error:', error);
    res.status(500).json({ 
      error: 'Failed to verify backup file: ' + (error.message || 'Unknown error'),
      valid: false
    });
  }
};

// Helper function to extract columns from CREATE TABLE statement
function extractColumns(createTableSQL) {
  const columns = {};
  // Match column definitions: `column_name` TYPE [attributes]
  const columnRegex = /`(\w+)`\s+(\w+(?:\([^)]+\))?)\s*([^,`]*)/g;
  let match;
  
  while ((match = columnRegex.exec(createTableSQL)) !== null) {
    const columnName = match[1].toLowerCase();
    const columnType = match[2];
    const attributes = match[3].trim();
    columns[columnName] = {
      type: columnType.toLowerCase(),
      attributes: attributes.toLowerCase(),
      full: match[0].trim()
    };
  }
  
  return columns;
}

// Helper function to compare columns
function compareColumns(dumpColumns, currentColumns) {
  const changes = {
    hasChanges: false,
    added: [],
    removed: [],
    modified: []
  };

  // Check for added columns (in dump but not in current)
  for (const [colName, colDef] of Object.entries(dumpColumns)) {
    if (!currentColumns[colName]) {
      changes.added.push({ name: colName, definition: colDef });
      changes.hasChanges = true;
    } else if (colDef.type !== currentColumns[colName].type || 
               colDef.attributes !== currentColumns[colName].attributes) {
      changes.modified.push({
        name: colName,
        dump: colDef,
        current: currentColumns[colName]
      });
      changes.hasChanges = true;
    }
  }

  // Check for removed columns (in current but not in dump)
  for (const [colName, colDef] of Object.entries(currentColumns)) {
    if (!dumpColumns[colName]) {
      changes.removed.push({ name: colName, definition: colDef });
      changes.hasChanges = true;
    }
  }

  return changes;
}

// Streaming SQL parser that processes file in chunks to avoid memory issues
async function* parseSQLStream(buffer, chunkSize = 1024 * 1024) { // Process 1MB chunks
  let currentStatement = '';
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let commentType = ''; // '--' or '/*'
  let bufferPos = 0;
  
  const sqlContent = buffer.toString('utf-8');
  const totalLength = sqlContent.length;
  
  while (bufferPos < totalLength) {
    const endPos = Math.min(bufferPos + chunkSize, totalLength);
    
    for (let i = bufferPos; i < endPos; i++) {
      const char = sqlContent[i];
      const nextChar = sqlContent[i + 1];
      const prevChar = sqlContent[i - 1];
      
      // Handle string literals
      if (!inComment && (char === "'" || char === '"' || char === '`')) {
        if (!inString) {
          inString = true;
          stringChar = char;
          currentStatement += char;
        } else if (char === stringChar && prevChar !== '\\') {
          inString = false;
          stringChar = '';
          currentStatement += char;
        } else {
          currentStatement += char;
        }
        continue;
      }
      
      // Handle comments
      if (!inString) {
        // Single-line comment
        if (char === '-' && nextChar === '-' && !inComment) {
          inComment = true;
          commentType = '--';
          // Skip to end of line
          while (i < totalLength && sqlContent[i] !== '\n') {
            i++;
          }
          continue;
        }
        
        // Multi-line comment
        if (char === '/' && nextChar === '*' && !inComment) {
          // Check if it's a MySQL version-specific comment (/*!40000 ... */)
          const checkAhead = sqlContent.substring(i, Math.min(i + 10, totalLength));
          if (checkAhead.match(/^\/\*!\d/)) {
            currentStatement += char;
            continue;
          }
          inComment = true;
          commentType = '/*';
          i++; // Skip the *
          continue;
        }
        
        if (inComment && commentType === '/*' && char === '*' && nextChar === '/') {
          inComment = false;
          commentType = '';
          i++; // Skip the /
          continue;
        }
        
        if (inComment && commentType === '--' && char === '\n') {
          inComment = false;
          commentType = '';
          currentStatement += char;
          continue;
        }
        
        if (inComment) {
          continue;
        }
      }
      
      // End of statement
      if (!inString && !inComment && char === ';') {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0) {
          const upperTrimmed = trimmed.toUpperCase();
          const isVersionComment = upperTrimmed.startsWith('/*!') && upperTrimmed.match(/^\/\*!\d+/);
          const isSetStatement = upperTrimmed.startsWith('SET ') && 
                                 !upperTrimmed.includes('FOREIGN_KEY_CHECKS') &&
                                 !upperTrimmed.includes('SQL_MODE') &&
                                 !upperTrimmed.includes('AUTOCOMMIT');
          
          if (!isSetStatement && !isVersionComment) {
            yield trimmed;
          }
        }
        currentStatement = '';
        continue;
      }
      
      if (!inComment) {
        currentStatement += char;
      }
    }
    
    bufferPos = endPos;
    
    // Yield control to allow other operations
    await new Promise(resolve => setImmediate(resolve));
  }
  
  // Add remaining statement if any
  const trimmed = currentStatement.trim();
  if (trimmed.length > 0) {
    const upperTrimmed = trimmed.toUpperCase();
    if (!upperTrimmed.startsWith('SET ') && 
        !upperTrimmed.startsWith('LOCK TABLES') &&
        !upperTrimmed.startsWith('UNLOCK TABLES') &&
        !upperTrimmed.startsWith('/*!') &&
        !upperTrimmed.match(/^\/\*!\d+/)) {
      yield trimmed;
    }
  }
}

// Restore data - import from SQL dump file
export const restoreData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file size (max 1GB)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'File too large. Maximum size is 1GB' });
    }

    // Validate file size (max 1GB)
    // Check if it looks like a SQL file (check first 1MB only)
    const preview = req.file.buffer.toString('utf-8', 0, Math.min(1024 * 1024, req.file.size));
    if (!preview.toUpperCase().includes('CREATE TABLE') && !preview.toUpperCase().includes('INSERT INTO')) {
      return res.status(400).json({ error: 'File does not appear to be a valid SQL dump file' });
    }

    // Disable foreign key checks for restore
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.query('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO"');
    await sequelize.query('SET AUTOCOMMIT = 0');

    const errors = [];
    let executedCount = 0;
    let statementIndex = 0;

    // Process SQL file using streaming parser to avoid memory issues
    try {
      for await (const statement of parseSQLStream(req.file.buffer)) {
        statementIndex++;
        
        if (statement.trim().length === 0) continue;
        
        try {
          // DDL statements (CREATE, DROP, ALTER) cause implicit commit in MySQL
          const upperStatement = statement.toUpperCase().trim();
          const isDDL = upperStatement.startsWith('CREATE ') || 
                       upperStatement.startsWith('DROP ') || 
                       upperStatement.startsWith('ALTER ');
          
          await sequelize.query(statement);
          executedCount++;
        } catch (error) {
          const errorMsg = error.message || String(error);
          const errorCode = error.code || '';
          
          // Skip certain expected/non-critical errors
          const isExpectedError = errorMsg.includes('already exists') || 
              errorMsg.includes('Unknown table') ||
              errorMsg.includes('Duplicate entry') ||
              (errorMsg.includes('Table') && errorMsg.includes("doesn't exist")) ||
              errorMsg.includes('Duplicate key') ||
              errorMsg.includes('ER_DUP_ENTRY') ||
              errorMsg.includes('ER_DUP_KEYNAME') ||
              errorCode === 'ER_DUP_ENTRY' ||
              errorCode === 'ER_DUP_KEYNAME' ||
              errorCode === 'ER_TABLE_EXISTS_ERROR' ||
              errorMsg.includes('Table') && errorMsg.includes('already exists');
          
          if (isExpectedError) {
            // Skip silently for expected errors
            continue;
          }
          
          // Check for critical errors that should stop the restore
          const isCriticalError = errorMsg.includes('syntax error') ||
                                 errorMsg.includes('parse error') ||
                                 errorMsg.includes('You have an error in your SQL syntax') ||
                                 errorCode === 'ER_PARSE_ERROR' ||
                                 errorCode === 'ER_SYNTAX_ERROR';
          
          if (isCriticalError) {
            console.error(`Critical error at statement ${statementIndex}:`, errorMsg);
            console.error(`Error code:`, errorCode);
            console.error(`Statement preview (first 500 chars):`, statement.substring(0, 500));
            errors.push({
              statementIndex: statementIndex,
              error: errorMsg,
              errorCode: errorCode,
              preview: statement.substring(0, 500),
              critical: true
            });
            // Stop restore on critical errors
            break;
          } else {
            // Non-critical error - log and continue
            console.warn(`Non-critical error at statement ${statementIndex}:`, errorMsg.substring(0, 150));
            console.warn(`Error code:`, errorCode);
            errors.push({
              statementIndex: statementIndex,
              error: errorMsg,
              errorCode: errorCode,
              preview: statement.substring(0, 500)
            });
          }
        }
      }
      
    } catch (streamError) {
      console.error('Error during streaming parse:', streamError);
      console.error('Stream error stack:', streamError.stack);
      errors.push({
        statementIndex: statementIndex,
        error: streamError.message || String(streamError),
        critical: true
      });
    }

    // Re-enable foreign key checks
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      await sequelize.query('SET AUTOCOMMIT = 1');
    } catch (cleanupError) {
      console.warn('Error during cleanup (non-critical):', cleanupError.message);
    }

    if (errors.length > 0) {
      const criticalErrors = errors.filter(e => e.critical);

      if (criticalErrors.length > 0) {
        console.error(`[Restore] Failed: ${criticalErrors.length} critical, ${executedCount} statements executed`);
        return res.status(500).json({
          error: `Restore failed: ${criticalErrors.length} critical error(s)`,
          executed: executedCount,
          errors: criticalErrors.slice(0, 10),
        });
      }

      return res.json({
        message: `Data restored with ${errors.length} warnings`,
        executed: executedCount,
        warnings: errors.slice(0, 10),
      });
    }

    res.json({
      message: 'Data restored successfully',
      executed: executedCount,
    });
  } catch (error) {
    console.error('Restore error:', error);
    console.error('Error stack:', error.stack);
    
    // Try to re-enable foreign key checks even on error
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      await sequelize.query('SET AUTOCOMMIT = 1');
    } catch (cleanupError) {
      console.warn('Error during cleanup (non-critical):', cleanupError.message);
    }
    
    res.status(500).json({ 
      error: 'Failed to restore data: ' + (error.message || 'Unknown error'),
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
