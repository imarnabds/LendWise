import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Borrower {
  id: string;
  name: string;
  amount: number;
  interest: string;
  startDate: string;
  emi: number;
  dueDate: string;
  status: string;
  monthlyInterest: number;
}

interface LoanContextType {
  borrowers: Borrower[];
  setBorrowers: (borrowers: Borrower[]) => void;
}

const LoanContext = createContext<LoanContextType | undefined>(undefined);

export const LoanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  return (
    <LoanContext.Provider value={{ borrowers, setBorrowers }}>
      {children}
    </LoanContext.Provider>
  );
};

export const useLoans = () => {
  const context = useContext(LoanContext);
  if (!context) throw new Error('useLoans must be used within a LoanProvider');
  return context;
};
