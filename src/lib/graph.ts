import { db, DbGraphTriple } from './db';
import { encryptDataAsync, decryptDataAsync } from './crypto';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

export const addGraphTriple = async (subject: string, predicate: string, object: string, pin: string) => {
    const normalizedKey = `${subject}|${predicate}|${object}`.toLowerCase().trim();
    const hash = CryptoJS.SHA256(normalizedKey).toString();

    // Check hash in IndexedDB (O(1) lookup)
    const existing = await db.graphTriples.where('hash').equals(hash).first();
    if (existing) return;

    const encSubject = await encryptDataAsync(subject.toLowerCase().trim(), pin);
    const encPredicate = await encryptDataAsync(predicate.toLowerCase().trim(), pin);
    const encObject = await encryptDataAsync(object.toLowerCase().trim(), pin);

    const encTriple: DbGraphTriple = {
        id: uuidv4(),
        hash,
        subject: encSubject,
        predicate: encPredicate,
        object: encObject,
        createdAt: Date.now()
    };
    await db.graphTriples.put(encTriple);
}

export const getGraphTriples = async (pin: string) => {
    const triples = await db.graphTriples.toArray();
    return await Promise.all(triples.map(async t => ({
        ...t,
        decryptedSubject: await decryptDataAsync(t.subject, pin) || '',
        decryptedPredicate: await decryptDataAsync(t.predicate, pin) || '',
        decryptedObject: await decryptDataAsync(t.object, pin) || ''
    })));
}

// Full text search exact matcher
export const queryGraph = async (query: string, pin: string): Promise<string> => {
    const triples = await getGraphTriples(pin);
    const lowerQuery = query.toLowerCase();

    // Give high score if query contains the subject or object
    const matchedTriples = triples.filter(t => 
        lowerQuery.includes(t.decryptedSubject) || 
        lowerQuery.includes(t.decryptedObject) ||
        t.decryptedSubject.includes(lowerQuery) ||
        t.decryptedObject.includes(lowerQuery)
    );

    if (matchedTriples.length === 0) return '';

    return matchedTriples.map(t => `(${t.decryptedSubject}) - [${t.decryptedPredicate}] -> (${t.decryptedObject})`).join('\n');
}
