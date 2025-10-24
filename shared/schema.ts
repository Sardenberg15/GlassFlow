import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  description: text("description"),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // vidro, espelho, reparo
  status: text("status").notNull().default("orcamento"), // orcamento, aprovado, execucao, finalizado, cancelado
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // receita, despesa
  description: text("description").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  date: text("date").notNull(),
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

export const quoteItems = pgTable("quote_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  width: decimal("width", { precision: 10, scale: 2 }), // LARGURA
  height: decimal("height", { precision: 10, scale: 2 }), // ALTURA
  colorThickness: text("color_thickness"), // COR E ESPESSURA
  profileColor: text("profile_color"), // *COR PERFIL
  accessoryColor: text("accessory_color"), // *COR ACESSÓRIO
  line: text("line"), // LINHA
  deliveryDate: text("delivery_date"), // DATA ENTREGA
  itemObservations: text("item_observations"), // OBSERVAÇÕES DESTE ITEM
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"), // URL da imagem/desenho do item
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectFiles = pgTable("project_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  category: text("category").notNull(), // comprovante, nota_fiscal_recebida, nota_fiscal_emitida
  objectPath: text("object_path").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // pagar, receber
  description: text("description").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  dueDate: text("due_date").notNull(), // data de vencimento
  status: text("status").notNull().default("pendente"), // pendente, pago, atrasado
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'set null' }), // opcional
  date: text("date").notNull(), // data de emissão
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
