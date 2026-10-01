import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from './AuthContext';
import { useWorkspaceSocket, WorkspaceSyncEvent } from '@/hooks/useWorkspaceSocket';

interface Metrics {
  employees: number;
  activeProjects: number;
  clients: number;
  netProfit: number;
  totalIncome: number;
  totalExpense: number;
}

interface ClientMetrics {
  active: number;
  pending: number;
  completed: number;
  total: number;
}

interface PayrollMetrics {
  paid: number;
  unpaid: number;
  staffPaid: number;
  total: number;
  payrollMonths: { month: string; paid: boolean }[];
}

interface DebtsGrouped {
  weOwe: any[];
  owedToUs: any[];
}

interface DataContextType {
  employees: any[];
  clients: any[];
  projects: any[];
  transactions: any[];
  notifications: any[];
  budgetCategories: any[];
  savings: any[];
  debts: DebtsGrouped;
  payrollMonths: { month: string; paid: boolean }[];
  metrics: Metrics;
  clientMetrics: ClientMetrics;
  payrollMetrics: PayrollMetrics;
  loading: boolean;
  fetchError: string | null;
  subscriptionLimits: any | null;
  refresh: () => Promise<void>;
  togglePayrollMonth: (month: string, currentPaid: boolean) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

const initialMetrics: Metrics = {
  employees: 0,
  activeProjects: 0,
  clients: 0,
  netProfit: 0,
  totalIncome: 0,
  totalExpense: 0,
};

const initialClientMetrics: ClientMetrics = {
  active: 0,
  pending: 0,
  completed: 0,
  total: 0,
};

const initialPayrollMetrics: PayrollMetrics = {
  paid: 0,
  unpaid: 0,
  staffPaid: 0,
  total: 0,
  payrollMonths: [],
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<any[]>([]);
  const [savings, setSavings] = useState<any[]>([]);
  const [debts, setDebts] = useState<DebtsGrouped>({ weOwe: [], owedToUs: [] });
  const [payrollMonths, setPayrollMonths] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics>(initialClientMetrics);
  const [payrollMetrics, setPayrollMetrics] = useState<PayrollMetrics>(initialPayrollMetrics);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [subscriptionLimits, setSubscriptionLimits] = useState<any | null>(null);

  const fetchAll = useCallback(async (background = false) => {
    try {
      if (!background) setLoading(true);
      const [
        empRes, clientRes, projRes, txRes, notifRes, budgetRes,
        savingsRes, metricsRes, clientMetRes, payrollRes, debtsRes,
      ] = await Promise.all([
        apiService.getEmployees(),
        apiService.getClients(),
        apiService.getProjects(),
        apiService.getTransactions(),
        apiService.getNotifications(),
        apiService.getBudgets(),
        apiService.getSavings(),
        apiService.getMetrics(),
        apiService.getClientMetrics(),
        apiService.getPayrollMetrics(),
        apiService.getDebtsGrouped(),
      ]);

      setEmployees(empRes.data);
      setClients(clientRes.data);
      setProjects(projRes.data);
      setTransactions(txRes.data);
      setNotifications(notifRes.data);
      setBudgetCategories(budgetRes.data);
      setSavings(savingsRes.data);
      setMetrics(metricsRes.data);
      setClientMetrics(clientMetRes.data);
      setPayrollMetrics(payrollRes.data);
      setPayrollMonths(payrollRes.data.payrollMonths ?? []);
      setDebts(debtsRes.data);

      let subLimits = null;
      try {
        const subRes = await apiService.getSubscriptionLimits();
        subLimits = subRes.data;
      } catch (subErr) {
        console.warn("Failed to fetch subscription limits for this user:", subErr);
      }
      setSubscriptionLimits(subLimits);

      setFetchError(null);
    } catch (err) {
      console.warn('Data fetch failed (Network/Server error):', err);
      if (!background) {
        setFetchError('Unable to connect to the server. Please check your internet connection or try again later.');
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let intervalId: any;
    if (user && user.profile_complete) {
      fetchAll();
      // Setup real-time polling every 15 seconds in the background
      intervalId = setInterval(() => {
        fetchAll(true);
      }, 15000);
    } else {
      setEmployees([]);
      setClients([]);
      setProjects([]);
      setTransactions([]);
      setNotifications([]);
      setBudgetCategories([]);
      setSavings([]);
      setDebts({ weOwe: [], owedToUs: [] });
      setPayrollMonths([]);
      setMetrics(initialMetrics);
      setClientMetrics(initialClientMetrics);
      setPayrollMetrics(initialPayrollMetrics);
      setSubscriptionLimits(null);
      setFetchError(null);
      setLoading(false);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, fetchAll]);

  const handleSyncEvent = useCallback((event: WorkspaceSyncEvent) => {
    switch (event.event) {
      case "employee.created":
        if (event.data) {
          setEmployees(prev => {
            if (prev.some(e => String(e.id) === String(event.data.id))) return prev;
            return [event.data, ...prev];
          });
          setMetrics(prev => ({ ...prev, employees: prev.employees + 1 }));
        }
        break;
      case "employee.updated":
        if (event.data) {
          setEmployees(prev =>
            prev.map(e => (String(e.id) === String(event.data.id) ? { ...e, ...event.data } : e))
          );
          // Live sync to logged-in user profile if this employee matches
          if (
            user &&
            (String(user.employee_id) === String(event.data.id) ||
              String(user.id) === String(event.data.linked_user) ||
              (user.email && event.data.email && user.email.toLowerCase() === event.data.email.toLowerCase()))
          ) {
            setUser({
              ...user,
              name: event.data.name || user.name,
              role: event.data.role || user.role,
              avatar: event.data.avatar !== undefined ? event.data.avatar : user.avatar,
              phone: event.data.phone !== undefined ? event.data.phone : user.phone,
              location: event.data.location !== undefined ? event.data.location : user.location,
              bio: event.data.bio !== undefined ? event.data.bio : user.bio,
            });
          }
        }
        break;
      case "user.updated":
        if (event.data && user && String(user.id) === String(event.data.id)) {
          setUser({ ...user, ...event.data });
        }
        break;
      case "notification.created":
        if (event.data) {
          setNotifications(prev => {
            if (prev.some(n => String(n.id) === String(event.data.id))) return prev;
            return [event.data, ...prev];
          });
        }
        break;
      case "employee.deleted":
        if (event.data?.id) {
          setEmployees(prev => prev.filter(e => String(e.id) !== String(event.data.id)));
          setMetrics(prev => ({ ...prev, employees: Math.max(0, prev.employees - 1) }));
        }
        break;
      case "financial_pulse.updated":
        if (event.data) {
          setMetrics(prev => ({
            ...prev,
            netProfit: event.data.netProfit !== undefined ? event.data.netProfit : prev.netProfit,
            totalIncome: event.data.totalIncome !== undefined ? event.data.totalIncome : prev.totalIncome,
            totalExpense: event.data.totalExpense !== undefined ? event.data.totalExpense : prev.totalExpense,
          }));
          if (event.data.totalPayroll !== undefined) {
            setPayrollMetrics(prev => ({
              ...prev,
              total: event.data.totalPayroll,
              staffPaid: event.data.staffPaid !== undefined ? event.data.staffPaid : prev.staffPaid,
            }));
          }
        }
        break;
      case "transaction.created":
        if (event.data) {
          setTransactions(prev => [event.data, ...prev.filter(t => t.id !== event.data.id)]);
        }
        break;
      case "client.created":
        if (event.data) {
          setClients(prev => [event.data, ...prev.filter(c => c.id !== event.data.id)]);
          setMetrics(prev => ({ ...prev, clients: prev.clients + 1 }));
        }
        break;
      case "client.updated":
        if (event.data) {
          setClients(prev =>
            prev.map(c => (String(c.id) === String(event.data.id) ? { ...c, ...event.data } : c))
          );
        }
        break;
      case "client.deleted":
        if (event.data?.id) {
          setClients(prev => prev.filter(c => String(c.id) !== String(event.data.id)));
          setMetrics(prev => ({ ...prev, clients: Math.max(0, prev.clients - 1) }));
        }
        break;
      default:
        break;
    }
  }, []);

  useWorkspaceSocket(handleSyncEvent);

  const togglePayrollMonth = useCallback(async (month: string, currentPaid: boolean) => {
    const newPaid = !currentPaid;
    
    setPayrollMonths(prev => prev.map(m => m.month === month ? { ...m, paid: newPaid } : m));
    setPayrollMetrics(prev => {
      const paidChange = newPaid ? 1 : -1;
      return {
        ...prev,
        paid: Math.max(0, prev.paid + paidChange),
        unpaid: Math.max(0, prev.unpaid - paidChange),
      };
    });

    try {
      await apiService.togglePayrollMonth({ month, paid: newPaid });
    } catch (err) {
      console.error("Failed to toggle payroll status:", err);
      fetchAll(true);
    }
  }, [fetchAll]);

  return (
    <DataContext.Provider
      value={{
        employees,
        clients,
        projects,
        transactions,
        notifications,
        budgetCategories,
        savings,
        debts,
        payrollMonths,
        metrics,
        clientMetrics,
        payrollMetrics,
        loading,
        fetchError,
        subscriptionLimits,
        refresh: fetchAll,
        togglePayrollMonth,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
