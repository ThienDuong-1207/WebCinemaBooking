# Cinema Database JSON Exports

This folder contains JSON exports of all MongoDB collections from the Cinema application.

## Files

- `bookings.json` - Booking records (86 documents)
- `broken_seats.json` - Empty broken seats collection (0 documents)
- `brokenSeats.json` - Broken seats records (5 documents)
- `cinemas.json` - Cinema information (2 documents)
- `halls.json` - Movie hall information (6 documents)
- `logs.json` - System activity logs (45 documents)
- `movies.json` - Movie information (52 documents)
- `payments.json` - Payment records (63 documents)
- `seatlocks.json` - Seat lock records (6 documents)
- `seats.json` - Seat information (600 documents)
- `showtimes.json` - Showtime schedules (429 documents)
- `summary.json` - Export summary information
- `tickets.json` - Ticket records (210 documents)
- `users.json` - User accounts (222 documents)

## Export Information

- **Export Date**: July 30, 2025
- **Total Collections**: 13
- **Total Documents**: 1,726
- **Export Tool**: export_collections_fixed.py

## File Structure

Each JSON file contains:
```json
{
  "collection_name": "collection_name",
  "export_timestamp": "2025-07-30T10:54:45.339303",
  "total_documents": 52,
  "data": [
    {
      "_id": "document_id",
      "field1": "value1",
      "field2": "value2"
    }
  ]
}
```

## Usage

These files can be used for:
- Data backup
- Database migration
- Data analysis
- Development testing
