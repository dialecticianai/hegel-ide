# lib/

Pure utility functions for HTTP server and terminal environment building. These modules contain no side effects and are fully unit tested.

## Structure

```
lib/
├── terminal-env.js     Pure function for building terminal environment with HEGEL_IDE_URL injection
└── http-server.js      Pure functions for HTTP request parsing, file validation, and project path matching
```

## Testing

Unit tests located in `test/lib/` provide complete coverage for all exported functions. Tests verify:
- Environment variable merging and immutability
- HTTP request body parsing and validation
- File existence checking with Promise.allSettled
- Project path matching with startsWith logic
