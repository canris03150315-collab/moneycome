

// A utility function to compute SHA-256 hash.
// It uses the browser's built-in SubtleCrypto API for security and performance.
export async function sha256(message: string): Promise<string> {
  // Encode the message into a Uint8Array
  const msgBuffer = new TextEncoder().encode(message);
  
  // Hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  
  // Convert the ArrayBuffer to a hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}