import { createContext, useContext } from "react";
import { createOptimizerLabels } from "./optimizerLabels";

export const OptimizerLabelContext = createContext(createOptimizerLabels());
export const useOptimizerLabelContext = () => useContext(OptimizerLabelContext);
