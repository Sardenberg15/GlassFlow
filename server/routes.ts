import { parse as parseOfx } from "node-ofx-parser";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertProjectSchema, insertTransactionSchema, insertQuoteSchema, insertQuoteItemSchema, insertProjectFileSchema, insertBillSchema, insertCategorySchema, insertAluminumLineSchema, insertAluminumProfileSchema, insertTypologySchema, insertTypologyMaterialSchema, insertAluminumStockSchema, insertProductionBatchSchema, insertProductionBatchItemSchema, insertEmployeeSchema, insertEmployeePaymentSchema, insertEmployeeProductivitySchema, insertBankAccountSchema, insertAccessorySchema, insertAccessoryMovementSchema } from "@shared/schema";
import { ZodError } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import path from "path";
import fs from "fs";
import express from "express";
import { randomUUID } from "crypto";
import type { Project } from "@shared/schema";
import { pool } from "./db";

// Payment condition configurations
const PAYMENT_CONDITIONS: Record<string, { label: string; getInstallments: (totalValue: number, entryPct: number) => { label: string; pct: number; daysOffset: number }[] }> = {
  a_vista: {
    label: "À Vista (100%)",
    getInstallments: () => [{ label: "Pagamento à Vista", pct: 100, daysOffset: 0 }],
  },
  pix: {
    label: "PIX à Vista",
    getInstallments: () => [{ label: "PIX à Vista", pct: 100, daysOffset: 0 }],
  },
  cheque: {
    label: "Cheque",
    getInstallments: () => [{ label: "Cheque", pct: 100, daysOffset: 0 }],
  },
  entrada_saldo_30: {
    label: "Entrada + Saldo com 30 dias",
    getInstallments: (_total, entryPct) => {
      const entry = entryPct || 50;
      return [
        { label: "Entrada", pct: entry, daysOffset: 0 },
        { label: "Saldo com 30 dias", pct: 100 - entry, daysOffset: 30 },
      ];
    },
  },
  entrada_25_saldo: {
    label: "Entrada + 25% com 30 dias + Saldo Final",
    getInstallments: (_total, entryPct) => {
      const entry = entryPct || 50;
      return [
        { label: "Entrada", pct: entry, daysOffset: 0 },
        { label: "25% com 30 dias", pct: 25, daysOffset: 30 },
        { label: "Saldo Final", pct: 100 - entry - 25, daysOffset: 60 },
      ];
    },
  },
  sinal_boleto_30_60_90: {
    label: "Sinal + Boleto 30/60/90 dias",
    getInstallments: (_total, entryPct) => {
      const sinal = entryPct || 10;
      const remaining = 100 - sinal;
      const each = parseFloat((remaining / 3).toFixed(2));
      return [
        { label: "Sinal", pct: sinal, daysOffset: 0 },
        { label: "Boleto 30 dias", pct: each, daysOffset: 30 },
        { label: "Boleto 60 dias", pct: each, daysOffset: 60 },
        { label: "Boleto 90 dias", pct: remaining - each * 2, daysOffset: 90 },
      ];
    },
  },
  boleto_30_60_90: {
    label: "Boleto 30/60/90 dias",
    getInstallments: () => {
      const each = parseFloat((100 / 3).toFixed(2));
      return [
        { label: "Boleto 30 dias", pct: each, daysOffset: 30 },
        { label: "Boleto 60 dias", pct: each, daysOffset: 60 },
        { label: "Boleto 90 dias", pct: 100 - each * 2, daysOffset: 90 },
      ];
    },
  },
};

// Helper to generate installment bills for a project based on its payment condition
async function generatePaymentConditionBills(project: Project) {
  try {
    const condition = (project as any).paymentCondition;
    if (!condition) return;

    if (condition === "personalizado") {
      const customInstallments = (project as any).customInstallments;
      if (!customInstallments || !Array.isArray(customInstallments) || customInstallments.length === 0) {
        return;
      }
      
      const existingBills = await storage.getBillsByProject(project.id);
      for (const bill of existingBills) {
        if (bill.type === "receber" && bill.status === "pendente") {
          await storage.deleteBill(bill.id);
        }
      }
      
      for (const inst of customInstallments) {
        await storage.createBill({
          type: "receber",
          description: `${inst.description || 'Parcela'} - ${project.name}`,
          value: parseFloat(inst.value).toFixed(2),
          dueDate: inst.dueDate || null,
          status: "pendente",
          projectId: project.id,
          date: new Date().toISOString().split("T")[0],
        });
      }
      return;
    }

    if (!PAYMENT_CONDITIONS[condition]) return;

    const projectValue = parseFloat(String(project.value));
    if (projectValue <= 0) return;

    const entryPct = parseFloat(String((project as any).paymentConditionEntry || 0));
    const config = PAYMENT_CONDITIONS[condition];
    const installments = config.getInstallments(projectValue, entryPct);

    // Determine base date: saleDate > date > today
    const baseDate = (project as any).saleDate || project.date || new Date().toISOString().split("T")[0];
    const baseDateObj = new Date(baseDate + "T00:00:00");

    // Remove existing pending bills for this project before generating new ones
    const existingBills = await storage.getBillsByProject(project.id);
    for (const bill of existingBills) {
      if (bill.type === "receber" && bill.status === "pendente") {
        await storage.deleteBill(bill.id);
      }
    }

    // Create new bills
    for (const inst of installments) {
      const dueDate = new Date(baseDateObj);
      dueDate.setDate(dueDate.getDate() + inst.daysOffset);
      const dueDateStr = dueDate.toISOString().split("T")[0];
      const value = ((projectValue * inst.pct) / 100).toFixed(2);

      await storage.createBill({
        type: "receber",
        description: `${inst.label} - ${project.name}`,
        value,
        dueDate: dueDateStr,
        status: "pendente",
        projectId: project.id,
        date: new Date().toISOString().split("T")[0],
      });
    }
  } catch (error) {
    console.error("Error generating payment condition bills:", error);
  }
}

// Helper function to sync bills with project payment status
async function syncProjectBills(project: Project) {
  try {
    // If the project has a payment condition, installments are managed explicitly
    const condition = (project as any).paymentCondition;
    if (condition && PAYMENT_CONDITIONS[condition]) {
      // Don't auto-sync — installments are managed by generatePaymentConditionBills
      return;
    }
    if (condition === "personalizado" && (project as any).customInstallments && Array.isArray((project as any).customInstallments) && (project as any).customInstallments.length > 0) {
      // Managed by custom installments
      return;
    }

    // Calculate pending amount based on project value and received transactions
    const projectValue = parseFloat(String(project.value));
    const transactions = await storage.getTransactionsByProject(project.id);
    const receivedAmount = transactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
    const pendingAmount = projectValue - receivedAmount;

    // Get existing bills for this project
    const existingBills = await storage.getBillsByProject(project.id);

    // Check if we have multiple unpaid receivables (indicates installments/manual split)
    const unpaidReceivables = existingBills.filter(b => b.type === "receber" && b.status !== "pago");

    if (unpaidReceivables.length > 1) {
      // If there are multiple unpaid bills, do not sync automatically (it's manually managed)
      return;
    }

    const existingBill = existingBills.find(bill => bill.type === "receber" && bill.status !== "pago");

    if (pendingAmount > 0) {
      // Project has pending payment - create or update bill
      const billData = {
        type: "receber" as const,
        description: `Saldo a receber - ${project.name}`,
        value: pendingAmount.toFixed(2),
        dueDate: project.date, // Use project date as due date
        status: "pendente" as const,
        projectId: project.id,
        date: new Date().toISOString().split('T')[0],
      };

      if (existingBill) {
        // Update existing only if it's the single auto-generated one
        await storage.updateBill(existingBill.id, billData);
      } else {
        // Create new bill if none exists
        await storage.createBill(billData);
      }
    } else if (existingBill) {
      // Project fully paid or overpaid - mark bill as paid
      await storage.updateBill(existingBill.id, {
        status: "pago" as const,
        value: projectValue.toFixed(2),
      });
    }
  } catch (error) {
    console.error("Error syncing project bills:", error);
    // Don't throw - let project creation/update succeed even if bill sync fails
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auto-seed default categories if none exist
  try {
    const existingCategories = await storage.getCategories();
    if (existingCategories.length === 0) {
      console.log("[SEED] No categories found, creating default categories...");
      const defaultCategories = [
        // Despesas
        { name: "Material", type: "despesa", color: "#ef4444", fixedVariable: "variavel", costType: "direto" },
        { name: "Vidros", type: "despesa", color: "#f97316", fixedVariable: "variavel", costType: "direto" },
        { name: "Alumínio", type: "despesa", color: "#eab308", fixedVariable: "variavel", costType: "direto" },
        { name: "Ferragens", type: "despesa", color: "#22c55e", fixedVariable: "variavel", costType: "direto" },
        { name: "Mão de Obra", type: "despesa", color: "#06b6d4", fixedVariable: "variavel", costType: "direto" },
        { name: "Transporte / Frete", type: "despesa", color: "#3b82f6", fixedVariable: "variavel", costType: "operacional" },
        { name: "Instalação", type: "despesa", color: "#6366f1", fixedVariable: "variavel", costType: "direto" },
        { name: "Aluguel", type: "despesa", color: "#a855f7", fixedVariable: "fixo", costType: "operacional" },
        { name: "Energia / Água", type: "despesa", color: "#ec4899", fixedVariable: "fixo", costType: "operacional" },
        { name: "Salários / Encargos", type: "despesa", color: "#64748b", fixedVariable: "fixo", costType: "operacional" },
        { name: "Impostos", type: "despesa", color: "#dc2626", fixedVariable: "variavel", costType: "imposto" },
        { name: "Outros Custos", type: "despesa", color: "#94a3b8", fixedVariable: "variavel", costType: "operacional" },
        // Receitas
        { name: "Venda de Projeto", type: "receita", color: "#22c55e", fixedVariable: null, costType: null },
        { name: "Serviço Avulso", type: "receita", color: "#10b981", fixedVariable: null, costType: null },
        { name: "Outras Receitas", type: "receita", color: "#06b6d4", fixedVariable: null, costType: null },
      ];
      for (const cat of defaultCategories) {
        await storage.createCategory(cat as any);
      }
      console.log(`[SEED] Created ${defaultCategories.length} default categories.`);
    }
  } catch (error) {
    console.error("[SEED] Error seeding default categories:", error);
  }

  // Clients Routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: "Failed to update client", details: message });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Geocoding proxy (Nominatim/OpenStreetMap) — usado pela Torre de Controle
  app.get("/api/geocode", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) {
        return res.status(400).json({ error: "Missing query parameter 'q'" });
      }

      // Nominatim não resolve bem endereços com apto/bloco/CEP — tenta variantes
      // progressivamente mais simples até encontrar.
      const clean = q
        .replace(/\b(apto\.?|apartamento|bloco|casa|sala|loja)\s*\S*/gi, "")
        .replace(/\bCEP:?\s*[\d.-]+/gi, "")
        .replace(/\bS\/N\b/gi, "")
        .replace(/\bn[ºo°]\.?\s*/gi, "")
        .replace(/\//g, " ")
        .replace(/\s{2,}/g, " ")
        .replace(/\s*,\s*,/g, ",")
        .replace(/[,\s-]+$/g, "")
        .trim();
      // separa também por " - " (padrão comum: "Bairro - Cidade")
      const parts = clean.split(/,|\s-\s/).map((s) => s.trim()).filter(Boolean);
      const variants = [clean];
      if (parts.length > 2) {
        // rua + número + cidade/UF (últimas 1-2 partes)
        variants.push([parts[0], parts[1], ...parts.slice(-2)].join(", "));
        variants.push([parts[0], ...parts.slice(-2)].join(", "));
      }
      if (parts.length > 1) {
        variants.push([parts[0], parts[parts.length - 1]].join(", "));
      }
      if (parts.length > 2) {
        // último recurso: bairro + cidade (posição aproximada)
        variants.push(parts.slice(-2).join(", "));
      }

      const tried = new Set<string>();
      for (const variant of variants) {
        if (tried.has(variant)) continue;
        tried.add(variant);
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(variant)}`;
        const response = await fetch(url, {
          headers: { "User-Agent": "GlassFlow-Sardenberg/1.0 (torre-de-controle)" },
        });
        if (!response.ok) continue;
        const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
        if (results.length) {
          return res.json({
            found: true,
            latitude: parseFloat(results[0].lat),
            longitude: parseFloat(results[0].lon),
            displayName: results[0].display_name,
          });
        }
        await new Promise((r) => setTimeout(r, 600));
      }
      res.json({ found: false });
    } catch (error) {
      console.error("Geocode error:", error);
      res.status(500).json({ error: "Failed to geocode" });
    }
  });

  // Projects Routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.get("/api/clients/:clientId/projects", async (req, res) => {
    try {
      const projects = await storage.getProjectsByClient(req.params.clientId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client projects" });
    }
  });

  app.get("/api/projects/next-number", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const year = new Date().getFullYear();
      
      // Filter projects from the current year to find the highest sequence
      const yearProjects = projects.filter(p => {
        const num = p.quoteNumber || p.saleNumber || "";
        return num.includes(year.toString());
      });
      
      let maxSeq = 0;
      for (const p of yearProjects) {
        const num = p.quoteNumber || p.saleNumber || "";
        const match = num.match(/\d+$/);
        if (match) {
          const seq = parseInt(match[0], 10);
          if (seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
      
      const nextSeq = maxSeq + 1;
      res.json({ number: `ORC.${year}.${String(nextSeq).padStart(3, '0')}` });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate next quote number" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      let incoming = { ...req.body } as any;

      if (!incoming.clientId) {
         return res.status(400).json({ error: "Client ID is required" });
      }

      const client = await storage.getClient(incoming.clientId);
      const clientName = client?.name || "Cliente";

      // Automatically set saleNumber to be the same as quoteNumber
      if (incoming.quoteNumber) {
        incoming.saleNumber = incoming.quoteNumber;
        incoming.name = `${clientName} | Venda/Orç: ${incoming.quoteNumber}`;
      } else {
        incoming.name = incoming.name || "Novo Projeto";
      }

      // Handle items if present (for esquadrias)
      const items = incoming.items;
      delete incoming.items; // Remove before inserting project

      const validatedData = insertProjectSchema.parse(incoming);
      const project = await storage.createProject(validatedData);

      // Save items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
           if (item.description) {
             const total = parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0");
             // project items handled via quotes if needed
           }
        }
      }

      // Generate installment bills if a payment condition is set
      await generatePaymentConditionBills(project);

      // Sync bills automatically for projects with pending payment
      await syncProjectBills(project);

      res.status(201).json(project);
    } catch (error) {
      console.error("Project creation error:", error);
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Generate installment bills if a payment condition is set
      await generatePaymentConditionBills(project);

      // Sync bills automatically after project update
      await syncProjectBills(project);

      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Failed to update project" });
    }
  });

  app.post("/api/projects/:id/custom-installments", async (req, res) => {
    try {
      const { installments } = req.body;
      if (!Array.isArray(installments)) {
        return res.status(400).json({ error: "Installments must be an array" });
      }
      
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Update project with custom installments
      const updatedProject = await storage.updateProject(req.params.id, {
        paymentCondition: "personalizado",
        customInstallments: installments
      });

      // Generate the bills
      if (updatedProject) {
        await generatePaymentConditionBills(updatedProject);
        await syncProjectBills(updatedProject);
      }

      res.json(updatedProject);
    } catch (error) {
      console.error("Custom installments error:", error);
      res.status(500).json({ error: "Failed to save custom installments" });
    }
  });

  app.patch("/api/projects/reorder", async (req, res) => {
    try {
      const { updates } = req.body; // Expects an array: [{ id: "...", orderIndex: 1 }, ...]
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: "Invalid updates format. Expected an array." });
      }

      await storage.reorderProjects(updates);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Project reorder error:", error);
      res.status(500).json({ error: "Failed to reorder projects" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      // Clean up associated pending bills before deleting the project
      // This prevents orphaned bills from inflating dashboard "A Receber"
      try {
        const projectBills = await storage.getBillsByProject(req.params.id);
        for (const bill of projectBills) {
          if (bill.status === "pendente") {
            await storage.deleteBill(bill.id);
          }
        }
      } catch (e) {
        console.error("Warning: failed to clean up project bills:", e);
      }

      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Transactions Routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const { projectId } = req.query as { projectId?: string };
      if (projectId) {
        const transactions = await storage.getTransactionsByProject(projectId);
        return res.json(transactions);
      }
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("GET /api/transactions error:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Failed to fetch transactions", details: message });
    }
  });

  app.get("/api/projects/:projectId/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByProject(req.params.projectId);
      res.json(transactions);
    } catch (error) {
      console.error("GET /api/projects/:projectId/transactions error:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Failed to fetch project transactions", details: message });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      // Log and normalize incoming payload for safer validation
      const incoming = req.body as any;
      console.log("POST /api/transactions incoming", incoming);

      // Normalize value to a decimal string with dot separator and two decimals
      let normalizedValue = incoming?.value;
      if (typeof normalizedValue === "number") {
        normalizedValue = normalizedValue.toFixed(2);
      } else if (typeof normalizedValue === "string") {
        const s = normalizedValue.replace(/,/g, ".").trim();
        const n = Number(s);
        if (!Number.isNaN(n)) {
          normalizedValue = n.toFixed(2);
        } else {
          normalizedValue = s; // let zod complain with details
        }
      }

      const body = { ...incoming, value: normalizedValue };
      const validatedData = insertTransactionSchema.parse(body);
      const transaction = await storage.createTransaction(validatedData);

      // Sync bills when transaction changes project payment
      if (transaction.projectId) {
        const project = await storage.getProject(transaction.projectId);
        if (project) {
          await syncProjectBills(project);
        }
      }

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Transaction creation error:", error, "payload:", req.body);
      let details: any = undefined;
      if (error instanceof ZodError) {
        details = error.issues?.map(i => ({ path: i.path.join('.'), message: i.message }));
      }
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: "Invalid transaction data", details: details || message });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      // Validate and strip unknown fields to avoid updating forbidden columns (e.g., id)
      const validatedData = insertTransactionSchema.partial().parse(req.body);

      console.log("PATCH /api/transactions/:id incoming", {
        id: req.params.id,
        body: req.body,
        validated: validatedData,
      });

      const transaction = await storage.updateTransaction(req.params.id, validatedData);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      console.log("PATCH /api/transactions/:id updated", { id: req.params.id, transaction });

      // Sync bills when transaction changes
      if (transaction.projectId) {
        const project = await storage.getProject(transaction.projectId);
        if (project) {
          await syncProjectBills(project);
        }
      }

      res.json(transaction);
    } catch (error) {
      console.error("Transaction update error:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: "Failed to update transaction", details: message });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      // Get transaction before deleting to sync project bills
      const transactionToDelete = await storage.getTransaction(req.params.id);

      await storage.deleteTransaction(req.params.id);

      // Sync bills after transaction deletion
      if (transactionToDelete && transactionToDelete.projectId) {
        const project = await storage.getProject(transactionToDelete.projectId);
        if (project) {
          await syncProjectBills(project);
        }
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Rotas para anexos de transações
  app.get("/api/transactions/files", async (req, res) => {
    try {
      const { projectId } = req.query;
      let files;
      if (projectId) {
        files = await storage.getTransactionFiles(projectId as string);
      } else {
        files = await storage.getAllTransactionFiles();
      }
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.json(files);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Failed to fetch transaction files", details: message });
    }
  });

  app.post("/api/transactions/files", async (req, res) => {
    try {
      const { transactionId, fileName, fileType, fileSize, objectPath, observations } = req.body;

      if (!transactionId || !fileName || !objectPath) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Normalize object path when using object storage signed URLs
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(objectPath);

      const file = await storage.createTransactionFile({
        transactionId,
        fileName,
        fileType: fileType || "application/octet-stream",
        fileSize: fileSize || 0,
        objectPath: normalizedPath,
        observations: observations || null,
        uploadedAt: new Date()
      });

      res.status(201).json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to create transaction file" });
    }
  });

  // Project status update route to support client calls
  app.put("/api/projects/:id/status", async (req, res) => {
    try {
      const { status } = req.body as { status?: string };
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      const project = await storage.updateProjectStatus(req.params.id, status);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error: any) {
      // Provide useful diagnostics for debugging
      const details = {
        message: error?.message,
        code: error?.code,
      };
      res.status(400).json({ error: "Failed to update project status", details });
    }
  });

  app.delete("/api/transactions/files/:id", async (req, res) => {
    try {
      await storage.deleteTransactionFile(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction file" });
    }
  });

  // Dashboard Stats Route
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const { activeProjects, totalClients, receitas, despesas } = stats;

      const lucro = receitas - despesas;
      const margem = receitas > 0 ? ((lucro / receitas) * 100) : 0;

      res.json({
        activeProjects,
        totalClients,
        receitas,
        despesas,
        lucro,
        margem: parseFloat(margem.toFixed(1)),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("GET /api/dashboard/stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats", details: message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Dashboard V2 — Financial Summary with MoM comparison
  // ═══════════════════════════════════════════════════════════
  app.get("/api/dashboard/financial-summary", async (req, res) => {
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

      const result = await pool.query<{
        cur_receitas: string;
        cur_despesas: string;
        prev_receitas: string;
        prev_despesas: string;
        pending_receivables: string;
        pending_payables: string;
        overdue_receivables: string;
        overdue_payables: string;
        active_projects: string;
        total_clients: string;
      }>(`
        WITH transfer_categories AS (
          SELECT id FROM categories WHERE name = 'Transferência entre contas'
        )
        SELECT
          COALESCE((SELECT SUM(value) FROM transactions WHERE type = 'receita' AND date LIKE $1 || '%' AND (category_id IS NULL OR category_id NOT IN (SELECT id FROM transfer_categories))), 0)::text as cur_receitas,
          COALESCE((SELECT SUM(value) FROM transactions WHERE type = 'despesa' AND date LIKE $1 || '%' AND (category_id IS NULL OR category_id NOT IN (SELECT id FROM transfer_categories))), 0)::text as cur_despesas,
          COALESCE((SELECT SUM(value) FROM transactions WHERE type = 'receita' AND date LIKE $2 || '%' AND (category_id IS NULL OR category_id NOT IN (SELECT id FROM transfer_categories))), 0)::text as prev_receitas,
          COALESCE((SELECT SUM(value) FROM transactions WHERE type = 'despesa' AND date LIKE $2 || '%' AND (category_id IS NULL OR category_id NOT IN (SELECT id FROM transfer_categories))), 0)::text as prev_despesas,
          COALESCE((SELECT SUM(value::numeric) FROM bills WHERE type = 'receber' AND status = 'pendente'), 0)::text as pending_receivables,
          COALESCE((SELECT SUM(value::numeric) FROM bills WHERE type = 'pagar' AND status = 'pendente'), 0)::text as pending_payables,
          COALESCE((SELECT SUM(value::numeric) FROM bills WHERE type = 'receber' AND status = 'pendente' AND due_date < CURRENT_DATE::text), 0)::text as overdue_receivables,
          COALESCE((SELECT SUM(value::numeric) FROM bills WHERE type = 'pagar' AND status = 'pendente' AND due_date < CURRENT_DATE::text), 0)::text as overdue_payables,
          (SELECT COUNT(*) FROM projects WHERE status IN ('aprovado', 'execucao'))::text as active_projects,
          (SELECT COUNT(*) FROM clients)::text as total_clients
      `, [currentMonth, prevMonth]);

      const row = result.rows[0];
      const curReceitas = parseFloat(row.cur_receitas);
      const curDespesas = parseFloat(row.cur_despesas);
      const prevReceitas = parseFloat(row.prev_receitas);
      const prevDespesas = parseFloat(row.prev_despesas);
      const curLucro = curReceitas - curDespesas;
      const prevLucro = prevReceitas - prevDespesas;

      const pctChange = (cur: number, prev: number) => {
        if (prev === 0) return cur > 0 ? 100 : 0;
        return parseFloat(((cur - prev) / Math.abs(prev) * 100).toFixed(1));
      };

      res.json({
        currentMonth,
        receitas: { value: curReceitas, change: pctChange(curReceitas, prevReceitas) },
        despesas: { value: curDespesas, change: pctChange(curDespesas, prevDespesas) },
        resultado: { value: curLucro, change: pctChange(curLucro, prevLucro) },
        margem: curReceitas > 0 ? parseFloat(((curLucro / curReceitas) * 100).toFixed(1)) : 0,
        pendingReceivables: parseFloat(row.pending_receivables),
        pendingPayables: parseFloat(row.pending_payables),
        overdueReceivables: parseFloat(row.overdue_receivables),
        overduePayables: parseFloat(row.overdue_payables),
        activeProjects: parseInt(row.active_projects),
        totalClients: parseInt(row.total_clients),
      });
    } catch (error) {
      console.error("GET /api/dashboard/financial-summary error:", error);
      res.status(500).json({ error: "Failed to fetch financial summary" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Dashboard V2 — Chart Data (6 months of revenue/expenses)
  // ═══════════════════════════════════════════════════════════
  app.get("/api/dashboard/chart-data", async (req, res) => {
    try {
      const result = await pool.query<{
        month: string;
        receitas: string;
        despesas: string;
      }>(`
        WITH months AS (
          SELECT to_char(d, 'YYYY-MM') as month,
                 to_char(d, 'Mon/YY') as label
          FROM generate_series(
            date_trunc('month', CURRENT_DATE) - interval '5 months',
            date_trunc('month', CURRENT_DATE),
            interval '1 month'
          ) d
        )
        SELECT
          m.month,
          m.label,
          COALESCE(SUM(CASE WHEN t.type = 'receita' THEN t.value ELSE 0 END), 0)::text as receitas,
          COALESCE(SUM(CASE WHEN t.type = 'despesa' THEN t.value ELSE 0 END), 0)::text as despesas
        FROM months m
        LEFT JOIN transactions t ON t.date LIKE m.month || '%'
          AND (t.category_id IS NULL OR t.category_id NOT IN (
            SELECT id FROM categories WHERE name = 'Transferência entre contas'
          ))
        GROUP BY m.month, m.label
        ORDER BY m.month ASC
      `);

      res.json(result.rows.map(r => ({
        name: (r as any).label,
        month: r.month,
        Receitas: parseFloat(r.receitas),
        Despesas: parseFloat(r.despesas),
        Resultado: parseFloat(r.receitas) - parseFloat(r.despesas),
      })));
    } catch (error) {
      console.error("GET /api/dashboard/chart-data error:", error);
      res.status(500).json({ error: "Failed to fetch chart data" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // DRE — Demonstrativo de Resultados
  // ═══════════════════════════════════════════════════════════
  app.get("/api/dre", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = (startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const end = (endDate as string) || new Date().toISOString().split('T')[0];

      // Get all transactions in period
      const txResult = await pool.query<{
        type: string;
        value: string;
        category_id: string | null;
        fixed_variable: string | null;
        cost_type: string | null;
        category_name: string | null;
      }>(`
        SELECT 
          t.type,
          t.value::text,
          t.category_id,
          c.fixed_variable,
          c.cost_type,
          c.name as category_name
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.date >= $1 AND t.date <= $2
      `, [start, end]);

      let receitaBruta = 0;
      let custosVariaveis = 0;
      let gastosFixos = 0;
      let resultadoFinanceiro = 0;
      let impostos = 0;
      const detalhes: Record<string, { nome: string; valor: number; tipo: string }[]> = {
        receitas: [],
        custosVariaveis: [],
        gastosFixos: [],
        resultadoFinanceiro: [],
        impostos: [],
      };

      for (const row of txResult.rows) {
        const value = parseFloat(row.value);
        if (row.type === 'receita') {
          receitaBruta += value;
          detalhes.receitas.push({ nome: row.category_name || 'Sem categoria', valor: value, tipo: 'receita' });
        } else {
          const costType = row.cost_type || 'operacional';
          const fixedVar = row.fixed_variable || 'variavel';

          if (costType === 'financeiro') {
            resultadoFinanceiro += value;
            detalhes.resultadoFinanceiro.push({ nome: row.category_name || 'Sem categoria', valor: value, tipo: 'financeiro' });
          } else if (costType === 'imposto') {
            impostos += value;
            detalhes.impostos.push({ nome: row.category_name || 'Sem categoria', valor: value, tipo: 'imposto' });
          } else if (fixedVar === 'fixo') {
            gastosFixos += value;
            detalhes.gastosFixos.push({ nome: row.category_name || 'Sem categoria', valor: value, tipo: 'fixo' });
          } else {
            custosVariaveis += value;
            detalhes.custosVariaveis.push({ nome: row.category_name || 'Sem categoria', valor: value, tipo: 'variavel' });
          }
        }
      }

      // Aggregate details by category
      const aggregateDetails = (items: { nome: string; valor: number; tipo: string }[]) => {
        const grouped: Record<string, number> = {};
        for (const item of items) {
          grouped[item.nome] = (grouped[item.nome] || 0) + item.valor;
        }
        return Object.entries(grouped).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
      };

      const receitaLiquida = receitaBruta; // Pode subtrair deduções futuras
      const margemContribuicao = receitaLiquida - custosVariaveis;
      const resultadoOperacional = margemContribuicao - gastosFixos; // EBITDA simplificado
      const lucroAntesIR = resultadoOperacional - resultadoFinanceiro;
      const lucroLiquido = lucroAntesIR - impostos;

      res.json({
        periodo: { inicio: start, fim: end },
        dre: {
          receitaBruta,
          deducoes: 0,
          receitaLiquida,
          custosVariaveis,
          margemContribuicao,
          margemContribuicaoPct: receitaLiquida > 0 ? parseFloat(((margemContribuicao / receitaLiquida) * 100).toFixed(1)) : 0,
          gastosFixos,
          resultadoOperacional,
          margemOperacionalPct: receitaLiquida > 0 ? parseFloat(((resultadoOperacional / receitaLiquida) * 100).toFixed(1)) : 0,
          resultadoFinanceiro,
          lucroAntesIR,
          impostos,
          lucroLiquido,
          margemLiquidaPct: receitaLiquida > 0 ? parseFloat(((lucroLiquido / receitaLiquida) * 100).toFixed(1)) : 0,
        },
        detalhes: {
          receitas: aggregateDetails(detalhes.receitas),
          custosVariaveis: aggregateDetails(detalhes.custosVariaveis),
          gastosFixos: aggregateDetails(detalhes.gastosFixos),
          resultadoFinanceiro: aggregateDetails(detalhes.resultadoFinanceiro),
          impostos: aggregateDetails(detalhes.impostos),
        },
      });
    } catch (error) {
      console.error("GET /api/dre error:", error);
      res.status(500).json({ error: "Failed to calculate DRE" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Upcoming Bills & Alerts
  // ═══════════════════════════════════════════════════════════
  app.get("/api/dashboard/upcoming-bills", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT b.*, p.name as project_name
        FROM bills b
        LEFT JOIN projects p ON p.id = b.project_id
        WHERE b.status = 'pendente'
        ORDER BY b.due_date ASC
        LIMIT 20
      `);
      res.json(result.rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        description: r.description,
        value: parseFloat(r.value),
        dueDate: r.due_date,
        status: r.status,
        projectName: r.project_name,
        isOverdue: r.due_date < new Date().toISOString().split('T')[0],
      })));
    } catch (error) {
      console.error("GET /api/dashboard/upcoming-bills error:", error);
      res.status(500).json({ error: "Failed to fetch upcoming bills" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Goals CRUD
  // ═══════════════════════════════════════════════════════════
  app.get("/api/goals", async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM goals ORDER BY period DESC`);
      res.json(result.rows.map((r: any) => ({
        id: r.id,
        type: r.type || 'mensal',
        period: r.period,
        targetValue: parseFloat(r.target_value),
        description: r.description,
        createdAt: r.created_at,
      })));
    } catch (error) {
      console.error("GET /api/goals error:", error);
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const { type, period, targetValue, description } = req.body;
      const result = await pool.query(
        `INSERT INTO goals (type, period, target_value, description) VALUES ($1, $2, $3, $4) RETURNING *`,
        [type || 'mensal', period, String(targetValue), description || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("POST /api/goals error:", error);
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM goals WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error("DELETE /api/goals/:id error:", error);
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  // Goal progress for current month
  app.get("/api/goals/current-progress", async (req, res) => {
    try {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const goalResult = await pool.query(
        `SELECT * FROM goals WHERE period = $1 LIMIT 1`,
        [currentPeriod]
      );

      const revenueResult = await pool.query(
        `SELECT COALESCE(SUM(value), 0)::text as total FROM transactions WHERE type = 'receita' AND date LIKE $1 || '%'`,
        [currentPeriod]
      );

      const goal = goalResult.rows[0];
      const achieved = parseFloat((revenueResult.rows[0] as any).total);

      if (goal) {
        const target = parseFloat(goal.target_value);
        res.json({
          hasGoal: true,
          period: currentPeriod,
          target,
          achieved,
          percentage: target > 0 ? parseFloat(((achieved / target) * 100).toFixed(1)) : 0,
          remaining: Math.max(0, target - achieved),
          description: goal.description,
        });
      } else {
        res.json({
          hasGoal: false,
          period: currentPeriod,
          target: 0,
          achieved,
          percentage: 0,
          remaining: 0,
          description: null,
        });
      }
    } catch (error) {
      console.error("GET /api/goals/current-progress error:", error);
      res.status(500).json({ error: "Failed to fetch goal progress" });
    }
  });

  // Quotes Routes
  app.get("/api/quotes", async (req, res) => {
    try {
      const quotes = await storage.getQuotes();
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  app.get("/api/clients/:clientId/quotes", async (req, res) => {
    try {
      const quotes = await storage.getQuotesByClient(req.params.clientId);
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client quotes" });
    }
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      const validatedData = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote(validatedData);
      res.status(201).json(quote);
    } catch (error) {
      console.error("Quote creation error:", error);
      res.status(400).json({ error: "Invalid quote data" });
    }
  });

  app.post("/api/quotes/:id/duplicate", async (req, res) => {
    try {
      const originalQuote = await storage.getQuote(req.params.id);
      if (!originalQuote) {
        return res.status(404).json({ error: "Original quote not found" });
      }

      // Generate new quote number
      const existingQuotes = await storage.getQuotes();
      const year = new Date().getFullYear();
      const count = existingQuotes.length + 1;
      const newNumber = `ORC-${year}-${String(count).padStart(3, '0')}`;

      // Create new quote based on original
      const quoteData = {
        clientId: originalQuote.clientId,
        number: newNumber,
        status: "pendente",
        // Default validity to 30 days from now
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        local: originalQuote.local,
        tipo: originalQuote.tipo,
        discount: originalQuote.discount,
        observations: originalQuote.observations,
      };

      const newQuote = await storage.createQuote(quoteData);

      // Duplicate items
      const items = await storage.getQuoteItems(originalQuote.id);
      for (const item of items) {
        await storage.createQuoteItem({
          quoteId: newQuote.id,
          description: item.description,
          quantity: item.quantity,
          width: item.width,
          height: item.height,
          colorThickness: item.colorThickness,
          profileColor: item.profileColor,
          accessoryColor: item.accessoryColor,
          line: item.line,
          deliveryDate: item.deliveryDate,
          itemObservations: item.itemObservations,
          environment: item.environment,
          unitPrice: item.unitPrice,
          total: item.total,
          imageUrl: item.imageUrl,
        });
      }

      res.status(201).json(newQuote);
    } catch (error) {
      console.error("Quote duplication error:", error);
      res.status(500).json({ error: "Failed to duplicate quote" });
    }
  });

  app.patch("/api/quotes/:id", async (req, res) => {
    try {
      const originalQuote = await storage.getQuote(req.params.id);
      if (!originalQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      const quote = await storage.updateQuote(req.params.id, req.body);

      // Financial Integration: Auto-generate bill (conta a pagar) for projected material costs when approved
      if (req.body.status === "aprovado" && originalQuote.status !== "aprovado") {
        try {
          const items = await storage.getQuoteItems(quote!.id);

          let totalMaterialCost = 0;
          for (const item of items) {
            if (item.calculatedMaterials) {
              const calc = item.calculatedMaterials as any;
              // Sum pre-calculated costs if they exist
              if (calc.costs) {
                const aluCost = parseFloat(calc.costs.aluminumCost || "0");
                const glassCost = parseFloat(calc.costs.glassCost || "0");
                const accCost = parseFloat(calc.costs.accessoriesCost || "0");
                totalMaterialCost += (aluCost + glassCost + accCost) * parseInt(item.quantity?.toString() || "1");
              }
            }
          }

          if (totalMaterialCost > 0) {
            // Find or create category for "Custo de Materiais"
            const categories = await storage.getCategories();
            let pCategory = categories.find(c => c.name.toLowerCase() === "custo de materiais");

            if (!pCategory) {
              pCategory = await storage.createCategory({
                name: "Custo de Materiais",
                type: "despesa",
                color: "#ef4444"
              });
            }

            // Create Expense Bill for Materials
            await storage.createBill({
              description: `Custo projetado Ref. Orçamento #${quote!.number}`,
              value: totalMaterialCost.toString(),
              type: "pagar",
              status: "pendente",
              dueDate: new Date().toISOString().split('T')[0], // Today initially, could be dynamic
              date: new Date().toISOString().split('T')[0],
              categoryId: pCategory.id || null,
              projectId: quote!.projectId || null,
            });
          }

          // Create Revenue Bill for Total Quote Value
          if (quote!.total && parseFloat(quote!.total.toString()) > 0) {
            const categories = await storage.getCategories();
            let rCategory = categories.find(c => c.name.toLowerCase() === "venda de esquadrias" || c.name.toLowerCase() === "vendas");

            if (!rCategory) {
              rCategory = await storage.createCategory({
                name: "Venda de Esquadrias",
                type: "receita",
                color: "#16a34a"
              });
            }

            await storage.createBill({
              description: `Receita Ref. Orçamento #${quote!.number}`,
              value: quote!.total.toString(),
              type: "receber",
              status: "pendente",
              dueDate: new Date().toISOString().split('T')[0],
              date: new Date().toISOString().split('T')[0],
              categoryId: rCategory.id || null,
              projectId: quote!.projectId || null,
            });
          }
        } catch (finError) {
          console.error("Failed to integrate quote approval with financial module:", finError);
          // Do not block quote approval if financial integration fails, but log it
        }
      }

      res.json(quote);
    } catch (error) {
      res.status(400).json({ error: "Failed to update quote" });
    }
  });

  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      await storage.deleteQuote(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // Quote Items Routes
  app.get("/api/quote-items", async (req, res) => {
    try {
      const items = await storage.getAllQuoteItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all quote items" });
    }
  });

  app.get("/api/quotes/:quoteId/items", async (req, res) => {
    try {
      const items = await storage.getQuoteItems(req.params.quoteId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quote items" });
    }
  });

  app.post("/api/quote-items", async (req, res) => {
    try {
      console.log("POST /api/quote-items received body:", JSON.stringify(req.body, null, 2));
      console.log("Environment field in body:", req.body.environment);
      const validatedData = insertQuoteItemSchema.parse(req.body);
      console.log("Validated Environment field:", validatedData.environment);
      console.log("POST /api/quote-items validated:", JSON.stringify(validatedData, null, 2));
      const item = await storage.createQuoteItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Quote item creation error:", error);
      res.status(400).json({ error: "Invalid quote item data" });
    }
  });

  app.delete("/api/quote-items/:id", async (req, res) => {
    try {
      await storage.deleteQuoteItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete quote item" });
    }
  });

  // Object Storage Routes
  // NOTE: In production, these routes should be protected with authentication
  // Local upload fallback (development): store files under attached_assets/uploads
  const useLocalObjects = process.env.USE_LOCAL_OBJECTS === "1" && app.get("env") === "development";
  const localUploadsDir = path.resolve(import.meta.dirname, "..", "attached_assets", "uploads");

  if (useLocalObjects) {
    // Ensure uploads dir exists
    try {
      fs.mkdirSync(localUploadsDir, { recursive: true });
    } catch { }

    // Accept binary PUT uploads to /objects/uploads/:id
    app.put(
      "/objects/uploads/:id",
      express.raw({ type: "*/*", limit: "50mb" }),
      async (req, res) => {
        try {
          const id = req.params.id;
          const filePath = path.join(localUploadsDir, id);
          fs.writeFileSync(filePath, req.body);
          const meta = {
            contentType: req.header("content-type") || "application/octet-stream",
            size: req.body?.length || 0,
          };
          fs.writeFileSync(filePath + ".meta.json", JSON.stringify(meta));
          res.status(200).end();
        } catch (error) {
          console.error("Local upload error:", error);
          res.status(500).json({ error: "Failed to upload file" });
        }
      }
    );

    // Serve local uploads at /objects/uploads/:id
    app.get("/objects/uploads/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filePath = path.join(localUploadsDir, id);
        if (!fs.existsSync(filePath)) {
          return res.sendStatus(404);
        }
        let contentType = "application/octet-stream";
        try {
          const metaRaw = fs.readFileSync(filePath + ".meta.json", "utf8");
          const meta = JSON.parse(metaRaw);
          if (meta?.contentType) contentType = meta.contentType;
        } catch { }
        res.setHeader("Content-Type", contentType);
        res.sendFile(filePath);
      } catch (error) {
        console.error("Local download error:", error);
        res.status(500).json({ error: "Failed to download file" });
      }
    });
  }
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      // Backward compatibility: if path is /objects/<uuid> (without uploads/),
      // check local uploads directory first before trying Supabase
      if (useLocalObjects) {
        const relativePath = req.path.replace("/objects/", "");
        const parts = relativePath.split('/');
        const possibleId = parts[parts.length - 1];
        if (possibleId) {
          const localPath = path.join(localUploadsDir, possibleId);
          if (fs.existsSync(localPath)) {
            let contentType = "application/octet-stream";
            try {
              const metaRaw = fs.readFileSync(localPath + ".meta.json", "utf8");
              const meta = JSON.parse(metaRaw);
              if (meta?.contentType) contentType = meta.contentType;
            } catch { }
            res.setHeader("Content-Type", contentType);
            return res.sendFile(localPath);
          }
        }
      }

      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    try {
      if (useLocalObjects) {
        const objectId = randomUUID();
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const uploadURL = `${baseUrl}/objects/uploads/${objectId}`;
        return res.json({ uploadURL });
      }

      const objectStorageService = new ObjectStorageService();
      const { bucketName, pathPrefix } = req.body;
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(bucketName, pathPrefix);
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({
        error: "Failed to generate upload URL",
        details: error.message,
        stack: error.stack
      });
    }
  });

  // Project Files Routes
  app.get("/api/projects/:projectId/files", async (req, res) => {
    try {
      const files = await storage.getProjectFiles(req.params.projectId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project files" });
    }
  });

  app.post("/api/project-files", async (req, res) => {
    try {
      const validatedData = insertProjectFileSchema.parse(req.body);

      // Normalize the object path from the upload URL
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(validatedData.objectPath);

      // Save with normalized path
      const file = await storage.createProjectFile({
        ...validatedData,
        objectPath: normalizedPath,
      });

      res.status(201).json(file);
    } catch (error) {
      console.error("Project file creation error:", error);
      res.status(400).json({ error: "Invalid project file data" });
    }
  });

  app.delete("/api/project-files/:id", async (req, res) => {
    try {
      await storage.deleteProjectFile(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project file" });
    }
  });

  // Bills Routes (Contas a Pagar e Receber)
  app.get("/api/bills", async (req, res) => {
    try {
      const { projectId } = req.query as { projectId?: string };
      if (projectId) {
        const bills = await storage.getBillsByProject(projectId);
        return res.json(bills);
      }
      const bills = await storage.getBills();
      res.json(bills);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  });

  app.get("/api/bills/:id", async (req, res) => {
    try {
      const bill = await storage.getBill(req.params.id);
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      res.json(bill);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bill" });
    }
  });

  app.get("/api/projects/:projectId/bills", async (req, res) => {
    try {
      const bills = await storage.getBillsByProject(req.params.projectId);
      res.json(bills);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project bills" });
    }
  });

  app.post("/api/bills", async (req, res) => {
    try {
      const validatedData = insertBillSchema.parse(req.body);
      const bill = await storage.createBill(validatedData);
      res.status(201).json(bill);
    } catch (error) {
      console.error("Bill creation error:", error);
      res.status(400).json({ error: "Invalid bill data" });
    }
  });

  app.patch("/api/bills/:id", async (req, res) => {
    try {
      const prev = await storage.getBill(req.params.id);
      const bill = await storage.updateBill(req.params.id, req.body);
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      // Sync receipt with project when marking a receivable bill as paid
      try {
        const wasPaid = prev?.status === "pago";
        const isPaidNow = bill.status === "pago";

        if (!wasPaid && isPaidNow && bill.type === "receber") {
          const paymentDate = new Date().toISOString().split('T')[0];
          const tx = await storage.createTransaction({
            projectId: bill.projectId || null,
            categoryId: bill.categoryId || null,
            type: "receita",
            description: `Recebimento: ${bill.description}`,
            value: String(bill.value),
            date: paymentDate,
          });
          if (tx.projectId) {
            const project = await storage.getProject(tx.projectId);
            if (project) {
              await syncProjectBills(project);
            }
          }
        } else if (!wasPaid && isPaidNow && bill.type === "pagar") {
          const paymentDate = new Date().toISOString().split('T')[0];
          await storage.createTransaction({
            projectId: bill.projectId || null,
            categoryId: bill.categoryId || null,
            type: "despesa",
            description: `Despesa: ${bill.description}`,
            value: String(bill.value),
            date: paymentDate,
          });
          if (bill.projectId) {
            const project = await storage.getProject(bill.projectId);
            if (project) {
              await syncProjectBills(project);
            }
          }
        }
      } catch (syncErr) {
        console.error("Bill→Transaction sync error:", syncErr);
        // Do not fail the request; syncing is best-effort
      }
      res.json(bill);
    } catch (error) {
      res.status(400).json({ error: "Failed to update bill" });
    }
  });

  app.delete("/api/bills/:id", async (req, res) => {
    try {
      await storage.deleteBill(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bill" });
    }
  });
  // Bank Accounts Routes
  app.get("/api/bank-accounts", async (req, res) => {
    try {
      const accounts = await storage.getBankAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bank accounts" });
    }
  });

  app.post("/api/bank-accounts", async (req, res) => {
    try {
      const validatedData = insertBankAccountSchema.parse(req.body);
      const account = await storage.createBankAccount(validatedData);
      res.status(201).json(account);
    } catch (error) {
      console.error("Bank account creation error:", error);
      res.status(400).json({ error: "Invalid bank account data" });
    }
  });

  app.patch("/api/bank-accounts/:id", async (req, res) => {
    try {
      const account = await storage.updateBankAccount(req.params.id, req.body);
      if (!account) {
        return res.status(404).json({ error: "Bank account not found" });
      }
      res.json(account);
    } catch (error) {
      console.error("Bank account update error:", error);
      res.status(400).json({ error: "Failed to update bank account" });
    }
  });

  app.delete("/api/bank-accounts/:id", async (req, res) => {
    try {
      await storage.deleteBankAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bank account" });
    }
  });

  // Categories Routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Category creation error:", error);
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Category update error:", error);
      res.status(400).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  app.post("/api/bills/:id/ensure-transaction", async (req, res) => {
    try {
      const bill = await storage.getBill(req.params.id);
      if (!bill) return res.status(404).json({ error: "Bill not found" });
      if (bill.status !== "pago") return res.status(400).json({ error: "Bill is not marked as paid" });
      if (!bill.projectId) return res.status(400).json({ error: "Bill has no associated project" });

      const targetType = bill.type === "receber" ? "receita" : "despesa";
      const expectedDescPrefix = bill.type === "receber" ? "Recebimento: " : "Despesa: ";
      const expectedDesc = `${expectedDescPrefix}${bill.description}`;

      const txs = await storage.getTransactionsByProject(bill.projectId);
      const existing = txs.find(t => t.type === targetType && t.description === expectedDesc && String(t.value) === String(bill.value));
      if (existing) {
        return res.json(existing);
      }

      const paymentDate = new Date().toISOString().split('T')[0];
      const tx = await storage.createTransaction({
        projectId: bill.projectId,
        type: targetType,
        description: expectedDesc,
        value: String(bill.value),
        date: paymentDate,
      });
      if (tx.projectId) {
        const project = await storage.getProject(tx.projectId);
        if (project) {
          await syncProjectBills(project);
        }
      }
      return res.status(201).json(tx);
    } catch (error) {
      console.error("ensure-transaction error", error);
      res.status(500).json({ error: "Failed to ensure transaction for bill" });
    }
  });

  // Admin: initialize schema in Supabase via server connection
  app.post("/api/admin/init-schema", async (_req, res) => {
    const ddlStatements: string[] = [
      `CREATE EXTENSION IF NOT EXISTS pgcrypto;`,
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
      `CREATE TABLE IF NOT EXISTS transaction_files (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id uuid NOT NULL,
        file_name text NOT NULL,
        file_type text NOT NULL,
        file_size integer NOT NULL,
        object_path text NOT NULL,
        uploaded_at timestamp NOT NULL DEFAULT now()
      );`,
      // Ensure column types match existing transactions table (uuid)
      `DO $$ BEGIN
         BEGIN
           ALTER TABLE transaction_files
             ALTER COLUMN transaction_id TYPE uuid USING transaction_id::uuid;
         EXCEPTION WHEN undefined_table OR undefined_column THEN
           -- ignore if table or column doesn't exist yet
           NULL;
         END;
       END $$;`,
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
      `CREATE TABLE IF NOT EXISTS virtual_files (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name text NOT NULL,
        file_type text NOT NULL,
        file_size integer NOT NULL,
        object_path text NOT NULL,
        folder text NOT NULL DEFAULT 'Geral',
        tags text,
        description text,
        uploaded_by text,
        created_at timestamp NOT NULL DEFAULT now()
      );`,
    ];

    try {
      for (const sql of ddlStatements) {
        await pool.query(sql);
      }
      return res.status(200).json({ status: "ok" });
    } catch (err: any) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  });

  // Admin: check table existence
  app.get("/api/admin/check", async (_req, res) => {
    try {
      const tables = [
        'clients', 'projects', 'transactions', 'quotes', 'quote_items', 'project_files', 'transaction_files', 'bills'
      ];
      const results: Record<string, string | null> = {};
      for (const t of tables) {
        const r = await pool.query(`select to_regclass('public.${t}') as exists`);
        results[t] = r.rows[0]?.exists ?? null;
      }
      return res.json({ ok: true, tables: results });
    } catch (err: any) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  });

  // Admin: diagnostic for transactions table
  app.get("/api/admin/diag/transactions", async (_req, res) => {
    try {
      const count = await pool.query('select count(*)::int as count from transactions');
      const sample = await pool.query('select id, project_id, type, description, value, date, created_at from transactions order by created_at desc limit 5');
      return res.json({ count: count.rows[0]?.count ?? 0, sample: sample.rows });
    } catch (err: any) {
      console.error('Admin diag transactions error:', err);
      return res.status(500).json({ error: String(err?.message || err) });
    }
  });

  // --- SERRALHERIA ERP ROUTES ---

  // Aluminum Lines
  app.get("/api/aluminum-lines", async (req, res) => {
    try {
      const lines = await storage.getAluminumLines();
      res.json(lines);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch aluminum lines" });
    }
  });

  app.post("/api/aluminum-lines", async (req, res) => {
    try {
      const data = insertAluminumLineSchema.parse(req.body);
      const line = await storage.createAluminumLine(data);
      res.status(201).json(line);
    } catch (err) {
      res.status(400).json({ error: "Invalid aluminum line data" });
    }
  });

  app.patch("/api/aluminum-lines/:id", async (req, res) => {
    try {
      const line = await storage.updateAluminumLine(req.params.id, req.body);
      if (!line) return res.status(404).json({ error: "Line not found" });
      res.json(line);
    } catch (err) {
      res.status(400).json({ error: "Failed to update aluminum line" });
    }
  });

  app.delete("/api/aluminum-lines/:id", async (req, res) => {
    try {
      await storage.deleteAluminumLine(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete aluminum line" });
    }
  });

  // Aluminum Profiles
  app.get("/api/aluminum-profiles", async (req, res) => {
    try {
      const lineId = req.query.lineId as string | undefined;
      const profiles = await storage.getAluminumProfiles(lineId);
      res.json(profiles);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch aluminum profiles" });
    }
  });

  app.post("/api/aluminum-profiles", async (req, res) => {
    try {
      const data = insertAluminumProfileSchema.parse(req.body);
      const profile = await storage.createAluminumProfile(data);
      res.status(201).json(profile);
    } catch (err) {
      res.status(400).json({ error: "Invalid aluminum profile data" });
    }
  });

  app.patch("/api/aluminum-profiles/:id", async (req, res) => {
    try {
      const profile = await storage.updateAluminumProfile(req.params.id, req.body);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (err) {
      res.status(400).json({ error: "Failed to update aluminum profile" });
    }
  });

  app.delete("/api/aluminum-profiles/:id", async (req, res) => {
    try {
      await storage.deleteAluminumProfile(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete aluminum profile" });
    }
  });

  // Typologies
  app.get("/api/typologies", async (req, res) => {
    try {
      const typologies = await storage.getTypologies();
      res.json(typologies);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch typologies" });
    }
  });

  app.post("/api/typologies", async (req, res) => {
    try {
      const data = insertTypologySchema.parse(req.body);
      const typology = await storage.createTypology(data);
      res.status(201).json(typology);
    } catch (err) {
      res.status(400).json({ error: "Invalid typology data" });
    }
  });

  app.patch("/api/typologies/:id", async (req, res) => {
    try {
      const typology = await storage.updateTypology(req.params.id, req.body);
      if (!typology) return res.status(404).json({ error: "Typology not found" });
      res.json(typology);
    } catch (err) {
      res.status(400).json({ error: "Failed to update typology" });
    }
  });

  app.delete("/api/typologies/:id", async (req, res) => {
    try {
      await storage.deleteTypology(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete typology" });
    }
  });

  // Typology Materials
  app.get("/api/typologies/:id/materials", async (req, res) => {
    try {
      const materials = await storage.getTypologyMaterials(req.params.id);
      res.json(materials);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch typology materials" });
    }
  });

  app.get("/api/typology-materials", async (req, res) => {
    try {
      const materials = await storage.getAllTypologyMaterials();
      res.json(materials);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch all typology materials" });
    }
  });

  app.post("/api/typology-materials", async (req, res) => {
    try {
      const data = insertTypologyMaterialSchema.parse(req.body);
      const material = await storage.createTypologyMaterial(data);
      res.status(201).json(material);
    } catch (err) {
      res.status(400).json({ error: "Invalid typology material data" });
    }
  });

  app.patch("/api/typology-materials/:id", async (req, res) => {
    try {
      const material = await storage.updateTypologyMaterial(req.params.id, req.body);
      if (!material) return res.status(404).json({ error: "Typology material not found" });
      res.json(material);
    } catch (err) {
      res.status(400).json({ error: "Failed to update typology material" });
    }
  });

  app.delete("/api/typology-materials/:id", async (req, res) => {
    try {
      await storage.deleteTypologyMaterial(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete typology material" });
    }
  });

  // Production Batches
  app.get("/api/production-batches", async (req, res) => {
    try {
      const batches = await storage.getProductionBatches();
      res.json(batches);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch production batches" });
    }
  });

  app.get("/api/production-batches/:id", async (req, res) => {
    try {
      const batch = await storage.getProductionBatch(req.params.id);
      if (!batch) return res.status(404).json({ error: "Production batch not found" });
      res.json(batch);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch production batch" });
    }
  });

  app.post("/api/production-batches", async (req, res) => {
    try {
      const { itemIds, ...batchData } = req.body;
      const data = insertProductionBatchSchema.parse(batchData);
      const batch = await storage.createProductionBatch(data);

      if (itemIds && Array.isArray(itemIds)) {
        for (const quoteItemId of itemIds) {
          await storage.createProductionBatchItem({
            batchId: batch.id,
            quoteItemId
          });
        }
      }

      res.status(201).json(batch);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Invalid production batch data" });
    }
  });

  app.patch("/api/production-batches/:id", async (req, res) => {
    try {
      const batch = await storage.updateProductionBatch(req.params.id, req.body);
      if (!batch) return res.status(404).json({ error: "Production batch not found" });
      res.json(batch);
    } catch (err) {
      res.status(400).json({ error: "Failed to update production batch" });
    }
  });

  app.delete("/api/production-batches/:id", async (req, res) => {
    try {
      await storage.deleteProductionBatch(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete production batch" });
    }
  });

  // Production Batch Items
  app.get("/api/production-batches/:batchId/items", async (req, res) => {
    try {
      const items = await storage.getProductionBatchItems(req.params.batchId);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch production batch items" });
    }
  });

  app.post("/api/production-batches/:batchId/items", async (req, res) => {
    try {
      const data = insertProductionBatchItemSchema.parse({
        batchId: req.params.batchId,
        quoteItemId: req.body.quoteItemId
      });
      const item = await storage.createProductionBatchItem(data);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ error: "Invalid production batch item data" });
    }
  });

  app.delete("/api/production-batch-items/:id", async (req, res) => {
    try {
      await storage.deleteProductionBatchItem(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete production batch item" });
    }
  });

  // --- Aluminum Stock Routes ---
  app.get("/api/aluminum-stock", async (req, res) => {
    try {
      const stock = await storage.getAluminumStock();
      res.json(stock);
    } catch (err) {
      console.error("GET /api/aluminum-stock error:", err);
      res.status(500).json({ error: "Failed to fetch aluminum stock" });
    }
  });

  app.get("/api/aluminum-stock/profile/:profileId", async (req, res) => {
    try {
      const stock = await storage.getAluminumStockByProfile(req.params.profileId);
      res.json(stock);
    } catch (err) {
      console.error("GET /api/aluminum-stock/profile/:profileId error:", err);
      res.status(500).json({ error: "Failed to fetch stock for profile" });
    }
  });

  app.post("/api/aluminum-stock", async (req, res) => {
    try {
      const data = insertAluminumStockSchema.parse(req.body);
      const newStock = await storage.createAluminumStockItem(data);
      res.status(201).json(newStock);
    } catch (err) {
      console.error("POST /api/aluminum-stock error:", err);
      res.status(400).json({ error: "Invalid aluminum stock data" });
    }
  });

  app.patch("/api/aluminum-stock/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const data = insertAluminumStockSchema.partial().parse(req.body);
      const updated = await storage.updateAluminumStockItem(id, data);

      if (!updated) {
        return res.status(404).json({ error: "Stock item not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/aluminum-stock error:", err);
      res.status(400).json({ error: "Invalid stock update data" });
    }
  });

  app.delete("/api/aluminum-stock/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteAluminumStockItem(id);
      res.status(204).send();
    } catch (err) {
      console.error("DELETE /api/aluminum-stock error:", err);
      res.status(500).json({ error: "Failed to delete stock item" });
    }
  });

  // Accessories Routes
  app.get("/api/accessories", async (req, res) => {
    try {
      const items = await storage.getAccessories();
      res.json(items);
    } catch (err) {
      console.error("GET /api/accessories error:", err);
      res.status(500).json({ error: "Failed to fetch accessories" });
    }
  });

  app.post("/api/accessories", async (req, res) => {
    try {
      const data = insertAccessorySchema.parse(req.body);
      const newItem = await storage.createAccessory(data);
      res.status(201).json(newItem);
    } catch (err) {
      console.error("POST /api/accessories error:", err);
      res.status(400).json({ error: "Invalid accessory data" });
    }
  });

  app.patch("/api/accessories/:id", async (req, res) => {
    try {
      const data = insertAccessorySchema.partial().parse(req.body);
      const updated = await storage.updateAccessory(req.params.id, data);
      if (!updated) {
        return res.status(404).json({ error: "Accessory not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/accessories error:", err);
      res.status(400).json({ error: "Invalid accessory update data" });
    }
  });

  app.delete("/api/accessories/:id", async (req, res) => {
    try {
      await storage.deleteAccessory(req.params.id);
      res.status(204).send();
    } catch (err) {
      console.error("DELETE /api/accessories error:", err);
      res.status(500).json({ error: "Failed to delete accessory" });
    }
  });

  app.get("/api/accessories/:id/movements", async (req, res) => {
    try {
      const movements = await storage.getAccessoryMovements(req.params.id);
      res.json(movements);
    } catch (err) {
      console.error("GET /api/accessories/:id/movements error:", err);
      res.status(500).json({ error: "Failed to fetch accessory movements" });
    }
  });

  // registra entrada/saida/ajuste e atualiza a quantidade do acessório
  app.post("/api/accessories/:id/movements", async (req, res) => {
    try {
      const accessory = await storage.getAccessory(req.params.id);
      if (!accessory) {
        return res.status(404).json({ error: "Accessory not found" });
      }
      const data = insertAccessoryMovementSchema.parse({ ...req.body, accessoryId: req.params.id });
      if (!["entrada", "saida", "ajuste"].includes(data.type)) {
        return res.status(400).json({ error: "Invalid movement type" });
      }
      const newQuantity = data.type === "entrada" ? accessory.quantity + data.quantity
        : data.type === "saida" ? accessory.quantity - data.quantity
        : data.quantity;
      if (newQuantity < 0) {
        return res.status(400).json({ error: "Estoque insuficiente para esta saída" });
      }
      const movement = await storage.createAccessoryMovement(data);
      const updated = await storage.updateAccessory(req.params.id, { quantity: newQuantity });
      res.status(201).json({ movement, accessory: updated });
    } catch (err) {
      console.error("POST /api/accessories/:id/movements error:", err);
      res.status(400).json({ error: "Invalid movement data" });
    }
  });

  // Bank Reconciliation Routes
  app.get("/api/bank-statements", async (req, res) => {
    try {
      const statements = await storage.getBankStatements();
      res.json(statements);
    } catch (error) {
      console.error("GET /api/bank-statements error:", error);
      res.status(500).json({ error: "Failed to fetch bank statements" });
    }
  });

  app.get("/api/bank-statements/:id/lines", async (req, res) => {
    try {
      const lines = await storage.getBankStatementLines(req.params.id);
      res.json(lines);
    } catch (error) {
      console.error("GET /api/bank-statements/:id/lines error:", error);
      res.status(500).json({ error: "Failed to fetch statement lines" });
    }
  });

  app.delete("/api/bank-statements/:id", async (req, res) => {
    try {
      await storage.deleteBankStatement(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/bank-statements/:id error:", error);
      res.status(500).json({ error: "Failed to delete bank statement" });
    }
  });

  app.post("/api/bank-statements/upload", express.json({ limit: "50mb" }), async (req, res) => {
    try {
      const { fileName, content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "No content provided" });
      }

      // Create the statement record
      const statement = await storage.createBankStatement({
        fileName,
        date: new Date().toISOString(),
        status: "pending",
      });

      const isCSV = fileName.toLowerCase().endsWith(".csv");
      let parsedLines: { date: string; description: string; amount: number; type: string }[] = [];

      if (isCSV) {
        // Parse CSV — support common Brazilian bank formats
        const lines = content.split(/\r?\n/).filter((l: string) => l.trim());
        // Try to detect delimiter
        const delimiter = lines[0]?.includes(';') ? ';' : ',';
        const headers = lines[0].toLowerCase().split(delimiter).map((h: string) => h.trim().replace(/"/g, ''));

        // Find columns by common names
        const dateIdx = headers.findIndex((h: string) => h.includes('data') || h === 'date');
        const descIdx = headers.findIndex((h: string) => h.includes('descri') || h.includes('histórico') || h.includes('historico') || h.includes('memo') || h === 'description');
        const amountIdx = headers.findIndex((h: string) => h.includes('valor') || h.includes('amount') || h.includes('quantia'));

        if (dateIdx === -1 || amountIdx === -1) {
          // Fallback: assume columns 0=date, 1=description, 2=amount
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(delimiter).map((c: string) => c.trim().replace(/"/g, ''));
            if (cols.length < 3) continue;
            const amtStr = cols[2]?.replace(/\./g, '').replace(',', '.') || '0';
            const amt = parseFloat(amtStr);
            if (isNaN(amt) || amt === 0) continue;
            const dateStr = cols[0] || '';
            // Try DD/MM/YYYY → YYYY-MM-DD
            const formattedDate = dateStr.includes('/') ? dateStr.split('/').reverse().join('-') : dateStr;

            parsedLines.push({
              date: formattedDate,
              description: cols[1] || 'Transação CSV',
              amount: Math.abs(amt),
              type: amt >= 0 ? 'CREDIT' : 'DEBIT',
            });
          }
        } else {
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(delimiter).map((c: string) => c.trim().replace(/"/g, ''));
            if (cols.length <= Math.max(dateIdx, amountIdx)) continue;

            const dateStr = cols[dateIdx] || '';
            const formattedDate = dateStr.includes('/') ? dateStr.split('/').reverse().join('-') : dateStr;
            const amtStr = (cols[amountIdx] || '0').replace(/\./g, '').replace(',', '.');
            const amt = parseFloat(amtStr);
            if (isNaN(amt) || amt === 0) continue;

            parsedLines.push({
              date: formattedDate,
              description: descIdx >= 0 ? cols[descIdx] || 'Transação CSV' : 'Transação CSV',
              amount: Math.abs(amt),
              type: amt >= 0 ? 'CREDIT' : 'DEBIT',
            });
          }
        }
      } else {
        // Parse OFX
        const ofxData = parseOfx(content);
        let transactions = [];

        try {
          const stmtTrnRs = ofxData.OFX.BANKMSGSRSV1.STMTTRNRS;
          const stmttrs = Array.isArray(stmtTrnRs) ? stmtTrnRs[0].STMTRS : stmtTrnRs.STMTRS;
          const bankTranList = stmttrs.BANKTRANLIST;
          const stmtrn = bankTranList.STMTTRN;
          transactions = Array.isArray(stmtrn) ? stmtrn : [stmtrn];
        } catch (e) {
          console.error("Failed to navigate OFX structure", e);
          return res.status(400).json({ error: "Invalid OFX format" });
        }

        for (const trn of transactions) {
          if (!trn) continue;
          const amount = parseFloat(trn.TRNAMT);
          const dateStr = trn.DTPOSTED || "";
          const formattedDate = dateStr.length >= 8
            ? `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
            : new Date().toISOString().split('T')[0];

          parsedLines.push({
            date: formattedDate,
            description: trn.MEMO || trn.NAME || "Transação Bank",
            amount: Math.abs(amount),
            type: amount >= 0 ? 'CREDIT' : 'DEBIT',
          });
        }
      }

      // Save all lines
      for (const line of parsedLines) {
        await storage.createBankStatementLine({
          statementId: statement.id,
          fitId: null,
          date: line.date,
          description: line.description,
          amount: line.amount.toString(),
          type: line.type,
          status: "unmatched",
        });
      }

      res.status(201).json({ ...statement, lineCount: parsedLines.length });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to process bank statement", details: error.message });
    }
  });

  app.post("/api/bank-statements/:id/reconcile", async (req, res) => {
    try {
      const { lineId, transactionId, createTransaction, categoryId, projectId } = req.body;
      const line = await storage.getBankStatementLine(lineId);
      if (!line) return res.status(404).json({ error: "Line not found" });

      if (createTransaction) {
        // Create new transaction and match
        const newTx = await storage.createTransaction({
          projectId: projectId || null,
          type: line.type === "CREDIT" ? "receita" : "despesa",
          description: line.description,
          value: line.amount,
          date: line.date,
          categoryId: categoryId || null,
        });

        // Important: set reconciled=true for the transaction
        await storage.updateTransaction(newTx.id, { reconciled: "true" });
        await storage.updateBankStatementLine(lineId, { status: "matched", transactionId: newTx.id });

        res.json({ success: true, transaction: newTx });
      } else if (transactionId) {
        // Match existing transaction
        await storage.updateTransaction(transactionId, { reconciled: "true" });
        await storage.updateBankStatementLine(lineId, { status: "matched", transactionId });
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Must provide transactionId or createTransaction flag" });
      }
    } catch (error: any) {
      console.error("Reconciliation error:", error);
      res.status(500).json({ error: "Reconciliation failed", details: error.message });
    }
  });

  // Auto-reconcile: match unmatched lines with transactions by amount and date proximity
  app.post("/api/bank-statements/:id/auto-reconcile", async (req, res) => {
    try {
      const statementId = req.params.id;
      const allLines = await storage.getBankStatementLines(statementId);
      const unmatchedLines = allLines.filter((l: any) => l.status === "unmatched");

      const allTransactions = await storage.getTransactions();
      const unreconciledTx = allTransactions.filter((t: any) => t.reconciled !== "true");

      let matched = 0;
      const usedTxIds = new Set<string>();

      for (const line of unmatchedLines) {
        const lineAmt = Math.abs(parseFloat(String(line.amount))).toFixed(2);
        const lineDate = new Date(line.date).getTime();

        // Find best match: same amount, closest date within 5 days
        let bestMatch: any = null;
        let bestDiff = Infinity;

        for (const tx of unreconciledTx) {
          if (usedTxIds.has(tx.id)) continue;
          const txAmt = Math.abs(parseFloat(String(tx.value))).toFixed(2);
          if (txAmt !== lineAmt) continue;

          // Check type compatibility
          const lineIsCredit = line.type === "CREDIT";
          const txIsReceita = tx.type === "receita";
          if (lineIsCredit !== txIsReceita) continue;

          const txDate = new Date(tx.date).getTime();
          const diffDays = Math.abs(txDate - lineDate) / (1000 * 3600 * 24);
          if (diffDays <= 5 && diffDays < bestDiff) {
            bestDiff = diffDays;
            bestMatch = tx;
          }
        }

        if (bestMatch) {
          await storage.updateTransaction(bestMatch.id, { reconciled: "true" });
          await storage.updateBankStatementLine(line.id, { status: "matched", transactionId: bestMatch.id });
          usedTxIds.add(bestMatch.id);
          matched++;
        }
      }

      res.json({ matched, total: unmatchedLines.length, remaining: unmatchedLines.length - matched });
    } catch (error: any) {
      console.error("Auto-reconcile error:", error);
      res.status(500).json({ error: "Auto-reconcile failed", details: error.message });
    }
  });

  app.post("/api/bank-statements/:id/ignore", async (req, res) => {
    try {
      const { lineId } = req.body;
      const line = await storage.getBankStatementLine(lineId);
      if (!line) return res.status(404).json({ error: "Line not found" });

      await storage.updateBankStatementLine(lineId, { status: "ignored" });
      res.json({ success: true });
    } catch (error) {
      console.error("Ignore error:", error);
      res.status(500).json({ error: "Failed to ignore line" });
    }
  });

  // ─── Employee Routes ───────────────────────────────────────────────────────

  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) return res.status(404).json({ error: "Employee not found" });
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Employee creation error:", error);
      res.status(400).json({ error: "Invalid employee data" });
    }
  });

  app.patch("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.updateEmployee(req.params.id, req.body);
      if (!employee) return res.status(404).json({ error: "Employee not found" });
      res.json(employee);
    } catch (error) {
      console.error("Employee update error:", error);
      res.status(400).json({ error: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  // Employee Payments
  app.get("/api/employee-payments", async (req, res) => {
    try {
      const { employeeId } = req.query as { employeeId?: string };
      const payments = await storage.getEmployeePayments(employeeId || undefined);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee payments" });
    }
  });

  app.get("/api/employee-payments/:id", async (req, res) => {
    try {
      const payment = await storage.getEmployeePayment(req.params.id);
      if (!payment) return res.status(404).json({ error: "Payment not found" });
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  app.post("/api/employee-payments", async (req, res) => {
    try {
      const incoming = { ...req.body };
      // Normalize value
      if (typeof incoming.value === "number") {
        incoming.value = incoming.value.toFixed(2);
      } else if (typeof incoming.value === "string") {
        const s = incoming.value.replace(/,/g, ".").trim();
        const n = Number(s);
        if (!Number.isNaN(n)) incoming.value = n.toFixed(2);
      }
      const validatedData = insertEmployeePaymentSchema.parse(incoming);
      const payment = await storage.createEmployeePayment(validatedData);

      // ── Integração Financeira: criar despesa se status = pago ──
      if (payment.status === "pago") {
        try {
          const employee = await storage.getEmployee(payment.employeeId);
          const empName = employee?.name || "Funcionário";
          const categories = await storage.getCategories();
          let cat = categories.find(c => c.name.toLowerCase() === "mão de obra" || c.name.toLowerCase() === "mao de obra");
          if (!cat) {
            cat = await storage.createCategory({ name: "Mão de Obra", type: "despesa", color: "#f97316" });
          }
          const typeLabel = ({
            salario: "Salário", adiantamento: "Adiantamento", ajuda_custo: "Ajuda de Custo",
            diaria: "Diária", bonificacao: "Bonificação", desconto: "Desconto",
            vale_transporte: "VT", vale_refeicao: "VR", hora_extra: "Hora Extra", outros: "Outros",
          } as Record<string, string>)[payment.type] || payment.type;

          await storage.createTransaction({
            type: "despesa",
            description: `[Func] ${typeLabel} - ${empName}: ${payment.description}`,
            value: payment.value,
            date: payment.date,
            projectId: payment.projectId || null,
            categoryId: cat.id,
          });
        } catch (finErr) {
          console.error("Failed to sync employee payment to financeiro:", finErr);
        }
      }

      res.status(201).json(payment);
    } catch (error) {
      console.error("Employee payment creation error:", error);
      res.status(400).json({ error: "Invalid payment data" });
    }
  });

  app.patch("/api/employee-payments/:id", async (req, res) => {
    try {
      const oldPayment = await storage.getEmployeePayment(req.params.id);
      if (!oldPayment) return res.status(404).json({ error: "Payment not found" });

      const payment = await storage.updateEmployeePayment(req.params.id, req.body);
      if (!payment) return res.status(404).json({ error: "Payment not found" });

      // ── Integração Financeira: sync com transações ──
      const statusChanged = oldPayment.status !== payment.status;
      if (statusChanged) {
        try {
          const employee = await storage.getEmployee(payment.employeeId);
          const empName = employee?.name || "Funcionário";

          if (payment.status === "pago" && oldPayment.status !== "pago") {
            // Criar despesa no financeiro
            const categories = await storage.getCategories();
            let cat = categories.find(c => c.name.toLowerCase() === "mão de obra" || c.name.toLowerCase() === "mao de obra");
            if (!cat) {
              cat = await storage.createCategory({ name: "Mão de Obra", type: "despesa", color: "#f97316" });
            }
            const typeLabel = ({
              salario: "Salário", adiantamento: "Adiantamento", ajuda_custo: "Ajuda de Custo",
              diaria: "Diária", bonificacao: "Bonificação", desconto: "Desconto",
              vale_transporte: "VT", vale_refeicao: "VR", hora_extra: "Hora Extra", outros: "Outros",
            } as Record<string, string>)[payment.type] || payment.type;

            await storage.createTransaction({
              type: "despesa",
              description: `[Func] ${typeLabel} - ${empName}: ${payment.description}`,
              value: payment.value,
              date: payment.date,
              projectId: payment.projectId || null,
              categoryId: cat.id,
            });
          } else if (payment.status !== "pago" && oldPayment.status === "pago") {
            // Remover despesa vinculada do financeiro
            const allTx = await storage.getTransactions();
            const linked = allTx.find(t =>
              t.description.includes(`[Func]`) &&
              t.description.includes(empName) &&
              t.description.includes(payment.description) &&
              t.value === payment.value
            );
            if (linked) {
              await storage.deleteTransaction(linked.id);
            }
          }
        } catch (finErr) {
          console.error("Failed to sync employee payment status to financeiro:", finErr);
        }
      }

      res.json(payment);
    } catch (error) {
      res.status(400).json({ error: "Failed to update payment" });
    }
  });

  app.delete("/api/employee-payments/:id", async (req, res) => {
    try {
      // Se o pagamento estava como pago, remover a transação vinculada
      const payment = await storage.getEmployeePayment(req.params.id);
      if (payment && payment.status === "pago") {
        try {
          const employee = await storage.getEmployee(payment.employeeId);
          const empName = employee?.name || "Funcionário";
          const allTx = await storage.getTransactions();
          const linked = allTx.find(t =>
            t.description.includes(`[Func]`) &&
            t.description.includes(empName) &&
            t.description.includes(payment.description) &&
            t.value === payment.value
          );
          if (linked) {
            await storage.deleteTransaction(linked.id);
          }
        } catch (finErr) {
          console.error("Failed to remove linked transaction on payment delete:", finErr);
        }
      }

      await storage.deleteEmployeePayment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  // Employee Productivity
  app.get("/api/employee-productivity", async (req, res) => {
    try {
      const { employeeId } = req.query as { employeeId?: string };
      const records = await storage.getEmployeeProductivity(employeeId || undefined);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch productivity records" });
    }
  });

  app.post("/api/employee-productivity", async (req, res) => {
    try {
      const validatedData = insertEmployeeProductivitySchema.parse(req.body);
      const record = await storage.createEmployeeProductivity(validatedData);
      res.status(201).json(record);
    } catch (error) {
      console.error("Productivity record creation error:", error);
      res.status(400).json({ error: "Invalid productivity data" });
    }
  });

  app.delete("/api/employee-productivity/:id", async (req, res) => {
    try {
      await storage.deleteEmployeeProductivity(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete productivity record" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // Virtual Files (Arquivo Virtual) — CRUD
  // ═══════════════════════════════════════════════════════════
  app.get("/api/virtual-files", async (req, res) => {
    try {
      const files = await storage.getVirtualFiles();
      res.json(files);
    } catch (error) {
      console.error("GET /api/virtual-files error:", error);
      res.status(500).json({ error: "Failed to fetch virtual files" });
    }
  });

  app.get("/api/virtual-files/:id", async (req, res) => {
    try {
      const file = await storage.getVirtualFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "Virtual file not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch virtual file" });
    }
  });

  app.post("/api/virtual-files", async (req, res) => {
    try {
      const { fileName, fileType, fileSize, objectPath, folder, tags, description, uploadedBy } = req.body;

      if (!fileName || !objectPath) {
        return res.status(400).json({ error: "Missing required fields: fileName, objectPath" });
      }

      // Normalize object path
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(objectPath);

      const file = await storage.createVirtualFile({
        fileName,
        fileType: fileType || "application/octet-stream",
        fileSize: fileSize || 0,
        objectPath: normalizedPath,
        folder: folder || "Geral",
        tags: tags || null,
        description: description || null,
        uploadedBy: uploadedBy || null,
      });

      res.status(201).json(file);
    } catch (error) {
      console.error("POST /api/virtual-files error:", error);
      res.status(400).json({ error: "Failed to create virtual file" });
    }
  });

  app.patch("/api/virtual-files/:id", async (req, res) => {
    try {
      const file = await storage.updateVirtualFile(req.params.id, req.body);
      if (!file) {
        return res.status(404).json({ error: "Virtual file not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(400).json({ error: "Failed to update virtual file" });
    }
  });

  app.delete("/api/virtual-files/:id", async (req, res) => {
    try {
      await storage.deleteVirtualFile(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete virtual file" });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // DRE — Export to XLSX
  // ═══════════════════════════════════════════════════════════
  app.get("/api/dre/export", async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const { startDate, endDate } = req.query;
      const start = (startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const end = (endDate as string) || new Date().toISOString().split('T')[0];

      // Get DRE data (reuse same query logic)
      const txResult = await pool.query<{
        type: string;
        value: string;
        category_id: string | null;
        fixed_variable: string | null;
        cost_type: string | null;
        category_name: string | null;
      }>(`
        SELECT 
          t.type,
          t.value::text,
          t.category_id,
          c.fixed_variable,
          c.cost_type,
          c.name as category_name
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.date >= $1 AND t.date <= $2
      `, [start, end]);

      let receitaBruta = 0;
      let custosVariaveis = 0;
      let gastosFixos = 0;
      let resultadoFinanceiro = 0;
      let impostos = 0;

      for (const row of txResult.rows) {
        const v = parseFloat(row.value);
        if (row.type === "receita") {
          receitaBruta += v;
        } else {
          const ct = row.cost_type || "operacional";
          const fv = row.fixed_variable || "variavel";
          if (ct === "financeiro") { resultadoFinanceiro += v; }
          else if (ct === "imposto") { impostos += v; }
          else if (fv === "fixo") { gastosFixos += v; }
          else { custosVariaveis += v; }
        }
      }

      const receitaLiquida = receitaBruta;
      const margemContribuicao = receitaLiquida - custosVariaveis;
      const resultadoOperacional = margemContribuicao - gastosFixos;
      const lucroAntesIR = resultadoOperacional - resultadoFinanceiro;
      const lucroLiquido = lucroAntesIR - impostos;

      const rows = [
        ["DEMONSTRATIVO DE RESULTADOS (DRE)"],
        [`Período: ${start} a ${end}`],
        [],
        ["LINHA", "VALOR (R$)", "% RECEITA"],
        ["(+) Receita Bruta de Vendas", receitaBruta.toFixed(2), "100,0%"],
        ["(-) Deduções sobre Receita", "0,00", "0,0%"],
        ["(=) RECEITA LÍQUIDA", receitaLiquida.toFixed(2), "100,0%"],
        [],
        ["(-) Custos Variáveis", custosVariaveis.toFixed(2), receitaBruta > 0 ? ((custosVariaveis / receitaBruta) * 100).toFixed(1) + "%" : "0,0%"],
        ["(=) MARGEM DE CONTRIBUIÇÃO", margemContribuicao.toFixed(2), receitaBruta > 0 ? ((margemContribuicao / receitaBruta) * 100).toFixed(1) + "%" : "0,0%"],
        [],
        ["(-) Gastos Fixos", gastosFixos.toFixed(2), receitaBruta > 0 ? ((gastosFixos / receitaBruta) * 100).toFixed(1) + "%" : "0,0%"],
        ["(=) RESULTADO OPERACIONAL (EBITDA)", resultadoOperacional.toFixed(2), receitaBruta > 0 ? ((resultadoOperacional / receitaBruta) * 100).toFixed(1) + "%" : "0,0%"],
        [],
        ["(-) Resultado Financeiro", resultadoFinanceiro.toFixed(2), ""],
        ["(=) LUCRO ANTES DO IR/CSLL", lucroAntesIR.toFixed(2), ""],
        ["(-) IR / CSLL Estimado", impostos.toFixed(2), ""],
        [],
        ["(=) LUCRO LÍQUIDO", lucroLiquido.toFixed(2), receitaBruta > 0 ? ((lucroLiquido / receitaBruta) * 100).toFixed(1) + "%" : "0,0%"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      // Set column widths
      ws["!cols"] = [{ wch: 40 }, { wch: 18 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DRE");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="DRE_${start}_${end}.xlsx"`);
      res.send(Buffer.from(buf));
    } catch (error) {
      console.error("GET /api/dre/export error:", error);
      res.status(500).json({ error: "Failed to export DRE" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
