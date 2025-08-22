# API Filters and Pagination

The following query parameters are available for listing transactions and bill splits.

## `/api/transactions`
- `category`: filter by transaction category.
- `minAmount` / `maxAmount`: limit results to an amount range.
- `keyword`: search in descriptions, bill split titles, and participant names.
- `page` / `size`: page-based pagination. Response includes `total` and `pageCount`.
- `cursor` / `limit`: cursor-based pagination (existing behaviour).
- `includeSummary`: also return `totalSent`, `totalReceived`, and `netFlow` in the response.

## `/api/bill-splits`
- `category`: filter by bill split category.
- `minAmount` / `maxAmount`: filter by total amount range.
- `keyword`: search in titles, descriptions, and participant names.
- `groupId`: restrict results to a specific group.
- `page` / `size`: page-based pagination with `total` and `pageCount` in the response.

Both endpoints return pagination metadata:
- `total`: total number of matching records.
- `pageCount`: number of pages based on the current page size.

## `/api/transactions/categories`
Fetch distinct transaction categories for the authenticated user. Use this endpoint to populate category filter options on load.

Example response:

```json
{
  "categories": ["food", "rent", "utilities"]
}
```
