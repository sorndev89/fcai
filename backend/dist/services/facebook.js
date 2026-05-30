"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUserProfile = fetchUserProfile;
exports.sendTextMessage = sendTextMessage;
/**
 * Fetches user profile from Facebook Graph API.
 * Falls back to mock data if the pageAccessToken is set to a simulator value.
 */
async function fetchUserProfile(psid, pageAccessToken) {
    // If in mock/simulator mode
    if (pageAccessToken.startsWith('mock') || pageAccessToken === 'test') {
        return {
            firstName: 'Facebook',
            lastName: `User_${psid.slice(0, 4)}`,
            fullName: `Facebook User_${psid.slice(0, 4)}`,
            profilePic: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        };
    }
    try {
        const url = `https://graph.facebook.com/${psid}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Graph API returned status ${response.status}`);
        }
        const data = (await response.json());
        return {
            firstName: data.first_name || 'Guest',
            lastName: data.last_name || 'User',
            fullName: `${data.first_name || 'Guest'} ${data.last_name || 'User'}`.trim(),
            profilePic: data.profile_pic || '',
        };
    }
    catch (error) {
        console.error(`Error fetching FB user profile (PSID: ${psid}):`, error);
        // Safe fallback
        return {
            firstName: 'Guest',
            lastName: 'User',
            fullName: 'Guest User',
            profilePic: '',
        };
    }
}
/**
 * Sends a text message to a user via Facebook Messenger Send API.
 * Simulates sending if pageAccessToken is set to a simulator value.
 */
async function sendTextMessage(recipientPsid, text, pageAccessToken) {
    console.log(`[Facebook API] Sending reply to PSID ${recipientPsid}: "${text.slice(0, 60)}..."`);
    if (pageAccessToken.startsWith('mock') || pageAccessToken === 'test') {
        console.log(`[Facebook API] [SIMULATOR] Message successfully simulated for PSID ${recipientPsid}`);
        return true;
    }
    try {
        const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipient: { id: recipientPsid },
                message: { text: text },
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Graph Send API failed: ${response.status} - ${errorText}`);
        }
        return true;
    }
    catch (error) {
        console.error(`Error sending FB message to PSID ${recipientPsid}:`, error);
        return false;
    }
}
//# sourceMappingURL=facebook.js.map