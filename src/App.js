// App.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import Sidebar from './Sidebar';
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
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  useEffect(() => {
    fetch('/app.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
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
              type: 'smoothstep',
              animated: true,
            });
          }
        });

        const layoutedElements = getLayoutedElements(newNodes, newEdges);
        setNodes([...layoutedElements.nodes]);
        setEdges([...layoutedElements.edges]);
      })
      .catch(error => console.error('Error fetching the JSON data:', error));
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();

    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow');
    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    const newNode = {
      id: `${type}-${+new Date()}`,
      type,
      position,
      data: { label: `${type} node` },
    };

    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance]);

  return (
    <div className="App">
      <h1>Interconnected Apps</h1>
      <ReactFlowProvider>
        <div className="dndflow">
          <Sidebar />
          <div className="flow-container reactflow-wrapper" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              fitView
              className="inner"
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        </div>
      </ReactFlowProvider>
    </div>
  );
};

export default App;
