import pg from 'pg';
const { Client } = pg;

const ddlStatements: string[] = [
  // Extension for gen_random_uuid
  `CREATE EXTENSION IF NOT EXISTS pgcrypto;`,

  // clients
  `CREATE TABLE IF NOT EXISTS clients (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    contact text NOT NULL,
    email text,
    phone text NOT NULL,
    address text,
    cnpj_cpf text,
    created_at timestamp NOT NULL DEFAULT now()
  );`,

  // projects
  `CREATE TABLE IF NOT EXISTS projects (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    client_id varchar NOT NULL,
    description text,
    value numeric(10,2) NOT NULL,
    type text NOT NULL,
    status text NOT NULL DEFAULT 'orcamento',
    date text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );`,

  // transactions
  `CREATE TABLE IF NOT EXISTS transactions (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id varchar NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    value numeric(10,2) NOT NULL,
    date text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT fk_transactions_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );`,

  // quotes
  `CREATE TABLE IF NOT EXISTS quotes (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id varchar NOT NULL,
    number text NOT NULL,
    status text NOT NULL DEFAULT 'pendente',
    valid_until text NOT NULL,
    local text,
    tipo text,
    discount numeric(5,2) DEFAULT '0',
    observations text,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT fk_quotes_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );`,

  // quote_items
  `CREATE TABLE IF NOT EXISTS quote_items (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id varchar NOT NULL,
    description text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    width numeric(10,2),
    height numeric(10,2),
    color_thickness text,
    profile_color text,
    accessory_color text,
    line text,
    delivery_date text,
    item_observations text,
    unit_price numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    image_url text,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT fk_quote_items_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
  );`,

  // project_files
  `CREATE TABLE IF NOT EXISTS project_files (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id varchar NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size integer NOT NULL,
    category text NOT NULL,
    object_path text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT fk_project_files_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );`,

  // bills
  `CREATE TABLE IF NOT EXISTS bills (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL,
    description text NOT NULL,
    value numeric(10,2) NOT NULL,
    due_date text NOT NULL,
    status text NOT NULL DEFAULT 'pendente',
    project_id varchar,
    date text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT fk_bills_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
  );`,
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL must be set');
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log('Connected. Applying schema to Supabase...');
    for (const sql of ddlStatements) {
      console.log('Executing:', sql.split('\n')[0]);
      await client.query(sql);
    }
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Schema apply failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();