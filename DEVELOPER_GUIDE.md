# Admin Panel Optimizations - Developer Guide

## 🎯 Quick Start

This guide helps you integrate the four major optimizations into your pages:

1. **React Query** - Smart data fetching
2. **Virtual Scrolling** - Performance for large lists  
3. **Unsaved Changes** - Prevent data loss
4. **Accessibility** - WCAG 2.1 compliance

---

## 📦 Installation

All dependencies are already installed:

```bash
✅ @tanstack/react-query@^5.83.0
✅ @tanstack/react-virtual (installed)
```

---

## 🚀 React Query - Data Fetching Made Easy

### Basic Usage

```typescript
import { useLeads, useUpdateLead } from "@/hooks/useLeadsQuery";

function MyComponent() {
  // Automatic caching, loading states, and error handling
  const { data: leads, isLoading, error, refetch } = useLeads({
    search: "john",
    status: "new"
  });

  const updateLead = useUpdateLead();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {leads?.map(lead => (
        <div key={lead.id}>{lead.name}</div>
      ))}
    </div>
  );
}
```

### Creating New Query Hooks

```typescript
// src/hooks/useListingsQuery.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useListings(filters = {}) {
  return useQuery({
    queryKey: ["listings", filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from("listings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Automatically refetch listings
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Listing updated!");
    },
  });
}
```

### Benefits
- ✅ Automatic caching (no duplicate requests)
- ✅ Background refetching (data stays fresh)
- ✅ Request deduplication
- ✅ Automatic error retry
- ✅ Loading and error states built-in

---

## ⚡ Virtual Scrolling - Handle Thousands of Items

### Basic Usage

```typescript
import { VirtualList } from "@/components/ui/VirtualList";

function LeadsList({ leads }) {
  return (
    <VirtualList
      items={leads}
      estimateSize={80} // Height of each item in pixels
      className="h-[600px]" // Container height
      overscan={5} // Extra items to render above/below
      renderItem={(lead, index) => (
        <div className="p-4 border-b">
          <h3>{lead.name}</h3>
          <p>{lead.email}</p>
        </div>
      )}
    />
  );
}
```

### Advanced: Variable Heights

```typescript
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

function VariableHeightList({ items }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Initial estimate
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ItemComponent item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### When to Use
- ✅ Lists with 100+ items
- ✅ Tables with many rows
- ✅ Activity feeds
- ✅ Chat messages
- ✅ Search results

---

## 🛡️ Unsaved Changes - Prevent Data Loss

### Basic Form Protection

```typescript
import { useState } from "react";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

function EditForm() {
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [originalData] = useState({ name: "", email: "" });
  
  // Detect changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  // Protect against navigation
  useUnsavedChanges({
    hasUnsavedChanges: hasChanges,
    message: "You have unsaved changes. Leave anyway?",
    onConfirm: () => {
      console.log("User left without saving");
    },
  });

  return (
    <form>
      <Input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <Button type="submit">Save</Button>
    </form>
  );
}
```

### With React Hook Form

```typescript
import { useForm } from "react-hook-form";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

function FormWithValidation() {
  const { register, formState: { isDirty }, handleSubmit } = useForm();

  useUnsavedChanges({
    hasUnsavedChanges: isDirty,
    message: "You have unsaved changes. Discard them?",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} />
      <button type="submit">Save</button>
    </form>
  );
}
```

### Protects Against
- ✅ Browser back button
- ✅ Refresh (F5 / Cmd+R)
- ✅ Close tab/window
- ✅ In-app navigation (React Router)

---

## ♿ Accessibility - WCAG 2.1 Compliance

### 1. Screen Reader Announcements

```typescript
import { useScreenReader } from "@/hooks/useAccessibility";

function SaveButton() {
  const { announce } = useScreenReader();

  const handleSave = async () => {
    await saveData();
    // Announce to screen readers
    announce("Changes saved successfully", "assertive");
  };

  return <Button onClick={handleSave}>Save</Button>;
}
```

**Politeness Levels:**
- `"polite"` - Wait for user to finish (default)
- `"assertive"` - Interrupt immediately (errors, success messages)

### 2. Keyboard Navigation

```typescript
import { useKeyboardNavigation } from "@/hooks/useAccessibility";

function SearchResults({ results }) {
  const { containerRef, handleKeyDown, currentIndex } = useKeyboardNavigation(
    results.length,
    (index) => selectResult(results[index])
  );

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} tabIndex={0}>
      {results.map((result, index) => (
        <div
          key={result.id}
          className={index === currentIndex ? "bg-blue-100" : ""}
        >
          {result.name}
        </div>
      ))}
    </div>
  );
}
```

**Supported Keys:**
- `↑` / `↓` - Navigate items
- `Home` - First item
- `End` - Last item
- `Enter` / `Space` - Select item

### 3. Focus Management

```typescript
import { useFocusTrap } from "@/hooks/useAccessibility";

function Modal({ isOpen, onClose }) {
  const containerRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div ref={containerRef} role="dialog" aria-modal="true">
      <h2 id="modal-title">Confirm Action</h2>
      <p id="modal-description">Are you sure?</p>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </div>
  );
}
```

### 4. Accessible Forms

```typescript
import { useAccessibleId } from "@/hooks/useAccessibility";

function FormField({ label, error, description }) {
  const ids = useAccessibleId("email");

  return (
    <div>
      <label htmlFor={ids.id} id={ids.labelId}>
        {label}
        <span className="text-red-500" aria-label="required">*</span>
      </label>
      
      <input
        id={ids.id}
        aria-labelledby={ids.labelId}
        aria-describedby={description ? ids.descriptionId : undefined}
        aria-invalid={!!error}
        aria-errormessage={error ? ids.errorId : undefined}
        className="focus-visible:ring-2 focus-visible:ring-primary"
      />
      
      {description && (
        <p id={ids.descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {error && (
        <p id={ids.errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

### 5. CSS Classes

```typescript
// Screen reader only
<span className="sr-only">Loading...</span>

// Skip to main content
<a href="#main" className="skip-to-main">
  Skip to main content
</a>

// Touch-friendly buttons (44x44px minimum)
<Button className="touch-accessible">
  <Icon />
</Button>

// Focus indicators
<Button className="focus-ring">
  Click me
</Button>
```

### Accessibility Checklist

When creating a new component:

- [ ] All interactive elements have `aria-label` or visible text
- [ ] Form inputs have associated `<label>` elements
- [ ] Buttons have descriptive text or `aria-label`
- [ ] Images have `alt` text
- [ ] Focus indicators are visible (2px ring)
- [ ] Keyboard navigation works (Tab, Enter, Arrows)
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Touch targets ≥ 44x44px
- [ ] Error messages announced to screen readers
- [ ] Loading states announced to screen readers

---

## 🎨 Complete Example

Here's a complete page using all four optimizations:

```typescript
import { useState } from "react";
import { useLeads, useUpdateLead } from "@/hooks/useLeadsQuery";
import { VirtualList } from "@/components/ui/VirtualList";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useScreenReader, useAccessibleId } from "@/hooks/useAccessibility";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OptimizedLeadsPage() {
  // 1. React Query - Data fetching
  const [search, setSearch] = useState("");
  const { data: leads, isLoading } = useLeads({ search });
  const updateLead = useUpdateLead();

  // 2. Unsaved changes tracking
  const [editingLead, setEditingLead] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useUnsavedChanges({
    hasUnsavedChanges: hasChanges,
    message: "You have unsaved changes. Discard them?",
  });

  // 3. Accessibility
  const { announce } = useScreenReader();
  const searchIds = useAccessibleId("search");

  const handleSave = async () => {
    await updateLead.mutateAsync({
      id: editingLead.id,
      updates: editingLead,
    });
    setHasChanges(false);
    announce("Lead updated successfully", "assertive");
  };

  if (isLoading) {
    return <div aria-busy="true">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Leads</h1>

      {/* Accessible search */}
      <div className="mb-4">
        <label htmlFor={searchIds.id} id={searchIds.labelId}>
          Search Leads
        </label>
        <Input
          id={searchIds.id}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-labelledby={searchIds.labelId}
          aria-describedby={searchIds.descriptionId}
          className="focus-visible:ring-2"
        />
        <p id={searchIds.descriptionId} className="sr-only">
          Search by name, email, or phone
        </p>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div role="alert" className="mb-4 p-3 bg-yellow-50 border rounded">
          You have unsaved changes
          <Button onClick={handleSave} className="ml-2">
            Save Now
          </Button>
        </div>
      )}

      {/* 4. Virtual scrolling for performance */}
      <VirtualList
        items={leads || []}
        estimateSize={80}
        className="h-[600px] border rounded"
        renderItem={(lead) => (
          <div
            className="p-4 border-b hover:bg-muted/50"
            role="article"
            aria-label={`Lead: ${lead.name}`}
          >
            <h3 className="font-medium">{lead.name}</h3>
            <p className="text-sm text-muted-foreground">{lead.email}</p>
            <Button
              size="sm"
              onClick={() => {
                setEditingLead(lead);
                setHasChanges(true);
              }}
              aria-label={`Edit ${lead.name}`}
              className="mt-2 focus-visible:ring-2"
            >
              Edit
            </Button>
          </div>
        )}
      />

      {/* Screen reader status */}
      <div className="sr-only" role="status" aria-live="polite">
        Showing {leads?.length || 0} leads
      </div>
    </div>
  );
}
```

---

## 🧪 Testing

### React Query
```typescript
// Check cache in DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add to App.tsx (development only)
{process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
```

### Virtual Scrolling
- Test with 1000+ items
- Check scroll performance (should be 60 FPS)
- Verify only visible items are rendered (inspect DOM)

### Unsaved Changes
- Try navigating away with unsaved changes
- Test browser back button
- Test refresh (F5)
- Test closing tab

### Accessibility
- **Keyboard**: Navigate using only Tab, Enter, Arrows
- **Screen Reader**: Test with NVDA (Windows) or VoiceOver (Mac)
- **Tools**:
  - axe DevTools (Chrome extension)
  - Lighthouse (Chrome DevTools)
  - WAVE (browser extension)

---

## 📊 Performance Monitoring

```typescript
// Monitor React Query performance
import { useQueryClient } from "@tanstack/react-query";

function DebugPanel() {
  const queryClient = useQueryClient();
  const cache = queryClient.getQueryCache();

  return (
    <div>
      <p>Cached queries: {cache.getAll().length}</p>
      <button onClick={() => queryClient.invalidateQueries()}>
        Clear Cache
      </button>
    </div>
  );
}
```

---

## 🐛 Common Issues

### React Query not caching
**Problem**: Data refetches on every render  
**Solution**: Check `queryKey` is stable (use useMemo if needed)

```typescript
// ❌ Bad - creates new object every render
const { data } = useLeads({ search: searchTerm });

// ✅ Good - stable queryKey
const filters = useMemo(() => ({ search: searchTerm }), [searchTerm]);
const { data } = useLeads(filters);
```

### Virtual scrolling jumpy
**Problem**: Items jump around while scrolling  
**Solution**: Provide accurate `estimateSize` or use `measureElement`

```typescript
// Use ref for dynamic measurement
ref={virtualizer.measureElement}
```

### Unsaved changes not working
**Problem**: Warning doesn't show  
**Solution**: Ensure `hasUnsavedChanges` is actually changing

```typescript
// Debug
console.log("Has changes:", hasUnsavedChanges);
```

### Focus not visible
**Problem**: Can't see which element is focused  
**Solution**: Ensure focus-visible classes are applied

```typescript
className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
```

---

## 📚 Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [React Virtual Docs](https://tanstack.com/virtual/latest)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

## 🎯 Quick Reference

| Feature | Hook/Component | File |
|---------|---------------|------|
| Data Fetching | `useLeads()` | `hooks/useLeadsQuery.ts` |
| Virtual List | `<VirtualList />` | `components/ui/VirtualList.tsx` |
| Unsaved Changes | `useUnsavedChanges()` | `hooks/useUnsavedChanges.ts` |
| Screen Reader | `useScreenReader()` | `hooks/useAccessibility.ts` |
| Keyboard Nav | `useKeyboardNavigation()` | `hooks/useAccessibility.ts` |
| Focus Trap | `useFocusTrap()` | `hooks/useAccessibility.ts` |
| Accessible IDs | `useAccessibleId()` | `hooks/useAccessibility.ts` |

---

**Need help?** Check `OPTIMIZATION_SUMMARY.md` for detailed documentation and `src/pages/examples/EnhancedLeadDetailExample.tsx` for a complete working example.
