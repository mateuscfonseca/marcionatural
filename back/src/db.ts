import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Em produção (container Docker), usa /app/data
// Em desenvolvimento, usa o diretório data local
const isProduction = process.env.NODE_ENV === 'production';
const DB_PATH = isProduction
  ? '/app/data/marcionatural.db'
  : join(__dirname, '..', 'data', 'marcionatural.db');

// Garante que o diretório data existe
const dataDir = isProduction ? '/app/data' : join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Abre o banco de dados
const db = new Database(DB_PATH);

// Configura para retornar objetos como resultado
db.exec('PRAGMA journal_mode = WAL');

export function initDatabase() {
  // Lê e executa o schema
  if(isProduction) {return;}
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Lê e executa os seeds
  const seedsPath = join(__dirname, 'seeds.sql');
  const seeds = fs.readFileSync(seedsPath, 'utf-8');
  
  // Executa cada statement separadamente
  const statements = seeds.split(';').filter(s => s.trim().length > 0);
  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (e) {
      // Ignora erros de inserts duplicados
    }
  }

  console.log('Banco de dados inicializado com sucesso!');
}

export { db };
