import { createContext, useContext, useState, ReactNode } from "react";
import { startOfMonth, endOfMonth } from "date-fns";

export interface EquipesFiltros {
  dataInicio: Date;
  dataFim: Date;
  equipeId?: string;
  vendedorId?: string;
  criterio: "valor" | "unidades" | "margem" | "conversao";
}

interface EquipesFiltrosContextType {
  filtros: EquipesFiltros;
  setDataInicio: (data: Date) => void;
  setDataFim: (data: Date) => void;
  setEquipeId: (id?: string) => void;
  setVendedorId: (id?: string) => void;
  setCriterio: (criterio: EquipesFiltros["criterio"]) => void;
  resetFiltros: () => void;
}

const EquipesFiltrosContext = createContext<EquipesFiltrosContextType | undefined>(undefined);

const getFiltrosIniciais = (): EquipesFiltros => ({
  dataInicio: startOfMonth(new Date()),
  dataFim: endOfMonth(new Date()),
  criterio: "valor",
});

export function EquipesFiltrosProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltros] = useState<EquipesFiltros>(getFiltrosIniciais);

  const setDataInicio = (data: Date) => {
    setFiltros((prev) => ({ ...prev, dataInicio: data }));
  };

  const setDataFim = (data: Date) => {
    setFiltros((prev) => ({ ...prev, dataFim: data }));
  };

  const setEquipeId = (id?: string) => {
    setFiltros((prev) => ({ ...prev, equipeId: id, vendedorId: undefined }));
  };

  const setVendedorId = (id?: string) => {
    setFiltros((prev) => ({ ...prev, vendedorId: id }));
  };

  const setCriterio = (criterio: EquipesFiltros["criterio"]) => {
    setFiltros((prev) => ({ ...prev, criterio }));
  };

  const resetFiltros = () => {
    setFiltros(getFiltrosIniciais());
  };

  return (
    <EquipesFiltrosContext.Provider
      value={{
        filtros,
        setDataInicio,
        setDataFim,
        setEquipeId,
        setVendedorId,
        setCriterio,
        resetFiltros,
      }}
    >
      {children}
    </EquipesFiltrosContext.Provider>
  );
}

export function useEquipesFiltros() {
  const context = useContext(EquipesFiltrosContext);
  if (!context) {
    throw new Error("useEquipesFiltros deve ser usado dentro de EquipesFiltrosProvider");
  }
  return context;
}
