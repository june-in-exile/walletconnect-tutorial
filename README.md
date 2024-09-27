# Event Attendance WalletConnect Demo App

This demo application coincides with a separate tutorial that shows how WalletConnect's Web3Modal can be used with Ceramic to initiatiate authenticated user sessions.

## Tutorial

[WalletConnect Tutorial: Create User Sessions with Web3Modal](https://blog.ceramic.network/walletconnect-tutorial/?ref=defiplot.com)

## Getting Started

Use the below steps to get started locally:

1. Install your dependencies:

Install your dependencies:

```bash
npm install
```

2. Generate your admin seed, admin did, and ComposeDB configuration file:

Next, we will need to generate an admin seed and ComposeDB configuration our application will use. This example repository contains a script found at /scripts/commands/mjs that generates one for you (preset to run "inmemory" which is ideal for testing).

To generate your necessary credentials, run the following in your terminal:

```bash
npm run generate
```

If you explore your composedb.config.json and admin_seed.txt files, you will now see a defined JSON ComposeDB server configuration and Ceramic admin seed, respectively.

3. Create a .env file and copy-paste the contents of the existing .env.example file into it

4. Create a WalletConnect project ID by visiting https://cloud.walletconnect.com/sign-in, create a new project (with a name of your choosing and the `App` type selected), and copy the `Project ID` key once available. You will need to enter this into src/pages/_app.tsx on line 8 to assign to the `projectId` value.


4. Finally, run your application in a new terminal (first ensure you are running node v20 in your terminal):

```bash
nvm use 20
npm run dev
```

5. Visit port 3000 in your browser

## Learn More

To learn more about Ceramic please visit the following links

- [Ceramic Documentation](https://developers.ceramic.network/learn/welcome/) - Learn more about the Ceramic Ecosystem.
- [ComposeDB](https://developers.ceramic.network/docs/composedb/getting-started) - Details on how to use and develop with ComposeDB!
- [AI Chatbot on ComposeDB](https://learnweb3.io/lessons/build-an-ai-chatbot-on-compose-db-and-the-ceramic-network) - Build an AI-powered Chatbot and save message history to ComposeDB
- [ComposeDB API Sandbox](https://developers.ceramic.network/sandbox) - Test GraphQL queries against a live dataset directly from your browser
- [Ceramic Blog](https://blog.ceramic.network/) - Browse technical tutorials and more on our blog
- [Ceramic Discord](https://discord.com/invite/ceramic) - Join the Ceramic Discord
- [Follow Ceramic on Twitter](https://twitter.com/ceramicnetwork) - Follow us on Twitter for latest announcements!
