import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertProjectSchema, insertTransactionSchema, insertQuoteSchema, insertQuoteItemSchema, insertProjectFileSchema, insertBillSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import type { Project } from "@shared/schema";

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
      res.status(400).json({ error: "Failed to update client" });
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
      const validatedData = insertProjectSchema.parse(req.body);
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
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/projects/:projectId/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByProject(req.params.projectId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      
      // Sync bills when transaction changes project payment
      const project = await storage.getProject(transaction.projectId);
      if (project) {
        await syncProjectBills(project);
      }
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Transaction creation error:", error);
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.updateTransaction(req.params.id, req.body);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      // Sync bills when transaction changes
      const project = await storage.getProject(transaction.projectId);
      if (project) {
        await syncProjectBills(project);
      }
      
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Failed to update transaction" });
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
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
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
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
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
      const bill = await storage.updateBill(req.params.id, req.body);
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
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

  const httpServer = createServer(app);

  return httpServer;
}
