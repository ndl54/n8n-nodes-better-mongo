# Better MongoDB Node for n8n

A drop-in replacement for the official n8n MongoDB node, offering enhanced BSON/EJSON support and improved data handling for advanced MongoDB workflows.

## Key Features

- **Full BSON/EJSON Parsing:**
  - Automatically parses `$oid` and `$date` fields to `ObjectId` and native `Date` objects.
  - Deep parsing for nested arrays and objects, ensuring all date fields (even in arrays) are handled as proper Date types.
- **Schema Validation Friendly:**
  - Outputs are always compatible with strict MongoDB JSON Schema, avoiding common validation errors (e.g. no `null` for arrays, always array or empty array).
- **Custom Credential Support:**
  - Uses `betterMongoDB` credential type for improved connection testing and flexibility.
- **Detailed Logging:**
  - Logs the exact data sent to MongoDB before insert/update/upsert for easy debugging and validation.
- **Field Selection and Dot Notation:**
  - Supports selective field updates and dot notation for advanced update scenarios.
- **Bulk Write Operations:**
  - Optimized performance for batch operations using MongoDB's `bulkWrite()` API
  - Supports bulk insert, update, findAndUpdate, and findAndReplace operations
  - Automatically enables upsert for bulk operations to ensure data consistency
  - Reduces network round trips and improves throughput for large datasets
- **Backward Compatibility:**
  - Compatible with n8n workflows using the official MongoDB node, but with improved reliability and type safety.

## Recent Improvements & Optimizations

- **Version 2.0**
  - Refactored node name, versioning, and credential system for clarity and separation from the default node.
  - Improved handling of date fields: all dates are now automatically parsed as native Date objects before sending to MongoDB.
  - Arrays are always output as arrays (never `null`), ensuring no schema validation errors for array fields.
  - Enhanced utility functions for deep EJSON parsing and robust type checking (including nested arrays/objects).
  - Added more granular logging for all database operations.
  - Optimized code structure and TypeScript typings for maintainability.
  - Bugfix: Prevented accidental overwriting of array fields with `null` or `undefined`.

- **Version 2.1**
  - Added Bulk Write support for improved performance in batch operations.

## Usage

1. **Install the custom module into your n8n instance.**
2. **Configure your MongoDB credentials** using the `betterMongoDB` credential type.
3. **Add the Better MongoDB node** to your workflow.
4. **Set operation and collection** as you would with the official node.
5. **For bulk operations:**
   - Enable "Use Bulk Write" option in the node settings
   - Available for insert, update, findAndUpdate, and findAndReplace operations
   - Automatically enables upsert for bulk operations
   - Recommended for handling large datasets or batch processing
6. **Input data:**
   - The node accepts data in JSON format
   - For date fields, the following formats are supported:
     - ISO 8601 string format: `"2024-03-20T10:00:00Z"`
     - EJSON format: `{ "$date": "2024-03-20T10:00:00Z" }`
     - Timestamp in milliseconds: `1710921600000`
     - Timestamp in seconds: `1710921600`
   - For ObjectId fields, the following formats are supported:
     - String format: `"65fb1234567890abcdef1234"`
     - EJSON format: `{ "$oid": "65fb1234567890abcdef1234" }`
   - The node will automatically convert these formats to their corresponding MongoDB types
   - When querying dates, you can use MongoDB comparison operators:
     ```json
     {
       "createdAt": {
         "$gt": "2024-03-20T00:00:00Z",
         "$lt": "2024-03-21T00:00:00Z"
       }
     }
     ```
   - Example input for different operations:
     ```json
     // Insert
     {
       "name": "Product A",
       "price": 100000,
       "createdAt": "2024-03-20T10:00:00Z",
       "updatedAt": "2024-03-20T11:00:00Z"
     }

     // Update
     {
       "id": "65fb1234567890abcdef1234",
       "name": "Product A (Updated)",
       "updatedAt": "2024-03-20T12:00:00Z"
     }

     // Find with date conditions
     {
       "createdAt": {
         "$gt": "2024-03-20T00:00:00Z",
         "$lt": "2024-03-21T00:00:00Z"
       }
     }
     ```


Will be sent to MongoDB as:
- `purchaseDate` and `payments.transDate` as native Date objects
- If `payments` is missing or null, will be sent as `[]` (empty array)

## Changelog

- v1.0: N8N mongo node with same official mongodb node, but using BSON instead of JSON for parsing queries. It accepts $oid and $date and parse them to ObjectId and Date objects respectively.
- v2.0: Major refactor, improved type handling, robust date/array processing, new credential type.
- v2.1: Added Bulk Write support for improved performance in batch operations.

## Author
- Juandl (Juan David)
https://github.com/juandl
- NDL54 (Loc Nguyen)
https://github.com/ndl54

---

For issues or contributions, please submit a pull request or open an issue on the project repository.
