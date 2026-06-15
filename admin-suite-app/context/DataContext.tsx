import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
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
    if (user) {
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
