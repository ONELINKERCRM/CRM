# Bug Fix: Listing Update Creates Duplicate

## Issue
When editing and saving changes to an existing listing, the system created a new duplicate record instead of updating the original one.

## Cause
The form submission logic in `AddEditListingForm.tsx` was unconditionally calling `supabase.from('listings').insert()`, regardless of whether the form was in "edit" or "add" mode.

## Fix Implemented

1.  **Modified Component Interface**: Updated `AddEditListingFormProps` to accept a `listingId` prop.
2.  **Updated Usage**: Passed `listingId` from `ListingCard.tsx` (main, mobile, and row views) and `ListingDetailPage.tsx` to the form component.
3.  **Corrected Logic**: Updated `handleSubmit` in `AddEditListingForm` to:
    *   Check if `mode === 'edit'` AND `listingId` is present.
    *   If true, perform an SQL `UPDATE` on the existing record using the ID.
    *   Otherwise, proceed with the existing `INSERT` logic for new listings.

## Verify Fix
To verify the fix:
1.  Go to any existing listing.
2.  Click "Edit".
3.  Change a field (e.g., price or title).
4.  Click "Update".
5.  Verify that the existing listing is updated and NO new listing is created in the list.

## Files Modified
*   `src/components/listings/AddEditListingForm.tsx`
*   `src/components/listings/ListingCard.tsx`
*   `src/pages/ListingDetailPage.tsx`
