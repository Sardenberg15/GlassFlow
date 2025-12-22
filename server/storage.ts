import {
  clients,
  projects,
  transactions,
  quotes,
  quoteItems,
  projectFiles,
  bills,
  transactionFiles,
  type Client,
  type InsertClient,
  type Project,
  type InsertProject,
  type Transaction,
  type InsertTransaction,
  type Quote,
  type InsertQuote,
  type QuoteItem,
  type InsertQuoteItem,
  type ProjectFile,
  type InsertProjectFile,
  type Bill,
  type InsertBill,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Local types for transaction files based on drizzle table
export type TransactionFile = typeof transactionFiles.$inferSelect;
export type InsertTransactionFile = typeof transactionFiles.$inferInsert;

export interface IStorage {
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByClient(clientId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByProject(projectId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<void>;

  // Transaction Files
  getTransactionFiles(projectId: string): Promise<TransactionFile[]>;
  createTransactionFile(file: InsertTransactionFile): Promise<TransactionFile>;
  deleteTransactionFile(id: string): Promise<void>;

  // Quotes
  getQuotes(): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  getQuotesByClient(clientId: string): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, quote: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<void>;

  // Quote Items
  getAllQuoteItems(): Promise<QuoteItem[]>;
  getQuoteItems(quoteId: string): Promise<QuoteItem[]>;
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  deleteQuoteItem(id: string): Promise<void>;

  // Project Files
  getProjectFiles(projectId: string): Promise<ProjectFile[]>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  deleteProjectFile(id: string): Promise<void>;

  // Bills
  getBills(): Promise<Bill[]>;
  getBill(id: string): Promise<Bill | undefined>;
  getBillsByProject(projectId: string): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: string, bill: Partial<InsertBill>): Promise<Bill | undefined>;
  deleteBill(id: string): Promise<void>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    activeProjects: number;
    totalClients: number;
    receitas: number;
    despesas: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Clients
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set(clientData)
      .where(eq(clients.id, id))
      .returning();
    return client || undefined;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByClient(clientId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: string, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set(projectData)
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  // Dedicated status update using explicit SQL to avoid ORM edge cases
  async updateProjectStatus(id: string, status: string): Promise<Project | undefined> {
    // Ensure legacy column "updatedAt" exists for deployments that rely on triggers
    await pool.query('alter table projects add column if not exists "updatedAt" timestamptz');
    const r = await pool.query<{
      id: string;
      name: string;
      clientId: string;
      description: string | null;
      value: string;
      type: string;
      status: string;
      date: string;
      createdAt: Date;
    }>(
      `update projects
         set status = $2,
             "updatedAt" = now()
       where id = $1
       returning 
         id,
         name,
         client_id as "clientId",
         description,
         value::text as value,
         type,
         status,
         date,
         created_at as "createdAt"`
      , [id, status]
    );
    return r.rows[0] as unknown as Project | undefined;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    const r = await pool.query<{
      id: string;
      projectId: string;
      type: string;
      description: string;
      value: string;
      date: string;
      createdAt: Date;
    }>(
      `select 
         id,
         project_id as "projectId",
         type,
         description,
         value::text as value,
         date,
         NULL::text as "receiptPath",
         created_at as "createdAt"
       from transactions
       order by created_at desc`
    );
    return r.rows as unknown as Transaction[];
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const r = await pool.query<{
      id: string;
      projectId: string;
      type: string;
      description: string;
      value: string;
      date: string;
      createdAt: Date;
    }>(
      `select 
         id,
         project_id as "projectId",
         type,
         description,
         value::text as value,
         date,
         NULL::text as "receiptPath",
         created_at as "createdAt"
       from transactions
       where id = $1
       limit 1`,
      [id]
    );
    return (r.rows[0] as unknown as Transaction) || undefined;
  }

  async getTransactionsByProject(projectId: string): Promise<Transaction[]> {
    const r = await pool.query<{
      id: string;
      projectId: string;
      type: string;
      description: string;
      value: string;
      date: string;
      createdAt: Date;
    }>(
      `select 
         id,
         project_id as "projectId",
         type,
         description,
         value::text as value,
         date,
         NULL::text as "receiptPath",
         created_at as "createdAt"
       from transactions
       where project_id = $1
       order by created_at desc`,
      [projectId]
    );
    return r.rows as unknown as Transaction[];
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    // Use explicit SQL to avoid referencing non-existent optional columns (e.g., receipt_path)
    const r = await pool.query<{
      id: string;
      projectId: string;
      type: string;
      description: string;
      value: string;
      date: string;
      createdAt: Date;
    }>(
      `insert into transactions (project_id, type, description, value, date)
       values ($1, $2, $3, $4::numeric, $5)
       returning 
         id,
         project_id as "projectId",
         type,
         description,
         value::text as value,
         date,
         NULL::text as "receiptPath",
         created_at as "createdAt"`,
      [
        insertTransaction.projectId,
        insertTransaction.type,
        insertTransaction.description,
        String(insertTransaction.value),
        insertTransaction.date,
      ]
    );
    return r.rows[0] as unknown as Transaction;
  }

  async updateTransaction(id: string, updateData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    try {
      console.log("storage.updateTransaction called", { id, updateData });
      const [transaction] = await db
        .update(transactions)
        .set(updateData)
        .where(eq(transactions.id, id))
        .returning();
      console.log("storage.updateTransaction result", { id, transaction });
      return transaction || undefined;
    } catch (err) {
      console.error("storage.updateTransaction error", err);
      throw err;
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  // Transaction Files
  async getTransactionFiles(projectId: string): Promise<TransactionFile[]> {
    // Use raw SQL with explicit cast to avoid uuid/text operator mismatch
    const r = await pool.query<{
      id: string;
      transactionId: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      objectPath: string;
      uploadedAt: Date;
    }>(
      `select 
         tf.id,
         tf.transaction_id::text as "transactionId",
         tf.file_name as "fileName",
         tf.file_type as "fileType",
         tf.file_size as "fileSize",
         tf.object_path as "objectPath",
         tf.uploaded_at as "uploadedAt"
       from transaction_files tf
       join transactions t on t.id::text = tf.transaction_id::text
       where t.project_id = $1
       order by tf.uploaded_at desc`,
      [projectId]
    );
    return r.rows as unknown as TransactionFile[];
  }
  async createTransactionFile(insertFile: InsertTransactionFile): Promise<TransactionFile> {
    const [file] = await db.insert(transactionFiles).values(insertFile).returning();
    return file;
  }
  async deleteTransactionFile(id: string): Promise<void> {
    await db.delete(transactionFiles).where(eq(transactionFiles.id, id));
  }

  // Quotes
  async getQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getQuotesByClient(clientId: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.clientId, clientId));
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const [quote] = await db.insert(quotes).values(insertQuote).returning();
    return quote;
  }

  async updateQuote(id: string, quoteData: Partial<InsertQuote>): Promise<Quote | undefined> {
    const [quote] = await db
      .update(quotes)
      .set(quoteData)
      .where(eq(quotes.id, id))
      .returning();
    return quote || undefined;
  }

  async deleteQuote(id: string): Promise<void> {
    await db.delete(quotes).where(eq(quotes.id, id));
  }

  // Quote Items
  async getAllQuoteItems(): Promise<QuoteItem[]> {
    return await db.select().from(quoteItems);
  }

  async getQuoteItems(quoteId: string): Promise<QuoteItem[]> {
    return await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  }

  async createQuoteItem(insertItem: InsertQuoteItem): Promise<QuoteItem> {
    const [item] = await db.insert(quoteItems).values(insertItem).returning();
    return item;
  }

  async deleteQuoteItem(id: string): Promise<void> {
    await db.delete(quoteItems).where(eq(quoteItems.id, id));
  }

  // Project Files
  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    return await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId)).orderBy(desc(projectFiles.createdAt));
  }

  async createProjectFile(insertFile: InsertProjectFile): Promise<ProjectFile> {
    const [file] = await db.insert(projectFiles).values(insertFile).returning();
    return file;
  }

  async deleteProjectFile(id: string): Promise<void> {
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
  }

  // Bills
  async getBills(): Promise<Bill[]> {
    return await db.select().from(bills).orderBy(desc(bills.createdAt));
  }

  async getBill(id: string): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill || undefined;
  }

  async getBillsByProject(projectId: string): Promise<Bill[]> {
    return await db.select().from(bills).where(eq(bills.projectId, projectId));
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const [bill] = await db.insert(bills).values(insertBill).returning();
    return bill;
  }

  async updateBill(id: string, billData: Partial<InsertBill>): Promise<Bill | undefined> {
    const [bill] = await db
      .update(bills)
      .set(billData)
      .where(eq(bills.id, id))
      .returning();
    return bill || undefined;
  }

  async deleteBill(id: string): Promise<void> {
    await db.delete(bills).where(eq(bills.id, id));
  }

  async getDashboardStats() {
    const result = await pool.query<{
      active_projects: number;
      total_clients: number;
      receitas: string;
      despesas: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM projects WHERE status IN ('aprovado', 'execucao'))::int as active_projects,
        (SELECT COUNT(*) FROM clients)::int as total_clients,
        (SELECT COALESCE(SUM(value), 0) FROM transactions WHERE type = 'receita')::text as receitas,
        (SELECT COALESCE(SUM(value), 0) FROM transactions WHERE type = 'despesa')::text as despesas
    `);

    const row = result.rows[0];
    return {
      activeProjects: row.active_projects,
      totalClients: row.total_clients,
      receitas: parseFloat(row.receitas || "0"),
      despesas: parseFloat(row.despesas || "0"),
    };
  }
}

// In-memory storage fallback for local development when DB is unreachable
class MemoryStorage implements IStorage {
  private clients: Client[] = [];
  private projects: Project[] = [];
  private transactions: Transaction[] = [];
  private quotes: Quote[] = [];
  private quoteItems: QuoteItem[] = [];
  private projectFiles: ProjectFile[] = [];
  private bills: Bill[] = [];
  private transactionFilesMem: TransactionFile[] = [];

  private nowISO(): Date { return new Date(); }
  private newId(): string {
    // crypto.randomUUID is available in current Node runtimes; fallback for older
    return (globalThis as any).crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return [...this.clients].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.find(c => c.id === id);
  }
  async createClient(client: InsertClient): Promise<Client> {
    const item: Client = { id: this.newId(), createdAt: this.nowISO(), ...client } as Client;
    this.clients.push(item);
    return item;
  }
  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    const idx = this.clients.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this.clients[idx] = { ...this.clients[idx], ...client } as Client;
    return this.clients[idx];
  }
  async deleteClient(id: string): Promise<void> {
    this.clients = this.clients.filter(c => c.id !== id);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return [...this.projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.find(p => p.id === id);
  }
  async getProjectsByClient(clientId: string): Promise<Project[]> {
    return this.projects.filter(p => p.clientId === clientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createProject(project: InsertProject): Promise<Project> {
    const item: Project = { id: this.newId(), createdAt: this.nowISO(), ...project } as Project;
    this.projects.push(item);
    return item;
  }
  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.projects[idx] = { ...this.projects[idx], ...project } as Project;
    return this.projects[idx];
  }

  async updateProjectStatus(id: string, status: string): Promise<Project | undefined> {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.projects[idx] = { ...this.projects[idx], status } as Project;
    return this.projects[idx];
  }
  async deleteProject(id: string): Promise<void> {
    this.projects = this.projects.filter(p => p.id !== id);
    // Also cascade delete related bills and transactions in memory for consistency
    this.bills = this.bills.filter(b => b.projectId !== id);
    this.transactions = this.transactions.filter(t => t.projectId !== id);
    this.projectFiles = this.projectFiles.filter(f => f.projectId !== id);
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return [...this.transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.find(t => t.id === id);
  }
  async getTransactionsByProject(projectId: string): Promise<Transaction[]> {
    return this.transactions.filter(t => t.projectId === projectId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const item: Transaction = { id: this.newId(), createdAt: this.nowISO(), ...transaction } as Transaction;
    this.transactions.push(item);
    return item;
  }
  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const idx = this.transactions.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    this.transactions[idx] = { ...this.transactions[idx], ...transaction } as Transaction;
    return this.transactions[idx];
  }
  async deleteTransaction(id: string): Promise<void> {
    this.transactions = this.transactions.filter(t => t.id !== id);
  }

  // Transaction Files
  async getTransactionFiles(projectId: string): Promise<TransactionFile[]> {
    const transactionIds = this.transactions.filter(t => t.projectId === projectId).map(t => t.id);
    return this.transactionFilesMem
      .filter(f => transactionIds.includes(f.transactionId))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }
  async createTransactionFile(file: InsertTransactionFile): Promise<TransactionFile> {
    const newFile: TransactionFile = { id: this.newId(), uploadedAt: this.nowISO(), ...file } as TransactionFile;
    this.transactionFilesMem.push(newFile);
    return newFile;
  }
  async deleteTransactionFile(id: string): Promise<void> {
    this.transactionFilesMem = this.transactionFilesMem.filter(f => f.id !== id);
  }

  // Quotes
  async getQuotes(): Promise<Quote[]> {
    return [...this.quotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getQuote(id: string): Promise<Quote | undefined> {
    return this.quotes.find(q => q.id === id);
  }
  async getQuotesByClient(clientId: string): Promise<Quote[]> {
    return this.quotes.filter(q => q.clientId === clientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createQuote(quote: InsertQuote): Promise<Quote> {
    const item: Quote = { id: this.newId(), createdAt: this.nowISO(), ...quote } as Quote;
    this.quotes.push(item);
    return item;
  }
  async updateQuote(id: string, quoteData: Partial<InsertQuote>): Promise<Quote | undefined> {
    const idx = this.quotes.findIndex(q => q.id === id);
    if (idx === -1) return undefined;
    this.quotes[idx] = { ...this.quotes[idx], ...quoteData } as Quote;
    return this.quotes[idx];
  }
  async deleteQuote(id: string): Promise<void> {
    this.quotes = this.quotes.filter(q => q.id !== id);
    this.quoteItems = this.quoteItems.filter(i => i.quoteId !== id);
  }

  // Quote Items
  async getAllQuoteItems(): Promise<QuoteItem[]> { return [...this.quoteItems]; }
  async getQuoteItems(quoteId: string): Promise<QuoteItem[]> { return this.quoteItems.filter(i => i.quoteId === quoteId); }
  async createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem> {
    const newItem: QuoteItem = { id: this.newId(), ...item } as QuoteItem;
    this.quoteItems.push(newItem);
    return newItem;
  }
  async deleteQuoteItem(id: string): Promise<void> {
    this.quoteItems = this.quoteItems.filter(i => i.id !== id);
  }

  // Project Files
  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    return this.projectFiles.filter(f => f.projectId === projectId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const newFile: ProjectFile = { id: this.newId(), createdAt: this.nowISO(), ...file } as ProjectFile;
    this.projectFiles.push(newFile);
    return newFile;
  }
  async deleteProjectFile(id: string): Promise<void> {
    this.projectFiles = this.projectFiles.filter(f => f.id !== id);
  }

  // Bills
  async getBills(): Promise<Bill[]> {
    return [...this.bills].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getBill(id: string): Promise<Bill | undefined> {
    return this.bills.find(b => b.id === id);
  }
  async getBillsByProject(projectId: string): Promise<Bill[]> {
    return this.bills.filter(b => b.projectId === projectId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createBill(bill: InsertBill): Promise<Bill> {
    const item: Bill = { id: this.newId(), createdAt: this.nowISO(), ...bill } as Bill;
    this.bills.push(item);
    return item;
  }
  async updateBill(id: string, billData: Partial<InsertBill>): Promise<Bill | undefined> {
    const idx = this.bills.findIndex(b => b.id === id);
    if (idx === -1) return undefined;
    this.bills[idx] = { ...this.bills[idx], ...billData } as Bill;
    return this.bills[idx];
  }
  async deleteBill(id: string): Promise<void> {
    this.bills = this.bills.filter(b => b.id !== id);
  }

  async getDashboardStats() {
    const activeProjects = this.projects.filter(p =>
      p.status === 'aprovado' || p.status === 'execucao'
    ).length;

    const totalClients = this.clients.length;

    const receitas = this.transactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + parseFloat(String(t.value)), 0);

    const despesas = this.transactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + parseFloat(String(t.value)), 0);

    return {
      activeProjects,
      totalClients,
      receitas,
      despesas,
    };
  }
}

const useMemory = process.env.USE_MEMORY_STORAGE === "1" || process.env.NODE_ENV === "development" && !process.env.DATABASE_URL;
export const storage: IStorage = useMemory ? new MemoryStorage() : new DatabaseStorage();
