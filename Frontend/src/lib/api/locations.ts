import apiClient from './client';

export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface State {
  id: number;
  countryId: number;
  name: string;
  code: string;
}

export interface City {
  id: number;
  stateId: number;
  name: string;
}

export interface Pincode {
  id: number;
  cityId: number;
  code: string;
}

export async function getCountries(): Promise<Country[]> {
  const response = await apiClient.get('/locations/countries');
  return response.data?.data || [];
}

export async function getStates(countryId: number): Promise<State[]> {
  const response = await apiClient.get(`/locations/states/${countryId}`);
  return response.data?.data || [];
}

export async function getCities(stateId: number): Promise<City[]> {
  const response = await apiClient.get(`/locations/cities/${stateId}`);
  return response.data?.data || [];
}

export async function getPincodes(cityId: number): Promise<Pincode[]> {
  const response = await apiClient.get(`/locations/pincodes/${cityId}`);
  return response.data?.data || [];
}

export async function createPincode(cityId: number, code: string): Promise<Pincode | null> {
  const response = await apiClient.post('/locations/pincodes', { cityId, code });
  return response.data?.data ?? null;
}
