import 'dotenv/config';
import { db } from '../server/db';
import { clients, projects } from '../shared/schema';

async function main() {
  // Create a test client
  const [client] = await db.insert(clients).values({
    name: 'Cliente Seed',
    contact: 'Contato Seed',
    phone: '11999999999',
    email: 'seed@example.com',
    address: 'Rua do Seed, 123',
    cnpjCpf: '000.000.000-00',
  }).returning();

  // Create a test project
  await db.insert(projects).values({
    name: 'Projeto Seed',
    clientId: client.id,
    description: 'Projeto de exemplo para validação',
    value: '1500.00',
    type: 'vidro',
    status: 'orcamento',
    date: new Date().toISOString().split('T')[0],
  });

  console.log('Seed concluído com sucesso.');
}

main().catch((err) => {
  console.error('Erro ao executar seed:', err);
  process.exit(1);
});