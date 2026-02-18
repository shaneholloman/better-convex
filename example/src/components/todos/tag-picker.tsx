'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Tags, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCRPC } from '@/lib/convex/crpc';
import { cn } from '@/lib/utils';

type TagPickerProps = {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  disabled?: boolean;
};

export function TagPicker({
  selectedTagIds,
  onTagsChange,
  disabled,
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const crpc = useCRPC();
  const { data: tags = [] } = useQuery(
    crpc.tags.list.queryOptions({}, { skipUnauth: true })
  );

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div className="space-y-2">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            className="w-full justify-start text-left font-normal"
            disabled={disabled}
            variant="outline"
          >
            <Tags className="h-4 w-4" />
            {selectedTags.length > 0 ? (
              <span>
                {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''}{' '}
                selected
              </span>
            ) : (
              <span className="text-muted-foreground">Select tags...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => toggleTag(tag.id)}
                    value={tag.name}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        selectedTagIds.includes(tag.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className={cn('h-4 w-4')} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                      {tag.usageCount > 0 && (
                        <span className="text-muted-foreground text-xs">
                          ({tag.usageCount})
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <Badge
              className="pr-1 pl-2"
              key={tag.id}
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                borderColor: tag.color,
              }}
              variant="secondary"
            >
              {tag.name}
              <button
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                disabled={disabled}
                onClick={() => removeTag(tag.id)}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
