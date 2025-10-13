import { CartaoObras } from '../cartao-obras';

export default function CartaoObrasExample() {
  const mockTransactions = [
    { id: "1", type: "receita" as const, description: "Pagamento inicial - 50%", value: 15000, date: "10/10/2025" },
    { id: "2", type: "despesa" as const, description: "Compra de vidros temperados", value: 8000, date: "12/10/2025" },
    { id: "3", type: "despesa" as const, description: "Mão de obra - instalação", value: 3500, date: "15/10/2025" },
    { id: "4", type: "receita" as const, description: "Pagamento final - 50%", value: 15000, date: "20/10/2025" },
  ];

  return <CartaoObras projectName="Fachada Comercial - Edifício Central" transactions={mockTransactions} />;
}
