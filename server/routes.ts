import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertProjectSchema, insertTransactionSchema, insertQuoteSchema, insertQuoteItemSchema, insertProjectFileSchema, insertBillSchema } from "@shared/schema";
import { ZodError } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import path from "path";
import fs from "fs";
import express from "express";
import { randomUUID } from "crypto";
import type { Project } from "@shared/schema";
import { pool } from "./db";

// Helper function to sync bills with project payment status
async function syncProjectBills(project: Project) {
  try {
    // Calculate pending amount based on project value and received transactions
    const projectValue = parseFloat(String(project.value));
    const transactions = await storage.getTransactionsByProject(project.id);
    const receivedAmount = transactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
    const pendingAmount = projectValue - receivedAmount;

    // Get existing bill for this project (should be only one "receber" bill per project)
    const existingBills = await storage.getBillsByProject(project.id);
    const existingBill = existingBills.find(bill => bill.type === "receber");

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
        // Update existing bill
        await storage.updateBill(existingBill.id, billData);
      } else {
        // Create new bill
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

  // Projects Routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
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

  app.post("/api/projects", async (req, res) => {
    try {
      // Allow creating administrative projects without client selection by assigning a default client
      let incoming = { ...req.body } as any;
      if (incoming?.type === "administrativo") {
        try {
          const clients = await storage.getClients();
          let adminClient = clients.find(c => (c.name || "").toLowerCase() === "administrativo");
          if (!adminClient) {
            adminClient = await storage.createClient({
              name: "Administrativo",
              contact: "Interno",
              phone: "0000000000",
              email: null,
              address: null,
              cnpjCpf: null,
            });
          }
          incoming.clientId = incoming.clientId || adminClient.id;
          // Normalize type to a known enum value if DB uses enums
          const existingProjects = await storage.getProjects();
          const fallbackType = existingProjects[0]?.type || "vidro";
          incoming.type = fallbackType;
          // Mark description to identify administrative folder
          incoming.description = `Pasta Administrativa${incoming.description ? ` - ${incoming.description}` : ''}`;
          // Default value for administrative folders
          if (!incoming.value) {
            incoming.value = "0.00";
          }
        } catch (e) {
          console.error("Failed to ensure administrative client", e);
          // Fall back to error if we cannot ensure client for administrative project
        }
      }

      const validatedData = insertProjectSchema.parse(incoming);
      const project = await storage.createProject(validatedData);

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

      // Sync bills automatically after project update
      await syncProjectBills(project);

      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
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
      const project = await storage.getProject(transaction.projectId);
      if (project) {
        await syncProjectBills(project);
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
      const project = await storage.getProject(transaction.projectId);
      if (project) {
        await syncProjectBills(project);
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
      if (transactionToDelete) {
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
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }
      const files = await storage.getTransactionFiles(projectId as string);
      res.json(files);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Failed to fetch transaction files", details: message });
    }
  });

  app.post("/api/transactions/files", async (req, res) => {
    try {
      const { transactionId, fileName, fileType, fileSize, objectPath } = req.body;

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
      const [projects, clients, transactions] = await Promise.all([
        storage.getProjects(),
        storage.getClients(),
        storage.getTransactions(),
      ]);

      const activeProjects = projects.filter(p =>
        p.status === 'aprovado' || p.status === 'execucao'
      ).length;

      const totalClients = clients.length;

      const receitas = transactions
        .filter(t => t.type === 'receita')
        .reduce((sum, t) => sum + parseFloat(t.value), 0);

      const despesas = transactions
        .filter(t => t.type === 'despesa')
        .reduce((sum, t) => sum + parseFloat(t.value), 0);

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

  app.patch("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.updateQuote(req.params.id, req.body);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
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
      const validatedData = insertQuoteItemSchema.parse(req.body);
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
        if (!wasPaid && isPaidNow && bill.type === "receber" && bill.projectId) {
          const paymentDate = new Date().toISOString().split('T')[0];
          const tx = await storage.createTransaction({
            projectId: bill.projectId,
            type: "receita",
            description: `Recebimento: ${bill.description}`,
            value: String(bill.value),
            date: paymentDate,
          });
          const project = await storage.getProject(tx.projectId);
          if (project) {
            await syncProjectBills(project);
          }
        } else if (!wasPaid && isPaidNow && bill.type === "pagar" && bill.projectId) {
          const paymentDate = new Date().toISOString().split('T')[0];
          await storage.createTransaction({
            projectId: bill.projectId,
            type: "despesa",
            description: `Despesa: ${bill.description}`,
            value: String(bill.value),
            date: paymentDate,
          });
          const project = await storage.getProject(bill.projectId);
          if (project) {
            await syncProjectBills(project);
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
      const project = await storage.getProject(tx.projectId);
      if (project) {
        await syncProjectBills(project);
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

  const httpServer = createServer(app);

  return httpServer;
}
