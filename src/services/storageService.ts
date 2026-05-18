import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

export async function saveSimulationState(name: string, logic: string, nodes: any[]) {
    if (!auth.currentUser) throw new Error("Authentication required");

    const nodesData = JSON.stringify(nodes.map(n => ({
        id: n.id,
        baseValue: n.baseValue,
        currentValue: n.currentValue,
        isSender: n.isSender
    })));

    try {
        return await addDoc(collection(db, 'simulations'), {
            name,
            logic,
            nodesData,
            authorId: auth.currentUser.uid,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'simulations');
    }
}

export async function loadSimulationStates() {
    if (!auth.currentUser) throw new Error("Authentication required");

    try {
        const q = query(collection(db, 'simulations'), where('authorId', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'simulations');
    }
}

export async function deleteSimulationState(id: string) {
    if (!auth.currentUser) throw new Error("Authentication required");
    try {
        await deleteDoc(doc(db, 'simulations', id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `simulations/${id}`);
    }
}
