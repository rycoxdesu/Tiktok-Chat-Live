// Advanced text sanitizer for handling various Unicode and special characters
function sanitizeText(input) {
  if (typeof input !== 'string') return input;

  // Handle null, undefined, or non-string inputs
  if (!input) return input;

  // Remove or replace problematic control characters while preserving common ones
  let sanitized = input
    // Keep common whitespace characters: space, tab, newline, carriage return
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove most control chars
    // Remove invisible Unicode characters that might interfere with display
    .replace(/[\u2000-\u200F\u2028-\u2029\u202A-\u202E\u2060-\u206F]/g, '')
    // Remove bidirectional control characters
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Replace any remaining non-printable Unicode with '?'
    .replace(/[^\x20-\x7E\u00A0-\uD7FF\uE000-\uFFFD]/g, '?')
    // Clean up multiple consecutive spaces
    .replace(/\s+/g, ' ')
    // Trim leading and trailing whitespace
    .trim();

  return sanitized;
}

// Function to decode common HTML entities
function decodeHtmlEntities(text) {
  if (typeof text !== 'string') return text;

  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#([0-9]+);/g, (match, numStr) => {
      const num = parseInt(numStr, 10);
      return String.fromCharCode(num);
    });
}

// Comprehensive sanitization combining both functions
function advancedSanitizeText(input) {
  if (typeof input !== 'string') return input;

  // First decode HTML entities if present
  let processed = decodeHtmlEntities(input);
  
  // Then sanitize the text
  processed = sanitizeText(processed);
  
  return processed;
}

module.exports = {
  sanitizeText,
  decodeHtmlEntities,
  advancedSanitizeText
};