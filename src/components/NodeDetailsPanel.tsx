/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useState, useRef } from 'react';

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

interface NodeDetailsPanelProps {
    nodeId: string | null;
    nodesRef: React.MutableRefObject<Node[]>;
    onClose: () => void;
}

export function NodeDetailsPanel({ nodeId, nodesRef, onClose }: NodeDetailsPanelProps) {
    const [displayNode, setDisplayNode] = useState<Node | null>(null);
    const requestRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const update = () => {
            if (nodeId) {
                const node = nodesRef.current.find(n => n.id === nodeId);
                if (node) {
                    setDisplayNode({ ...node }); // Shallow copy to trigger re-render
                } else {
                    setDisplayNode(null);
                }
            } else {
                setDisplayNode(null);
            }
            requestRef.current = requestAnimationFrame(update);
        };

        requestRef.current = requestAnimationFrame(update);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [nodeId, nodesRef]);

    if (!nodeId || !displayNode) return null;

    return (
        <div className="pointer-events-auto bg-[#111318] border border-[#2a2d35] shadow-2xl p-6 rounded-xl max-w-sm absolute right-6 top-6 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#08DDDD] to-transparent opacity-50"></div>
            
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">Node Diagnostics</h2>
                    <p className="text-[10px] uppercase tracking-widest text-[#8E9299] font-mono mt-1">ID: {displayNode.id}</p>
                </div>
                <button 
                    onClick={onClose}
                    className="text-[#8E9299] hover:text-white transition-colors p-1"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-[#8E9299] uppercase text-[9px]">Coordinates</p>
                        <p className="text-white">X: {displayNode.x.toFixed(1)}</p>
                        <p className="text-white">Y: {displayNode.y.toFixed(1)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[#8E9299] uppercase text-[9px]">Grid Position</p>
                        <p className="text-white">Row: {displayNode.row}</p>
                        <p className="text-white">Col: {displayNode.col}</p>
                    </div>
                </div>

                <div className="space-y-2 border-t border-[#2a2d35] pt-4">
                    <div className="flex justify-between">
                        <p className="text-[#8E9299] uppercase text-[9px]">Base Value</p>
                        <p className="text-white">{displayNode.baseValue.toFixed(4)}</p>
                    </div>
                    <div className="flex justify-between">
                        <p className="text-[#8E9299] uppercase text-[9px]">Current Vector</p>
                        <p className={displayNode.currentValue > 1.5 ? "text-[#ff3333]" : displayNode.currentValue < 0.9 ? "text-[#666]" : "text-[#08DDDD]"}>
                            {displayNode.currentValue.toFixed(4)}
                        </p>
                    </div>
                </div>

                <div className="space-y-2 border-t border-[#2a2d35] pt-4">
                    <p className="text-[#8E9299] uppercase text-[9px] mb-2">Direct Override Controls</p>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const node = nodesRef.current.find(n => n.id === nodeId);
                                    if (node) {
                                        node.isSender = !node.isSender;
                                        if (node.isSender) {
                                            node.baseValue = 1.0;
                                            node.currentValue = 2.5;
                                        }
                                    }
                                }}
                                className={`flex-1 py-1.5 border rounded transition-all text-[10px] ${displayNode.isSender ? 'bg-[#08DDDD]/20 border-[#08DDDD] text-[#08DDDD]' : 'bg-[#0a0c10] border-[#2a2d35] text-[#8E9299] hover:text-white hover:border-[#08DDDD]'}`}
                            >
                                {displayNode.isSender ? 'REVOKE SENDER' : 'ASSIGN SENDER'}
                            </button>
                            <button 
                                onClick={() => {
                                    const node = nodesRef.current.find(n => n.id === nodeId);
                                    if (node) {
                                        node.isSender = false;
                                        node.baseValue = 1.0;
                                        node.currentValue = 1.0;
                                    }
                                }}
                                className="flex-1 py-1.5 bg-[#0a0c10] border border-[#2a2d35] text-[#8E9299] hover:text-white hover:border-white rounded transition-all text-[10px]"
                            >
                                HEAL/RESET
                            </button>
                        </div>
                        <button 
                            onClick={() => {
                                const node = nodesRef.current.find(n => n.id === nodeId);
                                if (node) {
                                    node.isSender = false;
                                    node.baseValue = 0.2;
                                    node.currentValue = 0.2;
                                }
                            }}
                            className="w-full py-1.5 bg-[#0a0c10] border border-[#ff3333]/30 text-[#ff3333] hover:bg-[#ff3333]/10 rounded transition-all text-[10px]"
                        >
                            INJECT INSTABILITY
                        </button>
                    </div>

                    <div className="mt-4 space-y-1">
                        <div className="flex justify-between items-center text-[9px] uppercase text-[#8E9299]">
                            <span>Base Value Tuning</span>
                            <span className="text-white">{displayNode.baseValue.toFixed(2)}</span>
                        </div>
                        <input 
                            type="range"
                            min="0"
                            max="3"
                            step="0.05"
                            value={displayNode.baseValue}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const node = nodesRef.current.find(n => n.id === nodeId);
                                if (node) {
                                    node.baseValue = val;
                                    // If we are healing manualy, don't force currentValue immediately 
                                    // but let it stabilize via the draw loop logic
                                }
                            }}
                            className="w-full h-1 bg-[#2a2d35] rounded-lg appearance-none cursor-pointer accent-[#08DDDD]"
                        />
                    </div>
                </div>

                <div className="space-y-2 border-t border-[#2a2d35] pt-4">
                    <p className="text-[#8E9299] uppercase text-[9px]">Relational Links ({displayNode.neighbors.length})</p>
                    <div className="max-h-24 overflow-y-auto custom-scrollbar flex flex-wrap gap-1">
                        {displayNode.neighbors.map(n => (
                            <span key={n.id} className="bg-[#0a0c10] border border-[#2a2d35] px-1.5 py-0.5 rounded text-[9px] text-gray-400">
                                {n.id}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
