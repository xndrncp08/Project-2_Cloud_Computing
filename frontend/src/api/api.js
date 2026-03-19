const USE_MOCK_DATA = true; 
const API_BASE_URL = "PASTE_PERSON_A_AZURE_FUNCTION_URL_HERE";

const mockData = [
  { "Diet_type": "Vegan", "Protein(g)": 18, "Carbs(g)": 52, "Fat(g)": 12 },
  { "Diet_type": "Vegan", "Protein(g)": 22, "Carbs(g)": 48, "Fat(g)": 10 },
  { "Diet_type": "Keto", "Protein(g)": 30, "Carbs(g)": 10, "Fat(g)": 40 },
  { "Diet_type": "Keto", "Protein(g)": 28, "Carbs(g)": 8, "Fat(g)": 38 },
  { "Diet_type": "Mediterranean", "Protein(g)": 24, "Carbs(g)": 35, "Fat(g)": 20 },
  { "Diet_type": "Mediterranean", "Protein(g)": 20, "Carbs(g)": 38, "Fat(g)": 18 },
  { "Diet_type": "High Protein", "Protein(g)": 35, "Carbs(g)": 25, "Fat(g)": 15 },
  { "Diet_type": "Balanced", "Protein(g)": 25, "Carbs(g)": 40, "Fat(g)": 20 }
];

export async function getNutritionData() {
  // use mock data
  if (USE_MOCK_DATA) {
    return Promise.resolve(mockData);
  }

  // real api call
  const response = await fetch(API_BASE_URL);

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Unexpected API response format. Expected an array.");
  }

  return data;
}