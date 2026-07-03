import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  const missing = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(k => !process.env[k]);

  if (missing.length) {
    return NextResponse.json({
      status: 'error',
      message: `Missing env vars: ${missing.join(', ')}`,
      hint: 'Set environment variables in Vercel dashboard',
    }, { status: 500 });
  }

  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 5000,
    });
    const [rows] = await conn.execute('SELECT 1 as ok');
    await conn.end();
    return NextResponse.json({ status: 'ok', mysql: (rows as any[])[0].ok });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      message: e.message,
      code: e.code,
      hint: e.code === 'ECONNREFUSED' ? 'MySQL host unreachable. Check firewall/whitelist Vercel IPs.' :
            e.code === 'ER_ACCESS_DENIED_ERROR' ? 'Wrong user/password.' :
            e.code === 'ETIMEDOUT' ? 'Connection timeout. MySQL mungkin firewall.' :
            'Unknown error. Check credentials.',
    }, { status: 500 });
  }
}
