/**
 * Audit Service for NeuroAudit V2
 * Logs all critical user actions to ensure clinical integrity.
 */

class AuditService {
    constructor() {
        this.logs = [];
    }

    log(user, action, entityId, metadata = {}) {
        const entry = {
            id: `LOG-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            user,
            action,
            entityId,
            metadata
        };
        this.logs.push(entry);
        console.group(`[AUDIT TRAIL] ${action}`);
        console.log(`User: ${user}`);
        console.log(`Entity: ${entityId}`);
        console.log(`Timestamp: ${entry.timestamp}`);
        console.log('Metadata:', metadata);
        console.groupEnd();
        return entry;
    }

    getLogs() {
        return [...this.logs];
    }
}

export const auditService = new AuditService();
