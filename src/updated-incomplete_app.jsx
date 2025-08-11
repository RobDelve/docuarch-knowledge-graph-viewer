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
 * Enhanced Settings Panel Component with real-time preview
 */
const SettingsPanel = ({ isOpen, setIsOpen, onSettingsChange, settings, graphData }) => {
  const [tempSettings, setTempSettings] = useState(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync temp settings when props change
  useEffect(() => {
    setTempSettings(settings);
    setHasUnsavedChanges(false);
  }, [settings]);

  const handleTempChange = (newSettings) => {
    setTempSettings(newSettings);
    setHasUnsavedChanges(true);
    // Apply changes immediately for real-time preview
    onSettingsChange(newSettings);
  };

  const resetToDefaults = () => {
    const defaults = {
      physicsEnabled: true,
      nodeSize: 25,
      edgeWidth: 2,
      layout: "barnesHut",
    };
    handleTempChange(defaults);
  };

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
        {/* Physics Section */}
        <div className="bg-gray-700 bg-opacity-30 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 border-b border-gray-600 pb-1">
            Physics & Animation
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Enable Physics
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={tempSettings.physicsEnabled}
                  onChange={(e) =>
                    handleTempChange({
                      ...tempSettings,
                      physicsEnabled: e.target.checked,
                    })
                  }
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                {tempSettings.physicsEnabled && (
                  <span className="text-xs text-green-400">Active</span>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">
                  Layout Algorithm
                </label>
                <span className="text-xs text-gray-400 capitalize">
                  {tempSettings.layout.replace(/([A-Z])/g, ' $1')}
                </span>
              </div>
              <select
                value={tempSettings.layout}
                onChange={(e) =>
                  handleTempChange({ ...tempSettings, layout: e.target.value })
                }
                className="w-full bg-gray-700 border-gray-600 rounded text-white text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="barnesHut">Barnes Hut (Default)</option>
                <option value="forceAtlas2Based">Force Atlas 2</option>
                <option value="hierarchical">Hierarchical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Visual Settings Section */}
        <div className="bg-gray-700 bg-opacity-30 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 border-b border-gray-600 pb-1">
            Visual Appearance
          </h4>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">
                  Node Size
                </label>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                  {tempSettings.nodeSize}px
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={tempSettings.nodeSize}
                onChange={(e) =>
                  handleTempChange({
                    ...tempSettings,
                    nodeSize: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">
                  Edge Width
                </label>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                  {tempSettings.edgeWidth}px
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={tempSettings.edgeWidth}
                onChange={(e) =>
                  handleTempChange({
                    ...tempSettings,
                    edgeWidth: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Thin</span>
                <span>Thick</span>
              </div>
            </div>
          </div>
        </div>

        {/* Graph Info */}
        {graphData && (
          <div className="bg-blue-900 bg-opacity-20 rounded-lg p-3 border border-blue-700">
            <h4 className="text-sm font-semibold text-blue-300 mb-2">
              Current Graph
            </h4>
            <div className="text-xs text-blue-200 space-y-1">
              <div className="flex justify-between">
                <span>Nodes:</span>
                <span className="font-mono">{graphData.nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Edges:</span>
                <span className="font-mono">{graphData.edges.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Density:</span>
                <span className="font-mono">
                  {((graphData.edges.length / (graphData.nodes.length * (graphData.nodes.length - 1))) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-600">
          <button
            onClick={resetToDefaults}
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-sm transition-colors"
            title="Reset to default settings"
          >
            Reset Defaults
          </button>
          {hasUnsavedChanges && (
            <div className="flex items-center text-xs text-yellow-400">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Live Preview
            </div>
          )}
        </div>
      </div>
    </DraggablePanel>
  );
};

/**
 * Zoom Controls Component
 */
const ZoomControls = ({ networkRef }) => {
  const zoomIn = useCallback(() => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({
        scale: Math.min(scale * 1.2, 3),
        animation: { duration: 300, easingFunction: "easeInOutQuad" },
      });
    }
  }, [networkRef]);

  const zoomOut = useCallback(() => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({
        scale: Math.max(scale * 0.8, 0.1),
        animation: { duration: 300, easingFunction: "easeInOutQuad" },
      });
    }
  }, [networkRef]);

  const fitToScreen = useCallback(() => {
    if (networkRef.current) {
      networkRef.current.fit({
        animation: { duration: 500, easingFunction: "easeInOutQuad" },
      });
    }
  }, [networkRef]);

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 glass-effect rounded-lg p-2">
      <button
        onClick={zoomIn}
        className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
        title="Zoom In"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <button
        onClick={zoomOut}
        className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
        title="Zoom Out"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <button
        onClick={fitToScreen}
        className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
        title="Fit to Screen"
      >
        <CenterIcon />
      </button>
    </div>
  );
};

/**
 * The core graph visualization component using vis-network with enhanced features.
 */
const GraphViewer = ({ graphData, onNodeSelect, networkRef, settings }) => {
  const visJsRef = useRef(null);
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [stabilizationProgress, setStabilizationProgress] = useState(0);

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

    const handleStabilizationStart = () => {
      setIsStabilizing(true);
      setStabilizationProgress(0);
    };

    const handleStabilizationProgress = (params) => {
      const progress = Math.round((params.iterations / params.total) * 100);
      setStabilizationProgress(progress);
    };

    const handleStabilizationEnd = () => {
      setIsStabilizing(false);
      setStabilizationProgress(100);
      setTimeout(() => setStabilizationProgress(0), 1000);
    };

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
    networkRef.current.on("stabilizationProgress", handleStabilizationProgress);
    networkRef.current.on("stabilizationIterationsDone", handleStabilizationEnd);
    networkRef.current.on("doubleClick", handleDoubleClick);

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [networkRef, onNodeSelect, settings]);

  // Apply settings changes to existing network
  useEffect(() => {
    if (networkRef.current) {
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

      // Update network options without recreating the network
      networkRef.current.setOptions(enhancedOptions);
      
      // If physics was disabled and now enabled, restart stabilization
      if (settings.physicsEnabled && networkRef.current.physics.phys