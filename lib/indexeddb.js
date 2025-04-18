// IndexedDB wrapper
const idb = {
    openDB: async function(name, version, { upgrade } = {}) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(name, version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            if (upgrade) {
                request.onupgradeneeded = (event) => {
                    upgrade(request.result, event.oldVersion, event.newVersion, request.transaction);
                };
            }
        });
    },
    
    deleteDB: async function(name) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(name);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
}; 