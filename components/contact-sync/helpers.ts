import { whatsappAPI, showContactError } from "../../utils/contacts-api";
import { MatchedContact } from "./types";
import { WHATSAPP_INVITE_MESSAGE } from "./constants";
import { toast } from "sonner";
import { apiClient } from "../../utils/apiClient";

export const handleBulkInviteContacts = async (
  selectedContactsList: MatchedContact[],
  selectedContacts: Set<string>,
  setIsInviting: (value: boolean) => void,
  setSelectedContacts: (value: Set<string>) => void,
) => {
  if (selectedContacts.size === 0) {
    showContactError("Please select contacts to invite");
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
          WHATSAPP_INVITE_MESSAGE(contact.name),
        );

        if (success) {
          successCount++;
        }

        // Add delay between invites to avoid overwhelming the user
        if (i < selectedContactsList.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (error) {
        console.error(`Failed to invite ${contact.name}:`, error);
      }
    }

    const totalSelected = selectedContacts.size;
    if (successCount > 0) {
      toast.success(
        successCount === totalSelected
          ? `Opened WhatsApp to invite ${successCount} contact${successCount > 1 ? "s" : ""}!`
          : `Opened WhatsApp for ${successCount} of ${totalSelected} contacts`,
      );
    } else {
      showContactError("Failed to open WhatsApp invites");
    }

    setSelectedContacts(new Set());
  } catch (error) {
    console.error("Bulk invite failed:", error);
    showContactError("Failed to send invites. Please try again.");
  } finally {
    setIsInviting(false);
  }
};

export const handleSingleInvite = async (contact: MatchedContact) => {
  try {
    const success = await whatsappAPI.sendInvite(
      contact.phone,
      contact.name,
      WHATSAPP_INVITE_MESSAGE(contact.name),
    );

    if (success) {
      toast.success(`Opened WhatsApp to invite ${contact.name}!`);
    } else {
      showContactError("Failed to open WhatsApp");
    }
  } catch (error) {
    console.error("Single invite failed:", error);
    showContactError("Failed to open WhatsApp invite");
  }
};

export const handleSendFriendRequest = async (
  contact: MatchedContact,
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const data = await apiClient("/friends/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ receiverId: contact.userId }),
    });

    toast.success(`Friend request sent to ${contact.name}!`);
    try {
      // Notify any screens listening (e.g., FriendsList) to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("friendsUpdated"));
      }
    } catch {
      /* no-op */
    }
    return { success: true, data };
  } catch (error) {
    console.error("Send friend request failed:", error);
    const message =
      (error as Error).message ||
      `Failed to send friend request to ${contact.name}`;
    showContactError(message);
    return { success: false, error: message };
  }
};

export const filterContacts = (
  contacts: MatchedContact[],
  searchQuery: string,
) => {
  return contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery) ||
      contact.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );
};
