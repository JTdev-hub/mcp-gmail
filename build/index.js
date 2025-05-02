import fs from "fs/promises";
import path from "path";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// If modifying these scopes, delete token.json.
const SCOPES = [
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.readonly",
];
const TOKEN_PATH = path.join(__dirname, "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
/**
 * Reads previously authorized credentials from the saved file.
 */
const server = new McpServer({
    name: "gmail",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH, "utf-8");
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    }
    catch (err) {
        return null;
    }
}
/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH, "utf-8");
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: "authorized_user",
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}
/**
 * Load or request authorization to call APIs.
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    const newClient = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (newClient.credentials) {
        await saveCredentials(newClient);
    }
    return newClient;
}
/**
 * Lists the labels in the user's account.
 */
async function listLabels(auth) {
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.labels.list({ userId: "me" });
    const labels = res.data.labels;
    if (!labels || labels.length === 0) {
        console.log("No labels found.");
        return null;
    }
    return labels;
}
async function messageList(auth, subject) {
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.list({
        userId: "me",
        q: `subject:"${subject}"`,
    });
    const messageList = res.data.messages;
    if (!messageList || messageList.length === 0) {
        console.log("No message found.");
        return null;
    }
    console.log(messageList);
    return messageList;
}
async function getMessage(auth, id) {
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.get({
        userId: "me",
        id: id,
    });
    const message = res.data;
    if (!message) {
        console.log("No message found.");
        return null;
    }
    return message;
}
async function deleteMessage(auth, id) {
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.delete({
        userId: "me",
        id: id,
    });
    const messageStatus = res.status;
    return messageStatus;
}
// Run the script
async function displayMessage() {
    const auth = await authorize();
    const messageLists = await messageList(auth, "1.4x MORE triceps growth");
    const message = messageLists && messageLists.length > 0
        ? await getMessage(auth, messageLists[0].id)
        : "No message";
    console.log(message);
}
async function removeMessage() {
    const auth = await authorize();
    const messageLists = await messageList(auth, "1.4x MORE triceps growth");
    const message = messageLists && messageLists.length > 0
        ? await deleteMessage(auth, messageLists[0].id)
        : "No message to be deleted";
    console.log(message);
}
removeMessage();
// function formatLabels(labels: gmail_v1.Schema$Label): string {
//   return [
//     `ID: ${labels.id || "Unknown"}`,
//     `Name: ${labels.name || "Unknown"}`,
//     `Message List Visibility: ${labels.messageListVisibility || "Unknown"}`,
//     `Label List Visibility: ${labels.labelListVisibility || "Unknown"}`,
//     `Type: ${labels.type || "No headline"}`,
//     "---",
//   ].join("\n");
// }
// server.tool("get-labels", "Get Labels from GMail", async ({}) => {
//   const auth = await authorize();
//   const labels = await listLabels(auth);
//   const jsonLabels = JSON.stringify(labels);
//   if (!jsonLabels) {
//     return {
//       content: [
//         {
//           type: "text",
//           text: "Failed to retrieve labels",
//         },
//       ],
//     };
//   }
//   const formattedLabels = JSON.parse(jsonLabels).map(formatLabels);
//   const labelsText = `Active Labels for :\n\n${formattedLabels.join("\n")}`;
//   return {
//     content: [
//       {
//         type: "text",
//         text: labelsText,
//       },
//     ],
//   };
// });
// async function main() {
//   const transport = new StdioServerTransport();
//   await server.connect(transport);
//   console.error("Credentials Path: ", CREDENTIALS_PATH);
//   console.error("GMail MCP Server running on stdio");
// }
// main().catch((error) => {
//   console.error("Fatal error in main():", error);
//   process.exit(1);
// });
