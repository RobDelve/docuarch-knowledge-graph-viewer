import React, { useState, useEffect, useRef, useCallback } from "react";
import { Network } from "vis-network/esnext";
import "vis-network/styles/vis-network.css";

// JSON-LD Knowledge Graph Processor
class JSONLDProcessor {
  constructor() {
    this.prefixes = new Map();
    this.context = {};
  }

  processContext(context) {
    if (!context) return;

    Object.entries(context).forEach(([key, value]) => {
      if (key === "@vocab" || key === "@base") return;

      if (typeof value === "string") {
        this.prefixes.set(key, value);
      } else if (typeof value === "object") {
        this.context[key] = value;
      }
    });
  }

  expandIRI(compactIRI) {
    if (!compactIRI || typeof compactIRI !== "string") return compactIRI;

    if (compactIRI.includes("http://") || compactIRI.includes("https://")) {
      return compactIRI;
    }

    const [prefix, localName] = compactIRI.split(":", 2);
    if (localName && this.prefixes.has(prefix)) {
      return (
        this.prefixes.get(prefix) +
        (localName.startsWith("/") ? localName : "/" + localName)
      );
    }

    return compactIRI;
  }

  getLocalName(iri) {
    if (!iri || typeof iri !== "string") return iri;

    if (iri.includes(":") && !iri.includes("http")) {
      return iri.split(":").pop();
    }

    return iri.split("/").pop().split("#").pop();
  }

  getNodeGroup(type) {
    if (!type) return "Other";

    const localType = this.getLocalName(type).toLowerCase();

    if (localType.includes("business")) return "Business";
    if (localType.includes("application")) return "Application";
    if (
      localType.includes("technology") ||
      localType.includes("system") ||
      localType.includes("artifact") ||
      localType.includes("node")
    )
      return "Technology";
    if (localType.includes("data") || localType.includes("object"))
      return "Data";
    if (
      localType.includes("goal") ||
      localType.includes("principle") ||
      localType.includes("requirement")
    )
      return "Motivation";
    if (localType.includes("compliance") || localType.includes("constraint"))
      return "Compliance";
    if (
      localType.includes("person") ||
      localType.includes("actor") ||
      localType.includes("role")
    )
      return "Actors";
    if (
      localType.includes("process") ||
      localType.includes("function") ||
      localType.includes("service")
    )
      return "Processes";
    if (localType.includes("component") || localType.includes("module"))
      return "Components";

    return "Other";
  }

  processJSONLD(jsonldData) {
    this.processContext(jsonldData["@context"]);

    const nodes = [];
    const edges = [];
    const nodeMap = new Map();

    const graphData = jsonldData["@graph"] || [jsonldData];

    // First pass: Create all nodes
    graphData.forEach((item) => {
      if (!item || typeof item !== "object") return;

      const id = item["@id"] || item.id;
      if (!id) return;

      const type = item["@type"] || item.type;
      const name =
        item.name || item.label || item.title || this.getLocalName(id);

      const node = {
        id: id,
        label: name,
        type: this.getLocalName(type),
        group: this.getNodeGroup(type),
        description: item.description || `${this.getLocalName(type)} entity`,
        originalType: type,
        expandedType: this.expandIRI(type),
      };

      Object.keys(item).forEach((key) => {
        if (
          !["@id", "@type", "id", "type", "name", "label", "title"].includes(
            key
          )
        ) {
          node[key] = item[key];
        }
      });

      nodes.push(node);
      nodeMap.set(id, node);
    });

    // Second pass: Create edges from relationships
    graphData.forEach((item) => {
      if (!item || typeof item !== "object") return;

      const sourceId = item["@id"] || item.id;
      if (!sourceId) return;

      Object.entries(item).forEach(([property, value]) => {
        if (
          [
            "@id",
            "@type",
            "id",
            "type",
            "name",
            "label",
            "title",
            "description",
          ].includes(property)
        ) {
          return;
        }

        this.extractRelationships(sourceId, property, value, edges, nodeMap);
      });
    });

    // Third pass: Handle explicit relationship objects
    graphData.forEach((item) => {
      if (!item || typeof item !== "object") return;

      const type = item["@type"] || item.type;
      const id = item["@id"] || item.id;

      if (
        type &&
        (this.getLocalName(type).toLowerCase().includes("association") ||
          this.getLocalName(type).toLowerCase().includes("relationship") ||
          this.getLocalName(type).toLowerCase().includes("compliance"))
      ) {
        const relatesTo =
          item.relatesTo || item.relates || item.connects || item.links;
        const label = item.name || this.getLocalName(type);

        if (Array.isArray(relatesTo)) {
          for (let i = 0; i < relatesTo.length - 1; i++) {
            for (let j = i + 1; j < relatesTo.length; j++) {
              edges.push({
                from: relatesTo[i],
                to: relatesTo[j],
                label: label,
                type: this.getLocalName(type),
                relationshipId: id,
              });
            }
          }
        } else if (relatesTo) {
          const sourceNode = nodes.find((n) => n.id === id);
          if (sourceNode) {
            edges.push({
              from: id,
              to: relatesTo,
              label: label,
              type: this.getLocalName(type),
            });
          }
        }
      }
    });

    return {
      nodes: nodes.filter((node) => nodeMap.has(node.id)),
      edges: edges.filter(
        (edge) =>
          nodeMap.has(edge.from) &&
          nodeMap.has(edge.to) &&
          edge.from !== edge.to
      ),
      metadata: {
        source: "JSON-LD",
        format: this.detectFormat(jsonldData),
        totalNodes: nodes.length,
        totalEdges: edges.length,
        prefixes: Array.from(this.prefixes.entries()),
        processedAt: new Date().toISOString(),
      },
    };
  }

  extractRelationships(sourceId, property, value, edges, nodeMap) {
    const propertyLocal = this.getLocalName(property);

    if (
      ["description", "comment", "documentation"].includes(
        propertyLocal.toLowerCase()
      )
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        this.extractRelationships(sourceId, property, item, edges, nodeMap);
      });
      return;
    }

    if (typeof value === "object" && value !== null && value["@id"]) {
      value = value["@id"];
    }

    if (typeof value === "string" && nodeMap.has(value)) {
      edges.push({
        from: sourceId,
        to: value,
        label: propertyLocal,
        type: "relationship",
        property: property,
      });
    }
  }

  detectFormat(data) {
    const context = data["@context"];
    if (!context) return "Generic JSON-LD";

    if (typeof context === "object" && context !== null) {
      for (const key in context) {
        if (key.toLowerCase().includes("archimate")) return "ArchiMate JSON-LD";
        if (key.toLowerCase().includes("schema")) return "Schema.org JSON-LD";
      }
      if (context.owl || context.rdf) return "RDF/OWL JSON-LD";
    }

    if (typeof context === "string" && context.includes("schema.org"))
      return "Schema.org JSON-LD";

    return "Custom JSON-LD";
  }
}

// --- Helper Icons ---
const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
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
    Business: {
      color: { background: "#4a3a2a", border: "#d69e2e" },
      font: { color: "#faf089" },
    },
    Application: {
      color: { background: "#2a4a3a", border: "#38a169" },
      font: { color: "#9ae6b4" },
    },
    Technology: {
      color: { background: "#2a3a4a", border: "#4299e1" },
      font: { color: "#90cdf4" },
    },
    Data: {
      color: { background: "#4a2a4a", border: "#9f7aea" },
      font: { color: "#ddd6fe" },
    },
    Motivation: {
      color: { background: "#4a4a2a", border: "#ed8936" },
      font: { color: "#fbb040" },
    },
    Compliance: {
      color: { background: "#4a2a2a", border: "#e53e3e" },
      font: { color: "#fbb6b6" },
    },
    Actors: {
      color: { background: "#3a4a3a", border: "#48bb78" },
      font: { color: "#9ae6b4" },
    },
    Processes: {
      color: { background: "#3a3a4a", border: "#667eea" },
      font: { color: "#a3bffa" },
    },
    Components: {
      color: { background: "#3a4a4a", border: "#38b2ac" },
      font: { color: "#81e6d9" },
    },
    Other: {
      color: { background: "#2d3748", border: "#4a5568" },
      font: { color: "#e2e8f0" },
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
    if (
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest("a") ||
      e.target.closest("details")
    )
      return;
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

  if (!isOpen) return null;

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
      {!isMinimized && (
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
const SettingsPanel = ({
  isOpen,
  setIsOpen,
  onSettingsChange,
  settings,
  graphData,
}) => {
  const [tempSettings, setTempSettings] = useState(settings);

  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  const handleTempChange = (newSettings) => {
    setTempSettings(newSettings);
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
      initialPosition={{ x: window.innerWidth - 370, y: 20 }}
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
                  {tempSettings.layout.replace(/([A-Z])/g, " $1")}
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
              {graphData.nodes.length > 1 && (
                <div className="flex justify-between">
                  <span>Density:</span>
                  <span className="font-mono">
                    {(
                      (graphData.edges.length /
                        (graphData.nodes.length *
                          (graphData.nodes.length - 1))) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              )}
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
      networkRef.current.moveTo({
        scale: networkRef.current.getScale() * 1.2,
        animation: { duration: 300, easingFunction: "easeInOutQuad" },
      });
    }
  }, [networkRef]);

  const zoomOut = useCallback(() => {
    if (networkRef.current) {
      networkRef.current.moveTo({
        scale: networkRef.current.getScale() * 0.8,
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
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
      <button
        onClick={zoomOut}
        className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
        title="Zoom Out"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 12H4"
          />
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

    const enhancedOptions = { ...graphOptions };
    networkRef.current = new Network(visJsRef.current, {}, enhancedOptions);

    const handleSelectNode = (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = networkRef.current.body.data.nodes.get(nodeId);
        onNodeSelect(node);
      } else {
        onNodeSelect(null);
      }
    };
    const handleStabilizationProgress = (params) =>
      setStabilizationProgress(
        Math.round((params.iterations / params.total) * 100)
      );
    const handleStabilizationEnd = () => {
      setIsStabilizing(false);
      setStabilizationProgress(100);
      setTimeout(() => setStabilizationProgress(0), 1000);
    };
    const handleDoubleClick = (params) => {
      if (params.nodes.length > 0) {
        networkRef.current.focus(params.nodes[0], {
          scale: 1.5,
          animation: { duration: 1000, easingFunction: "easeInOutQuad" },
        });
      }
    };

    networkRef.current.on("select", handleSelectNode);
    networkRef.current.on("stabilizationProgress", handleStabilizationProgress);
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
  }, [networkRef, onNodeSelect]);

  useEffect(() => {
    if (networkRef.current) {
      const optionsToUpdate = {
        physics: { enabled: settings.physicsEnabled, solver: settings.layout },
        nodes: { size: settings.nodeSize },
        edges: { width: settings.edgeWidth },
      };
      networkRef.current.setOptions(optionsToUpdate);
      if (settings.physicsEnabled) {
        networkRef.current.startSimulation();
      } else {
        networkRef.current.stopSimulation();
      }
    }
  }, [settings, networkRef]);

  useEffect(() => {
    if (networkRef.current && graphData) {
      setIsStabilizing(true);
      networkRef.current.setData(graphData);
      networkRef.current.fit();
    }
  }, [graphData, networkRef]);

  return (
    <div className="relative w-full h-full">
      {isStabilizing && stabilizationProgress < 100 && (
        <div className="absolute top-4 right-4 z-20 bg-blue-900 bg-opacity-90 text-white px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Stabilizing graph...</span>
              <div className="w-32 bg-blue-800 rounded-full h-2 mt-1">
                <div
                  className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stabilizationProgress}%` }}
                ></div>
              </div>
              <span className="text-xs text-blue-200 mt-1">
                {stabilizationProgress}%
              </span>
            </div>
          </div>
        </div>
      )}
      <div ref={visJsRef} className="w-full h-full bg-gray-900" />
      <ZoomControls networkRef={networkRef} />
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
      const nodesCsv =
        "id,label,type,group,description\n" +
        graphData.nodes
          .map(
            (n) =>
              `"${n.id}","${n.label}","${n.type}","${n.group}","${
                n.description || ""
              }"`
          )
          .join("\n");
      const edgesCsv =
        "from,to,label,type\n" +
        graphData.edges
          .map((e) => `"${e.from}","${e.to}","${e.label}","${e.type || ""}"`)
          .join("\n");
      content = `NODES\n${nodesCsv}\n\nEDGES\n${edgesCsv}`;
      mimeType = "text/csv";
      extension = "csv";
      break;
    default:
      console.error("Unsupported export format");
      return;
  }

  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// --- Main Enhanced App Component ---
export default function App() {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
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

  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const text = await file.text();
      const rawData = JSON.parse(text);
      let data;

      if (rawData["@context"] || rawData["@graph"]) {
        const processor = new JSONLDProcessor();
        data = processor.processJSONLD(rawData);
      } else if (Array.isArray(rawData.nodes) && Array.isArray(rawData.edges)) {
        data = rawData;
      } else {
        throw new Error(
          "Unsupported JSON format. Please use JSON-LD or a format with 'nodes' and 'edges' arrays."
        );
      }

      if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges))
        throw new Error("Processing failed to produce valid graph data.");
      if (data.nodes.some((n) => !n.id || !n.label))
        throw new Error(
          "Invalid node data: all nodes must have an 'id' and 'label'."
        );
      if (data.edges.some((e) => !e.from || !e.to))
        throw new Error(
          "Invalid edge data: all edges must have a 'from' and 'to' property."
        );

      setGraphData(data);
      setSelectedNode(null);
      const successMsg =
        data.metadata?.source === "JSON-LD"
          ? `Loaded ${data.metadata.format}: ${data.nodes.length} nodes, ${data.edges.length} edges.`
          : `Loaded ${data.nodes.length} nodes and ${data.edges.length} edges.`;
      setSuccess(successMsg);
    } catch (err) {
      setError(`Error loading file: ${err.message}`);
      setGraphData(null);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const loadSampleData = useCallback(() => {
    setGraphData(sampleKgData);
    setSelectedNode(null);
    setError("");
    setSuccess("Sample data loaded successfully.");
  }, []);

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
    setIsDetailsOpen(!!node);
  }, []);

  const handleCloseDetails = useCallback(() => {
    if (networkRef.current && selectedNode) {
      networkRef.current.selectNodes([]);
    }
    setSelectedNode(null);
    setIsDetailsOpen(false);
  }, [selectedNode]);

  const centerGraph = useCallback(() => {
    if (networkRef.current) {
      networkRef.current.fit({
        animation: { duration: 1000, easingFunction: "easeInOutQuad" },
      });
    }
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans overflow-hidden">
      <header className="bg-gray-800 shadow-2xl z-30 border-b border-gray-700 flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-white">
              DocuArch Knowledge Graph Viewer
            </h1>
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
                accept=".json,.jsonld"
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

      {(error || success) && (
        <div
          className={`absolute top-20 right-4 z-50 p-4 rounded-md shadow-2xl animate-fade-in max-w-md ${
            error
              ? "bg-red-900 border border-red-700 text-red-200"
              : "bg-green-900 border border-green-700 text-green-200"
          }`}
          role="alert"
        >
          <div className="flex items-start">
            <svg
              className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${
                error ? "text-red-400" : "text-green-400"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              {error ? (
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              )}
            </svg>
            <div>
              <p className="font-bold text-sm">{error ? "Error" : "Success"}</p>
              <p className="text-sm mt-1">{error || success}</p>
            </div>
            <button
              onClick={() => {
                setError("");
                setSuccess("");
              }}
              className={`ml-4 ${
                error
                  ? "text-red-400 hover:text-red-200"
                  : "text-green-400 hover:text-green-200"
              }`}
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
                  Upload a JSON or JSON-LD file, or load the sample data to
                  visualize your knowledge graph.
                </p>
              </div>
            </div>
          )}
        </div>

        {graphData && (
          <DraggablePanel
            title={
              graphData.metadata?.source === "JSON-LD"
                ? `Legend - ${graphData.metadata.format}`
                : "Legend"
            }
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
                {graphData.metadata?.source === "JSON-LD" &&
                  graphData.metadata.prefixes?.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-blue-300 hover:text-blue-200">
                        Namespaces ({graphData.metadata.prefixes.length})
                      </summary>
                      <div className="mt-1 pl-2 space-y-1 max-h-20 overflow-y-auto">
                        {graphData.metadata.prefixes.map(([prefix, uri]) => (
                          <div key={prefix} className="text-xs">
                            <span className="text-yellow-300 font-mono">
                              {prefix}:
                            </span>
                            <span className="text-gray-400 ml-1 break-all">
                              {uri}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
              </div>
            </div>
          </DraggablePanel>
        )}

        {selectedNode && (
          <DraggablePanel
            title={`${selectedNode.type || "Node"}: ${selectedNode.label}`}
            initialPosition={{ x: window.innerWidth - 420, y: 20 }}
            isOpen={isDetailsOpen}
            setIsOpen={setIsDetailsOpen}
            onClose={handleCloseDetails}
            minWidth={380}
          >
            <div className="space-y-4">
              {Object.entries(selectedNode)
                .filter(
                  ([key]) =>
                    !["x", "y", "vx", "vy", "fx", "fy", "index"].includes(key)
                )
                .map(([key, value]) => (
                  <div key={key}>
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <div className="text-gray-200 bg-gray-700 bg-opacity-50 p-3 rounded-md text-sm break-words">
                      {value === null || value === undefined ? (
                        <span className="text-gray-500 italic">
                          Not specified
                        </span>
                      ) : typeof value === "object" ? (
                        <pre className="whitespace-pre-wrap overflow-x-auto font-mono text-xs">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <span>{value.toString()}</span>
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
          onSettingsChange={setSettings}
          settings={settings}
          graphData={graphData}
        />
      </main>
    </div>
  );
}
