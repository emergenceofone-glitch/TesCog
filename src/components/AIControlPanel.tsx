import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { analyzeNetwork, getRealWorldAnalogies } from '../services/aiService';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

interface AIControlPanelProps {
    nodesRef: React.MutableRefObject<any[]>;
    currentLogic: string;
    onLoadState: (nodesData: any[], logic: string) => void;
}

export function AIControlPanel({ nodesRef, currentLogic, onLoadState }: AIControlPanelProps) {
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [analogiesResult, setAnalogiesResult] = useState<string | null>(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [loadingAnalogies, setLoadingAnalogies] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingStates, setLoadingStates] = useState(false);
    const [savedStates, setSavedStates] = useState<any[]>([]);

    const handleAnalyze = async () => {
        setLoadingAnalysis(true);
        try {
            const result = await analyzeNetwork(nodesRef.current, currentLogic);
            setAnalysisResult(result);
        } catch (error) {
            console.error(error);
            setAnalysisResult("Error analyzing network.");
        } finally {
            setLoadingAnalysis(false);
        }
    };

    const handleAnalogies = async () => {
        setLoadingAnalogies(true);
        try {
            const result = await getRealWorldAnalogies(currentLogic);
            setAnalogiesResult(result);
        } catch (error) {
            console.error(error);
            setAnalogiesResult("Error fetching analogies.");
        } finally {
            setLoadingAnalogies(false);
        }
    };

    const handleSaveState = async () => {
        if (!auth.currentUser) return alert("Must be authenticated to save state.");
        setSaving(true);
        try {
            const stateName = prompt("Enter a name for this simulation state:") || "Untitled State";
            const nodesData = JSON.stringify(nodesRef.current.map(n => ({
                id: n.id,
                baseValue: n.baseValue,
                currentValue: n.currentValue,
                isSender: n.isSender
            })));

            await addDoc(collection(db, 'simulations'), {
                name: stateName,
                logic: currentLogic,
                nodesData,
                authorId: auth.currentUser.uid,
                createdAt: serverTimestamp()
            });
            alert("State saved successfully.");
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'simulations');
        } finally {
            setSaving(false);
        }
    };

    const handleLoadStates = async () => {
        if (!auth.currentUser) return alert("Must be authenticated to load state.");
        setLoadingStates(true);
        try {
            const q = query(collection(db, 'simulations'), where('authorId', '==', auth.currentUser.uid));
            const snapshot = await getDocs(q);
            const states = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedStates(states);
        } catch (error) {
            handleFirestoreError(error, OperationType.LIST, 'simulations');
        } finally {
            setLoadingStates(false);
        }
    };

    const applyState = (state: any) => {
        try {
            const parsedNodes = JSON.parse(state.nodesData);
            onLoadState(parsedNodes, state.logic);
            setSavedStates([]); // close menu
        } catch (e) {
            console.error("Failed to parse state", e);
        }
    };

    return (
        <div className="pointer-events-auto bg-[#111318] border border-[#2a2d35] shadow-2xl p-5 rounded-xl max-w-sm mt-4 relative overflow-hidden flex flex-col gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-[10px] uppercase tracking-widest text-[#8E9299] font-mono border-b border-[#2a2d35] pb-2">AI Intelligence & Storage</h2>
            
            <div className="flex gap-2">
                <button 
                    onClick={handleAnalyze} disabled={loadingAnalysis}
                    className="flex-1 py-2 text-xs font-mono border border-[#08DDDD] text-[#08DDDD] rounded hover:bg-[#08DDDD] hover:text-black transition-colors disabled:opacity-50"
                >
                    {loadingAnalysis ? 'ANALYZING...' : 'ANALYZE NETWORK'}
                </button>
                <button 
                    onClick={handleAnalogies} disabled={loadingAnalogies}
                    className="flex-1 py-2 text-xs font-mono border border-[#08DDDD] text-[#08DDDD] rounded hover:bg-[#08DDDD] hover:text-black transition-colors disabled:opacity-50"
                >
                    {loadingAnalogies ? 'SEARCHING...' : 'REAL-WORLD ANALOGIES'}
                </button>
            </div>

            {analysisResult && (
                <div className="bg-[#0a0c10] p-3 rounded border border-[#2a2d35] text-xs font-mono text-gray-300">
                    <span className="text-[#08DDDD] block mb-1 tracking-widest">&gt;&gt; ANALYSIS REPORT:</span>
                    <div className="markdown-body">
                        <ReactMarkdown>{analysisResult}</ReactMarkdown>
                    </div>
                </div>
            )}

            {analogiesResult && (
                <div className="bg-[#0a0c10] p-3 rounded border border-[#2a2d35] text-xs font-mono text-gray-300">
                    <span className="text-[#08DDDD] block mb-1 tracking-widest">&gt;&gt; SEARCH GROUNDING:</span>
                    <div className="markdown-body">
                        <ReactMarkdown>{analogiesResult}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
}
