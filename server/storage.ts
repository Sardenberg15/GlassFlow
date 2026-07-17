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
  categories,
  type Category,
  type InsertCategory,
  aluminumLines,
  aluminumProfiles,
  typologies,
  typologyMaterials,
  aluminumStock,
  type AluminumLine,
  type InsertAluminumLine,
  type AluminumProfile,
  type InsertAluminumProfile,
  type Typology,
  type InsertTypology,
  type TypologyMaterial,
  type InsertTypologyMaterial,
  type AluminumStock,
  type InsertAluminumStock,
  productionBatches,
  productionBatchItems,
  type ProductionBatch,
  type InsertProductionBatch,
  type ProductionBatchItem,
  type InsertProductionBatchItem,
  bankStatements,
  bankStatementLines,
  type BankStatement,
  type InsertBankStatement,
  type BankStatementLine,
  type InsertBankStatementLine,
  employees,
  employeePayments,
  employeeProductivity,
  type Employee,
  type InsertEmployee,
  type EmployeePayment,
  type InsertEmployeePayment,
  type EmployeeProductivity,
  type InsertEmployeeProductivity,
  bankAccounts,
  type BankAccount,
  type InsertBankAccount,
  virtualFiles,
  type VirtualFile,
  type InsertVirtualFile,
  accessories,
  accessoryMovements,
  type Accessory,
  type InsertAccessory,
  type AccessoryMovement,
  type InsertAccessoryMovement,
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
  updateProjectStatus(id: string, status: string): Promise<Project | undefined>;
  reorderProjects(updates: { id: string, orderIndex: number }[]): Promise<void>;
  deleteProject(id: string): Promise<void>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByProject(projectId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<void>;

  // Transaction Files
  getAllTransactionFiles(): Promise<TransactionFile[]>;
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

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    activeProjects: number;
    totalClients: number;
    receitas: number;
    despesas: number;
  }>;

  // Aluminum Lines
  getAluminumLines(): Promise<AluminumLine[]>;
  createAluminumLine(line: InsertAluminumLine): Promise<AluminumLine>;
  updateAluminumLine(id: string, line: Partial<InsertAluminumLine>): Promise<AluminumLine | undefined>;
  deleteAluminumLine(id: string): Promise<void>;

  // Aluminum Profiles
  getAluminumProfiles(lineId?: string): Promise<AluminumProfile[]>;
  createAluminumProfile(profile: InsertAluminumProfile): Promise<AluminumProfile>;
  updateAluminumProfile(id: string, profile: Partial<InsertAluminumProfile>): Promise<AluminumProfile | undefined>;
  deleteAluminumProfile(id: string): Promise<void>;

  // Typologies
  getTypologies(): Promise<Typology[]>;
  createTypology(typology: InsertTypology): Promise<Typology>;
  updateTypology(id: string, typology: Partial<InsertTypology>): Promise<Typology | undefined>;
  deleteTypology(id: string): Promise<void>;

  // Typology Materials
  getTypologyMaterials(typologyId: string): Promise<TypologyMaterial[]>;
  getAllTypologyMaterials(): Promise<TypologyMaterial[]>;
  createTypologyMaterial(mat: InsertTypologyMaterial): Promise<TypologyMaterial>;
  updateTypologyMaterial(id: string, material: Partial<InsertTypologyMaterial>): Promise<TypologyMaterial | undefined>;
  deleteTypologyMaterial(id: string): Promise<void>;

  // Production Batches
  getProductionBatches(): Promise<ProductionBatch[]>;
  getProductionBatch(id: string): Promise<ProductionBatch | undefined>;
  createProductionBatch(batch: InsertProductionBatch): Promise<ProductionBatch>;
  updateProductionBatch(id: string, batchData: Partial<InsertProductionBatch>): Promise<ProductionBatch | undefined>;
  deleteProductionBatch(id: string): Promise<void>;

  getProductionBatchItems(batchId: string): Promise<ProductionBatchItem[]>;
  createProductionBatchItem(item: InsertProductionBatchItem): Promise<ProductionBatchItem>;
  deleteProductionBatchItem(id: string): Promise<void>;

  // Aluminum Stock
  getAluminumStock(): Promise<AluminumStock[]>;
  getAluminumStockByProfile(profileId: string): Promise<AluminumStock[]>;
  createAluminumStockItem(item: InsertAluminumStock): Promise<AluminumStock>;
  updateAluminumStockItem(id: string, data: Partial<InsertAluminumStock>): Promise<AluminumStock | undefined>;
  deleteAluminumStockItem(id: string): Promise<void>;

  // Accessories
  getAccessories(): Promise<Accessory[]>;
  getAccessory(id: string): Promise<Accessory | undefined>;
  createAccessory(item: InsertAccessory): Promise<Accessory>;
  updateAccessory(id: string, data: Partial<InsertAccessory>): Promise<Accessory | undefined>;
  deleteAccessory(id: string): Promise<void>;
  getAccessoryMovements(accessoryId: string): Promise<AccessoryMovement[]>;
  createAccessoryMovement(movement: InsertAccessoryMovement): Promise<AccessoryMovement>;

  // Bank Accounts
  getBankAccounts(): Promise<BankAccount[]>;
  getBankAccount(id: string): Promise<BankAccount | undefined>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: string, accountData: Partial<InsertBankAccount>): Promise<BankAccount | undefined>;
  deleteBankAccount(id: string): Promise<void>;

  // Bank Reconciliation
  getBankStatements(): Promise<BankStatement[]>;
  getBankStatement(id: string): Promise<BankStatement | undefined>;
  createBankStatement(statement: InsertBankStatement): Promise<BankStatement>;
  updateBankStatement(id: string, data: Partial<InsertBankStatement>): Promise<BankStatement | undefined>;
  deleteBankStatement(id: string): Promise<void>;

  getBankStatementLines(statementId: string): Promise<BankStatementLine[]>;
  getBankStatementLine(id: string): Promise<BankStatementLine | undefined>;
  createBankStatementLine(line: InsertBankStatementLine): Promise<BankStatementLine>;
  updateBankStatementLine(id: string, data: Partial<InsertBankStatementLine>): Promise<BankStatementLine | undefined>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<void>;

  // Employee Payments
  getEmployeePayments(employeeId?: string): Promise<EmployeePayment[]>;
  getEmployeePayment(id: string): Promise<EmployeePayment | undefined>;
  createEmployeePayment(payment: InsertEmployeePayment): Promise<EmployeePayment>;
  updateEmployeePayment(id: string, data: Partial<InsertEmployeePayment>): Promise<EmployeePayment | undefined>;
  deleteEmployeePayment(id: string): Promise<void>;

  // Employee Productivity
  getEmployeeProductivity(employeeId?: string): Promise<EmployeeProductivity[]>;
  createEmployeeProductivity(record: InsertEmployeeProductivity): Promise<EmployeeProductivity>;
  deleteEmployeeProductivity(id: string): Promise<void>;

  // Virtual Files
  getVirtualFiles(): Promise<VirtualFile[]>;
  getVirtualFile(id: string): Promise<VirtualFile | undefined>;
  createVirtualFile(file: InsertVirtualFile): Promise<VirtualFile>;
  updateVirtualFile(id: string, data: Partial<InsertVirtualFile>): Promise<VirtualFile | undefined>;
  deleteVirtualFile(id: string): Promise<void>;
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

  async reorderProjects(updates: { id: string, orderIndex: number }[]): Promise<void> {
    // Basic implementation since it's just updating orders
    for (const update of updates) {
      await db.update(projects).set({ orderIndex: update.orderIndex }).where(eq(projects.id, update.id));
    }
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
      categoryId: string | null;
      createdAt: Date;
    }>(
      `select 
         id,
         project_id as "projectId",
         type,
         description,
         value::text as value,
         date,
         category_id as "categoryId",
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
      categoryId: string | null;
      createdAt: Date;
    }>(
      `select 
         id,
         project_id as "projectId",
         type,
         description,
         value::text as value,
         date,
         category_id as "categoryId",
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
      projectId: string | null;
      type: string;
      description: string;
      value: string;
      date: string;
      categoryId: string | null;
      createdAt: Date;
    }>(
      `select 
         id,
         project_id as "projectId",
         type,
         description,
         value::text as value,
         date,
         category_id as "categoryId",
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
      projectId: string | null;
      type: string;
      description: string;
      value: string;
      date: string;
      categoryId: string | null;
      createdAt: Date;
    }>(
      `insert into transactions (project_id, type, description, value, date, category_id)
       values ($1, $2, $3, $4::numeric, $5, $6)
       returning 
         id,
         project_id as "projectId",
         type,
         description,
         value::text as value,
         date,
         category_id as "categoryId",
         NULL::text as "receiptPath",
         created_at as "createdAt"`,
      [
        insertTransaction.projectId || null,
        insertTransaction.type,
        insertTransaction.description,
        String(insertTransaction.value),
        insertTransaction.date,
        insertTransaction.categoryId || null,
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
  async getAllTransactionFiles(): Promise<TransactionFile[]> {
    const r = await pool.query<{
      id: string;
      transactionId: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      objectPath: string;
      observations: string | null;
      uploadedAt: Date;
    }>(
      `select 
         tf.id,
         tf.transaction_id::text as "transactionId",
         tf.file_name as "fileName",
         tf.file_type as "fileType",
         tf.file_size as "fileSize",
         tf.object_path as "objectPath",
         tf.observations as "observations",
         tf.uploaded_at as "uploadedAt"
       from transaction_files tf
       order by tf.uploaded_at desc`
    );
    return r.rows as unknown as TransactionFile[];
  }

  async getTransactionFiles(projectId: string): Promise<TransactionFile[]> {
    // Use raw SQL with explicit cast to avoid uuid/text operator mismatch
    const r = await pool.query<{
      id: string;
      transactionId: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      objectPath: string;
      observations: string | null;
      uploadedAt: Date;
    }>(
      `select 
         tf.id,
         tf.transaction_id::text as "transactionId",
         tf.file_name as "fileName",
         tf.file_type as "fileType",
         tf.file_size as "fileSize",
         tf.object_path as "objectPath",
         tf.observations as "observations",
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

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async updateCategory(id: string, categoryData: Partial<InsertCategory>): Promise<Category | undefined> {
    const [category] = await db
      .update(categories)
      .set(categoryData)
      .where(eq(categories.id, id))
      .returning();
    return category || undefined;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Bank Accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    return await db.select().from(bankAccounts).orderBy(desc(bankAccounts.createdAt));
  }

  async getBankAccount(id: string): Promise<BankAccount | undefined> {
    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
    return account || undefined;
  }

  async createBankAccount(insertAccount: InsertBankAccount): Promise<BankAccount> {
    const [account] = await db.insert(bankAccounts).values(insertAccount).returning();
    return account;
  }

  async updateBankAccount(id: string, accountData: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const [account] = await db
      .update(bankAccounts)
      .set(accountData)
      .where(eq(bankAccounts.id, id))
      .returning();
    return account || undefined;
  }

  async deleteBankAccount(id: string): Promise<void> {
    await db.delete(bankAccounts).where(eq(bankAccounts.id, id));
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

  // Aluminum Lines
  async getAluminumLines(): Promise<AluminumLine[]> {
    return await db.select().from(aluminumLines).orderBy(aluminumLines.name);
  }
  async createAluminumLine(insertLine: InsertAluminumLine): Promise<AluminumLine> {
    const [line] = await db.insert(aluminumLines).values(insertLine).returning();
    return line;
  }
  async updateAluminumLine(id: string, lineData: Partial<InsertAluminumLine>): Promise<AluminumLine | undefined> {
    const [line] = await db.update(aluminumLines).set(lineData).where(eq(aluminumLines.id, id)).returning();
    return line || undefined;
  }
  async deleteAluminumLine(id: string): Promise<void> {
    await db.delete(aluminumLines).where(eq(aluminumLines.id, id));
  }

  // Aluminum Profiles
  async getAluminumProfiles(lineId?: string): Promise<AluminumProfile[]> {
    if (lineId) return await db.select().from(aluminumProfiles).where(eq(aluminumProfiles.lineId, lineId)).orderBy(aluminumProfiles.code);
    return await db.select().from(aluminumProfiles).orderBy(aluminumProfiles.code);
  }
  async createAluminumProfile(insertProfile: InsertAluminumProfile): Promise<AluminumProfile> {
    const [profile] = await db.insert(aluminumProfiles).values(insertProfile).returning();
    return profile;
  }
  async updateAluminumProfile(id: string, profileData: Partial<InsertAluminumProfile>): Promise<AluminumProfile | undefined> {
    const [profile] = await db.update(aluminumProfiles).set(profileData).where(eq(aluminumProfiles.id, id)).returning();
    return profile || undefined;
  }
  async deleteAluminumProfile(id: string): Promise<void> {
    await db.delete(aluminumProfiles).where(eq(aluminumProfiles.id, id));
  }

  // Typologies
  async getTypologies(): Promise<Typology[]> {
    return await db.select().from(typologies).orderBy(typologies.name);
  }
  async createTypology(insertTypology: InsertTypology): Promise<Typology> {
    const [typology] = await db.insert(typologies).values(insertTypology).returning();
    return typology;
  }
  async updateTypology(id: string, typologyData: Partial<InsertTypology>): Promise<Typology | undefined> {
    const [typology] = await db.update(typologies).set(typologyData).where(eq(typologies.id, id)).returning();
    return typology || undefined;
  }
  async deleteTypology(id: string): Promise<void> {
    await db.delete(typologies).where(eq(typologies.id, id));
  }

  // Typology Materials
  async getTypologyMaterials(typologyId: string): Promise<TypologyMaterial[]> {
    return await db.select().from(typologyMaterials).where(eq(typologyMaterials.typologyId, typologyId));
  }

  async getAllTypologyMaterials(): Promise<TypologyMaterial[]> {
    return await db.select().from(typologyMaterials);
  }

  async createTypologyMaterial(mat: InsertTypologyMaterial): Promise<TypologyMaterial> {
    const [material] = await db.insert(typologyMaterials).values(mat).returning();
    return material;
  }

  async updateTypologyMaterial(id: string, materialData: Partial<InsertTypologyMaterial>): Promise<TypologyMaterial | undefined> {
    const [material] = await db.update(typologyMaterials).set(materialData).where(eq(typologyMaterials.id, id)).returning();
    return material || undefined;
  }

  async deleteTypologyMaterial(id: string): Promise<void> {
    await db.delete(typologyMaterials).where(eq(typologyMaterials.id, id));
  }

  // Production Batches
  async getProductionBatches(): Promise<ProductionBatch[]> {
    return await db.select().from(productionBatches).orderBy(desc(productionBatches.createdAt));
  }
  async getProductionBatch(id: string): Promise<ProductionBatch | undefined> {
    const [batch] = await db.select().from(productionBatches).where(eq(productionBatches.id, id));
    return batch || undefined;
  }
  async createProductionBatch(batch: InsertProductionBatch): Promise<ProductionBatch> {
    const [newBatch] = await db.insert(productionBatches).values(batch).returning();
    return newBatch;
  }
  async updateProductionBatch(id: string, batchData: Partial<InsertProductionBatch>): Promise<ProductionBatch | undefined> {
    const [updated] = await db.update(productionBatches).set(batchData).where(eq(productionBatches.id, id)).returning();
    return updated || undefined;
  }
  async deleteProductionBatch(id: string): Promise<void> {
    await db.delete(productionBatches).where(eq(productionBatches.id, id));
  }

  async getProductionBatchItems(batchId: string): Promise<ProductionBatchItem[]> {
    return await db.select().from(productionBatchItems).where(eq(productionBatchItems.batchId, batchId));
  }
  async createProductionBatchItem(item: InsertProductionBatchItem): Promise<ProductionBatchItem> {
    const [newItem] = await db.insert(productionBatchItems).values(item).returning();
    return newItem;
  }
  async deleteProductionBatchItem(id: string): Promise<void> {
    await db.delete(productionBatchItems).where(eq(productionBatchItems.id, id));
  }

  // Aluminum Stock
  async getAluminumStock(): Promise<AluminumStock[]> {
    return await db.select().from(aluminumStock).orderBy(desc(aluminumStock.createdAt));
  }
  async getAluminumStockByProfile(profileId: string): Promise<AluminumStock[]> {
    return await db.select().from(aluminumStock).where(eq(aluminumStock.profileId, profileId)).orderBy(desc(aluminumStock.createdAt));
  }
  async createAluminumStockItem(item: InsertAluminumStock): Promise<AluminumStock> {
    const [newItem] = await db.insert(aluminumStock).values(item).returning();
    return newItem;
  }
  async updateAluminumStockItem(id: string, data: Partial<InsertAluminumStock>): Promise<AluminumStock | undefined> {
    const [updated] = await db.update(aluminumStock).set(data).where(eq(aluminumStock.id, id)).returning();
    return updated || undefined;
  }
  async deleteAluminumStockItem(id: string): Promise<void> {
    await db.delete(aluminumStock).where(eq(aluminumStock.id, id));
  }

  // Accessories
  async getAccessories(): Promise<Accessory[]> {
    return await db.select().from(accessories).orderBy(accessories.category, accessories.name);
  }
  async getAccessory(id: string): Promise<Accessory | undefined> {
    const [item] = await db.select().from(accessories).where(eq(accessories.id, id));
    return item || undefined;
  }
  async createAccessory(item: InsertAccessory): Promise<Accessory> {
    const [newItem] = await db.insert(accessories).values(item).returning();
    return newItem;
  }
  async updateAccessory(id: string, data: Partial<InsertAccessory>): Promise<Accessory | undefined> {
    const [updated] = await db.update(accessories).set(data).where(eq(accessories.id, id)).returning();
    return updated || undefined;
  }
  async deleteAccessory(id: string): Promise<void> {
    await db.delete(accessories).where(eq(accessories.id, id));
  }
  async getAccessoryMovements(accessoryId: string): Promise<AccessoryMovement[]> {
    return await db.select().from(accessoryMovements).where(eq(accessoryMovements.accessoryId, accessoryId)).orderBy(desc(accessoryMovements.createdAt));
  }
  async createAccessoryMovement(movement: InsertAccessoryMovement): Promise<AccessoryMovement> {
    const [newMovement] = await db.insert(accessoryMovements).values(movement).returning();
    return newMovement;
  }

  // Bank Statements
  async getBankStatements(): Promise<BankStatement[]> {
    return await db.select().from(bankStatements).orderBy(desc(bankStatements.createdAt));
  }
  async getBankStatement(id: string): Promise<BankStatement | undefined> {
    const [statement] = await db.select().from(bankStatements).where(eq(bankStatements.id, id));
    return statement || undefined;
  }
  async createBankStatement(statement: InsertBankStatement): Promise<BankStatement> {
    const [newStatement] = await db.insert(bankStatements).values(statement).returning();
    return newStatement;
  }
  async updateBankStatement(id: string, data: Partial<InsertBankStatement>): Promise<BankStatement | undefined> {
    const [updated] = await db.update(bankStatements).set(data).where(eq(bankStatements.id, id)).returning();
    return updated || undefined;
  }
  async deleteBankStatement(id: string): Promise<void> {
    await db.delete(bankStatements).where(eq(bankStatements.id, id));
  }

  async getBankStatementLines(statementId: string): Promise<BankStatementLine[]> {
    return await db.select().from(bankStatementLines).where(eq(bankStatementLines.statementId, statementId)).orderBy(desc(bankStatementLines.date));
  }
  async getBankStatementLine(id: string): Promise<BankStatementLine | undefined> {
    const [line] = await db.select().from(bankStatementLines).where(eq(bankStatementLines.id, id));
    return line || undefined;
  }
  async createBankStatementLine(line: InsertBankStatementLine): Promise<BankStatementLine> {
    const [newLine] = await db.insert(bankStatementLines).values(line).returning();
    return newLine;
  }
  async updateBankStatementLine(id: string, data: Partial<InsertBankStatementLine>): Promise<BankStatementLine | undefined> {
    const [updated] = await db.update(bankStatementLines).set(data).where(eq(bankStatementLines.id, id)).returning();
    return updated || undefined;
  }

  // Employees
  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }
  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }
  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db.insert(employees).values(insertEmployee).returning();
    return employee;
  }
  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [employee] = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
    return employee || undefined;
  }
  async deleteEmployee(id: string): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  // Employee Payments
  async getEmployeePayments(employeeId?: string): Promise<EmployeePayment[]> {
    if (employeeId) return await db.select().from(employeePayments).where(eq(employeePayments.employeeId, employeeId)).orderBy(desc(employeePayments.createdAt));
    return await db.select().from(employeePayments).orderBy(desc(employeePayments.createdAt));
  }
  async getEmployeePayment(id: string): Promise<EmployeePayment | undefined> {
    const [payment] = await db.select().from(employeePayments).where(eq(employeePayments.id, id));
    return payment || undefined;
  }
  async createEmployeePayment(payment: InsertEmployeePayment): Promise<EmployeePayment> {
    const [created] = await db.insert(employeePayments).values(payment).returning();
    return created;
  }
  async updateEmployeePayment(id: string, data: Partial<InsertEmployeePayment>): Promise<EmployeePayment | undefined> {
    const [updated] = await db.update(employeePayments).set(data).where(eq(employeePayments.id, id)).returning();
    return updated || undefined;
  }
  async deleteEmployeePayment(id: string): Promise<void> {
    await db.delete(employeePayments).where(eq(employeePayments.id, id));
  }

  // Employee Productivity
  async getEmployeeProductivity(employeeId?: string): Promise<EmployeeProductivity[]> {
    if (employeeId) return await db.select().from(employeeProductivity).where(eq(employeeProductivity.employeeId, employeeId)).orderBy(desc(employeeProductivity.createdAt));
    return await db.select().from(employeeProductivity).orderBy(desc(employeeProductivity.createdAt));
  }
  async createEmployeeProductivity(record: InsertEmployeeProductivity): Promise<EmployeeProductivity> {
    const [created] = await db.insert(employeeProductivity).values(record).returning();
    return created;
  }
  async deleteEmployeeProductivity(id: string): Promise<void> {
    await db.delete(employeeProductivity).where(eq(employeeProductivity.id, id));
  }

  // Virtual Files
  async getVirtualFiles(): Promise<VirtualFile[]> {
    return await db.select().from(virtualFiles).orderBy(desc(virtualFiles.createdAt));
  }
  async getVirtualFile(id: string): Promise<VirtualFile | undefined> {
    const [file] = await db.select().from(virtualFiles).where(eq(virtualFiles.id, id));
    return file || undefined;
  }
  async createVirtualFile(file: InsertVirtualFile): Promise<VirtualFile> {
    const [created] = await db.insert(virtualFiles).values(file).returning();
    return created;
  }
  async updateVirtualFile(id: string, data: Partial<InsertVirtualFile>): Promise<VirtualFile | undefined> {
    const [updated] = await db.update(virtualFiles).set(data).where(eq(virtualFiles.id, id)).returning();
    return updated || undefined;
  }
  async deleteVirtualFile(id: string): Promise<void> {
    await db.delete(virtualFiles).where(eq(virtualFiles.id, id));
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
  private productionBatches: ProductionBatch[] = [];
  private productionBatchItems: ProductionBatchItem[] = [];
  private aluminumStock: AluminumStock[] = [];
  private accessoriesMem: Accessory[] = [];
  private accessoryMovementsMem: AccessoryMovement[] = [];
  private categories: Category[] = [];
  private transactionFilesMem: TransactionFile[] = [];
  private aluminumLines: AluminumLine[] = [];
  private aluminumProfiles: AluminumProfile[] = [];
  private typologies: Typology[] = [];
  private typologyMaterials: TypologyMaterial[] = [];
  private bankStatements: BankStatement[] = [];
  private bankStatementLines: BankStatementLine[] = [];
  private employeesMem: Employee[] = [];
  private employeePaymentsMem: EmployeePayment[] = [];
  private employeeProductivityMem: EmployeeProductivity[] = [];
  private bankAccounts: BankAccount[] = [];
  private virtualFilesMem: VirtualFile[] = [];

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

  async reorderProjects(updates: { id: string, orderIndex: number }[]): Promise<void> {
    for (const update of updates) {
      const idx = this.projects.findIndex(p => p.id === update.id);
      if (idx !== -1) {
        this.projects[idx] = { ...this.projects[idx], orderIndex: update.orderIndex } as Project;
      }
    }
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
  async getAllTransactionFiles(): Promise<TransactionFile[]> {
    return [...this.transactionFilesMem].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }
  async getTransactionFiles(projectId: string): Promise<TransactionFile[]> {
    const projectTxs = this.transactions.filter(t => t.projectId === projectId).map(t => t.id);
    return this.transactionFilesMem
      .filter(f => projectTxs.includes(f.transactionId))
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

  // Categories
  async getCategories(): Promise<Category[]> {
    return [...this.categories].sort((a, b) => a.name.localeCompare(b.name));
  }
  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.find(c => c.id === id);
  }
  async createCategory(category: InsertCategory): Promise<Category> {
    const item: Category = { id: this.newId(), createdAt: this.nowISO(), ...category } as Category;
    this.categories.push(item);
    return item;
  }
  async updateCategory(id: string, categoryData: Partial<InsertCategory>): Promise<Category | undefined> {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this.categories[idx] = { ...this.categories[idx], ...categoryData } as Category;
    return this.categories[idx];
  }
  async deleteCategory(id: string): Promise<void> {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.categories.splice(idx, 1);
    }
  }

  // Bank Accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    return [];
  }

  async getBankAccount(id: string): Promise<BankAccount | undefined> {
    return undefined;
  }

  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    throw new Error("Not implemented");
  }

  async updateBankAccount(id: string, accountData: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    return undefined;
  }

  async deleteBankAccount(id: string): Promise<void> {
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

  // Aluminum Lines
  async getAluminumLines(): Promise<AluminumLine[]> { return [...this.aluminumLines]; }
  async createAluminumLine(line: InsertAluminumLine): Promise<AluminumLine> {
    const item = { id: this.newId(), createdAt: this.nowISO(), ...line } as AluminumLine;
    this.aluminumLines.push(item);
    return item;
  }
  async updateAluminumLine(id: string, data: Partial<InsertAluminumLine>): Promise<AluminumLine | undefined> {
    const idx = this.aluminumLines.findIndex(l => l.id === id);
    if (idx === -1) return undefined;
    this.aluminumLines[idx] = { ...this.aluminumLines[idx], ...data } as AluminumLine;
    return this.aluminumLines[idx];
  }
  async deleteAluminumLine(id: string): Promise<void> {
    this.aluminumLines = this.aluminumLines.filter(l => l.id !== id);
  }

  // Aluminum Profiles
  async getAluminumProfiles(lineId?: string): Promise<AluminumProfile[]> {
    if (lineId) return this.aluminumProfiles.filter(p => p.lineId === lineId);
    return [...this.aluminumProfiles];
  }
  async createAluminumProfile(profile: InsertAluminumProfile): Promise<AluminumProfile> {
    const item = { id: this.newId(), createdAt: this.nowISO(), ...profile } as AluminumProfile;
    this.aluminumProfiles.push(item);
    return item;
  }
  async updateAluminumProfile(id: string, data: Partial<InsertAluminumProfile>): Promise<AluminumProfile | undefined> {
    const idx = this.aluminumProfiles.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.aluminumProfiles[idx] = { ...this.aluminumProfiles[idx], ...data } as AluminumProfile;
    return this.aluminumProfiles[idx];
  }
  async deleteAluminumProfile(id: string): Promise<void> {
    this.aluminumProfiles = this.aluminumProfiles.filter(p => p.id !== id);
  }

  // Typologies
  async getTypologies(): Promise<Typology[]> { return [...this.typologies]; }
  async createTypology(typology: InsertTypology): Promise<Typology> {
    const item = { id: this.newId(), createdAt: this.nowISO(), ...typology } as Typology;
    this.typologies.push(item);
    return item;
  }
  async updateTypology(id: string, data: Partial<InsertTypology>): Promise<Typology | undefined> {
    const idx = this.typologies.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    this.typologies[idx] = { ...this.typologies[idx], ...data } as Typology;
    return this.typologies[idx];
  }
  async deleteTypology(id: string): Promise<void> {
    this.typologies = this.typologies.filter(t => t.id !== id);
  }

  // Typology Materials
  async getTypologyMaterials(typologyId: string): Promise<TypologyMaterial[]> {
    return this.typologyMaterials.filter(m => m.typologyId === typologyId);
  }
  async getAllTypologyMaterials(): Promise<TypologyMaterial[]> {
    return this.typologyMaterials;
  }
  async createTypologyMaterial(mat: InsertTypologyMaterial): Promise<TypologyMaterial> {
    const item = { id: this.newId(), createdAt: this.nowISO(), ...mat } as TypologyMaterial;
    this.typologyMaterials.push(item);
    return item;
  }
  async updateTypologyMaterial(id: string, data: Partial<InsertTypologyMaterial>): Promise<TypologyMaterial | undefined> {
    const idx = this.typologyMaterials.findIndex(m => m.id === id);
    if (idx === -1) return undefined;
    this.typologyMaterials[idx] = { ...this.typologyMaterials[idx], ...data } as TypologyMaterial;
    return this.typologyMaterials[idx];
  }
  async deleteTypologyMaterial(id: string): Promise<void> {
    this.typologyMaterials = this.typologyMaterials.filter(m => m.id !== id);
  }

  // Production Batches
  async getProductionBatches(): Promise<ProductionBatch[]> { return [...this.productionBatches]; }
  async getProductionBatch(id: string): Promise<ProductionBatch | undefined> { return this.productionBatches.find(b => b.id === id); }
  async createProductionBatch(batch: InsertProductionBatch): Promise<ProductionBatch> {
    const item = { id: this.newId(), createdAt: this.nowISO(), ...batch } as ProductionBatch;
    this.productionBatches.push(item);
    return item;
  }
  async updateProductionBatch(id: string, data: Partial<InsertProductionBatch>): Promise<ProductionBatch | undefined> {
    const idx = this.productionBatches.findIndex(b => b.id === id);
    if (idx === -1) return undefined;
    this.productionBatches[idx] = { ...this.productionBatches[idx], ...data } as ProductionBatch;
    return this.productionBatches[idx];
  }
  async deleteProductionBatch(id: string): Promise<void> {
    this.productionBatches = this.productionBatches.filter(b => b.id !== id);
    this.productionBatchItems = this.productionBatchItems.filter(i => i.batchId !== id);
  }

  async getProductionBatchItems(batchId: string): Promise<ProductionBatchItem[]> {
    return this.productionBatchItems.filter(i => i.batchId === batchId);
  }
  async createProductionBatchItem(item: InsertProductionBatchItem): Promise<ProductionBatchItem> {
    const newItem = { id: this.newId(), createdAt: this.nowISO(), ...item } as ProductionBatchItem;
    this.productionBatchItems.push(newItem);
    return newItem;
  }
  async deleteProductionBatchItem(id: string): Promise<void> {
    this.productionBatchItems = this.productionBatchItems.filter(i => i.id !== id);
  }

  // Aluminum Stock
  async getAluminumStock(): Promise<AluminumStock[]> { return [...this.aluminumStock]; }
  async getAluminumStockByProfile(profileId: string): Promise<AluminumStock[]> { return this.aluminumStock.filter(s => s.profileId === profileId); }
  async createAluminumStockItem(item: InsertAluminumStock): Promise<AluminumStock> {
    const newItem = { id: this.newId(), createdAt: this.nowISO(), ...item } as AluminumStock;
    this.aluminumStock.push(newItem);
    return newItem;
  }
  async updateAluminumStockItem(id: string, data: Partial<InsertAluminumStock>): Promise<AluminumStock | undefined> {
    const idx = this.aluminumStock.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.aluminumStock[idx] = { ...this.aluminumStock[idx], ...data } as AluminumStock;
    return this.aluminumStock[idx];
  }
  async deleteAluminumStockItem(id: string): Promise<void> {
    this.aluminumStock = this.aluminumStock.filter(s => s.id !== id);
  }

  // Accessories
  async getAccessories(): Promise<Accessory[]> {
    return [...this.accessoriesMem].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }
  async getAccessory(id: string): Promise<Accessory | undefined> {
    return this.accessoriesMem.find(a => a.id === id);
  }
  async createAccessory(item: InsertAccessory): Promise<Accessory> {
    const newItem: Accessory = { id: this.newId(), createdAt: this.nowISO(), ...item } as Accessory;
    this.accessoriesMem.push(newItem);
    return newItem;
  }
  async updateAccessory(id: string, data: Partial<InsertAccessory>): Promise<Accessory | undefined> {
    const idx = this.accessoriesMem.findIndex(a => a.id === id);
    if (idx === -1) return undefined;
    this.accessoriesMem[idx] = { ...this.accessoriesMem[idx], ...data } as Accessory;
    return this.accessoriesMem[idx];
  }
  async deleteAccessory(id: string): Promise<void> {
    this.accessoriesMem = this.accessoriesMem.filter(a => a.id !== id);
    this.accessoryMovementsMem = this.accessoryMovementsMem.filter(m => m.accessoryId !== id);
  }
  async getAccessoryMovements(accessoryId: string): Promise<AccessoryMovement[]> {
    return this.accessoryMovementsMem.filter(m => m.accessoryId === accessoryId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createAccessoryMovement(movement: InsertAccessoryMovement): Promise<AccessoryMovement> {
    const item: AccessoryMovement = { id: this.newId(), createdAt: this.nowISO(), ...movement } as AccessoryMovement;
    this.accessoryMovementsMem.push(item);
    return item;
  }

  // Bank Statements
  async getBankStatements(): Promise<BankStatement[]> {
    return [...this.bankStatements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getBankStatement(id: string): Promise<BankStatement | undefined> {
    return this.bankStatements.find(s => s.id === id);
  }
  async createBankStatement(statement: InsertBankStatement): Promise<BankStatement> {
    const item: BankStatement = { id: this.newId(), createdAt: this.nowISO(), ...statement } as BankStatement;
    this.bankStatements.push(item);
    return item;
  }
  async updateBankStatement(id: string, data: Partial<InsertBankStatement>): Promise<BankStatement | undefined> {
    const idx = this.bankStatements.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.bankStatements[idx] = { ...this.bankStatements[idx], ...data } as BankStatement;
    return this.bankStatements[idx];
  }
  async deleteBankStatement(id: string): Promise<void> {
    this.bankStatements = this.bankStatements.filter(s => s.id !== id);
    this.bankStatementLines = this.bankStatementLines.filter(l => l.statementId !== id);
  }

  async getBankStatementLines(statementId: string): Promise<BankStatementLine[]> {
    return this.bankStatementLines.filter(l => l.statementId === statementId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  async getBankStatementLine(id: string): Promise<BankStatementLine | undefined> {
    return this.bankStatementLines.find(l => l.id === id);
  }
  async createBankStatementLine(line: InsertBankStatementLine): Promise<BankStatementLine> {
    const item: BankStatementLine = { id: this.newId(), createdAt: this.nowISO(), ...line } as BankStatementLine;
    this.bankStatementLines.push(item);
    return item;
  }
  async updateBankStatementLine(id: string, data: Partial<InsertBankStatementLine>): Promise<BankStatementLine | undefined> {
    const idx = this.bankStatementLines.findIndex(l => l.id === id);
    if (idx === -1) return undefined;
    this.bankStatementLines[idx] = { ...this.bankStatementLines[idx], ...data } as BankStatementLine;
    return this.bankStatementLines[idx];
  }

  // Employees
  async getEmployees(): Promise<Employee[]> {
    return [...this.employeesMem].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getEmployee(id: string): Promise<Employee | undefined> {
    return this.employeesMem.find(e => e.id === id);
  }
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const item = { id: this.newId(), createdAt: this.nowISO(), ...employee } as Employee;
    this.employeesMem.push(item);
    return item;
  }
  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const idx = this.employeesMem.findIndex(e => e.id === id);
    if (idx === -1) return undefined;
    this.employeesMem[idx] = { ...this.employeesMem[idx], ...data } as Employee;
    return this.employeesMem[idx];
  }
  async deleteEmployee(id: string): Promise<void> {
    this.employeesMem = this.employeesMem.filter(e => e.id !== id);
    this.employeePaymentsMem = this.employeePaymentsMem.filter(p => p.employeeId !== id);
    this.employeeProductivityMem = this.employeeProductivityMem.filter(p => p.employeeId !== id);
  }

  // Employee Payments
  async getEmployeePayments(employeeId?: string): Promise<EmployeePayment[]> {
    const arr = employeeId ? this.employeePaymentsMem.filter(p => p.employeeId === employeeId) : this.employeePaymentsMem;
    return [...arr].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getEmployeePayment(id: string): Promise<EmployeePayment | undefined> {
    return this.employeePaymentsMem.find(p => p.id === id);
  }
  async createEmployeePayment(payment: InsertEmployeePayment): Promise<EmployeePayment> {
    const item = { id: this.newId(), createdAt: this.nowISO(), ...payment } as EmployeePayment;
    this.employeePaymentsMem.push(item);
    return item;
  }
  async updateEmployeePayment(id: string, data: Partial<InsertEmployeePayment>): Promise<EmployeePayment | undefined> {
    const idx = this.employeePaymentsMem.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.employeePaymentsMem[idx] = { ...this.employeePaymentsMem[idx], ...data } as EmployeePayment;
    return this.employeePaymentsMem[idx];
  }
  async deleteEmployeePayment(id: string): Promise<void> {
    this.employeePaymentsMem = this.employeePaymentsMem.filter(p => p.id !== id);
  }

  // Employee Productivity
  async getEmployeeProductivity(employeeId?: string): Promise<EmployeeProductivity[]> {
    const arr = employeeId ? this.employeeProductivityMem.filter(p => p.employeeId === employeeId) : this.employeeProductivityMem;
    return [...arr].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createEmployeeProductivity(record: InsertEmployeeProductivity): Promise<EmployeeProductivity> {
    const item = { id: this.newId(), createdAt: this.nowISO(), ...record } as EmployeeProductivity;
    this.employeeProductivityMem.push(item);
    return item;
  }
  async deleteEmployeeProductivity(id: string): Promise<void> {
    this.employeeProductivityMem = this.employeeProductivityMem.filter(p => p.id !== id);
  }

  // Virtual Files
  async getVirtualFiles(): Promise<VirtualFile[]> {
    return [...this.virtualFilesMem].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getVirtualFile(id: string): Promise<VirtualFile | undefined> {
    return this.virtualFilesMem.find(f => f.id === id);
  }
  async createVirtualFile(file: InsertVirtualFile): Promise<VirtualFile> {
    const item = { id: this.newId(), createdAt: this.nowISO(), ...file } as VirtualFile;
    this.virtualFilesMem.push(item);
    return item;
  }
  async updateVirtualFile(id: string, data: Partial<InsertVirtualFile>): Promise<VirtualFile | undefined> {
    const idx = this.virtualFilesMem.findIndex(f => f.id === id);
    if (idx === -1) return undefined;
    this.virtualFilesMem[idx] = { ...this.virtualFilesMem[idx], ...data } as VirtualFile;
    return this.virtualFilesMem[idx];
  }
  async deleteVirtualFile(id: string): Promise<void> {
    this.virtualFilesMem = this.virtualFilesMem.filter(f => f.id !== id);
  }
}

const useMemory = process.env.USE_MEMORY_STORAGE === "1" || process.env.NODE_ENV === "development" && !process.env.DATABASE_URL;
console.log("[STORAGE] NODE_ENV:", process.env.NODE_ENV);
console.log("[STORAGE] DATABASE_URL present:", !!process.env.DATABASE_URL);
console.log("[STORAGE] useMemory:", useMemory);
export const storage: IStorage = useMemory ? new MemoryStorage() : new DatabaseStorage();
