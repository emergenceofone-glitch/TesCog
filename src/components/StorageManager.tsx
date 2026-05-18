import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { saveSimulationState, loadSimulationStates, deleteSimulationState } from '../services/storageService';
import { Trash2, Download, Save, Cloud } from 'lucide-react';

interface StorageManagerProps {
    nodesRef: React.MutableRefObject<any[]>;
    currentLogic: string;
    onLoadState: (nodesData: any[], logic: string) => void;
}

export function StorageManager({ nodesRef, currentLogic, onLoadState }: StorageManagerProps) {
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [savedStates, setSavedStates] = useState<any[]>([]);
    const [showList, setShowList] = useState(false);

    const handleSave = async () => {
        if (!auth.currentUser) return;
        const name = prompt("Enter designation for this simulation state:");
        if (!name) return;

        setSaving(true);
        try {
            await saveSimulationState(name, currentLogic, nodesRef.current);
            // Refresh list if it's open
            if (showList) fetchStates();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const fetchStates = async () => {
        setLoading(true);
        try {
            const states = await loadSimulationStates();
            setSavedStates(states || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleList = () => {
        const next = !showList;
        setShowList(next);
        if (next) fetchStates();
    };

    const handleLoad = (state: any) => {
        try {
            const parsedNodes = JSON.parse(state.nodesData);
            onLoadState(parsedNodes, state.logic);
            setShowList(false);
        } catch (e) {
            console.error("Failed to parse state", e);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Confirm permanent deletion of this state vector?")) return;
        try {
            await deleteSimulationState(id);
            setSavedStates(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <button 
                    disabled={saving || !auth.currentUser}
                    onClick={handleSave}
                    className={`flex-1 py-2 text-[10px] font-bold tracking-widest font-mono border rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
                        !auth.currentUser 
                        ? 'border-[#2a2d35] text-[#444] cursor-not-allowed'
                        : 'bg-[#0a0c10] border-[#08DDDD]/30 text-[#08DDDD] hover:bg-[#08DDDD] hover:text-black'
                    }`}
                >
                    <Save size={12} />
                    {saving ? 'SYNCING...' : 'SAVE'}
                </button>
                <button 
                    disabled={!auth.currentUser}
                    onClick={handleToggleList}
                    className={`flex-1 py-2 text-[10px] font-bold tracking-widest font-mono border rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
                        !auth.currentUser 
                        ? 'border-[#2a2d35] text-[#444] cursor-not-allowed'
                        : showList ? 'bg-[#08DDDD] text-black border-[#08DDDD]' : 'bg-[#0a0c10] border-[#08DDDD]/30 text-[#08DDDD] hover:bg-[#08DDDD] hover:text-black'
                    }`}
                >
                    <Cloud size={12} />
                    {showList ? 'CLOSE' : 'RECALL'}
                </button>
            </div>

            {showList && (
                <div className="mt-2 bg-[#0a0c10] border border-[#2a2d35] rounded-lg overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-4 text-center text-[10px] text-[#8E9299] font-mono animate-pulse">
                            RETRIEVING CLOUD INDEX...
                        </div>
                    ) : savedStates.length === 0 ? (
                        <div className="p-4 text-center text-[10px] text-[#8E9299] font-mono">
                            NO SAVED VECTORS FOUND
                        </div>
                    ) : (
                        <div className="divide-y divide-[#2a2d35]">
                            {savedStates.map(state => (
                                <div 
                                    key={state.id}
                                    onClick={() => handleLoad(state)}
                                    className="p-3 hover:bg-[#1a1d23] cursor-pointer group transition-colors flex justify-between items-center"
                                >
                                    <div>
                                        <p className="text-xs font-mono text-[#08DDDD] truncate max-w-[140px] uppercase">{state.name}</p>
                                        <p className="text-[9px] font-mono text-[#444] uppercase tracking-tighter">{state.logic} // {new Date(state.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={(e) => handleDelete(e, state.id)}
                                            className="p-1 text-[#444] hover:text-[#ff3333] transition-colors"
                                            title="Purge"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        <div className="p-1 text-[#08DDDD] opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Download size={12} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
