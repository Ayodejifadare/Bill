// Contacts API utility for cross-platform contact access
// This handles web limitations and provides fallbacks

import type { MatchedContact } from '../components/contact-sync/types';
import { toast } from 'sonner';
import { apiClient } from './apiClient';

export type ContactErrorCode =
  | 'permission-denied'
  | 'network-failure'
  | 'invalid-file'
  | 'default';

const CONTACT_ERROR_MESSAGES: Record<ContactErrorCode, string> = {
  'permission-denied':
    'Contact access denied. Please enable permissions and try again.',
  'network-failure':
    'Network error. Please check your connection and try again.',
  'invalid-file':
    'Invalid file. Please use a supported contacts file.',
  default: 'Contact operation failed. Please try again.'
};

export function showContactError(
  typeOrMessage: ContactErrorCode | string = 'default',
  fallback?: string
): void {
  const message =
    CONTACT_ERROR_MESSAGES[typeOrMessage as ContactErrorCode] ||
    fallback ||
    String(typeOrMessage);
  toast.error(message);
}

export interface Contact {
  id: string;
  name: string;
  phoneNumbers: string[];
  emails: string[];
  displayName: string;
}

export interface ContactPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

class ContactsAPI {
  private static instance: ContactsAPI;
  
  static getInstance(): ContactsAPI {
    if (!ContactsAPI.instance) {
      ContactsAPI.instance = new ContactsAPI();
    }
    return ContactsAPI.instance;
  }

  // Check if contacts API is supported
  isSupported(): boolean {
    // Check for Contacts API (experimental, limited browser support)
    if ('contacts' in navigator && 'ContactsManager' in window) {
      return true;
    }
    
    // Check for File System Access API (can be used for contact import)
    // Note: This may fail in cross-origin contexts, so we'll handle that gracefully
    if ('showOpenFilePicker' in window) {
      return true;
    }
    
    // Mobile app environment detection (would be true in Capacitor/Cordova/React Native)
    const isMobileApp = window.location.protocol === 'file:' ||
                       window.location.hostname === 'localhost' ||
                       'Capacitor' in window ||
                       'cordova' in window;
    
    return isMobileApp;
  }

  // Check if we're in a cross-origin context that may restrict file access
  isInCrossOriginContext(): boolean {
    try {
      // Check if we're in an iframe
      if (window !== window.top) {
        return true;
      }
      
      // Check if showOpenFilePicker is available but may be restricted
      if ('showOpenFilePicker' in window) {
        // Try to detect if we're in a restricted context
        // This is a heuristic check - not foolproof but helps
        return window.location.hostname !== 'localhost' && 
               (window.location.protocol === 'https:' || window.location.protocol === 'http:') &&
               window.parent !== window;
      }
      
      return false;
    } catch (error) {
      // If we can't access window.top, we're likely in a cross-origin iframe
      return true;
    }
  }

  // Check if traditional file input should be used
  shouldUseFileInput(): boolean {
    return !('showOpenFilePicker' in window) || this.isInCrossOriginContext();
  }

  // Check current permission status
  async checkPermissionStatus(): Promise<ContactPermissionStatus> {
    try {
      // Mobile platforms (Capacitor/Cordova) typically handle permissions internally
      if ('Capacitor' in window) {
        // const { Contacts } = Capacitor.Plugins;
        // const permission = await Contacts.checkPermissions();
        // const state = permission?.contacts;
        // return { granted: state === 'granted', denied: state === 'denied', prompt: state === 'prompt' };
      }

      if ('cordova' in window && window.cordova?.plugins?.contacts) {
        return { granted: true, denied: false, prompt: false };
      }

      // Browser Permissions API
      if (typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
        try {
          const result = await (navigator as any).permissions.query({ name: 'contacts' as any });
          return {
            granted: result.state === 'granted',
            denied: result.state === 'denied',
            prompt: result.state === 'prompt',
          };
        } catch (error) {
          // Permission name not supported; fall through to default
        }
      }

      // Default to prompting if status cannot be determined
      return { granted: false, denied: false, prompt: true };
    } catch (error) {
      console.warn('Failed to check contact permission status:', error);
      return { granted: false, denied: true, prompt: false };
    }
  }

  // Request permission to access contacts
  async requestPermission(): Promise<ContactPermissionStatus> {
    try {
      // For actual mobile apps, this uses platform-specific APIs
      if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.Contacts) {
        try {
          const permission = await window.Capacitor.Plugins.Contacts.requestPermissions();
          const status = permission?.contacts || permission?.contactsPermission || permission;
          return {
            granted: status === 'granted',
            denied: status === 'denied',
            prompt: status === 'prompt' || status === 'prompt-with-rationale'
          };
        } catch (error) {
          console.warn('Capacitor permission request failed:', error);
        }
      }

      if (typeof window !== 'undefined' && window.cordova?.plugins?.contacts) {
        // Cordova implementation with runtime permission request
        const permissions = window.cordova.plugins.permissions;
        if (permissions?.requestPermission) {
          const permission = permissions.CONTACTS || permissions.READ_CONTACTS;
          return new Promise(resolve => {
            permissions.requestPermission(
              permission,
              () => resolve({ granted: true, denied: false, prompt: false }),
              () => resolve({ granted: false, denied: true, prompt: false })
            );
          });
        }

        // If no separate permission API, assume granted (plugin will handle)
        return { granted: true, denied: false, prompt: false };
      }

      // Web Contacts API (very limited browser support)
      if ('contacts' in navigator) {
        try {
          // This will likely fail in most browsers
          await (navigator as any).contacts.select(['name', 'tel', 'email']);
          return { granted: true, denied: false, prompt: false };
        } catch (error) {
          return { granted: false, denied: true, prompt: false };
        }
      }

      // Fallback for web: simulate permission (demo mode)
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ granted: true, denied: false, prompt: false });
        }, 1000);
      });
      
    } catch (error) {
      console.warn('Contact permission request failed:', error);
      return { granted: false, denied: true, prompt: false };
    }
  }

  // Get contacts from device or file import
  async getContacts(): Promise<Contact[]> {
    try {
      // Capacitor/Ionic implementation
      if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.Contacts) {
        try {
          const result = await window.Capacitor.Plugins.Contacts.getContacts();
          const contacts = Array.isArray(result) ? result : result.contacts;
          return this.normalizeContacts(contacts);
        } catch (error) {
          console.warn('Capacitor getContacts failed:', error);
        }
      }

      // Cordova implementation
      if ('cordova' in window && window.cordova?.plugins?.contacts) {
        return new Promise((resolve, reject) => {
          const options = {
            filter: '',
            multiple: true,
            desiredFields: ['displayName', 'name', 'phoneNumbers', 'emails']
          };
          
          window.cordova.plugins.contacts.find(
            ['displayName', 'name', 'phoneNumbers', 'emails'],
            (contacts: any[]) => {
              resolve(this.normalizeContacts(contacts));
            },
            reject,
            options
          );
        });
      }

      // Web Contacts API (experimental)
      if ('contacts' in navigator) {
        try {
          const contacts = await (navigator as any).contacts.select(
            ['name', 'tel', 'email'],
            { multiple: true }
          );
          return this.normalizeContacts(contacts);
        } catch (error) {
          console.warn('Web Contacts API failed:', error);
        }
      }

      // For demo/web testing, return mock data if no real contacts available
      // This allows the demo to work even when file import fails
      return this.getMockContacts();
      
    } catch (error) {
      console.error('Failed to get contacts:', error);
      return [];
    }
  }

  // Separate method specifically for file import
  async importContactsFromFile(): Promise<Contact[]> {
    try {
      // Try modern file picker first (if available and not in cross-origin context)
      if ('showOpenFilePicker' in window && !this.isInCrossOriginContext()) {
        try {
          const fileHandles = await (window as any).showOpenFilePicker({
            types: [{
              description: 'Contact files',
              accept: {
                'text/csv': ['.csv'],
                'text/vcard': ['.vcf', '.vcard'],
              },
            }],
            multiple: false
          });
          
          if (fileHandles.length > 0) {
            const file = await fileHandles[0].getFile();
            const contacts = await this.parseContactFile(file);
            return contacts;
          }
        } catch (error) {
          if (error.name === 'SecurityError') {
            console.warn('File picker not available in cross-origin context, falling back to file input');
            throw new Error('CROSS_ORIGIN_RESTRICTION');
          }
          console.warn('File picker cancelled or failed:', error);
          throw error;
        }
      }

      // Fallback: Traditional file input (works in cross-origin contexts)
      const file = await this.openFileInput();
      if (file) {
        const contacts = await this.parseContactFile(file);
        return contacts;
      } else {
        throw new Error('No file selected');
      }
      
    } catch (error) {
      console.error('Failed to import contacts from file:', error);
      throw error;
    }
  }

  // Open file using traditional HTML file input (works in cross-origin contexts)
  private async openFileInput(): Promise<File | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.vcf,.vcard';
      input.style.display = 'none';
      
      let resolved = false;
      
      const cleanup = () => {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };
      
      const handleResolve = (result: File | null) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(result);
        }
      };
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        handleResolve(file || null);
      };
      
      input.oncancel = () => {
        handleResolve(null);
      };
      
      // Handle cases where the dialog is closed without explicit cancel
      const handleFocus = () => {
        // Give the file dialog time to appear
        setTimeout(() => {
          // If no file was selected after a reasonable time, consider it cancelled
          setTimeout(() => {
            if (!resolved) {
              handleResolve(null);
            }
          }, 1000);
        }, 100);
      };
      
      // Add the input to DOM and trigger click
      try {
        document.body.appendChild(input);
        
        // Listen for window focus to detect dialog close
        window.addEventListener('focus', handleFocus, { once: true });
        
        input.click();
        
        // Fallback timeout to prevent hanging
        setTimeout(() => {
          if (!resolved) {
            handleResolve(null);
          }
        }, 30000); // 30 second timeout
        
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  // Parse contact files (CSV, VCF)
  private async parseContactFile(file: File): Promise<Contact[]> {
    const text = await file.text();
    
    if (file.name.endsWith('.csv')) {
      return this.parseCSVContacts(text);
    } else if (file.name.endsWith('.vcf') || file.name.endsWith('.vcard')) {
      return this.parseVCFContacts(text);
    }
    
    return [];
  }

  // Parse CSV contact format
  private parseCSVContacts(csvText: string): Contact[] {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const contacts: Contact[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= headers.length) {
        const contact: Contact = {
          id: `csv_${i}`,
          name: '',
          displayName: '',
          phoneNumbers: [],
          emails: []
        };
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim().replace(/"/g, '');
          if (!value) return;
          
          if (header.includes('name')) {
            contact.name = value;
            contact.displayName = value;
          } else if (header.includes('phone') || header.includes('mobile')) {
            contact.phoneNumbers.push(value);
          } else if (header.includes('email')) {
            contact.emails.push(value);
          }
        });
        
        if (contact.name && (contact.phoneNumbers.length > 0 || contact.emails.length > 0)) {
          contacts.push(contact);
        }
      }
    }
    
    return contacts;
  }

  // Parse VCF/vCard contact format
  private parseVCFContacts(vcfText: string): Contact[] {
    const contacts: Contact[] = [];
    const vcards = vcfText.split('BEGIN:VCARD');
    
    for (let i = 1; i < vcards.length; i++) {
      const vcard = vcards[i];
      const contact: Contact = {
        id: `vcf_${i}`,
        name: '',
        displayName: '',
        phoneNumbers: [],
        emails: []
      };
      
      const lines = vcard.split('\n');
      for (const line of lines) {
        if (line.startsWith('FN:')) {
          contact.name = line.substring(3).trim();
          contact.displayName = contact.name;
        } else if (line.startsWith('TEL:') || line.includes('TEL;')) {
          const phone = line.split(':')[1]?.trim();
          if (phone) contact.phoneNumbers.push(phone);
        } else if (line.startsWith('EMAIL:') || line.includes('EMAIL;')) {
          const email = line.split(':')[1]?.trim();
          if (email) contact.emails.push(email);
        }
      }
      
      if (contact.name && (contact.phoneNumbers.length > 0 || contact.emails.length > 0)) {
        contacts.push(contact);
      }
    }
    
    return contacts;
  }

  // Normalize contacts from different sources
  private normalizeContacts(rawContacts: any[]): Contact[] {
    return rawContacts.map((contact, index) => ({
      id: contact.id || `contact_${index}`,
      name: contact.displayName || contact.name?.formatted || `${contact.name?.givenName || ''} ${contact.name?.familyName || ''}`.trim() || 'Unknown',
      displayName: contact.displayName || contact.name?.formatted || `${contact.name?.givenName || ''} ${contact.name?.familyName || ''}`.trim() || 'Unknown',
      phoneNumbers: contact.phoneNumbers?.map((p: any) => p.value || p) || [],
      emails: contact.emails?.map((e: any) => e.value || e) || []
    })).filter(contact => 
      contact.name !== 'Unknown' && 
      (contact.phoneNumbers.length > 0 || contact.emails.length > 0)
    );
  }

  // Mock contacts for demo/testing
  private getMockContacts(): Contact[] {
    return [
      {
        id: 'mock_1',
        name: 'John Smith',
        displayName: 'John Smith',
        phoneNumbers: ['+1234567890'],
        emails: ['john@example.com']
      },
      {
        id: 'mock_2',
        name: 'Lisa Chen',
        displayName: 'Lisa Chen',
        phoneNumbers: ['+1234567891', '+1234567892'],
        emails: ['lisa@example.com']
      },
      {
        id: 'mock_3',
        name: 'Michael Johnson',
        displayName: 'Michael Johnson',
        phoneNumbers: ['+1234567893'],
        emails: ['michael@example.com', 'mike@work.com']
      },
      {
        id: 'mock_4',
        name: 'Sarah Wilson',
        displayName: 'Sarah Wilson',
        phoneNumbers: ['+1234567894'],
        emails: []
      },
      {
        id: 'mock_5',
        name: 'David Brown',
        displayName: 'David Brown',
        phoneNumbers: ['+1234567895'],
        emails: ['david@example.com']
      }
    ];
  }

  // Match contacts with existing users by calling the backend
  async matchContacts(contacts: Contact[]): Promise<MatchedContact[]> {
    try {
      const data = await apiClient('/contacts/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts })
      });
      const results = Array.isArray(data.contacts)
        ? data.contacts
        : Array.isArray(data.matchedContacts)
          ? data.matchedContacts
          : [];

      return results.map((c: any, index: number): MatchedContact => ({
        id: c.id || c.contactId || contacts[index]?.id || `contact_${index}`,
        name: c.name || c.displayName || contacts[index]?.name || 'Unknown',
        phone: c.phone || c.phoneNumber || c.phoneNumbers?.[0] || contacts[index]?.phoneNumbers?.[0] || '',
        email: c.email || c.emails?.[0] || contacts[index]?.emails?.[0],
        status: c.status === 'existing_user' ? 'existing_user' : 'not_on_app',
        userId: c.userId,
        username: c.username,
        mutualFriends: typeof c.mutualFriends === 'number' ? c.mutualFriends : undefined,
        avatar: c.avatar
      }));
    } catch (error) {
      console.error('Failed to match contacts:', error);
      throw error instanceof Error ? error : new Error('Network error');
    }
  }
}

export const contactsAPI = ContactsAPI.getInstance();

// WhatsApp utility functions
export class WhatsAppAPI {
  private static formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // If it doesn't start with a country code, assume it's a local number
    // You might want to adjust this based on your user base
    if (digits.length === 10 && !digits.startsWith('1')) {
      // Assume US/Canada number if 10 digits without country code
      return '1' + digits;
    }
    
    // Remove leading + or 00
    if (digits.startsWith('00')) {
      return digits.substring(2);
    }
    
    return digits;
  }

  static generateInviteMessage(userName?: string): string {
    const appName = 'Biltip';
    const baseMessage = `Hey! I'm using ${appName} to split bills and manage group expenses easily. Join me on ${appName}!`;
    
    if (userName) {
      return `Hi! ${userName} invited you to join ${appName} - an easy way to split bills and manage group expenses. Check it out!`;
    }
    
    return baseMessage;
  }

  static createWhatsAppInviteLink(phone: string, customMessage?: string): string {
    const formattedPhone = this.formatPhoneNumber(phone);
    const message = customMessage || this.generateInviteMessage();
    const encodedMessage = encodeURIComponent(message);
    
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }

  static async sendInvite(phone: string, name?: string, customMessage?: string): Promise<boolean> {
    try {
      const message = customMessage || this.generateInviteMessage(name);
      const whatsappLink = this.createWhatsAppInviteLink(phone, message);
      
      // Open WhatsApp
      window.open(whatsappLink, '_blank');
      
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp invite:', error);
      return false;
    }
  }

  static isWhatsAppAvailable(): boolean {
    // Check if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // WhatsApp Web works on desktop too, but mobile experience is better
    return true; // WhatsApp Web is available on all platforms
  }

  static async sendBulkInvites(contacts: Array<{phone: string, name: string}>, customMessage?: string): Promise<{success: number, failed: number}> {
    let success = 0;
    let failed = 0;
    
    for (const contact of contacts) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between invites
        const sent = await this.sendInvite(contact.phone, contact.name, customMessage);
        if (sent) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to invite ${contact.name}:`, error);
        failed++;
      }
    }
    
    return { success, failed };
  }
}

export const whatsappAPI = WhatsAppAPI;

// Type declarations for platforms
declare global {
  interface Window {
    cordova?: {
      plugins?: {
        contacts?: any;
        permissions?: any;
      };
    };
    Capacitor?: any;
  }
}