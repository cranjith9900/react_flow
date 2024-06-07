import React, { useEffect, useState } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import './App.css';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const positions = new Set();
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? 'left' : 'top';
    node.sourcePosition = isHorizontal ? 'right' : 'bottom';

    let { x, y } = nodeWithPosition;
    // Adjust position if it overlaps
    while (positions.has(`${x}-${y}`)) {
      x += nodeWidth / 2;
      y += nodeHeight / 2;
    }
    positions.add(`${x}-${y}`);

    node.position = {
      x: x - nodeWidth / 2,
      y: y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

const App = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    fetch('/app.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        // Extract nodes and create a mapping for unique node IDs
        const newNodes = [];
        const nodeIdMap = new Map();

        data.forEach((app, index) => {
          const nodeId = `${app.appId}-${index}`;
          nodeIdMap.set(app.appId, nodeId);
          newNodes.push({
            id: nodeId,
            data: { label: app.name },
            position: { x: 0, y: 0 },
          });
        });

        // Find the primary node and create edges
        const primaryNode = data.find(app => app.isPrimary);
        const primaryNodeId = nodeIdMap.get(primaryNode.appId);
        const newEdges = [];

        data.forEach(app => {
          if (!app.isPrimary) {
            const targetId = nodeIdMap.get(app.appId);
            newEdges.push({
              id: `e-${primaryNodeId}-${targetId}`,
              source: primaryNodeId,
              target: targetId,
              type: 'smoothstep', // Use the 'smoothstep' edge type
              animated: true, // Set animated to true
            });
          }
        });

        const layoutedElements = getLayoutedElements(newNodes, newEdges);
        setNodes([...layoutedElements.nodes]);
        setEdges([...layoutedElements.edges]);
      })
      .catch(error => console.error('Error fetching the JSON data:', error));
  }, []);

  return (
    <div className="App">
      <h1>Interconnected Apps</h1>
      <div className="flow-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          style={{ width: '100%', height: 'calc(100vh - 100px)' }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default App;

