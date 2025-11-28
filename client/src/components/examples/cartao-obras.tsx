import { CartaoObras } from '../cartao-obras';
import type { Transaction } from '@shared/schema';

export default function CartaoObrasExample() {
  const mockTransactions: Transaction[] = [
    { 
      id: "1", 
      type: "receita", 
      description: "Pagamento inicial - 50%", 
      value: "15000", 
      date: "2025-10-10",
      projectId: "projeto-1",
      receiptPath: null,
      createdAt: new Date("2025-10-10")
    },
    { 
      id: "2", 
      type: "despesa", 
      description: "Compra de vidros temperados", 
      value: "8000", 
      date: "2025-10-12",
      projectId: "projeto-1", 
      receiptPath: null,
      createdAt: new Date("2025-10-12")
    },
    { 
      id: "3", 
      type: "despesa", 
      description: "Mão de obra - instalação", 
      value: "3500", 
      date: "2025-10-15",
      projectId: "projeto-1",
      receiptPath: null,
      createdAt: new Date("2025-10-15")
    },
    { 
      id: "4", 
      type: "receita", 
      description: "Pagamento final - 50%", 
      value: "15000", 
      date: "2025-10-20",
      projectId: "projeto-1",
      receiptPath: null,
      createdAt: new Date("2025-10-20")
    },
  ];

  return <CartaoObras projectId="projeto-1" projectName="Fachada Comercial - Edifício Central" transactions={mockTransactions} />;
}
