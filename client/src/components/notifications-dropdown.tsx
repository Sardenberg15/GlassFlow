import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, AlertCircle, Clock, CheckCircle2, DollarSign } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Bill, Project } from "@shared/schema";

export function NotificationsDropdown() {
  const [, setLocation] = useLocation();

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(now.getDate() + 3);
  const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

  const billsAPagar = bills.filter(b => b.type === "pagar" && b.status !== "pago");

  const overdueBills = billsAPagar.filter(bill => {
    return bill.dueDate < todayStr;
  });

  const todayBills = billsAPagar.filter(bill => {
    return bill.dueDate === todayStr;
  });

  const upcomingBills = billsAPagar.filter(bill => {
    return bill.dueDate > todayStr && bill.dueDate <= threeDaysLaterStr;
  });

  const notifications = {
    overdue: overdueBills,
    today: todayBills,
    upcoming: upcomingBills,
    total: overdueBills.length + todayBills.length + upcomingBills.length,
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue);
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}`;
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "Sem projeto";
    const project = projects.find(p => p.id === projectId);
    return project?.name || "Projeto desconhecido";
  };

  const handleNotificationClick = () => {
    setLocation("/financeiro");
    // O dropdown fechará automaticamente
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {notifications.total > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              data-testid="badge-notification-count"
            >
              {notifications.total}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {notifications.total > 0 && (
            <Badge variant="secondary" className="text-xs">
              {notifications.total} {notifications.total === 1 ? 'nova' : 'novas'}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.total === 0 ? (
          <div className="p-8 text-center" data-testid="empty-notifications">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-600 dark:text-green-500" />
            <p className="text-sm font-medium">Tudo em dia!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Não há contas pendentes
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-1">
              {/* Contas Vencidas */}
              {notifications.overdue.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Vencidas ({notifications.overdue.length})
                  </div>
                  {notifications.overdue.map((bill) => (
                    <DropdownMenuItem
                      key={bill.id}
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                      onClick={handleNotificationClick}
                      data-testid={`notification-overdue-${bill.id}`}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{bill.description}</p>
                            <p className="text-xs text-muted-foreground truncate">{getProjectName(bill.projectId)}</p>
                          </div>
                        </div>
                        <Badge variant="destructive" className="flex-shrink-0 text-xs font-mono">
                          {formatCurrency(bill.value)}
                        </Badge>
                      </div>
                      <div className="text-xs text-destructive flex items-center gap-1 ml-6">
                        <Clock className="h-3 w-3" />
                        Venceu em {formatDate(bill.dueDate)}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {(notifications.today.length > 0 || notifications.upcoming.length > 0) && (
                    <DropdownMenuSeparator className="my-2" />
                  )}
                </>
              )}

              {/* Contas Vencendo Hoje */}
              {notifications.today.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Vence Hoje ({notifications.today.length})
                  </div>
                  {notifications.today.map((bill) => (
                    <DropdownMenuItem
                      key={bill.id}
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                      onClick={handleNotificationClick}
                      data-testid={`notification-today-${bill.id}`}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Clock className="h-4 w-4 text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{bill.description}</p>
                            <p className="text-xs text-muted-foreground truncate">{getProjectName(bill.projectId)}</p>
                          </div>
                        </div>
                        <Badge className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 flex-shrink-0 text-xs font-mono">
                          {formatCurrency(bill.value)}
                        </Badge>
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-500 ml-6">
                        Vence hoje
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {notifications.upcoming.length > 0 && (
                    <DropdownMenuSeparator className="my-2" />
                  )}
                </>
              )}

              {/* Contas Próximas do Vencimento */}
              {notifications.upcoming.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Próximas ({notifications.upcoming.length})
                  </div>
                  {notifications.upcoming.map((bill) => (
                    <DropdownMenuItem
                      key={bill.id}
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                      onClick={handleNotificationClick}
                      data-testid={`notification-upcoming-${bill.id}`}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{bill.description}</p>
                            <p className="text-xs text-muted-foreground truncate">{getProjectName(bill.projectId)}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0 text-xs font-mono">
                          {formatCurrency(bill.value)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground ml-6">
                        Vence em {formatDate(bill.dueDate)}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        )}

        {notifications.total > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center font-medium text-primary cursor-pointer"
              onClick={handleNotificationClick}
              data-testid="button-view-all-bills"
            >
              Ver todas as contas
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
