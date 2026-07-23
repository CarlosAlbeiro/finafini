import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { NewDebtModal } from './components/NewDebtModal';
import { PaymentModal } from './components/PaymentModal';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { DebtsList } from './pages/DebtsList';
import { DebtDetail } from './pages/DebtDetail';
import { SharedLoans } from './pages/SharedLoans';
import { WhatsAppBot } from './pages/WhatsAppBot';
import { Profile } from './pages/Profile';
import { Expenses } from './pages/Expenses';
import type { CurrencyCode } from './utils/currency';

const ProtectedLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [isNewDebtOpen, setIsNewDebtOpen] = useState(false);
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    debtId: string;
    currency: CurrencyCode;
    amount?: number;
    instId?: string;
  }>({
    isOpen: false,
    debtId: '',
    currency: 'COP'
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOpenPayment = (debtId: string, currency: CurrencyCode, amount?: number, instId?: string) => {
    setPaymentModalState({
      isOpen: true,
      debtId,
      currency,
      amount,
      instId
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-sky-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar onOpenNewDebt={() => setIsNewDebtOpen(true)} />

      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Routes key={refreshTrigger}>
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  onOpenNewDebt={() => setIsNewDebtOpen(true)}
                  onOpenPaymentModal={handleOpenPayment}
                />
              }
            />
            <Route
              path="/debts"
              element={
                <DebtsList
                  onOpenNewDebt={() => setIsNewDebtOpen(true)}
                  onOpenPaymentModal={handleOpenPayment}
                />
              }
            />
            <Route
              path="/debts/:id"
              element={<DebtDetail onOpenPaymentModal={handleOpenPayment} />}
            />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/shared" element={<SharedLoans />} />
            <Route path="/whatsapp" element={<WhatsAppBot />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      <NewDebtModal
        isOpen={isNewDebtOpen}
        onClose={() => setIsNewDebtOpen(false)}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <PaymentModal
        isOpen={paymentModalState.isOpen}
        debtId={paymentModalState.debtId}
        currency={paymentModalState.currency}
        suggestedAmount={paymentModalState.amount}
        installmentId={paymentModalState.instId}
        onClose={() => setPaymentModalState((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
