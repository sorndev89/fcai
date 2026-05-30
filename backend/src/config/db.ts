import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../db/schema';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'mysql://root:root@127.0.0.1:3306/fb_chat_ai';

export const poolConnection = mysql.createPool({
  uri: databaseUrl,
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });
