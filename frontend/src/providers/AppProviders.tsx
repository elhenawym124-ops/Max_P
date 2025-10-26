import React, { ReactNode } from 'react';
import { AuthProvider } from '../hooks/useAuthSimple';
import { CompanyProvider } from '../contexts/CompanyContext';

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <CompanyProvider>
        {children}
      </CompanyProvider>
    </AuthProvider>
  );
};

export default AppProviders;
