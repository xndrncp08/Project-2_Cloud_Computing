import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { getNutritionData } from "./api/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Scatter, Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function average(values) {
  if (!values.length) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

function groupByDiet(records) {
  return records.reduce((acc, item) => {
    const diet = item.diet_type || "Unknown";
    if (!acc[diet]) {
      acc[diet] = [];
    }
    acc[diet].push(item);
    return acc;
  }, {});
}

function App() {
  const [allRecords, setAllRecords] = useState([]);
  const [selectedDiet, setSelectedDiet] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [executionTime, setExecutionTime] = useState("N/A");
  const [lastUpdated, setLastUpdated] = useState("-");
  const [statusText, setStatusText] = useState("Waiting for API call");
  const [loading, setLoading] = useState(false);

  const fetchAndRenderData = async () => {
    setLoading(true);
    setStatusText("Fetching data from API...");

    try {
      const start = performance.now();
      const apiData = await getNutritionData();
      const end = performance.now();

      const formatted = apiData.map((item) => {
        const protein = Number(item["Protein(g)"]) || 0;
        const carbs = Number(item["Carbs(g)"]) || 0;
        const fat = Number(item["Fat(g)"]) || 0;

        return {
          diet_type: String(item["Diet_type"] || "").trim(),
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat,
          calories: protein * 4 + carbs * 4 + fat * 9,
        };
      });

      setAllRecords(formatted);
      setExecutionTime(`${((end - start) / 1000).toFixed(2)} sec`);
      setLastUpdated(new Date().toLocaleString());
      setStatusText("Data loaded successfully");
    } catch (error) {
      console.error("API fetch failed:", error);
      setAllRecords([]);
      setExecutionTime("N/A");
      setLastUpdated(new Date().toLocaleString());
      setStatusText(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndRenderData();
  }, []);

  const uniqueDiets = useMemo(() => {
    return [
      ...new Set(allRecords.map((record) => record.diet_type).filter(Boolean)),
    ].sort();
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    let filtered = [...allRecords];

    if (selectedDiet !== "all") {
      filtered = filtered.filter(
        (item) => (item.diet_type || "").toLowerCase() === selectedDiet
      );
    }

    if (searchText.trim()) {
      filtered = filtered.filter((item) =>
        (item.diet_type || "")
          .toLowerCase()
          .includes(searchText.trim().toLowerCase())
      );
    }

    return filtered;
  }, [allRecords, selectedDiet, searchText]);

  const grouped = useMemo(() => groupByDiet(filteredRecords), [filteredRecords]);
  const labels = useMemo(() => Object.keys(grouped), [grouped]);

  const avgProtein = labels.map((label) =>
    average(grouped[label].map((item) => item.protein_g))
  );

  const avgCarbs = labels.map((label) =>
    average(grouped[label].map((item) => item.carbs_g))
  );

  const avgFat = labels.map((label) =>
    average(grouped[label].map((item) => item.fat_g))
  );

  const avgCalories = labels.map((label) =>
    average(grouped[label].map((item) => item.calories))
  );

  const recordCounts = labels.map((label) => grouped[label].length);

  const scatterPoints = filteredRecords.map((item) => ({
    x: item.protein_g,
    y: item.carbs_g,
  }));

  const barData = {
    labels,
    datasets: [
      {
        label: "Protein (g)",
        data: avgProtein,
        backgroundColor: "#2f67e8",
      },
      {
        label: "Carbs (g)",
        data: avgCarbs,
        backgroundColor: "#11a36a",
      },
      {
        label: "Fat (g)",
        data: avgFat,
        backgroundColor: "#f59e0b",
      },
    ],
  };

  const scatterData = {
    datasets: [
      {
        label: "Protein vs Carbs",
        data: scatterPoints,
        backgroundColor: "#7c3aed",
      },
    ],
  };

  const lineData = {
    labels,
    datasets: [
      {
        label: "Average Calories",
        data: avgCalories,
        borderColor: "#2f67e8",
        backgroundColor: "#2f67e8",
        tension: 0.3,
      },
    ],
  };

  const doughnutData = {
    labels,
    datasets: [
      {
        label: "Record Distribution",
        data: recordCounts,
        backgroundColor: [
          "#2f67e8",
          "#11a36a",
          "#7c3aed",
          "#f59e0b",
          "#ef4444",
          "#06b6d4",
        ],
      },
    ],
  };

  return (
    <div>
      <header className="topbar">
        <h1>Nutritional Insights</h1>
      </header>

      <main className="container">
        <section className="section">
          <h2>Explore Nutritional Insights</h2>

          <div className="chart-grid">
            <div className="card">
              <h3>Bar Chart</h3>
              <p>Average macronutrient content by diet type.</p>
              <div className="chart-wrapper">
                {labels.length ? (
                  <Bar
                    data={barData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                ) : (
                  <div className="empty-state">No data available</div>
                )}
              </div>
            </div>

            <div className="card">
              <h3>Scatter Plot</h3>
              <p>Nutrient relationships (e.g. protein vs carbs).</p>
              <div className="chart-wrapper">
                {scatterPoints.length ? (
                  <Scatter
                    data={scatterData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          title: { display: true, text: "Protein (g)" },
                        },
                        y: {
                          title: { display: true, text: "Carbs (g)" },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="empty-state">No data available</div>
                )}
              </div>
            </div>

            <div className="card">
              <h3>Line Chart</h3>
              <p>Average calories by diet type.</p>
              <div className="chart-wrapper">
                {labels.length ? (
                  <Line
                    data={lineData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                ) : (
                  <div className="empty-state">No data available</div>
                )}
              </div>
            </div>

            <div className="card">
              <h3>Doughnut Chart</h3>
              <p>Distribution of records by diet type.</p>
              <div className="chart-wrapper">
                {labels.length ? (
                  <Doughnut
                    data={doughnutData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                ) : (
                  <div className="empty-state">No data available</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2>Filters and Data Interaction</h2>
          <div className="controls">
            <input
              type="text"
              value={searchText}
              placeholder="Search by Diet Type"
              onChange={(e) => setSearchText(e.target.value)}
            />

            <select
              value={selectedDiet}
              onChange={(e) => setSelectedDiet(e.target.value)}
            >
              <option value="all">All Diet Types</option>
              {uniqueDiets.map((diet) => (
                <option key={diet} value={diet.toLowerCase()}>
                  {diet}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="section">
          <h2>API Data Interaction</h2>
          <div className="button-row">
            <button className="btn btn-blue" onClick={fetchAndRenderData}>
              {loading ? "Loading..." : "Refresh Dashboard Data"}
            </button>
            <button
              className="btn btn-green"
              onClick={() => alert("Recipe feature coming soon.")}
            >
              Get Recipes
            </button>
            <button
              className="btn btn-purple"
              onClick={() => alert("Cluster feature coming soon.")}
            >
              Get Clusters
            </button>
          </div>

          <div className="info-box">
            <p><strong>Execution Time:</strong> {executionTime}</p>
            <p><strong>Total Records:</strong> {filteredRecords.length}</p>
            <p><strong>Last Updated:</strong> {lastUpdated}</p>
            <p><strong>Status:</strong> {statusText}</p>
          </div>
        </section>

        <section className="section">
          <h2>Pagination</h2>
          <div className="pagination">
            <button className="page-btn" disabled>
              Previous
            </button>
            <button className="page-btn active">1</button>
            <button className="page-btn">2</button>
            <button className="page-btn">Next</button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>© 2025 Nutritional Insights. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default App;