import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { contactsAPI } from '../utils/contacts-api';
import { PermissionRequestScreen } from './contact-sync/PermissionRequestScreen';
import { SyncingProgressScreen } from './contact-sync/SyncingProgressScreen';
import { ContactResultsScreen } from './contact-sync/ContactResultsScreen';
import { MatchedContact, ContactSyncScreenProps, SyncStep } from './contact-sync/types';
import { mockMatchedContacts } from './contact-sync/constants';

export function ContactSyncScreen({ onNavigate }: ContactSyncScreenProps) {
  const [syncStep, setSyncStep] = useState<SyncStep>('permission');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [matchedContacts, setMatchedContacts] = useState<MatchedContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isInviting, setIsInviting] = useState(false);
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);
  const [contactCount, setContactCount] = useState<number>(0);

  // Check if contacts API is available
  const contactsSupported = contactsAPI.isSupported();

  // Check for previously granted permission on mount
  useEffect(() => {
    const checkExistingPermission = async () => {
      try {
        if (contactsSupported) {
          const status = await contactsAPI.checkPermissionStatus();
          if (status.granted) {
            setHasPermission(true);
            // Optionally auto-sync if permission was previously granted
            // await handleAutoSync();
          }
        }
      } catch (error) {
        console.warn('Permission check failed:', error);
      }
    };

    checkExistingPermission();
  }, [contactsSupported]);

  // Enhanced sync progress tracking
  const updateSyncProgress = (progress: number, message?: string) => {
    setSyncProgress(progress);
    if (message && progress < 100) {
      toast.info(message, { duration: 1000 });
    }
  };

  // Auto-sync for returning users
  const handleAutoSync = async () => {
    if (!hasPermission) return;
    
    setSyncStep('syncing');
    setSyncStartTime(Date.now());
    await performContactSync();
  };

  // Main contact sync logic
  const performContactSync = async () => {
    try {
      updateSyncProgress(10, 'Accessing your contacts...');
      
      // Get contacts with better error handling
      const contacts = await contactsAPI.getContacts();
      setContactCount(contacts.length);
      
      updateSyncProgress(40, `Found ${contacts.length} contacts`);
      
      // Simulate more realistic sync timing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateSyncProgress(70, 'Matching with Biltip users...');
      
      // Match contacts with existing users
      const matched = await contactsAPI.matchContacts(contacts);
      
      updateSyncProgress(90, 'Almost done...');
      
      // Final delay for smooth UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      updateSyncProgress(100);
      
      setTimeout(() => {
        setMatchedContacts(matched);
        setSyncStep('results');
        
        const existingUsers = matched.filter(c => c.status === 'existing_user').length;
        const inviteableContacts = matched.filter(c => c.status === 'not_on_app').length;
        
        if (existingUsers > 0) {
          toast.success(`Found ${existingUsers} friend${existingUsers !== 1 ? 's' : ''} on Biltip!`);
        }
        
        if (inviteableContacts > 0) {
          toast.success(`${inviteableContacts} contact${inviteableContacts !== 1 ? 's' : ''} can be invited to join!`);
        }
        
        if (existingUsers === 0 && inviteableContacts === 0) {
          toast.info('Contact sync complete');
        }
      }, 500);
      
    } catch (error) {
      console.error('Contact sync failed:', error);
      setSyncStep('permission');
      setHasPermission(false);
      
      // Better error messaging
      if (error.message?.includes('Permission denied')) {
        toast.error('Contact access was denied. Please enable it in your browser settings.');
      } else if (error.message?.includes('Network')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('Contact sync failed. Please try again.');
      }
    }
  };

  // Request contact permission and sync contacts
  const requestContactPermission = async () => {
    setSyncStep('syncing');
    setSyncProgress(0);
    setSyncStartTime(Date.now());
    
    try {
      // Request permission with user feedback
      updateSyncProgress(5, 'Requesting contact access...');
      
      const permission = await contactsAPI.requestPermission();
      
      if (!permission.granted) {
        setHasPermission(false);
        setSyncStep('permission');
        
        // More specific permission denied messaging
        if (permission.userDenied) {
          toast.error('Contact access denied. You can still add friends manually or try again.');
        } else {
          toast.error('Contact access not available. Please try importing a contact file.');
        }
        return;
      }
      
      setHasPermission(true);
      await performContactSync();
      
    } catch (error) {
      console.error('Contact permission request failed:', error);
      setSyncStep('permission');
      toast.error('Failed to request contact access. Please try again.');
    }
  };

  // Enhanced file import with better UX
  const handleFileImport = async () => {
    try {
      setSyncStep('syncing');
      setSyncProgress(0);
      setSyncStartTime(Date.now());
      
      updateSyncProgress(10, 'Opening file picker...');
      
      // Use the specific file import method
      const contacts = await contactsAPI.importContactsFromFile();
      setContactCount(contacts.length);
      
      updateSyncProgress(50, `Processing ${contacts.length} contacts...`);
      
      const matched = await contactsAPI.matchContacts(contacts);
      
      updateSyncProgress(90, 'Finalizing...');
      
      setTimeout(() => {
        updateSyncProgress(100);
        setMatchedContacts(matched);
        setSyncStep('results');
        setHasPermission(true);
        
        const existingUsers = matched.filter(c => c.status === 'existing_user').length;
        const inviteableContacts = matched.filter(c => c.status === 'not_on_app').length;
        
        toast.success(`Imported ${contacts.length} contacts successfully!`);
        
        if (existingUsers > 0) {
          toast.success(`Found ${existingUsers} friend${existingUsers !== 1 ? 's' : ''} on Biltip!`, { delay: 1000 });
        }
      }, 500);
      
    } catch (error) {
      console.error('File import failed:', error);
      setSyncStep('permission');
      
      // Enhanced error handling for file import
      if (error.message === 'CROSS_ORIGIN_RESTRICTION') {
        toast.error('File picker not available in this environment. Please try the upload option.');
      } else if (error.name === 'SecurityError') {
        toast.error('File access restricted. Please check your browser settings.');
      } else if (error.message === 'No file selected') {
        toast.info('File import cancelled');
      } else if (error.message?.includes('format')) {
        toast.error('Invalid file format. Please use CSV or VCF files.');
      } else {
        toast.error('File import failed. Please check your file and try again.');
      }
    }
  };

  // Enhanced demo mode with realistic data
  const handleDemoMode = async () => {
    setSyncStep('syncing');
    setSyncProgress(0);
    setSyncStartTime(Date.now());
    setContactCount(50); // Simulate realistic contact count
    
    try {
      updateSyncProgress(15, 'Loading demo contacts...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      updateSyncProgress(45, 'Matching with Biltip users...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateSyncProgress(75, 'Preparing results...');
      await new Promise(resolve => setTimeout(resolve, 600));
      
      updateSyncProgress(100);
      
      setTimeout(() => {
        setMatchedContacts(mockMatchedContacts);
        setSyncStep('results');
        setHasPermission(true);
        
        const existingUsers = mockMatchedContacts.filter(c => c.status === 'existing_user').length;
        toast.success(`Demo complete! Found ${existingUsers} friends on Biltip.`);
      }, 300);
      
    } catch (error) {
      console.error('Demo mode failed:', error);
      setSyncStep('permission');
      toast.error('Demo mode failed. Please try again.');
    }
  };

  const denyPermission = () => {
    setHasPermission(false);
    // More graceful handling of permission denial
    toast.info('Contact sync skipped. You can add friends manually or try again later.');
    onNavigate('add-friend');
  };

  // Go back to sync from results to retry
  const handleRetrySync = () => {
    setSyncStep('permission');
    setMatchedContacts([]);
    setSelectedContacts(new Set());
    setSyncProgress(0);
    setContactCount(0);
    setSyncStartTime(null);
  };

  // Render different screens based on sync step
  switch (syncStep) {
    case 'permission':
      return (
        <PermissionRequestScreen
          onNavigate={onNavigate}
          contactsSupported={contactsSupported}
          requestContactPermission={requestContactPermission}
          handleFileImport={handleFileImport}
          handleDemoMode={handleDemoMode}
          denyPermission={denyPermission}
          hasPermission={hasPermission}
        />
      );

    case 'syncing':
      return (
        <SyncingProgressScreen
          onNavigate={onNavigate}
          syncProgress={syncProgress}
          contactCount={contactCount}
          startTime={syncStartTime}
          onCancel={() => {
            setSyncStep('permission');
            setSyncProgress(0);
            toast.info('Contact sync cancelled');
          }}
        />
      );

    case 'results':
      return (
        <ContactResultsScreen
          onNavigate={onNavigate}
          matchedContacts={matchedContacts}
          selectedContacts={selectedContacts}
          setSelectedContacts={setSelectedContacts}
          isInviting={isInviting}
          setIsInviting={setIsInviting}
          onRetrySync={handleRetrySync}
          syncMethod={hasPermission ? 'contacts' : 'demo'}
        />
      );

    default:
      return (
        <PermissionRequestScreen
          onNavigate={onNavigate}
          contactsSupported={contactsSupported}
          requestContactPermission={requestContactPermission}
          handleFileImport={handleFileImport}
          handleDemoMode={handleDemoMode}
          denyPermission={denyPermission}
          hasPermission={hasPermission}
        />
      );
  }
}