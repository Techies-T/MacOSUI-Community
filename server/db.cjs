const dbType = process.env.DB_TYPE || 'sqlite';

let db;

if (dbType === 'postgres') {
    db = require('./db_postgres.cjs');
    console.log('[DB Factory] Loaded PostgreSQL Adapter');
} else {
    db = require('./db_sqlite.cjs');
    console.log('[DB Factory] Loaded SQLite Adapter');
}

module.exports = db;
