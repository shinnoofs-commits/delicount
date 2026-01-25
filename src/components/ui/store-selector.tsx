
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useStores } from '@/contexts/store-context';
import { useStoreSelection } from '@/contexts/store-selection-context';
import { cn } from '@/lib/utils';
import { Badge } from './badge';

export function StoreSelector() {
  const { stores, loading } = useStores();
  const { selectedStoreIds, setSelectedStoreIds } = useStoreSelection();
  const [open, setOpen] = React.useState(false);

  const toggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStoreIds.length === stores.length) {
      setSelectedStoreIds([]);
    } else {
      setSelectedStoreIds(stores.map(s => s.id));
    }
  }

  const getSelectionText = () => {
    if (selectedStoreIds.length === 0) return "店舗を選択...";
    if (selectedStoreIds.length === stores.length) return "すべての店舗";
    if (selectedStoreIds.length === 1) {
      return stores.find(s => s.id === selectedStoreIds[0])?.name || "1店舗選択中";
    }
    return `${selectedStoreIds.length}店舗選択中`;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
          disabled={loading || stores.length === 0}
        >
          <span className="truncate">{getSelectionText()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="店舗を検索..." />
          <CommandList>
            <CommandEmpty>店舗が見つかりません。</CommandEmpty>
            <CommandGroup>
                <CommandItem onSelect={handleSelectAll} className="cursor-pointer">
                     <div
                        className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        selectedStoreIds.length === stores.length
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50 [&_svg]:invisible'
                        )}
                    >
                        <Check className={cn('h-4 w-4')} />
                    </div>
                    すべて選択
                    <Badge variant="outline" className="ml-auto">{stores.length}</Badge>
                </CommandItem>
              {stores.map((store) => (
                <CommandItem
                  key={store.id}
                  value={store.name}
                  onSelect={() => {
                    toggleStore(store.id);
                  }}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                      selectedStoreIds.includes(store.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'opacity-50 [&_svg]:invisible'
                    )}
                  >
                    <Check className={cn('h-4 w-4')} />
                  </div>
                  {store.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
