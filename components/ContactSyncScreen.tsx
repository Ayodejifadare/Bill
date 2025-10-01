import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { contactsAPI, showContactError, Contact } from '../utils/contacts-api';
import { PermissionRequestScreen } from './contact-sync/PermissionRequestScreen';
import { SyncingProgressScreen } from './contact-sync/SyncingProgressScreen';
import { ContactResultsScreen } from './contact-sync/ContactResultsScreen';
import { MatchedContact, ContactSyncScreenProps, SyncStep } from './contact-sync/types';

export function ContactSyncScreen({ onNavigate }: ContactSyncScreenProps) {
  const [syncStep, setSyncStep] = useState<SyncStep>('permission');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [matchedContacts, setMatchedContacts] = useState<MatchedContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isInviting, setIsInviting] = useState(false);
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);
  const [contactCount, setContactCount] = useState<number>(0);
  const [syncMethod, setSyncMethod] = useState<'contacts' | 'file' | 'demo'>('contacts');

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
          } else if (status.denied) {
            setHasPermission(false);
          } else {
            setHasPermission(null);
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


  // Main contact sync logic
  const performContactSync = async () => {
    try {
      updateSyncProgress(10, 'Accessing your contacts...');
      
      const contacts = await contactsAPI.getContacts();
      setContactCount(contacts.length);
      updateSyncProgress(40, `Found ${contacts.length} contacts`);
      await new Promise(resolve => setTimeout(resolve, 500));
      updateSyncProgress(70, 'Matching with Biltip users...');
      const matched = await contactsAPI.matchContacts(contacts);

      updateSyncProgress(90, 'Almost done...');

      // Final delay for smooth UX
      await new Promise(resolve => setTimeout(resolve, 300));

      updateSyncProgress(100);

      setTimeout(() => {
        setMatchedContacts(matched);
        setSyncMethod('contacts');
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
      
    } catch (error: any) {
      console.error('Contact sync failed:', error);
      setSyncStep('permission');
      setHasPermission(false);

      // Better error messaging
      if (error.message?.includes('Permission denied')) {
        showContactError('permission-denied');
      } else if (error.message === 'Network error' || error.message?.includes('Network')) {
        showContactError('network-failure');
      } else {
        showContactError('Contact sync failed. Please try again.');
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
        if (permission.denied) {
          showContactError('permission-denied');
        } else {
          showContactError('Contact access not available. Please try importing a contact file.');
        }
        return;
      }
      
      setHasPermission(true);
      await performContactSync();
      
    } catch (error) {
      console.error('Contact permission request failed:', error);
      setSyncStep('permission');
      showContactError('Failed to request contact access. Please try again.');
    }
  };

  // Enhanced file import with better UX
  const handleFileImport = async () => {
    try {
      setSyncStep('syncing');
      setSyncProgress(0);
      setSyncStartTime(Date.now());

      updateSyncProgress(10, 'Opening file picker...');

      const contacts = await contactsAPI.importContactsFromFile();
      setContactCount(contacts.length);

      updateSyncProgress(50, `Processing ${contacts.length} contacts...`);

      const matched = await contactsAPI.matchContacts(contacts);

      updateSyncProgress(90, 'Finalizing...');

      setTimeout(() => {
        updateSyncProgress(100);
        setMatchedContacts(matched);
        setSyncMethod('file');
        setSyncStep('results');
        setHasPermission(true);

        const existingUsers = matched.filter(c => c.status === 'existing_user').length;
        const inviteableContacts = matched.filter(c => c.status === 'not_on_app').length;

        toast.success(`Imported ${contacts.length} contacts successfully!`);

        if (existingUsers > 0) {
          toast.success(`Found ${existingUsers} friend${existingUsers !== 1 ? 's' : ''} on Biltip!`, { duration: 1200 });
        }
        if (inviteableContacts > 0) {
          toast.success(`${inviteableContacts} contact${inviteableContacts !== 1 ? 's' : ''} can be invited to join!`, { duration: 1200 });
        }
      }, 500);

    } catch (error: any) {
      console.error('File import failed:', error);
      setSyncStep('permission');

      if (error.message === 'Network error' || error.message?.includes('Network')) {
        showContactError('network-failure');
      } else if (error.message === 'CROSS_ORIGIN_RESTRICTION') {
        showContactError('File picker not available in this environment. Please try the upload option.');
      } else if (error.name === 'SecurityError') {
        showContactError('permission-denied');
      } else if (error.message === 'No file selected') {
        toast.info('File import cancelled');
      } else if (error.message?.includes('format')) {
        showContactError('invalid-file');
      } else {
        showContactError('invalid-file');
      }
    }
  };

  // Demo mode now calls the backend to fetch sample matches
  const handleDemoMode = async () => {
    setSyncStep('syncing');
    setSyncProgress(0);
    setSyncStartTime(Date.now());

    // Minimal set of demo contacts
    const demoContacts: Contact[] = [
      {
        id: 'demo1',
        name: 'Demo User 1',
        displayName: 'Demo User 1',
        phoneNumbers: ['+15555550100'],
        emails: []
      },
      {
        id: 'demo2',
        name: 'Demo User 2',
        displayName: 'Demo User 2',
        phoneNumbers: ['+15555550101'],
        emails: []
      }
    ];

    setContactCount(demoContacts.length);

    try {
      updateSyncProgress(40, 'Matching with Biltip users...');
      const matched = await contactsAPI.matchContacts(demoContacts);
      updateSyncProgress(100);

      setMatchedContacts(matched);
      setSyncMethod('demo');
      setSyncStep('results');
      setHasPermission(true);

      const existingUsers = matched.filter(c => c.status === 'existing_user').length;
      toast.success(`Demo complete! Found ${existingUsers} friend${existingUsers !== 1 ? 's' : ''} on Biltip.`);
    } catch (error) {
      console.error('Demo mode failed:', error);
      setSyncStep('permission');
      showContactError('Demo mode failed. Please try again.');
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
    setSyncMethod('contacts');
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
          syncMethod={syncMethod}
          updateMatchedContacts={setMatchedContacts}
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

