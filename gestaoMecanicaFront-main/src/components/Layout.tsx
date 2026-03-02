// src/components/Layout.tsx

import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';

// Define os tipos das propriedades (props) que o componente vai receber
interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    // O flex principal para organizar Sidebar e Conteúdo
    <div className="flex min-h-screen">
      <Sidebar /> {/* <-- Adicione o Sidebar aqui */}
      
      {/* O resto do layout (cabeçalho, conteúdo principal, rodapé) */}
      <div className="flex flex-col flex-grow">
        <header className="bg-blue-600 text-white p-4 shadow-md">
          <h1 className="text-xl font-bold">Sistema de Gestão de Mecânica</h1>
        </header>
        <main className="flex-grow p-6">
          {children}
        </main>
        <footer className="bg-gray-800 text-white p-4 text-center text-sm">
          <p>&copy; 2025 Sistema de Gestão de Mecânica. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default Layout;