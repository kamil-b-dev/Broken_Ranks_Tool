import apiClient from "./axiosConfig";

/** Loads the complete data set required to initialize the equipment tool. */
export const fetchInitialEquipmentData = async () => {
    const response = await apiClient.get("/initial-data");
    return response.data;
};

/** Calculates final statistics for the current equipment request. */
export const calculateEquipmentStats = async (requestData) => {
    const response = await apiClient.post("/calculator/calculate", requestData);
    return response.data;
};

/** Requests an optimized drif setup from the backend. */
export const optimizeEquipmentDrifs = async (optimizationRequest) => {
    const response = await apiClient.post("/optimizer/drifs", optimizationRequest);
    return response.data;
};
