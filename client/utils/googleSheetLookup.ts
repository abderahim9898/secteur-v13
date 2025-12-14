// Google Sheets lookup for worker information
// Fetches worker data from Google Sheet via Google Apps Script

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby9HLiqYrDEV8yKeNji3UIFsm3DeeKgiAgBVygCOP7Vl2YG8VFeDUXQepfgcgYau8tHSg/exec';

export interface GoogleSheetWorker {
  matricule: string;
  nom_complet: string;
  cin: string;
  sexe: string; // 'homme' or 'femme' (converted from H/M)
  date_entree: string; // Format: YYYY-MM-DD
}

/**
 * Convert gender code to French text
 * @param code - 'H' for Homme, 'M' for Femme
 * @returns 'homme' or 'femme'
 */
const convertGenderCode = (code: string): string => {
  const upperCode = String(code || '').toUpperCase().trim();
  if (upperCode === 'H') return 'homme';
  if (upperCode === 'M') return 'femme';
  return '';
};

/**
 * Search for worker in Google Sheet by matricule or CIN
 * @param searchValue - The matricule or CIN to search for
 * @returns Worker data if found, null otherwise
 */
export const searchWorkerInGoogleSheet = async (
  searchValue: string
): Promise<GoogleSheetWorker | null> => {
  if (!searchValue || searchValue.trim().length === 0) {
    return null;
  }

  try {
    console.log(`🔍 Searching Google Sheet for: ${searchValue}`);
    console.log(`📡 Using Google Script URL: ${GOOGLE_SCRIPT_URL}`);

    // Call the Google Script with the search parameter
    // Using mode: 'no-cors' can help with CORS issues, but we won't be able to read the response
    // So we'll try with normal CORS first
    const url = `${GOOGLE_SCRIPT_URL}?search=${encodeURIComponent(searchValue.trim())}`;
    console.log(`🌐 Fetching from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`❌ Google Script returned status ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    console.log(`📝 Response content-type: ${contentType}`);

    const text = await response.text();
    console.log(`📄 Response text length: ${text.length} characters`);
    console.log(`📄 Response preview: ${text.substring(0, 200)}`);

    if (!text) {
      console.error('Empty response from Google Script');
      return null;
    }

    const data = JSON.parse(text);
    console.log(`✅ Parsed JSON response, array length: ${Array.isArray(data) ? data.length : 'not an array'}`);

    // The response should contain matching rows
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('⚠️ No workers found in Google Sheet');
      return null;
    }

    // The Google Script returns an array of rows
    // We expect the first match to be the correct one
    // Columns: 0=matricule, 2=nom_complet, 3=cin, 13=date_entree
    const row = data[0];

    if (!Array.isArray(row) || row.length < 14) {
      console.error('❌ Invalid row format from Google Script');
      console.error(`Row type: ${typeof row}, length: ${Array.isArray(row) ? row.length : 'N/A'}`);
      return null;
    }

    const worker: GoogleSheetWorker = {
      matricule: String(row[0] || ''),
      nom_complet: String(row[2] || ''),
      cin: String(row[3] || ''),
      sexe: convertGenderCode(row[4] || ''), // Column E: H=homme, M=femme
      date_entree: String(row[13] || ''), // ISO date format
    };

    // Validate the worker data
    if (!worker.matricule && !worker.cin) {
      console.error('❌ Worker data missing matricule and CIN');
      return null;
    }

    console.log('✅ Worker found:', {
      matricule: worker.matricule,
      nom_complet: worker.nom_complet,
      cin: worker.cin,
      sexe: worker.sexe,
      date_entree: worker.date_entree
    });
    return worker;
  } catch (error) {
    console.error('❌ Error searching Google Sheet:', error);
    if (error instanceof TypeError) {
      console.error('This is a CORS or network error. Possible causes:');
      console.error('1. Google Script URL is wrong or not deployed');
      console.error('2. CORS is blocked by browser');
      console.error('3. Network connectivity issue');
      console.error(`Current URL: ${GOOGLE_SCRIPT_URL}`);
    }
    return null;
  }
};

/**
 * Convert date to ISO format (YYYY-MM-DD) in Morocco timezone (GMT+1)
 * Handles ISO dates with timezone info - converts to Morocco local date
 * @param dateStr - Date string in ISO or dd/MM/yyyy format
 * @returns ISO date string (YYYY-MM-DD) in Morocco timezone
 */
export const parseFrenchDate = (dateStr: string): string | null => {
  if (!dateStr) return null;

  // Trim whitespace
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;

  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle ISO format with timezone (e.g., 2025-11-30T23:00:00.000Z)
  // Morocco is UTC+1, so we need to add 1 hour to get the local date
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    try {
      // Parse as UTC date
      const date = new Date(trimmed);

      // Create a formatter for Morocco timezone (UTC+1)
      // We manually add 1 hour to convert from UTC to Morocco time
      const moroccoDayMs = date.getTime() + (1 * 60 * 60 * 1000); // Add 1 hour for GMT+1
      const moroccoDate = new Date(moroccoDayMs);

      // Format as YYYY-MM-DD
      const year = moroccoDate.getUTCFullYear();
      const month = String(moroccoDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(moroccoDate.getUTCDate()).padStart(2, '0');

      const result = `${year}-${month}-${day}`;
      console.log(`⏰ Timezone conversion: ${trimmed} (UTC) → ${result} (Morocco GMT+1)`);
      return result;
    } catch (error) {
      console.error('Error parsing ISO date:', error);
      return null;
    }
  }

  // Try dd/MM/yyyy format
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;

    // Validate and parse
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900) {
      // Pad with zeros if needed
      const paddedMonth = String(monthNum).padStart(2, '0');
      const paddedDay = String(dayNum).padStart(2, '0');
      return `${yearNum}-${paddedMonth}-${paddedDay}`;
    }
  }

  console.warn(`Could not parse date: ${trimmed}`);
  return null;
};
