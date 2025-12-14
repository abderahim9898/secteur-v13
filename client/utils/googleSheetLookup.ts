// Google Sheets lookup for worker information
// Fetches worker data from Google Sheet via Google Apps Script

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwWdJe14BQLOrmwbwerjU6HyGQh-G13nKS1g1JHBk6VY8-4BdE7VzkthtR1fBvD5M3s-g/exec';

export interface GoogleSheetWorker {
  matricule: string;
  nom_complet: string;
  cin: string;
  date_entree: string; // Format: dd/MM/yyyy
}

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
    
    // Call the Google Script with the search parameter
    const response = await fetch(
      `${GOOGLE_SCRIPT_URL}?search=${encodeURIComponent(searchValue.trim())}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ Google Script returned status ${response.status}`);
      return null;
    }

    const data = await response.json();

    // The response should contain matching rows
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('No workers found in Google Sheet');
      return null;
    }

    // The Google Script returns an array of rows
    // We expect the first match to be the correct one
    // Columns: 0=matricule, 2=nom_complet, 3=cin, 13=date_entree
    const row = data[0];
    
    if (!Array.isArray(row) || row.length < 14) {
      console.error('Invalid row format from Google Script');
      return null;
    }

    const worker: GoogleSheetWorker = {
      matricule: String(row[0] || ''),
      nom_complet: String(row[2] || ''),
      cin: String(row[3] || ''),
      date_entree: String(row[13] || ''), // Already formatted as dd/MM/yyyy by Google Script
    };

    // Validate the worker data
    if (!worker.matricule && !worker.cin) {
      console.error('Worker data missing matricule and CIN');
      return null;
    }

    console.log('✅ Worker found:', worker);
    return worker;
  } catch (error) {
    console.error('❌ Error searching Google Sheet:', error);
    return null;
  }
};

/**
 * Convert dd/MM/yyyy format to ISO date string
 * @param dateStr - Date string in dd/MM/yyyy format
 * @returns ISO date string (YYYY-MM-DD)
 */
export const parseFrenchDate = (dateStr: string): string | null => {
  if (!dateStr) return null;

  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;
  const date = new Date(`${year}-${month}-${day}`);

  if (isNaN(date.getTime())) {
    return null;
  }

  // Return as YYYY-MM-DD format
  return date.toISOString().split('T')[0];
};
