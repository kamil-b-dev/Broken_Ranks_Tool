import { createContext, useContext } from "react";

export const ProfessionContext = createContext(null);
export const useProfession = () => useContext(ProfessionContext);
