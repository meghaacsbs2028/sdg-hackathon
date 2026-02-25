import { useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import StudentList from './pages/StudentList'

const tabs = [
  { id: "dashboard", label: "🎯 Predict Risk" },
  { id: "students", label: "📋 Student List" },
];

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <>
      <Navbar />
      <div style={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.activeTab : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "dashboard" && <Dashboard />}
      {activeTab === "students" && <StudentList />}
    </>
  )
}

const styles = {
  tabBar: {
    display: "flex",
    gap: "0",
    borderBottom: "2px solid #e5e7eb",
    padding: "0 2rem",
    background: "#f9fafb",
  },
  tab: {
    padding: "0.75rem 1.5rem",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 500,
    color: "#666",
    borderBottom: "2px solid transparent",
    marginBottom: "-2px",
  },
  activeTab: {
    color: "#1e3a5f",
    borderBottom: "2px solid #1e3a5f",
    fontWeight: 700,
  },
};

export default App
