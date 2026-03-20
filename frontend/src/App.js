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
 
function App() {
  const [dashboardData, setDashboardData] = useState(null);
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
      const data = await getNutritionData();
 
      setDashboardData(data);
      setExecutionTime(data.executionTime || "N/A");
      setLastUpdated(new Date().toLocaleString());
      setStatusText("Data loaded successfully");
    } catch (error) {
      console.error("API fetch failed:", error);
      setDashboardData(null);
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
 
  const dietOptions = useMemo(() => {
    return dashboardData?.summary?.dietTypes || [];
  }, [dashboardData]);
 
  const filterChart = (chartBlock) => {
    if (!chartBlock) return { labels: [], values: [] };
 
    const combined = chartBlock.labels.map((label, index) => ({
      label,
      value: chartBlock.values[index],
    }));
 
    const filtered = combined.filter((item) => {
      const matchesDiet =
        selectedDiet === "all" || item.label.toLowerCase() === selectedDiet;
 
      const matchesSearch =
        !searchText.trim() ||
        item.label.toLowerCase().includes(searchText.trim().toLowerCase());
 
      return matchesDiet && matchesSearch;
    });
 
    return {
      labels: filtered.map((item) => item.label),
      values: filtered.map((item) => item.value),
    };
  };
 
  const proteinData = filterChart(dashboardData?.chartData?.avgProtein);
  const carbsData = filterChart(dashboardData?.chartData?.avgCarbs);
  const fatData = filterChart(dashboardData?.chartData?.avgFat);
 
  const scatterDataPoints = proteinData.labels.map((label, index) => {
    const carbIndex = carbsData.labels.findIndex((c) => c === label);
    return {
      x: proteinData.values[index],
      y: carbIndex >= 0 ? carbsData.values[carbIndex] : 0,
    };
  });
 
  const barData = {
    labels: proteinData.labels,
    datasets: [
      {
        label: "Average Protein (g)",
        data: proteinData.values,
        backgroundColor: "#2f67e8",
      },
    ],
  };
 
  const scatterData = {
    datasets: [
      {
        label: "Protein vs Carbs",
        data: scatterDataPoints,
        backgroundColor: "#7c3aed",
      },
    ],
  };
 
  const lineData = {
    labels: carbsData.labels,
    datasets: [
      {
        label: "Average Carbs (g)",
        data: carbsData.values,
        borderColor: "#11a36a",
        backgroundColor: "#11a36a",
        tension: 0.3,
      },
    ],
  };
 
  const doughnutData = {
    labels: fatData.labels,
    datasets: [
      {
        label: "Average Fat (g)",
        data: fatData.values,
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
 
  const filteredCount = proteinData.labels.length;
  const totalRecipes = dashboardData?.summary?.totalRecipes ?? "-";
  const highestProteinDiet = dashboardData?.summary?.highestProteinDiet ?? "-";
 
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
              <p>Average protein content by diet type.</p>
              <div className="chart-wrapper">
                {proteinData.labels.length ? (
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
              <p>Relationship between average protein and carbs by diet type.</p>
              <div className="chart-wrapper">
                {scatterDataPoints.length ? (
                  <Scatter
                    data={scatterData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          title: { display: true, text: "Average Protein (g)" },
                        },
                        y: {
                          title: { display: true, text: "Average Carbs (g)" },
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
              <p>Average carbohydrate content by diet type.</p>
              <div className="chart-wrapper">
                {carbsData.labels.length ? (
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
              <p>Average fat distribution by diet type.</p>
              <div className="chart-wrapper">
                {fatData.labels.length ? (
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
              {dietOptions.map((diet) => (
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
          </div>
 
          <div className="info-box">
            <p><strong>Execution Time:</strong> {executionTime}</p>
            <p><strong>Total Recipes:</strong> {totalRecipes}</p>
            <p><strong>Highest Protein Diet:</strong> {highestProteinDiet}</p>
            <p><strong>Visible Diet Types:</strong> {filteredCount}</p>
            <p><strong>Last Updated:</strong> {lastUpdated}</p>
            <p><strong>Status:</strong> {statusText}</p>
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