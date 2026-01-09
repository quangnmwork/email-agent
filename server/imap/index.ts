import { ImapFlow } from "imapflow";

export class ImapManager {
  private static instance: ImapManager;
  private imap: ImapFlow | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  private createImapClient(): ImapFlow {
    const EMAIL = process.env.EMAIL ?? "";
    const PASSWORD = process.env.EMAIL_PASSWORD ?? "";
    const HOST = process.env.IMAP_HOST ?? "";
    const PORT = process.env.IMAP_PORT ?? 993;

    console.log("📧 IMAP Config:", { EMAIL, HOST, PORT });

    const client = new ImapFlow({
      host: HOST,
      port: Number(PORT),
      auth: {
        user: EMAIL,
        pass: PASSWORD,
      },
      secure: true,
      logger: false,
    });

    client.on("close", () => {
      this.isConnected = false;
      this.imap = null;
      console.log("📴 IMAP connection closed");
    });

    client.on("error", (err) => {
      console.error("❌ IMAP error:", err.message);
      this.isConnected = false;
      this.imap = null;
    });

    return client;
  }

  public static getInstance(): ImapManager {
    if (!ImapManager.instance) {
      ImapManager.instance = new ImapManager();
    }
    return ImapManager.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected && this.imap) {
      return;
    }

    // Create new client if needed
    if (!this.imap) {
      this.imap = this.createImapClient();
    }

    try {
      console.log("🔌 Attempting IMAP connection to", process.env.IMAP_HOST);
      await this.imap.connect();
      this.isConnected = true;
      console.log("✅ IMAP connection ready!");
    } catch (err) {
      this.isConnected = false;
      this.imap = null;
      throw err;
    }
  }

  public async listMailboxes(): Promise<void> {
    await this.ensureConnection();

    const mailboxes = await this.imap!.list();
    console.log("📬 Mailboxes:");
    for (const mailbox of mailboxes) {
      console.log(` Mailbox: ${mailbox.path}`);
    }
  }

  public async getMailboxList(): Promise<{ path: string; name: string }[]> {
    await this.ensureConnection();
    const mailboxes = await this.imap!.list();
    return mailboxes.map((m) => ({ path: m.path, name: m.name }));
  }
  public async getMailboxMessages(mailbox: string = "INBOX") {
    await this.ensureConnection();

    let lock = await this.imap!.getMailboxLock(mailbox);
    try {
      // Fetch the most recent message
      let message = await this.imap!.fetchOne("*", {
        envelope: true,
      });

      if (message) {
        console.log("📨 Latest message:", message.envelope?.subject);
        return {
          uid: message.uid,
          subject: message.envelope?.subject,
          from: message.envelope?.from,
          date: message.envelope?.date,
        };
      } else {
        console.log("📭 No messages in mailbox");
        return null;
      }
    } catch (err) {
      console.error("❌ Error fetching messages:", err);
      throw err;
    } finally {
      lock.release();
    }
  }

  public async getRecentMessages(
    mailbox: string = "INBOX",
    limit: number = 10
  ) {
    await this.ensureConnection();

    // Force refresh by getting fresh mailbox status
    const status = await this.imap!.status(mailbox, {
      messages: true,
      uidNext: true,
    });

    let lock = await this.imap!.getMailboxLock(mailbox);
    try {
      const messages: Array<{
        uid: number;
        subject?: string;
        from?: { name?: string; address?: string }[];
        to?: { name?: string; address?: string }[];
        date?: Date;
      }> = [];

      // Use status.messages for accurate count
      const totalMessages = status.messages || 0;
      const startSeq = Math.max(1, totalMessages - limit + 1);

      for await (let message of this.imap!.fetch(`${startSeq}:*`, {
        envelope: true,
      })) {
        messages.push({
          uid: message.uid,
          subject: message.envelope?.subject,
          from: message.envelope?.from,
          to: message.envelope?.to,
          date: message.envelope?.date,
        });
      }

      console.log(
        `📨 Fetched ${messages.length} messages (total: ${totalMessages})`
      );
      return messages.reverse(); // Newest first
    } catch (err) {
      console.error("❌ Error fetching messages:", err);
      throw err;
    } finally {
      lock.release();
    }
  }

  public async getMailboxStatus(mailbox: string = "INBOX"): Promise<void> {
    await this.ensureConnection();

    const status = await this.imap!.status(mailbox, {
      messages: true,
      unseen: true,
      recent: true,
    });

    console.log(`📬 ${mailbox} status:`);
    console.log(`   Total messages: ${status.messages}`);
    console.log(`   Unseen: ${status.unseen}`);
    console.log(`   Recent: ${status.recent}`);
  }

  public async disconnect(): Promise<void> {
    if (this.imap && this.isConnected) {
      await this.imap.logout();
      this.isConnected = false;
      this.imap = null;
      console.log("📴 Disconnected from IMAP");
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected || !this.imap) {
      console.log("🔄 Connecting to IMAP server...");
      await this.connect();
    }
  }
}
