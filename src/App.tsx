/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import { AuthPanel } from './components/AuthPanel';
import { AIControlPanel } from './components/AIControlPanel';
import { NodeDetailsPanel } from './components/NodeDetailsPanel';

type Tool = 'sender' | 'break' | 'heal' | 'select';
type Logic = 'diversion' | 'dam' | 'crush';

interface PulseData {
    node: Node;
    energy: number;
}

interface Node {
    id: string;
    x: number;
    y: number;
    row: number;
    col: number;
    baseValue: number;
    currentValue: number;
    neighbors: Node[];
    isSender: boolean;
}

export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [currentTool, setCurrentTool] = useState<Tool>('select');
    const [currentLogic, setCurrentLogic] = useState<Logic>('diversion');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const toolRef = useRef<Tool>(currentTool);
    const logicRef = useRef<Logic>(currentLogic);
    const selectedNodeIdRef = useRef<string | null>(null);
    
    useEffect(() => {
        toolRef.current = currentTool;
    }, [currentTool]);
    
    useEffect(() => {
        logicRef.current = currentLogic;
    }, [currentLogic]);

    useEffect(() => {
        selectedNodeIdRef.current = selectedNodeId;
    }, [selectedNodeId]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        const node = nodesRef.current.find(n => n.id === query);
        if (node) {
            setSelectedNodeId(node.id);
        }
    };

    const nodesRef = useRef<Node[]>([]);
    const pulseStateRef = useRef<{
        active: boolean;
        queue: PulseData[];
        step: number;
        lastPulseTime: number;
    }>({ active: false, queue: [], step: 0, lastPulseTime: 0 });
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;
        const spacing = 45;
        const nodeRadius = 6;
        
        const initGrid = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;
            
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            
            // Reset transform before scaling to avoid compounding scales on resize
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
            
            const oldNodes = new Map(nodesRef.current.map(n => [n.id, n]));
            const nodes: Node[] = [];
            const cols = Math.floor(width / spacing) + 2;
            const rows = Math.floor(height / (spacing * 0.866)) + 2;

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const x = col * spacing + (row % 2 === 0 ? 0 : spacing / 2);
                    const y = row * spacing * 0.866;
                    const id = `${row}-${col}`;
                    const oldNode = oldNodes.get(id);
                    
                    nodes.push({
                        id,
                        x,
                        y,
                        row,
                        col,
                        baseValue: oldNode ? oldNode.baseValue : 1.0,
                        currentValue: oldNode ? oldNode.currentValue : 1.0,
                        neighbors: [],
                        isSender: oldNode ? oldNode.isSender : false
                    });
                }
            }

            nodes.forEach(node => {
                nodes.forEach(other => {
                    if (node !== other) {
                        const dx = node.x - other.x;
                        const dy = node.y - other.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < spacing * 1.5) {
                            node.neighbors.push(other);
                        }
                    }
                });
            });
            
            nodesRef.current = nodes;
        };
        
        initGrid();
        
        const handleResize = () => {
            initGrid();
        };
        window.addEventListener('resize', handleResize);
        
        const handleMouseDown = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let closestNode: Node | null = null;
            let minDist = Infinity;
            nodesRef.current.forEach(node => {
                const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
                if (dist < minDist) {
                    minDist = dist;
                    closestNode = node;
                }
            });

            if (closestNode && minDist < spacing) {
                const tool = toolRef.current;
                
                // Always select on click
                setSelectedNodeId(closestNode.id);

                if (tool === 'sender') {
                    closestNode.isSender = true;
                    closestNode.baseValue = 1.0;
                    closestNode.currentValue = 2.5;
                } else if (tool === 'break') {
                    closestNode.isSender = false;
                    closestNode.baseValue = 0.2;
                    closestNode.currentValue = 0.2;
                } else if (tool === 'heal') {
                    closestNode.isSender = false;
                    closestNode.baseValue = 1.0;
                    closestNode.currentValue = 1.0;
                }
            } else {
                // Deselect if clicking empty space
                setSelectedNodeId(null);
            }
        };
        
        canvas.addEventListener('mousedown', handleMouseDown);
        
        const draw = () => {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, width, height);

            // Draw subtle background grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x < width; x += spacing) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
            for (let y = 0; y < height; y += spacing * 0.866) {
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
            ctx.stroke();

            const pulse = pulseStateRef.current;
            if (pulse.active) {
                const now = Date.now();
                if (now - pulse.lastPulseTime > 100) {
                    if (pulse.queue.length === 0 || pulse.step > 20) {
                        pulse.active = false;
                    } else {
                        const currentBatch = pulse.queue.splice(0, pulse.queue.length);
                        const nextNodes = new Set<Node>();
                        const logic = logicRef.current;

                        currentBatch.forEach(data => {
                            data.node.neighbors.forEach(neighbor => {
                                if (logic === 'diversion') {
                                    if (neighbor.baseValue >= 1.0) {
                                        neighbor.currentValue += data.energy * 0.5;
                                        if (neighbor.currentValue > 2.5) neighbor.currentValue = 2.5;
                                        nextNodes.add(neighbor);
                                    }
                                } 
                                else if (logic === 'dam') {
                                    if (neighbor.baseValue < 1.0) {
                                        data.node.currentValue += 0.5; 
                                    } else {
                                        neighbor.currentValue += data.energy * 0.5;
                                        nextNodes.add(neighbor);
                                    }
                                }
                                else if (logic === 'crush') {
                                    const transmission = data.energy * neighbor.baseValue;
                                    neighbor.currentValue += transmission;
                                    if (transmission > 0.3) {
                                        nextNodes.add(neighbor);
                                    }
                                }
                            });
                        });

                        nextNodes.forEach(n => {
                            pulse.queue.push({ node: n, energy: currentBatch[0].energy * 0.8 });
                        });

                        pulse.step++;
                        pulse.lastPulseTime = now;
                    }
                }
            }

            nodesRef.current.forEach(node => {
                if (!node.isSender) {
                    node.currentValue += (node.baseValue - node.currentValue) * 0.05;
                } else {
                    node.currentValue = 2.0 + Math.sin(Date.now() * 0.005) * 0.5;
                }
            });

            const selectedNode = selectedNodeIdRef.current ? nodesRef.current.find(n => n.id === selectedNodeIdRef.current) : null;

            nodesRef.current.forEach(node => {
                node.neighbors.forEach(neighbor => {
                    if (node.id < neighbor.id) {
                        const avgValue = (node.currentValue + neighbor.currentValue) / 2;
                        const isSelectedConnection = selectedNode && (node.id === selectedNode.id || neighbor.id === selectedNode.id);
                        
                        if (isSelectedConnection) {
                            ctx.strokeStyle = 'rgba(8, 221, 221, 0.8)';
                            ctx.lineWidth = 2;
                        } else {
                            ctx.lineWidth = 1;
                            if (avgValue < 1.0) {
                                ctx.strokeStyle = `rgba(100, 100, 100, 0.2)`;
                            } else if (avgValue < 1.5) {
                                ctx.strokeStyle = `rgba(8, 221, 221, 0.4)`;
                            } else {
                                ctx.strokeStyle = `rgba(255, 50, 50, 0.6)`;
                            }
                        }
                        
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(neighbor.x, neighbor.y);
                        ctx.stroke();
                    }
                });
            });

            ctx.lineWidth = 1; // Reset for nodes
            nodesRef.current.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
                
                if (node.currentValue < 0.9) {
                    ctx.fillStyle = '#444';
                    ctx.shadowBlur = 0;
                } else if (node.currentValue < 1.5) {
                    ctx.fillStyle = '#08DDDD';
                    ctx.shadowColor = '#08DDDD';
                    ctx.shadowBlur = 10;
                } else {
                    ctx.fillStyle = '#ff2222';
                    ctx.shadowColor = '#ff0000';
                    ctx.shadowBlur = 20;
                }

                ctx.fill();
                ctx.shadowBlur = 0;
                
                if (node.isSender) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Neighbor highlight
                if (selectedNode && selectedNode.neighbors.some(n => n.id === node.id)) {
                    ctx.strokeStyle = 'rgba(8, 221, 221, 0.6)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeRadius + 4, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]); // Reset line dash
                }

                // Draw selection highlight and ping
                if (node.id === selectedNodeIdRef.current) {
                    const time = Date.now() * 0.005;
                    const pingSize = nodeRadius + 4 + Math.sin(time) * 4;
                    const pingAlpha = 0.5 + Math.sin(time) * 0.3;

                    ctx.strokeStyle = `rgba(8, 221, 221, ${pingAlpha})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, pingSize, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.strokeStyle = '#08DDDD';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeRadius + 4, 0, Math.PI * 2);
                    ctx.stroke();

                    // Pointer
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y - nodeRadius - 10);
                    ctx.lineTo(node.x, node.y - nodeRadius - 20);
                    ctx.stroke();
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };
        
        draw();
        
        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('mousedown', handleMouseDown);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const triggerPulse = () => {
        const queue: PulseData[] = [];
        nodesRef.current.forEach(node => {
            if (node.isSender) {
                node.currentValue = 3.0;
                queue.push({ node, energy: 1.5 });
            }
        });

        pulseStateRef.current = {
            active: true,
            queue,
            step: 0,
            lastPulseTime: Date.now()
        };
    };

    const handleLoadState = (savedNodes: any[], logic: string) => {
        setCurrentLogic(logic as Logic);
        
        // Create a map for fast lookup
        const savedMap = new Map(savedNodes.map(n => [n.id, n]));
        
        // Update current nodes
        nodesRef.current.forEach(node => {
            const saved = savedMap.get(node.id);
            if (saved) {
                node.baseValue = saved.baseValue;
                node.currentValue = saved.currentValue;
                node.isSender = saved.isSender;
            } else {
                // Reset if not in saved state
                node.baseValue = 1.0;
                node.currentValue = 1.0;
                node.isSender = false;
            }
        });
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#050505] text-[#e0e0e0] font-sans scanlines">
            <canvas ref={canvasRef} className="block w-full h-full absolute z-0" />

            <div className="absolute z-10 top-0 left-0 w-full h-full pointer-events-none p-6 flex flex-col justify-between">
                {/* Top Control Panel */}
                <div className="flex flex-col">
                    <AuthPanel />
                    <div className="pointer-events-auto bg-[#111318] border border-[#2a2d35] shadow-2xl p-6 rounded-xl max-w-sm relative overflow-hidden">
                        {/* Decorative hardware accent */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#08DDDD] to-transparent opacity-50"></div>
                        
                        <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white">TESANA COGNITIVE ENGINE</h1>
                            <p className="text-[10px] uppercase tracking-widest text-[#8E9299] font-mono mt-1">BRNS State Vector Sim // v2.4</p>
                        </div>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-[#08DDDD] animate-pulse shadow-[0_0_8px_#08DDDD]"></div>
                            <div className="w-2 h-2 rounded-full bg-[#2a2d35]"></div>
                            <div className="w-2 h-2 rounded-full bg-[#2a2d35]"></div>
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-[10px] uppercase tracking-widest text-[#8E9299] font-mono mb-2">Network Survival Logic</label>
                        <div className="relative">
                            <select 
                                value={currentLogic}
                                onChange={(e) => setCurrentLogic(e.target.value as Logic)}
                                className="w-full bg-[#0a0c10] border border-[#2a2d35] text-white p-2.5 text-sm font-mono outline-none appearance-none rounded-md focus:border-[#08DDDD] transition-colors cursor-pointer"
                            >
                                <option value="diversion">Diversion (Aetherium Routing)</option>
                                <option value="dam">The Dam (Weakest-Link: W(X))</option>
                                <option value="crush">The Crush (Multiplicative: C = Π x_i)</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8E9299]">
                                ▼
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-[10px] uppercase tracking-widest text-[#8E9299] font-mono mb-2">Search Node ID</label>
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="e.g. 10-5"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full bg-[#0a0c10] border border-[#2a2d35] text-white p-2.5 text-sm font-mono outline-none rounded-md focus:border-[#08DDDD] transition-colors"
                            />
                            {searchQuery && nodesRef.current.some(n => n.id === searchQuery) && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#08DDDD] text-[10px] font-mono">
                                    FOUND
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 mb-8">
                        <p className="text-[10px] uppercase tracking-widest text-[#8E9299] font-mono">Operations & Tools</p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentTool('select')}
                                className={`flex-1 py-2 text-xs font-mono border rounded-md transition-all duration-200 ${currentTool === 'select' ? 'bg-white/10 text-white border-white' : 'bg-[#0a0c10] text-[#8E9299] border-[#2a2d35] hover:border-white/50 hover:text-white'}`}
                            >
                                SELECT
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    setCurrentTool('sender');
                                    if (selectedNodeId) {
                                        const node = nodesRef.current.find(n => n.id === selectedNodeId);
                                        if (node) {
                                            node.isSender = true;
                                            node.baseValue = 1.0;
                                            node.currentValue = 2.5;
                                        }
                                    }
                                }}
                                className={`flex-1 py-2 text-xs font-mono border rounded-md transition-all duration-200 ${currentTool === 'sender' ? 'bg-[#08DDDD]/10 text-[#08DDDD] border-[#08DDDD] shadow-[inset_0_0_10px_rgba(8,221,221,0.2)]' : 'bg-[#0a0c10] text-[#8E9299] border-[#2a2d35] hover:border-[#08DDDD]/50 hover:text-white'}`}
                            >
                                SENDER
                            </button>
                            <button 
                                onClick={() => {
                                    setCurrentTool('break');
                                    if (selectedNodeId) {
                                        const node = nodesRef.current.find(n => n.id === selectedNodeId);
                                        if (node) {
                                            node.isSender = false;
                                            node.baseValue = 0.2;
                                            node.currentValue = 0.2;
                                        }
                                    }
                                }}
                                className={`flex-1 py-2 text-xs font-mono border rounded-md transition-all duration-200 ${currentTool === 'break' ? 'bg-[#ff3333]/10 text-[#ff3333] border-[#ff3333] shadow-[inset_0_0_10px_rgba(255,51,51,0.2)]' : 'bg-[#0a0c10] text-[#8E9299] border-[#2a2d35] hover:border-[#ff3333]/50 hover:text-white'}`}
                            >
                                BREAK
                            </button>
                        </div>
                        <button 
                            onClick={() => {
                                setCurrentTool('heal');
                                if (selectedNodeId) {
                                    const node = nodesRef.current.find(n => n.id === selectedNodeId);
                                    if (node) {
                                        node.isSender = false;
                                        node.baseValue = 1.0;
                                        node.currentValue = 1.0;
                                    }
                                }
                            }}
                            className={`w-full py-2 text-xs font-mono border rounded-md transition-all duration-200 ${currentTool === 'heal' ? 'bg-white/10 text-white border-white shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]' : 'bg-[#0a0c10] text-[#8E9299] border-[#2a2d35] hover:border-white/50 hover:text-white'}`}
                        >
                            HEAL (RESET)
                        </button>
                    </div>

                    <button 
                        onClick={triggerPulse}
                        className="w-full py-4 text-sm font-bold tracking-[0.2em] bg-[#0a0c10] border border-[#08DDDD] text-[#08DDDD] rounded-md hover:bg-[#08DDDD] hover:text-black hover:shadow-[0_0_20px_rgba(8,221,221,0.4)] transition-all duration-300 relative overflow-hidden group"
                    >
                        <span className="relative z-10">TRIGGER 40Hz PULSE</span>
                        <div className="absolute inset-0 bg-[#08DDDD] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-0"></div>
                    </button>
                </div>
                
                <AIControlPanel 
                    nodesRef={nodesRef} 
                    currentLogic={currentLogic} 
                    onLoadState={handleLoadState} 
                />
                </div>

                <NodeDetailsPanel 
                    nodeId={selectedNodeId} 
                    nodesRef={nodesRef} 
                    onClose={() => setSelectedNodeId(null)} 
                />

                {/* Bottom Legend Panel */}
                <div className="pointer-events-auto bg-[#111318] border border-[#2a2d35] shadow-2xl p-5 rounded-xl max-w-sm self-end">
                    <h2 className="text-[10px] uppercase tracking-widest text-[#8E9299] font-mono mb-4 border-b border-[#2a2d35] pb-2">BRNS Legend</h2>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-xs font-mono text-gray-300">
                            <div className="w-3 h-3 rounded-full bg-[#444] border border-[#666]"></div>
                            <span>&lt; 1.0 (Pre-Baseline / Unstable)</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono text-gray-300">
                            <div className="w-3 h-3 rounded-full bg-[#08DDDD] shadow-[0_0_8px_#08DDDD]"></div>
                            <span>= 1.0 (Deep Teal / Valid Vessel)</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono text-gray-300">
                            <div className="w-3 h-3 rounded-full bg-[#ff2222] shadow-[0_0_12px_#ff0000]"></div>
                            <span>&gt; 1.5 (Red Grid / Overcharge)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
