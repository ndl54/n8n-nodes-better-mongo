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
- **Backward Compatibility:**
  - Compatible with n8n workflows using the official MongoDB node, but with improved reliability and type safety.

## Recent Improvements & Optimizations

- **Version 2.0 by NDL54**
  - Refactored node name, versioning, and credential system for clarity and separation from the default node.
  - Improved handling of date fields: all dates are now automatically parsed as native Date objects before sending to MongoDB.
  - Arrays are always output as arrays (never `null`), ensuring no schema validation errors for array fields.
  - Enhanced utility functions for deep EJSON parsing and robust type checking (including nested arrays/objects).
  - Added more granular logging for all database operations.
  - Optimized code structure and TypeScript typings for maintainability.
  - Bugfix: Prevented accidental overwriting of array fields with `null` or `undefined`.

## Usage

1. **Install the custom module into your n8n instance.**
2. **Configure your MongoDB credentials** using the `betterMongoDB` credential type.
3. **Add the Better MongoDB node** to your workflow.
4. **Set operation and collection** as you would with the official node.
5. **Input data:**
   - Date fields can be ISO strings, JS Date objects, or EJSON (`{"$date": ...}`) – all will be converted to Date.
   - ObjectId fields can be string or EJSON (`{"$oid": ...}`).
   - Arrays must be arrays (not null); empty arrays are accepted.
6. **Check logs** for the exact data sent to MongoDB if you encounter validation errors.

## Example

```json
{
  "id": 123,
  "purchaseDate": "2022-11-04T11:15:00.000Z",
  "payments": [
    { "id": 1, "transDate": "2022-11-04T11:15:00.006Z" }
  ]
}
```

Will be sent to MongoDB as:
- `purchaseDate` and `payments.transDate` as native Date objects
- If `payments` is missing or null, will be sent as `[]` (empty array)

## Changelog

- v1.0: N8N mongo node with same official mongodb node, but using BSON instead of JSON for parsing queries. It accepts $oid and $date and parse them to ObjectId and Date objects respectively.
- v2.0: Major refactor, improved type handling, robust date/array processing, new credential type.

## Author
- Juandl (Juan David)
https://github.com/juandl
- NDL54 (Loc Nguyen)
https://github.com/ndl54

---

For issues or contributions, please submit a pull request or open an issue on the project repository.
