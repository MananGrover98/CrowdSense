/**
 * @typedef {{
 *   id: string;
 *   officeId: string;
 *   college: string;
 *   major: string;
 *   crowdLevel: 'quiet'|'moderate'|'busy'|'very_busy';
 *   waitMinutes: number;
 *   comment: string;
 *   reason: string;
 *   createdAt: number;
 * }} Report
 */

import * as fileStore from './store-file.js';
import * as supabaseStore from './store-supabase.js';

function useSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** @returns {Promise<Report[]>} */
export function readReports() {
  return useSupabase() ? supabaseStore.readReports() : fileStore.readReports();
}

/** @param {Omit<Report, 'id'|'createdAt'> & { id?: string; createdAt?: number }} input */
export function addReport(input) {
  return useSupabase() ? supabaseStore.addReport(input) : fileStore.addReport(input);
}

export function storageMode() {
  return useSupabase() ? 'supabase' : 'file';
}
