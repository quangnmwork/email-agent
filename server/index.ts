import { ImapManager } from "./imap";

async function main() {
  const imapManager = ImapManager.getInstance();

  try {
    await imapManager.connect();
    console.log("✅ IMAP connection established\n");

    // List all mailboxes
    await imapManager.listMailboxes();
    console.log("");

    // Get INBOX status
    await imapManager.getMailboxStatus("INBOX");
    console.log("");

    await imapManager.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    await imapManager.disconnect();
    process.exit(1);
  }
}

main();
