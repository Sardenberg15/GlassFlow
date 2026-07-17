import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  cnpjCpf: text("cnpj_cpf"),
  updatedAt: timestamp("updatedAt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  description: text("description"),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // vidro, espelho, reparo
  items: jsonb("items"), // Detalhamento de itens (ex: esquadrias)
  status: text("status").notNull().default("orcamento"), // orcamento, aprovado, execucao, finalizado, cancelado
  date: text("date").notNull(),
  saleNumber: text("sale_number"),
  saleDate: text("sale_date"),
  quoteNumber: text("quote_number"),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }), // Previsão de Custo
  paymentCondition: text("payment_condition"), // a_vista, entrada_saldo_30, entrada_25_saldo, sinal_boleto_30_60_90, boleto_30_60_90, pix, cheque, personalizado
  paymentConditionEntry: decimal("payment_condition_entry", { precision: 5, scale: 2 }), // % da entrada/sinal (ex: 30.00 = 30%)
  customInstallments: jsonb("custom_installments"), // [{ description, value, dueDate }]
  orderIndex: integer("order_index").default(0),
  obraAddress: text("obra_address"), // endereço da obra (fallback: endereço do cliente)
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  towerStatus: jsonb("tower_status"), // { contrato, execucao, recebimento, notaFiscal } — 0=pendente 1=parcial 2=concluído
  updatedAt: timestamp("updatedAt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // receita, despesa
  description: text("description").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  date: text("date").notNull(),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: 'set null' }),
  paymentMethod: text("payment_method"), // Ex: 'dinheiro', 'pix', 'boleto', 'transferencia', 'cartao_credito', 'cartao_debito'
  bankAccountId: varchar("bank_account_id").references(() => bankAccounts.id, { onDelete: 'set null' }), 
  installmentLabel: text("installment_label"), // Ex: 'Entrada', 'Saldo 30 dias', '2ª Parcela', 'Saldo Final'
  receiptPath: text("receipt_path"), // caminho do comprovante/anexo
  reconciled: text("reconciled").default("false"), // true, false
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  number: text("number").notNull(), // número do orçamento (ex: ORC-2025-001)
  status: text("status").notNull().default("pendente"), // pendente, aprovado, recusado
  validUntil: text("valid_until").notNull(), // data de validade
  local: text("local"), // LOCAL/AMBIENTE
  tipo: text("tipo"), // TIPO
  discount: decimal("discount", { precision: 5, scale: 2 }).default("0"), // desconto em percentual (ex: 10.50 = 10,5%)
  observations: text("observations"), // observações gerais
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactionFiles = pgTable("transaction_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  objectPath: text("object_path").notNull(),
  observations: text("observations"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const quoteItems = pgTable("quote_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  description: text("description").notNull(),
  environment: text("environment"), // LOCAL/AMBIENTE
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  width: decimal("width", { precision: 10, scale: 2 }), // LARGURA
  height: decimal("height", { precision: 10, scale: 2 }), // ALTURA
  typologyId: varchar("typology_id").references(() => typologies.id, { onDelete: 'set null' }), // ID da Tipologia associada
  calculatedMaterials: jsonb("calculated_materials"), // JSON contendo a lista exata de perfis, cortes, e pesos calculados
  colorThickness: text("color_thickness"), // COR E ESPESSURA
  profileColor: text("profile_color"), // *COR PERFIL
  accessoryColor: text("accessory_color"), // *COR ACESSÓRIO
  line: text("line"), // LINHA
  deliveryDate: text("delivery_date"), // DATA ENTREGA
  itemObservations: text("item_observations"), // OBSERVAÇÕES DESTE ITEM
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"), // URL da imagem/desenho do item
  specifications: text("specifications"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectFiles = pgTable("project_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  category: text("category").notNull(), // comprovante, nota_fiscal_recebida, nota_fiscal_emitida, contrato, orcamento_assinado, foto_obra
  objectPath: text("object_path").notNull(),
  quoteId: varchar("quote_id").references(() => quotes.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // pagar, receber
  description: text("description").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  dueDate: text("due_date"), // data de vencimento (pode ser nula para parcelas após conclusão)
  status: text("status").notNull().default("pendente"), // pendente, pago, atrasado
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'set null' }), // opcional
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: 'set null' }),
  paymentMethod: text("payment_method"), // Ex: 'dinheiro', 'pix', 'boleto', 'transferencia', 'cartao_credito', 'cartao_debito'
  bankAccountId: varchar("bank_account_id").references(() => bankAccounts.id, { onDelete: 'set null' }),
  date: text("date").notNull(), // data de emissão
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Serralheria ERP Tables
export const aluminumLines = pgTable("aluminum_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Suprema, Gold, Inova
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aluminumProfiles = pgTable("aluminum_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull(), // SU-0042, LG-079 (códigos oficiais do catálogo Alcoa)
  name: text("name").notNull(), // Marco superior / correr 2, Travessa da folha
  lineId: varchar("line_id").notNull().references(() => aluminumLines.id, { onDelete: 'cascade' }),
  weightPerMeter: decimal("weight_per_meter", { precision: 10, scale: 3 }).notNull(), // peso em kg/m
  barLengthMm: integer("bar_length_mm").notNull().default(6000), // comprimento da barra comercial
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const typologies = pgTable("typologies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Janela de Correr 2 Folhas
  lineId: varchar("line_id").notNull().references(() => aluminumLines.id, { onDelete: 'cascade' }),
  imageUrl: text("image_url"),
  type: text("type").notNull().default("esquadria"), // esquadria, portao, etc
  description: text("description"),
  accessories: text("accessories"), // Kit 02, Fechadura, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const typologyMaterials = pgTable("typology_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  typologyId: varchar("typology_id").notNull().references(() => typologies.id, { onDelete: 'cascade' }),
  profileId: varchar("profile_id").notNull().references(() => aluminumProfiles.id, { onDelete: 'cascade' }),
  formula: text("formula").notNull(), // "L - 32", "(L - 32 - 110) / 2"
  quantityFormula: text("quantity_formula").notNull().default("1"), // "2", "4"
  type: text("type").notNull(), // marco, folha, grapa
  orientation: text("orientation").notNull(), // largura, altura
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const typologyAccessories = pgTable("typology_accessories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  typologyId: varchar("typology_id").notNull().references(() => typologies.id, { onDelete: 'cascade' }),
  accessoryId: varchar("accessory_id").notNull().references(() => accessories.id, { onDelete: 'cascade' }),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"), // ex: código equivalente no catálogo Alcoa, regra de escolha
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aluminumStock = pgTable("aluminum_stock", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => aluminumProfiles.id, { onDelete: 'cascade' }),
  length: integer("length").notNull(), // comprimento em mm (ex: 6000 para barra inteira, ou 1200 para retalho)
  quantity: integer("quantity").notNull().default(1),
  type: text("type").notNull().default("barra"), // "barra" (6m) ou "retalho"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accessories = pgTable("accessories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // FEC46, ROLDUPPEDRCSUP1PC
  name: text("name").notNull(), // Fecho concha manual sem chave
  category: text("category").notNull().default("Outros"), // Roldanas, Fechos e Contrafechos, etc.
  supplier: text("supplier"), // Udinese, Fermax
  line: text("line"), // Linha Suprema, Linha Gold, Componentes
  unit: text("unit").notNull().default("un"), // un, par, jogo, m
  imageUrl: text("image_url"), // desenho/foto do catálogo
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("min_quantity").notNull().default(0), // alerta de estoque mínimo
  cost: decimal("cost", { precision: 10, scale: 2 }), // custo de compra unitário
  location: text("location"), // prateleira/gaveta na fábrica
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accessoryMovements = pgTable("accessory_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accessoryId: varchar("accessory_id").notNull().references(() => accessories.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // entrada, saida, ajuste
  quantity: integer("quantity").notNull(),
  notes: text("notes"), // ex: "Obra Projecar", "Compra NF 1234"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productionBatches = pgTable("production_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull(), // ex: LOTE-001
  status: text("status").notNull().default("pendente"), // pendente, em_corte, finalizado
  observations: text("observations"),
  expectedDate: text("expected_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productionBatchItems = pgTable("production_batch_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => productionBatches.id, { onDelete: 'cascade' }),
  quoteItemId: varchar("quote_item_id").notNull().references(() => quoteItems.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
  quotes: many(quotes),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  transactions: many(transactions),
  files: many(projectFiles),
  bills: many(bills),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  project: one(projects, {
    fields: [transactions.projectId],
    references: [projects.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  items: many(quoteItems),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
}));

export const projectFilesRelations = relations(projectFiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectFiles.projectId],
    references: [projects.id],
  }),
}));

export const billsRelations = relations(bills, ({ one }) => ({
  project: one(projects, {
    fields: [bills.projectId],
    references: [projects.id],
  }),
  category: one(categories, {
    fields: [bills.categoryId],
    references: [categories.id],
  }),
}));

export const aluminumLinesRelations = relations(aluminumLines, ({ many }) => ({
  profiles: many(aluminumProfiles),
  typologies: many(typologies),
}));

export const aluminumProfilesRelations = relations(aluminumProfiles, ({ one, many }) => ({
  line: one(aluminumLines, {
    fields: [aluminumProfiles.lineId],
    references: [aluminumLines.id],
  }),
  typologyMaterials: many(typologyMaterials),
  stock: many(aluminumStock),
}));

export const typologiesRelations = relations(typologies, ({ one, many }) => ({
  line: one(aluminumLines, {
    fields: [typologies.lineId],
    references: [aluminumLines.id],
  }),
  materials: many(typologyMaterials),
}));

export const typologyMaterialsRelations = relations(typologyMaterials, ({ one }) => ({
  typology: one(typologies, {
    fields: [typologyMaterials.typologyId],
    references: [typologies.id],
  }),
  profile: one(aluminumProfiles, {
    fields: [typologyMaterials.profileId],
    references: [aluminumProfiles.id],
  }),
}));

export const aluminumStockRelations = relations(aluminumStock, ({ one }) => ({
  profile: one(aluminumProfiles, {
    fields: [aluminumStock.profileId],
    references: [aluminumProfiles.id],
  }),
}));

export const productionBatchesRelations = relations(productionBatches, ({ many }) => ({
  items: many(productionBatchItems),
}));

export const productionBatchItemsRelations = relations(productionBatchItems, ({ one }) => ({
  batch: one(productionBatches, {
    fields: [productionBatchItems.batchId],
    references: [productionBatches.id],
  }),
  quoteItem: one(quoteItems, {
    fields: [productionBatchItems.quoteItemId],
    references: [quoteItems.id],
  }),
}));

// Insert Schemas
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // receita, despesa
  color: text("color").notNull().default("#808080"),
  fixedVariable: text("fixed_variable").default("variavel"), // fixo, variavel
  costType: text("cost_type").default("operacional"), // direto, indireto, operacional, financeiro, imposto
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

// ─── Sales Goals ────────────────────────────────────────────────────────────────

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull().default("mensal"), // mensal, trimestral, anual
  period: text("period").notNull(), // "2026-04" for monthly, "2026-Q1" for quarterly, "2026" for annual
  targetValue: decimal("target_value", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
});

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

// ─── Bank Accounts ──────────────────────────────────────────────────────────────

export const bankAccounts = pgTable("bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "BTG Pactual PJ", "Inter Banking PJ"
  bankCode: text("bank_code"), // "208" for BTG, "077" for Inter
  agency: text("agency"),
  accountNumber: text("account_number"),
  color: text("color").notNull().default("#2563EB"), // visual identifier
  initialBalance: decimal("initial_balance", { precision: 12, scale: 2 }).default("0"),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({
  id: true,
  createdAt: true,
});

export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
  createdAt: true,
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  createdAt: true,
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
});

export const insertAluminumLineSchema = createInsertSchema(aluminumLines).omit({
  id: true,
  createdAt: true,
});

export const insertAluminumProfileSchema = createInsertSchema(aluminumProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertTypologySchema = createInsertSchema(typologies).omit({
  id: true,
  createdAt: true,
});

export const insertTypologyMaterialSchema = createInsertSchema(typologyMaterials).omit({
  id: true,
  createdAt: true,
});

export const insertAluminumStockSchema = createInsertSchema(aluminumStock).omit({
  id: true,
  createdAt: true,
});

export const insertTypologyAccessorySchema = createInsertSchema(typologyAccessories).omit({
  id: true,
  createdAt: true,
});

export const insertAccessorySchema = createInsertSchema(accessories).omit({
  id: true,
  createdAt: true,
});

export const insertAccessoryMovementSchema = createInsertSchema(accessoryMovements).omit({
  id: true,
  createdAt: true,
});

export const insertProductionBatchSchema = createInsertSchema(productionBatches).omit({
  id: true,
  createdAt: true,
});

export const insertProductionBatchItemSchema = createInsertSchema(productionBatchItems).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;

export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;

export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

export type InsertAluminumLine = z.infer<typeof insertAluminumLineSchema>;
export type AluminumLine = typeof aluminumLines.$inferSelect;

export type InsertAluminumProfile = z.infer<typeof insertAluminumProfileSchema>;
export type AluminumProfile = typeof aluminumProfiles.$inferSelect;

export type InsertTypology = z.infer<typeof insertTypologySchema>;
export type Typology = typeof typologies.$inferSelect;

export type InsertTypologyMaterial = z.infer<typeof insertTypologyMaterialSchema>;
export type TypologyMaterial = typeof typologyMaterials.$inferSelect;

export type InsertAluminumStock = z.infer<typeof insertAluminumStockSchema>;
export type AluminumStock = typeof aluminumStock.$inferSelect;

export type InsertAccessory = z.infer<typeof insertAccessorySchema>;
export type Accessory = typeof accessories.$inferSelect;

export type InsertTypologyAccessory = z.infer<typeof insertTypologyAccessorySchema>;
export type TypologyAccessory = typeof typologyAccessories.$inferSelect;

export type InsertAccessoryMovement = z.infer<typeof insertAccessoryMovementSchema>;
export type AccessoryMovement = typeof accessoryMovements.$inferSelect;

export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;
export type ProductionBatch = typeof productionBatches.$inferSelect;

export type InsertProductionBatchItem = z.infer<typeof insertProductionBatchItemSchema>;
export type ProductionBatchItem = typeof productionBatchItems.$inferSelect;

// Bank Reconciliation
export const bankStatements = pgTable("bank_statements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  date: text("date").notNull(),
  bankAccountId: varchar("bank_account_id").references(() => bankAccounts.id, { onDelete: 'set null' }),
  status: text("status").notNull().default("pending"), // pending, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bankStatementLines = pgTable("bank_statement_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  statementId: varchar("statement_id").notNull().references(() => bankStatements.id, { onDelete: 'cascade' }),
  fitId: text("fit_id"), // Identificador unico da transacao no banco (OFX)
  date: text("date").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // DEBIT, CREDIT
  status: text("status").notNull().default("unmatched"), // unmatched, matched, ignored
  transactionId: varchar("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bankStatementsRelations = relations(bankStatements, ({ many }) => ({
  lines: many(bankStatementLines),
}));

export const bankStatementLinesRelations = relations(bankStatementLines, ({ one }) => ({
  statement: one(bankStatements, {
    fields: [bankStatementLines.statementId],
    references: [bankStatements.id],
  }),
  transaction: one(transactions, {
    fields: [bankStatementLines.transactionId],
    references: [transactions.id],
  }),
}));

export const insertBankStatementSchema = createInsertSchema(bankStatements).omit({
  id: true,
  createdAt: true,
});

export const insertBankStatementLineSchema = createInsertSchema(bankStatementLines).omit({
  id: true,
  createdAt: true,
});

export type InsertBankStatement = z.infer<typeof insertBankStatementSchema>;
export type BankStatement = typeof bankStatements.$inferSelect;

export type InsertBankStatementLine = z.infer<typeof insertBankStatementLineSchema>;
export type BankStatementLine = typeof bankStatementLines.$inferSelect;

// ─── Employee Management ───────────────────────────────────────────────────────

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cpf: text("cpf"),
  rg: text("rg"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  birthDate: text("birth_date"),
  role: text("role"), // montador, cortador, ajudante, etc.
  contractType: text("contract_type").notNull().default("clt"), // clt, pj, chapa
  admissionDate: text("admission_date"),
  terminationDate: text("termination_date"),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("ativo"), // ativo, inativo, desligado
  observations: text("observations"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  pixKey: text("pix_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeePayments = pgTable("employee_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // salario, adiantamento, ajuda_custo, diaria, bonificacao, desconto, vale_transporte, vale_refeicao, hora_extra, outros
  description: text("description").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  date: text("date").notNull(),
  referenceMonth: text("reference_month"),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'set null' }),
  status: text("status").notNull().default("pendente"), // pendente, pago, cancelado
  paymentMethod: text("payment_method"), // pix, dinheiro, transferencia, cheque
  observations: text("observations"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeeProductivity = pgTable("employee_productivity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'set null' }),
  date: text("date").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),
  description: text("description"),
  rating: integer("rating"),
  observations: text("observations"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Virtual Files (Arquivo Virtual) ────────────────────────────────────────────

export const virtualFiles = pgTable("virtual_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // MIME type
  fileSize: integer("file_size").notNull(),
  objectPath: text("object_path").notNull(),
  folder: text("folder").notNull().default("Geral"), // pasta/categoria do arquivo
  tags: text("tags"), // tags separadas por vírgula
  description: text("description"),
  uploadedBy: text("uploaded_by"), // quem fez upload
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVirtualFileSchema = createInsertSchema(virtualFiles).omit({
  id: true,
  createdAt: true,
});

export type InsertVirtualFile = z.infer<typeof insertVirtualFileSchema>;
export type VirtualFile = typeof virtualFiles.$inferSelect;

// Employee Relations
export const employeesRelations = relations(employees, ({ many }) => ({
  payments: many(employeePayments),
  productivity: many(employeeProductivity),
}));

export const employeePaymentsRelations = relations(employeePayments, ({ one }) => ({
  employee: one(employees, {
    fields: [employeePayments.employeeId],
    references: [employees.id],
  }),
  project: one(projects, {
    fields: [employeePayments.projectId],
    references: [projects.id],
  }),
}));

export const employeeProductivityRelations = relations(employeeProductivity, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeProductivity.employeeId],
    references: [employees.id],
  }),
  project: one(projects, {
    fields: [employeeProductivity.projectId],
    references: [projects.id],
  }),
}));

// Employee Insert Schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeePaymentSchema = createInsertSchema(employeePayments).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeProductivitySchema = createInsertSchema(employeeProductivity).omit({
  id: true,
  createdAt: true,
});

// Employee Types
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export type InsertEmployeePayment = z.infer<typeof insertEmployeePaymentSchema>;
export type EmployeePayment = typeof employeePayments.$inferSelect;

export type InsertEmployeeProductivity = z.infer<typeof insertEmployeeProductivitySchema>;
export type EmployeeProductivity = typeof employeeProductivity.$inferSelect;
