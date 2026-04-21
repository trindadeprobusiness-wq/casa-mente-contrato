import { useEffect } from 'react';

export const TRACKING_STORAGE_KEY = '@crm/tracking_data';

export interface TrackingData {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    fbclid?: string;
    gclid?: string;
    captured_at?: string;
}

export function useUTMTracker() {
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
        
        let foundTracking = false;
        const newTracking: Partial<TrackingData> = {};

        utmKeys.forEach(key => {
            const value = urlParams.get(key);
            if (value) {
                (newTracking as any)[key] = value;
                foundTracking = true;
            }
        });

        if (foundTracking) {
            newTracking.captured_at = new Date().toISOString();
            
            // Merge with existing if needed, but usually we overwrite with newest touchpoint
            const existing = localStorage.getItem(TRACKING_STORAGE_KEY);
            let merged = newTracking;
            
            if (existing) {
                try {
                    const parsed = JSON.parse(existing);
                    // Keep old data but overwrite with new params found
                    merged = { ...parsed, ...newTracking };
                } catch (e) {
                    console.error("Error parsing existing tracking data", e);
                }
            }

            localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(merged));
            console.log("UTM Tracking captured:", merged);
        }
    }, []);
}

export function getTrackingData(): TrackingData | null {
    const data = localStorage.getItem(TRACKING_STORAGE_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data) as TrackingData;
    } catch {
        return null;
    }
}

export function clearTrackingData() {
    localStorage.removeItem(TRACKING_STORAGE_KEY);
}
