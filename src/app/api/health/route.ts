export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const missing = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(k => !process.env[k]);

    let dbStatus = 'not-tested';
    let dbError: string | null = null;

    if (missing.length === 0) {
      try {
        const mysql = await import('mysql2/promise');
        const conn = await mysql.default.createConnection({
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '3306'),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          connectTimeout: 5000,
        });
        await conn.execute('SELECT 1');
        await conn.end();
        dbStatus = 'ok';
      } catch (e: any) {
        dbStatus = 'error';
        dbError = `${e.code || 'UNKNOWN'}: ${e.message}`;
      }
    }

    return Response.json({
      status: 'ok',
      env_set: missing.length === 0,
      missing_env: missing.length > 0 ? missing : undefined,
      db: dbStatus,
      db_error: dbError,
      node: process.version,
    });
  } catch (e: any) {
    return Response.json({ status: 'crash', error: e.message, stack: e.stack?.split('\n').slice(0, 3) }, { status: 500 });
  }
}
