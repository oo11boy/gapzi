import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // username MySQL خودت
  password: '', // password MySQL خودت
  database: 'chat_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;