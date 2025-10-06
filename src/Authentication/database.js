/**
 * Database Handler for Authentication Module
 * Centralized database operations for MFA/2FA functionality
 */

import {
    collection,
    deleteDoc,
    disableNetwork,
    doc,
    enableNetwork,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Database connection status
 */
let isConnected = true;

/**
 * Check database connection status
 * @returns {boolean} - True if connected
 */
export const isDatabaseConnected = () => {
    return isConnected;
};

/**
 * Enable database network connection
 */
export const enableDatabaseConnection = async () => {
    try {
        await enableNetwork(db);
        isConnected = true;
        console.log('Database connection enabled');
    } catch (error) {
        console.error('Failed to enable database connection:', error);
        isConnected = false;
    }
};

/**
 * Disable database network connection
 */
export const disableDatabaseConnection = async () => {
    try {
        await disableNetwork(db);
        isConnected = false;
        console.log('Database connection disabled');
    } catch (error) {
        console.error('Failed to disable database connection:', error);
    }
};

/**
 * Test database connection
 * @returns {Promise<boolean>} - True if connection is working
 */
export const testDatabaseConnection = async () => {
    try {
        // Try to read a simple document to test connection
        const testRef = doc(db, 'test', 'connection');
        await getDoc(testRef);
        isConnected = true;
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error);
        isConnected = false;
        return false;
    }
};

/**
 * Get database instance
 * @returns {object} - Firestore database instance
 */
export const getDatabase = () => {
    return db;
};

/**
 * Create a batch for multiple operations
 * @returns {object} - Firestore batch instance
 */
export const createBatch = () => {
    return writeBatch(db);
};

/**
 * Commit a batch operation
 * @param {object} batch - Firestore batch instance
 * @returns {Promise<void>}
 */
export const commitBatch = async (batch) => {
    try {
        await batch.commit();
        console.log('Batch operation committed successfully');
    } catch (error) {
        console.error('Failed to commit batch:', error);
        throw error;
    }
};

/**
 * Database operation wrapper with error handling
 * @param {Function} operation - Database operation function
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise<any>} - Operation result
 */
export const withErrorHandling = async (operation, operationName = 'Database operation') => {
    try {
        if (!isConnected) {
            throw new Error('Database connection is not available');
        }
        
        const result = await operation();
        console.log(`${operationName} completed successfully`);
        return result;
    } catch (error) {
        console.error(`${operationName} failed:`, error);
        
        // Handle specific Firebase errors
        if (error.code) {
            switch (error.code) {
                case 'permission-denied':
                    throw new Error('Permission denied. Please check your authentication.');
                case 'unavailable':
                    throw new Error('Database is temporarily unavailable. Please try again.');
                case 'deadline-exceeded':
                    throw new Error('Operation timed out. Please try again.');
                case 'resource-exhausted':
                    throw new Error('Database quota exceeded. Please contact support.');
                default:
                    throw new Error(`Database error: ${error.message}`);
            }
        }
        
        throw error;
    }
};

/**
 * Get server timestamp
 * @returns {object} - Server timestamp
 */
export const getServerTimestamp = () => {
    return serverTimestamp();
};

/**
 * Create document reference
 * @param {string} collectionPath - Collection path
 * @param {string} docId - Document ID
 * @returns {object} - Document reference
 */
export const createDocRef = (collectionPath, docId) => {
    return doc(db, collectionPath, docId);
};

/**
 * Create collection reference
 * @param {string} collectionPath - Collection path
 * @returns {object} - Collection reference
 */
export const createCollectionRef = (collectionPath) => {
    return collection(db, collectionPath);
};

/**
 * Generic document operations
 */
export const documentOperations = {
    /**
     * Get document
     * @param {string} collectionPath - Collection path
     * @param {string} docId - Document ID
     * @returns {Promise<object|null>} - Document data or null
     */
    get: async (collectionPath, docId) => {
        return withErrorHandling(async () => {
            const docRef = createDocRef(collectionPath, docId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                };
            }
            return null;
        }, `Get document ${docId} from ${collectionPath}`);
    },

    /**
     * Set document
     * @param {string} collectionPath - Collection path
     * @param {string} docId - Document ID
     * @param {object} data - Document data
     * @param {boolean} merge - Whether to merge with existing data
     * @returns {Promise<boolean>} - Success status
     */
    set: async (collectionPath, docId, data, merge = false) => {
        return withErrorHandling(async () => {
            const docRef = createDocRef(collectionPath, docId);
            await setDoc(docRef, data, { merge });
            return true;
        }, `Set document ${docId} in ${collectionPath}`);
    },

    /**
     * Update document
     * @param {string} collectionPath - Collection path
     * @param {string} docId - Document ID
     * @param {object} data - Update data
     * @returns {Promise<boolean>} - Success status
     */
    update: async (collectionPath, docId, data) => {
        return withErrorHandling(async () => {
            const docRef = createDocRef(collectionPath, docId);
            await updateDoc(docRef, data);
            return true;
        }, `Update document ${docId} in ${collectionPath}`);
    },

    /**
     * Delete document
     * @param {string} collectionPath - Collection path
     * @param {string} docId - Document ID
     * @returns {Promise<boolean>} - Success status
     */
    delete: async (collectionPath, docId) => {
        return withErrorHandling(async () => {
            const docRef = createDocRef(collectionPath, docId);
            await deleteDoc(docRef);
            return true;
        }, `Delete document ${docId} from ${collectionPath}`);
    }
};

/**
 * Generic collection operations
 */
export const collectionOperations = {
    /**
     * Get all documents in collection
     * @param {string} collectionPath - Collection path
     * @param {object} options - Query options
     * @returns {Promise<Array>} - Array of documents
     */
    getAll: async (collectionPath, options = {}) => {
        return withErrorHandling(async () => {
            const collectionRef = createCollectionRef(collectionPath);
            let q = collectionRef;

            // Apply filters
            if (options.where) {
                options.where.forEach(filter => {
                    q = query(q, where(filter.field, filter.operator, filter.value));
                });
            }

            // Apply ordering
            if (options.orderBy) {
                options.orderBy.forEach(order => {
                    q = query(q, orderBy(order.field, order.direction || 'asc'));
                });
            }

            // Apply limit
            if (options.limit) {
                q = query(q, limit(options.limit));
            }

            const querySnapshot = await getDocs(q);
            const documents = [];
            
            querySnapshot.forEach((doc) => {
                documents.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return documents;
        }, `Get all documents from ${collectionPath}`);
    },

    /**
     * Listen to collection changes
     * @param {string} collectionPath - Collection path
     * @param {Function} callback - Callback function
     * @param {object} options - Query options
     * @returns {Function} - Unsubscribe function
     */
    listen: (collectionPath, callback, options = {}) => {
        const collectionRef = createCollectionRef(collectionPath);
        let q = collectionRef;

        // Apply filters
        if (options.where) {
            options.where.forEach(filter => {
                q = query(q, where(filter.field, filter.operator, filter.value));
            });
        }

        // Apply ordering
        if (options.orderBy) {
            options.orderBy.forEach(order => {
                q = query(q, orderBy(order.field, order.direction || 'asc'));
            });
        }

        // Apply limit
        if (options.limit) {
            q = query(q, limit(options.limit));
        }

        return onSnapshot(q, (querySnapshot) => {
            const documents = [];
            querySnapshot.forEach((doc) => {
                documents.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            callback(documents);
        }, (error) => {
            console.error(`Error listening to ${collectionPath}:`, error);
        });
    }
};

/**
 * MFA-specific database operations
 */
export const mfaOperations = {
    /**
     * Get MFA data for admin
     * @param {string} adminId - Admin ID
     * @returns {Promise<object|null>} - MFA data or null
     */
    getMFAData: async (adminId) => {
        return documentOperations.get('admins', `${adminId}/mfa/totp`);
    },

    /**
     * Set MFA data for admin
     * @param {string} adminId - Admin ID
     * @param {object} mfaData - MFA data
     * @returns {Promise<boolean>} - Success status
     */
    setMFAData: async (adminId, mfaData) => {
        const dataWithTimestamp = {
            ...mfaData,
            lastUpdated: getServerTimestamp()
        };
        return documentOperations.set('admins', `${adminId}/mfa/totp`, dataWithTimestamp, true);
    },

    /**
     * Update MFA data for admin
     * @param {string} adminId - Admin ID
     * @param {object} updateData - Update data
     * @returns {Promise<boolean>} - Success status
     */
    updateMFAData: async (adminId, updateData) => {
        const dataWithTimestamp = {
            ...updateData,
            lastUpdated: getServerTimestamp()
        };
        return documentOperations.update('admins', `${adminId}/mfa/totp`, dataWithTimestamp);
    },

    /**
     * Delete MFA data for admin
     * @param {string} adminId - Admin ID
     * @returns {Promise<boolean>} - Success status
     */
    deleteMFAData: async (adminId) => {
        return documentOperations.delete('admins', `${adminId}/mfa/totp`);
    },

    /**
     * Get all admins with MFA enabled
     * @returns {Promise<Array>} - Array of admin MFA data
     */
    getAllMFAEnabledAdmins: async () => {
        return collectionOperations.getAll('admins', {
            where: [ { field: 'mfa.totp.enabled', operator: '==', value: true } ]
        });
    }
};

/**
 * Initialize database connection
 * @returns {Promise<boolean>} - Connection status
 */
export const initializeDatabase = async () => {
    try {
        console.log('Initializing database connection...');
        
        // Test connection
        const isConnected = await testDatabaseConnection();
        
        if (isConnected) {
            console.log('Database connection established successfully');
        } else {
            console.warn('Database connection test failed, but continuing...');
        }
        
        return isConnected;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        return false;
    }
};

// Auto-initialize database connection
initializeDatabase();
