import { whatsappAPI } from '../../utils/contacts-api';
import { MatchedContact } from './types';
import { WHATSAPP_INVITE_MESSAGE } from './constants';
import { toast } from 'sonner';

export const handleBulkInviteContacts = async (
  selectedContactsList: MatchedContact[],
  selectedContacts: Set<string>,
  setIsInviting: (value: boolean) => void,
  setSelectedContacts: (value: Set<string>) => void
) => {
  if (selectedContacts.size === 0) {
    toast.error('Please select contacts to invite');
    return;
  }

  setIsInviting(true);
  
  try {
    let successCount = 0;
    
    for (let i = 0; i < selectedContactsList.length; i++) {
      const contact = selectedContactsList[i];
      
      try {
        const success = await whatsappAPI.sendInvite(
          contact.phone, 
          contact.name,
          WHATSAPP_INVITE_MESSAGE(contact.name)
        );
        
        if (success) {
          successCount++;
        }
        
        // Add delay between invites to avoid overwhelming the user
        if (i < selectedContactsList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (error) {
        console.error(`Failed to invite ${contact.name}:`, error);
      }
    }
    
    const totalSelected = selectedContacts.size;
    if (successCount > 0) {
      toast.success(
        successCount === totalSelected 
          ? `Opened WhatsApp to invite ${successCount} contact${successCount > 1 ? 's' : ''}!`
          : `Opened WhatsApp for ${successCount} of ${totalSelected} contacts`
      );
    } else {
      toast.error('Failed to open WhatsApp invites');
    }
    
    setSelectedContacts(new Set());
  } catch (error) {
    console.error('Bulk invite failed:', error);
    toast.error('Failed to send invites. Please try again.');
  } finally {
    setIsInviting(false);
  }
};

export const handleSingleInvite = async (contact: MatchedContact) => {
  try {
    const success = await whatsappAPI.sendInvite(
      contact.phone,
      contact.name,
      WHATSAPP_INVITE_MESSAGE(contact.name)
    );
    
    if (success) {
      toast.success(`Opened WhatsApp to invite ${contact.name}!`);
    } else {
      toast.error('Failed to open WhatsApp');
    }
  } catch (error) {
    console.error('Single invite failed:', error);
    toast.error('Failed to open WhatsApp invite');
  }
};

export const handleSendFriendRequest = (contact: MatchedContact) => {
  toast.success(`Friend request sent to ${contact.name}!`);
  // Update contact status in real implementation
};

export const filterContacts = (
  contacts: MatchedContact[],
  searchQuery: string
) => {
  return contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );
};