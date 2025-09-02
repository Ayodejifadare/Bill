import { useState } from 'react';
import { Search, X, Building2, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useUserProfile } from './UserProfileContext';
import { getBanksForRegion } from '../utils/banks';

interface BankSelectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBank: (bank: string) => void;
  selectedBank?: string;
}

const FALLBACK_OTHER = 'Other';

export function BankSelectionSheet({ isOpen, onClose, onSelectBank, selectedBank }: BankSelectionSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { appSettings } = useUserProfile();
  const regionBanks = getBanksForRegion(appSettings.region);
  const banks = [...regionBanks, FALLBACK_OTHER];

  const filteredBanks = banks.filter(bank =>
    bank.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectBank = (bank: string) => {
    onSelectBank(bank);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[100vh] max-h-[100vh] rounded-t-none">
        <div className="flex flex-col h-full">
          {/* Fixed Header */}
          <SheetHeader className="flex-shrink-0 pb-6 pt-2">
            <div className="flex items-center justify-between">
              <SheetTitle>Select Bank</SheetTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SheetDescription>
              Choose your bank from the list below or search for it.
            </SheetDescription>
          </SheetHeader>

          {/* Fixed Search */}
          <div className="flex-shrink-0 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for your bank..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </div>

          {/* Scrollable Banks List */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-1 pb-6">
                {filteredBanks.length > 0 ? (
                  filteredBanks.map((bank) => (
                    <Button
                      key={bank}
                      variant="ghost"
                      className={`w-full justify-between h-auto p-4 ${
                        selectedBank === bank ? 'bg-accent border border-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => handleSelectBank(bank)}
                    >
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <span className="text-left">{bank}</span>
                      </div>
                      {selectedBank === bank && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-1">No banks found</p>
                    <p className="text-sm text-muted-foreground">Try searching with a different term</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
