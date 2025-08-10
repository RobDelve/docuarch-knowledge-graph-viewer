import React, { useState, useEffect, useRef, useCallback } from "react";
import { Network } from "vis-network/esnext";
import "vis-network/styles/vis-network.css";

// --- Helper Icons ---
const SidebarIcon = ({ open }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    {open ? (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 8l4 4m0 0l-4 4m4-4H3"
      />
    ) : (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M4 12h16M4 18h16"
      />
    )}
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const CenterIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4"
    />
  </svg>
);

const SaveIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

// --- Enhanced Sample Data ---
const sampleKgData = {
  nodes: [
    {
      id: "app-1",
      label: "Online Banking App",
      type: "ApplicationComponent",
      group: "Application",
      description: "Web-based banking application for customer transactions",
    },
    {
      id: "app-2",
      label: "Mobile Banking App",
      type: "ApplicationComponent",
      group: "Application",
      description: "Mobile application for iOS and Android banking services",
    },
    {
      id: "service-1",
      label: "Account Info Service",
      type: "ApplicationService",
      group: "Application",
      description:
        "Microservice providing account information and balance data",
    },
    {
      id: "service-2",
      label: "Payment Service",
      type: "ApplicationService",
      group: "Application",
      description: "Core payment processing and transaction management service",
    },
    {
      id: "interface-1",
      label: "API Gateway",
      type: "ApplicationInterface",
      group: "Application",
      description:
        "Enterprise API gateway managing all external service interactions",
    },
    {
      id: "tech-1",
      label: "Web Server",
      type: "Node",
      group: "Technology",
      description: "Load-balanced web server cluster running on IIS",
    },
    {
      id: "tech-2",
      label: "Database Server",
      type: "Node",
      group: "Technology",
      description: "High-availability SQL Server cluster for transaction data",
    },
    {
      id: "biz-1",
      label: "Customer",
      type: "BusinessActor",
      group: "Business",
      description: "External banking customer accessing services",
    },
    {
      id: "biz-role-1",
      label: "Personal Banking Customer",
      type: "BusinessRole",
      group: "Business",
      description: "Individual customer role with personal banking privileges",
    },
    {
      id: "onestream-1",
      label: "OneStream Application",
      type: "ApplicationComponent",
      group: "Application",
      description: "OneStream XF financial reporting and planning platform",
    },
    {
      id: "onestream-db",
      label: "OneStream Database",
      type: "Node",
      group: "Technology",
      description:
        "OneStream application database containing financial metadata",
    },
  ],
  edges: [
    { from: "app-1", to: "interface-1", label: "uses", type: "access" },
    { from: "app-2", to: "interface-1", label: "uses", type: "access" },
    { from: "interface-1", to: "service-1", label: "accesses", type: "flow" },
    { from: "interface-1", to: "service-2", label: "accesses", type: "flow" },
    {
      from: "service-1",
      to: "tech-2",
      label: "realized by",
      type: "realization",
    },
    {
      from: "service-2",
      to: "tech-2",
      label: "realized by",
      type: "realization",
    },
    { from: "app-1", to: "tech-1", label: "hosted on", type: "deployment" },
    {
      from: "biz-1",
      to: "biz-role-1",
      label: "assigned to",
      type: "assignment",
    },
    { from: "biz-role-1", to: "app-1", label: "accesses", type: "access" },
    { from: "biz-role-1", to: "app-2", label: "accesses", type: "access" },
    { from: "onestream-1", to: "onestream-db", label: "uses", type: "access" },
  ],
};

// --- Enhanced Graph Configuration ---
const graphOptions = {
  autoResize: true,
  height: "100%",
  width: "100%",
  nodes: {
    shape: "box",
    borderWidth: 2,
    font: { color: "#e2e8f0", size: 14, face: "Inter, sans-serif" },
    color: {
      border: "#4a5568",
      background: "#2d3748",
      highlight: { border: "#63b3ed", background: "#2b6cb0" },
      hover: { border: "#63b3ed", background: "#2c5282" },
    },
    shapeProperties: { borderRadius: 6 },
    margin: 10,
  },
  edges: {
    color: { color: "#4a5568", highlight: "#63b3ed", hover: "#63b3ed" },
    font: {
      align: "top",
      color: "#a0aec0",
      size: 11,
      face: "Inter, sans-serif",
    },
    arrows: { to: { enabled: true, scaleFactor: 0.8 } },
    smooth: {
      enabled: true,
      type: "dynamic",
      roundness: 0.5,
    },
    width: 2,
  },
  physics: {
    enabled: true,
    solver: "barnesHut",
    barnesHut: {
      gravitationalConstant: -35000,
      centralGravity: 0.15,
      springLength: 150,
      springConstant: 0.05,
      damping: 0.12,
      avoidOverlap: 0.2,
    },
    stabilization: { iterations: 1000, fit: true },
    maxVelocity: 50,
  },
  interaction: {
    dragNodes: true,
    hover: true,
    tooltipDelay: 300,
    hoverConnectedEdges: true,
    selectConnectedEdges: false,
    multiselect: true,
  },
  groups: {
    Application: {
      color: { background: "#4a3a2a", border: "#d69e2e" },
      font: { color: "#faf089" },
    },
    Technology: {
      color: { background: "#2a4a3a", border: "#38a169" },
      font: { color: "#9ae6b4" },
    },
    Business: {
      color: { background: "#3a2a4a", border: "#805ad5" },
      font: { color: "#d6bcfa" },
    },
  },
};

// --- Enhanced Helper Components ---

/**
 * A generic, draggable, and collapsible floating panel with improved UX.
 */
const DraggablePanel = ({
  title,
  children,
  initialPosition,
  onClose,
  isOpen,
  setIsOpen,
  minWidth = 300,
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest("button") || e.target.closest("input")) return;

    setIsDragging(true);
    const panelRect = panelRef.current.getBoundingClientRect();
    dragStartPos.current = {
      x: e.clientX - panelRect.left,
      y: e.clientY - panelRect.top,
    };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;

      // Keep panel within viewport bounds
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 300);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 200);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={panelRef}
      className={`absolute glass-effect text-white rounded-lg shadow-2xl z-30 flex flex-col transition-all duration-300 ${
        isMinimized ? "h-12" : ""
      }`}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        minWidth: `${minWidth}px`,
        maxWidth: "90vw",
      }}
    >
      <div
        className="p-3 font-semibold flex justify-between items-center cursor-move bg-gray-800 bg-opacity-50 rounded-t-lg border-b border-gray-600"
        onMouseDown={handleMouseDown}
      >
        <span className="truncate">{title}</span>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            className="p-1 rounded hover:bg-gray-600 transition-colors"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Restore" : "Minimize"}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
                isMinimized ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <button
            className="p-1 rounded hover:bg-gray-600 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? "Collapse" : "Expand"}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
                isOpen ? "" : "rotate-90"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          {onClose && (
            <button
              className="p-1 rounded hover:bg-red-600 transition-colors"
              onClick={onClose}
              title="Close"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
      {isOpen && !isMinimized && (
        <div className="p-4 bg-gray-800 bg-opacity-30 rounded-b-lg overflow-auto max-h-96">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced Settings Panel Component
 */
const SettingsPanel = ({ isOpen, setIsOpen, onSettingsChange, settings }) => {
  if (!isOpen) return null;

  return (
    <DraggablePanel
      title="Graph Settings"
      initialPosition={{ x: window.innerWidth - 350, y: 100 }}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      onClose={() => setIsOpen(false)}
      minWidth={320}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Physics Enabled
          </label>
          <input
            type="checkbox"
            checked={settings.physicsEnabled}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                physicsEnabled: e.target.checked,
              })
            }
            className="rounded bg-gray-700 border-gray-600 text-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Node Size
          </label>
          <input
            type="range"
            min="20"
            max="80"
            value={settings.nodeSize}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                nodeSize: parseInt(e.target.value),
              })
            }
            className="w-full bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-gray-400">{settings.nodeSize}px</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Edge Width
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={settings.edgeWidth}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                edgeWidth: parseInt(e.target.value),
              })
            }
            className="w-full bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-gray-400">{settings.edgeWidth}px</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Layout Algorithm
          </label>
          <select
            value={settings.layout}
            onChange={(e) =>
              onSettingsChange({ ...settings, layout: e.target.value })
            }
            className="w-full bg-gray-700 border-gray-600 rounded text-white"
          >
            <option value="barnesHut">Barnes Hut</option>
            <option value="forceAtlas2Based">Force Atlas 2</option>
            <option value="hierarchical">Hierarchical</option>
          </select>
        </div>
      </div>
    </DraggablePanel>
  );
};

/**
 * The core graph visualization component using vis-network with enhanced features.
 */
const GraphViewer = ({ graphData, onNodeSelect, networkRef, settings }) => {
  const visJsRef = useRef(null);
  const [isStabilizing, setIsStabilizing] = useState(false);

  useEffect(() => {
    if (!visJsRef.current) return;

    // Apply settings to graph options
    const enhancedOptions = {
      ...graphOptions,
      physics: {
        ...graphOptions.physics,
        enabled: settings.physicsEnabled,
        solver: settings.layout,
      },
      nodes: {
        ...graphOptions.nodes,
        size: settings.nodeSize,
      },
      edges: {
        ...graphOptions.edges,
        width: settings.edgeWidth,
      },
    };

    networkRef.current = new Network(visJsRef.current, {}, enhancedOptions);

    // Enhanced event handlers
    const handleSelectNode = (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = networkRef.current.body.data.nodes.get(nodeId);
        onNodeSelect(node);
      }
    };

    const handleDeselectNode = () => onNodeSelect(null);

    const handleStabilizationStart = () => setIsStabilizing(true);
    const handleStabilizationEnd = () => setIsStabilizing(false);

    // Double-click to focus on node
    const handleDoubleClick = (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        networkRef.current.focus(nodeId, {
          scale: 1.5,
          animation: { duration: 1000, easingFunction: "easeInOutQuad" },
        });
      }
    };

    networkRef.current.on("selectNode", handleSelectNode);
    networkRef.current.on("deselectNode", handleDeselectNode);
    networkRef.current.on("stabilizationProgress", handleStabilizationStart);
    networkRef.current.on(
      "stabilizationIterationsDone",
      handleStabilizationEnd
    );
    networkRef.current.on("doubleClick", handleDoubleClick);

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [networkRef, onNodeSelect, settings]);

  useEffect(() => {
    if (networkRef.current && graphData) {
      networkRef.current.setData(graphData);
      networkRef.current.fit();

      // Enhanced stabilization with progress feedback
      setIsStabilizing(true);
      networkRef.current.once("stabilizationIterationsDone", () => {
        setIsStabilizing(false);
        if (settings.physicsEnabled) {
          setTimeout(() => {
            networkRef.current.setOptions({ physics: false });
          }, 3000);
        }
      });
    }
  }, [graphData, networkRef, settings.physicsEnabled]);

  return (
    <div className="relative w-full h-full">
      {isStabilizing && (
        <div className="absolute top-4 right-4 z-20 bg-blue-900 bg-opacity-80 text-white px-4 py-2 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">Stabilizing graph...</span>
          </div>
        </div>
      )}
      <div ref={visJsRef} className="w-full h-full bg-gray-900" />
    </div>
  );
};

// --- Enhanced Export Functionality ---
const exportGraphData = (graphData, format = "json") => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `docuarch-graph-${timestamp}`;

  let content, mimeType, extension;

  switch (format) {
    case "json":
      content = JSON.stringify(graphData, null, 2);
      mimeType = "application/json";
      extension = "json";
      break;
    case "csv":
      // Export nodes and edges as separate CSV sections
      const nodesCsv = graphData.nodes
        .map(
          (node) =>
            `"${node.id}","${node.label}","${node.type}","${node.group}","${
              node.description || ""
            }"`
        )
        .join("\n");
      const edgesCsv = graphData.edges
        .map(
          (edge) =>
            `"${edge.from}","${edge.to}","${edge.label}","${edge.type || ""}"`
        )
        .join("\n");
      content = `NODES\nid,label,type,group,description\n${nodesCsv}\n\nEDGES\nfrom,to,label,type\n${edgesCsv}`;
      mimeType = "text/csv";
      extension = "csv";
      break;
    default:
      throw new Error("Unsupported export format");
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// --- Main Enhanced App Component ---
export default function App() {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    physicsEnabled: true,
    nodeSize: 25,
    edgeWidth: 2,
    layout: "barnesHut",
  });

  const fileInputRef = useRef(null);
  const networkRef = useRef(null);

  // Enhanced file handling with validation
  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError("");

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Enhanced validation
      if (!data || typeof data !== "object") {
        throw new Error("Invalid JSON structure.");
      }

      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
        throw new Error("JSON must contain 'nodes' and 'edges' arrays.");
      }

      // Validate node structure
      const invalidNodes = data.nodes.filter((node) => !node.id || !node.label);
      if (invalidNodes.length > 0) {
        throw new Error(
          `Invalid node structure. All nodes must have 'id' and 'label' properties.`
        );
      }

      // Validate edge structure
      const invalidEdges = data.edges.filter((edge) => !edge.from || !edge.to);
      if (invalidEdges.length > 0) {
        throw new Error(
          `Invalid edge structure. All edges must have 'from' and 'to' properties.`
        );
      }

      setGraphData(data);
      setSelectedNode(null);
      setSuccess(
        `Successfully loaded ${data.nodes.length} nodes and ${data.edges.length} edges.`
      );

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(`Error loading file: ${err.message}`);
      setGraphData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSampleData = useCallback(() => {
    setGraphData(sampleKgData);
    setSelectedNode(null);
    setError("");
    setSuccess("Sample data loaded successfully.");
    setTimeout(() => setSuccess(""), 3000);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleCloseDetails = useCallback(() => {
    if (networkRef.current && selectedNode) {
      networkRef.current.selectNodes([]);
    }
    setSelectedNode(null);
  }, [selectedNode]);

  const centerGraph = useCallback(() => {
    if (networkRef.current) {
      networkRef.current.fit({
        animation: { duration: 1000, easingFunction: "easeInOutQuad" },
      });
    }
  }, []);

  const handleSettingsChange = useCallback((newSettings) => {
    setSettings(newSettings);
  }, []);

  // Auto-clear error messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans overflow-hidden">
      <header className="bg-gray-800 shadow-2xl z-30 border-b border-gray-700 flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-white">
                DocuArch Knowledge Graph Viewer
              </h1>
              <div className="text-sm text-gray-400">
                {process.env.REACT_APP_ENVIRONMENT && (
                  <span className="px-2 py-1 bg-blue-900 rounded text-blue-200 text-xs">
                    {process.env.REACT_APP_ENVIRONMENT.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {graphData && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportGraphData(graphData, "json")}
                    className="p-2 rounded-md bg-green-700 hover:bg-green-600 text-white transition-colors"
                    title="Export as JSON"
                  >
                    <SaveIcon />
                  </button>
                  <button
                    onClick={() => exportGraphData(graphData, "csv")}
                    className="px-3 py-2 rounded-md bg-green-700 hover:bg-green-600 text-white text-sm transition-colors"
                    title="Export as CSV"
                  >
                    CSV
                  </button>
                </div>
              )}

              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors shadow-md"
              >
                {isLoading ? "Loading..." : "Upload JSON"}
              </label>
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
              />

              <button
                onClick={loadSampleData}
                className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors shadow-md"
                disabled={isLoading}
              >
                Load Sample
              </button>

              <button
                onClick={centerGraph}
                className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                title="Center Graph"
              >
                <CenterIcon />
              </button>

              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-2 rounded-md transition-colors ${
                  isSettingsOpen
                    ? "bg-blue-700 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white"
                }`}
                title="Graph Settings"
              >
                <SettingsIcon />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced notification system */}
      {error && (
        <div
          className="absolute top-20 right-4 z-50 bg-red-900 border border-red-700 text-red-200 p-4 rounded-md shadow-2xl animate-fade-in max-w-md"
          role="alert"
        >
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-bold text-sm">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="ml-4 text-red-400 hover:text-red-200"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="absolute top-20 right-4 z-50 bg-green-900 border border-green-700 text-green-200 p-4 rounded-md shadow-2xl animate-fade-in max-w-md">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-bold text-sm">Success</p>
              <p className="text-sm mt-1">{success}</p>
            </div>
            <button
              onClick={() => setSuccess("")}
              className="ml-4 text-green-400 hover:text-green-200"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      )}

      <main className="flex-grow relative overflow-hidden">
        <div className="w-full h-full">
          {graphData ? (
            <GraphViewer
              graphData={graphData}
              onNodeSelect={handleNodeSelect}
              networkRef={networkRef}
              settings={settings}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <div className="text-center text-gray-500 max-w-md">
                <svg
                  className="mx-auto h-20 w-20 text-gray-600 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
                <h3 className="text-xl font-medium text-gray-400 mb-2">
                  No Graph Data Loaded
                </h3>
                <p className="text-gray-500 mb-4">
                  Upload a JSON file or load the sample data to visualize your
                  knowledge graph.
                </p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Supports ArchiMate and custom knowledge graph formats</p>
                  <p>• Interactive visualization with physics simulation</p>
                  <p>• Enterprise-ready for OneStream XF integration</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced floating panels */}
        {graphData && (
          <DraggablePanel
            title="Legend"
            initialPosition={{ x: 20, y: 20 }}
            isOpen={isLegendOpen}
            setIsOpen={setIsLegendOpen}
          >
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-300 border-b border-gray-600 pb-1">
                Node Types
              </h4>
              {Object.entries(graphOptions.groups).map(([name, properties]) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span
                      className="w-4 h-4 rounded mr-3 border-2"
                      style={{
                        backgroundColor: properties.color?.background || "#fff",
                        borderColor: properties.color?.border || "#000",
                      }}
                    />
                    <span className="text-sm">{name}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {graphData.nodes.filter((n) => n.group === name).length}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-600 text-xs text-gray-500">
                <p>
                  Total: {graphData.nodes.length} nodes,{" "}
                  {graphData.edges.length} edges
                </p>
              </div>
            </div>
          </DraggablePanel>
        )}

        {selectedNode && (
          <DraggablePanel
            title={`Node: ${selectedNode.label}`}
            initialPosition={{ x: window.innerWidth - 420, y: 20 }}
            isOpen={isDetailsOpen}
            setIsOpen={setIsDetailsOpen}
            onClose={handleCloseDetails}
            minWidth={380}
          >
            <div className="space-y-4">
              {Object.entries(selectedNode)
                .filter(([key]) => key !== "x" && key !== "y") // Hide position data
                .map(([key, value]) => (
                  <div key={key}>
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <div className="text-gray-200 bg-gray-700 bg-opacity-50 p-3 rounded-md text-sm font-mono">
                      {value === null || value === undefined ? (
                        <span className="text-gray-500 italic">
                          Not specified
                        </span>
                      ) : typeof value === "object" ? (
                        <pre className="whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <span className="break-words">{value.toString()}</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </DraggablePanel>
        )}

        <SettingsPanel
          isOpen={isSettingsOpen}
          setIsOpen={setIsSettingsOpen}
          onSettingsChange={handleSettingsChange}
          settings={settings}
        />
      </main>
    </div>
  );
}
