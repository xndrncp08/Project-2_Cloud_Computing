const USE_MOCK_DATA = false; 
const FUNCTION_URL = "https://diet-analysis-func-xy.azurewebsites.net/api/analysediet?code=klko7ONHz2sKYZmUSGtw91WCVld-SQAuydcVoGgP0J1QAzFuPjVVow==";

const mockData = {
  status: "success",
  executionTime: "2026-03-19 07:29:24",
  summary: {
    totalRecipes: 7806,
    dietTypes: ["dash", "keto", "mediterranean", "paleo", "vegan"],
    highestProteinDiet: "keto",
  },
  chartData: {
    avgProtein: {
      labels: ["dash", "keto", "mediterranean", "paleo", "vegan"],
      values: [69.28, 101.27, 101.11, 88.67, 56.16],
    },
    avgCarbs: {
      labels: ["dash", "keto", "mediterranean", "paleo", "vegan"],
      values: [160.54, 57.97, 152.91, 129.55, 254.0],
    },
    avgFat: {
      labels: ["dash", "keto", "mediterranean", "paleo", "vegan"],
      values: [101.15, 153.12, 101.42, 135.67, 103.3],
    },
  },
};

export async function getNutritionData() {
  const response = await fetch(FUNCTION_URL);

  console.log("HTTP status:", response.status);
  console.log("Content-Type:", response.headers.get("content-type"));

  const rawText = await response.text();
  console.log("Raw response text:", rawText);

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (error) {
    throw new Error("Response was not valid JSON.");
  }

  console.log("Parsed API data:", data);

  if (!response.ok) {
    throw new Error('HTTP error: ${response.status}');
  }

  if (data.status !== "success") {
    throw new Error(
      API did not return success status. Got: ${JSON.stringify(data)}
    );
  }

  return data;
}