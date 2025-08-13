/**
 * Comprehensive JSON-LD Knowledge Graph Processor
 * Handles various JSON-LD formats and complex relationship structures
 */

// JSON-LD context resolver for expanding compact IRIs
class JSONLDProcessor {
  constructor() {
    this.prefixes = new Map();
    this.context = {};
  }

  // Process @context to extract prefixes and mappings
  processContext(context) {
    if (!context) return;

    Object.entries(context).forEach(([key, value]) => {
      if (key === '@vocab' || key === '@base') return;
      
      if (typeof value === 'string') {
        // Simple prefix mapping: "archimate": "http://www.opengroup.org/xsd/archimate"
        this.prefixes.set(key, value);
      } else if (typeof value === 'object') {
        // Complex mapping with @id, @type, etc.
        this.context[key] = value;
      }
    });
  }

  // Expand compact IRI (e.g., "archimate:BusinessRole" -> "http://www.opengroup.org/xsd/archimate/BusinessRole")
  expandIRI(compactIRI) {
    if (!compactIRI || typeof compactIRI !== 'string') return compactIRI;

    // Already a full IRI
    if (compactIRI.includes('http://') || compactIRI.includes('https://')) {
      return compactIRI;
    }

    // Handle prefixed terms
    const [prefix, localName] = compactIRI.split(':', 2);
    if (localName && this.prefixes.has(prefix)) {
      return this.prefixes.get(prefix) + (localName.startsWith('/') ? localName : '/' + localName);
    }

    return compactIRI;
  }

  // Get human-readable label from IRI
  getLocalName(iri) {
    if (!iri || typeof iri !== 'string') return iri;
    
    // Handle prefixed terms
    if (iri.includes(':') && !iri.includes('http')) {
      return iri.split(':').pop();
    }
    
    // Handle full IRIs
    return iri.split('/').pop().split('#').pop();
  }

  // Determine node group based on type
  getNodeGroup(type) {
    if (!type) return 'Other';
    
    const localType = this.getLocalName(type).toLowerCase();
    
    // ArchiMate groupings
    if (localType.includes('business')) return 'Business';
    if (localType.includes('application')) return 'Application';
    if (localType.includes('technology') || localType.includes('system') || 
        localType.includes('artifact') || localType.includes('node')) return 'Technology';
    if (localType.includes('data') || localType.includes('object')) return 'Data';
    if (localType.includes('goal') || localType.includes('principle') || 
        localType.includes('requirement')) return 'Motivation';
    if (localType.includes('compliance') || localType.includes('constraint')) return 'Compliance';
    
    // Generic groupings
    if (localType.includes('person') || localType.includes('actor') || 
        localType.includes('role')) return 'Actors';
    if (localType.includes('process') || localType.includes('function') || 
        localType.includes('service')) return 'Processes';
    if (localType.includes('component') || localType.includes('module')) return 'Components';
    
    return 'Other';
  }

  // Process JSON-LD graph into nodes and edges
  processJSONLD(jsonldData) {
    this.processContext(jsonldData['@context']);
    
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();
    
    // Get the main graph data
    const graphData = jsonldData['@graph'] || [jsonldData];
    
    // First pass: Create all nodes
    graphData.forEach(item => {
      if (!item || typeof item !== 'object') return;
      
      const id = item['@id'] || item.id;
      if (!id) return;
      
      const type = item['@type'] || item.type;
      const name = item.name || item.label || item.title || this.getLocalName(id);
      
      const node = {
        id: id,
        label: name,
        type: this.getLocalName(type),
        group: this.getNodeGroup(type),
        description: item.description || `${this.getLocalName(type)} entity`,
        originalType: type,
        expandedType: this.expandIRI(type)
      };

      // Add any additional properties
      Object.keys(item).forEach(key => {
        if (!['@id', '@type', 'id', 'type', 'name', 'label', 'title'].includes(key)) {
          node[key] = item[key];
        }
      });

      nodes.push(node);
      nodeMap.set(id, node);
    });

    // Second pass: Create edges from relationships
    graphData.forEach(item => {
      if (!item || typeof item !== 'object') return;
      
      const sourceId = item['@id'] || item.id;
      if (!sourceId) return;

      // Process all properties that might be relationships
      Object.entries(item).forEach(([property, value]) => {
        if (['@id', '@type', 'id', 'type', 'name', 'label', 'title', 'description'].includes(property)) {
          return;
        }

        // Handle different relationship patterns
        this.extractRelationships(sourceId, property, value, edges, nodeMap);
      });
    });

    // Third pass: Handle explicit relationship objects (like ArchiMate associations)
    graphData.forEach(item => {
      if (!item || typeof item !== 'object') return;
      
      const type = item['@type'] || item.type;
      const id = item['@id'] || item.id;
      
      // Handle association/relationship types
      if (type && (this.getLocalName(type).toLowerCase().includes('association') ||
                   this.getLocalName(type).toLowerCase().includes('relationship') ||
                   this.getLocalName(type).toLowerCase().includes('compliance'))) {
        
        const relatesTo = item.relatesTo || item.relates || item.connects || item.links;
        const label = item.name || this.getLocalName(type);
        
        if (Array.isArray(relatesTo)) {
          // Create edges between all related entities
          for (let i = 0; i < relatesTo.length - 1; i++) {
            for (let j = i + 1; j < relatesTo.length; j++) {
              edges.push({
                from: relatesTo[i],
                to: relatesTo[j],
                label: label,
                type: this.getLocalName(type),
                relationshipId: id
              });
            }
          }
        } else if (relatesTo) {
          // Single relationship
          const sourceNode = nodes.find(n => n.id === id);
          if (sourceNode) {
            edges.push({
              from: id,
              to: relatesTo,
              label: label,
              type: this.getLocalName(type)
            });
          }
        }
      }
    });

    return {
      nodes: nodes.filter(node => nodeMap.has(node.id)), // Ensure all nodes exist
      edges: edges.filter(edge => 
        nodeMap.has(edge.from) && nodeMap.has(edge.to) && edge.from !== edge.to
      ), // Filter valid edges
      metadata: {
        source: 'JSON-LD',
        format: this.detectFormat(jsonldData),
        totalNodes: nodes.length,
        totalEdges: edges.length,
        prefixes: Array.from(this.prefixes.entries()),
        processedAt: new Date().toISOString()
      }
    };
  }

  // Extract relationships from various property patterns
  extractRelationships(sourceId, property, value, edges, nodeMap) {
    const propertyLocal = this.getLocalName(property);
    
    // Skip non-relationship properties
    if (['description', 'comment', 'documentation'].includes(propertyLocal.toLowerCase())) {
      return;
    }

    // Handle array values
    if (Array.isArray(value)) {
      value.forEach(item => {
        this.extractRelationships(sourceId, property, item, edges, nodeMap);
      });
      return;
    }

    // Handle object values with @id
    if (typeof value === 'object' && value['@id']) {
      value = value['@id'];
    }

    // Handle string references to other nodes
    if (typeof value === 'string' && nodeMap.has(value)) {
      edges.push({
        from: sourceId,
        to: value,
        label: propertyLocal,
        type: 'relationship',
        property: property
      });
    }
  }

  // Detect specific JSON-LD format
  detectFormat(data) {
    const context = data['@context'];
    if (!context) return 'Generic JSON-LD';
    
    if (typeof context === 'object') {
      if (context.archimate) return 'ArchiMate JSON-LD';
      if (context.schema || context['@vocab']?.includes('schema.org')) return 'Schema.org JSON-LD';
      if (context.owl || context.rdf) return 'RDF/OWL JSON-LD';
    }
    
    return 'JSON-LD';
  }
}

// Enhanced graph options for JSON-LD data
const jsonldGraphOptions = {
  ...graphOptions,
  groups: {
    ...graphOptions.groups,
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
    }
  }
};

// Export the processor and enhanced options
export { JSONLDProcessor, jsonldGraphOptions };