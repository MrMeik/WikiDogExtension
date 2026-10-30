# Privacy Policy: WikiDog - DogOnline Action Logger

**Last updated:** October 30, 2026

WikiDog - DogOnline Action Logger ("the extension") is an unofficial, community-made browser extension. It records the results of certain actions you take in the browser game DogOnline (fishing, gachapon, mob kills and opening chests) and sends them to a server so that the community can calculate drop-rate statistics for the DogOnline wiki.

This extension is **not affiliated with, endorsed by, or sponsored by DogOnline** or its operators.

## Summary

- The extension collects the **results of in-game actions** (for example, what a fishing cast produced and under what conditions), not information about you.
- The only thing connecting those results to you is an **API key ID** that was issued to you. We have no record of which person holds which key, and no way to look that up.
- We do **not** collect your name, email address, passwords, session tokens, cookies, browsing history, or anything from sites other than DogOnline.
- We do **not** sell your data, use it for advertising, or share it with data brokers.
- The extension's source code is public, so you can check what it does.

## What data is collected

### Gameplay event data

When you perform a tracked action while playing on `dogonline.net`, the extension records details of the result. Depending on the action, this includes:

| Data                             | Examples                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| The action and where it happened | Fishing area, gachapon machine, mob or chest type                                       |
| What you used                    | Bait ID or other item used for the action                                               |
| The result                       | Item or fish received, or that nothing was caught; stat level-up notices                |
| Game conditions at the time      | Weather, time of day (as reported by the game)                                          |
| When it happened                 | A timestamp (UTC) taken from the game server's response                                 |
| Software versions                | The DogOnline site build identifier, the extension version, and the data format version |

The extension is designed to leave out personal details that appear in the game's messages. For example, your dog's name is replaced with a placeholder before anything is kept.

### API key ID

To accept data from the extension, the server requires an API key. Each key has an ID, and that ID is sent with the events you submit so that the server can authenticate requests, limit abuse, and revoke a key if it is misused.

The API key ID is a random identifier. It is not derived from your name, email address, or DogOnline account, and we do not keep any record linking a key to a particular person. For that reason we consider the data collected to be **non-personal**, although we describe the key ID here openly because it is a persistent identifier that groups events submitted from the same installation.

### Data we do not collect

- Your name, email address, or other contact details
- Your DogOnline username, account ID, or login or session information (tokens, cookies, passwords)
- Your dog's name
- Your money, inventory contents, or other account information, beyond what is listed above
- Your browsing history or activity on any website other than `dogonline.net`
- Your location

### Technical connection information

When your browser sends data to the server, the server and its hosting provider (Render) necessarily receive standard connection information such as your IP address, in the same way as any website or web service. We do not store IP addresses with your event records and do not use them to identify you.

## How the extension gets the data

The extension runs only on `https://dogonline.net/*`. While you play, it reads the responses that the game's own server sends to your browser in order to work out the result of an action. It does not play the game for you, click anything, or send actions to the game on your behalf.

## What is stored on your device

The extension uses your browser's extension storage (the `storage` permission) to keep:

- your API key and your settings, and
- records that have been collected but not yet uploaded.

This data stays on your device until it is sent to the server or you remove the extension. Uninstalling the extension deletes it.

## Where the data goes

Collected records are sent over HTTPS to `https://wikidogbackend.onrender.com`, a server operated by the project maintainer and hosted by Render. The server validates the records and stores them for aggregation.

## How we use the data

We use the data only to:

1. calculate statistics such as drop rates under different conditions (location, bait, weather, time of day) and publish them on the DogOnline wiki;
2. compare results across game updates, since odds can change over time;
3. keep the service working and prevent abuse (for example, rate limiting, rejecting invalid data, and revoking misused API keys).

We do not use the data for advertising, profiling, determining creditworthiness or eligibility for loans, or any purpose unrelated to the extension's single purpose of collecting DogOnline statistics for the wiki.

## Sharing

- **Published statistics.** Aggregated statistics derived from many submissions are published on the wiki. These do not identify any person or API key.
- **Service providers.** Our hosting provider (Render) processes data on our behalf as needed to run the server.
- **Legal reasons.** We may disclose information if required by law, although given what we hold, there is nothing that identifies a person.
- We do not sell data or transfer it to third parties for advertising or data-broker purposes.

## Chrome Web Store User Data Policy (Limited Use)

The use of information received by this extension will adhere to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements. Data is used only to provide and improve the extension's single, user-facing purpose described above, is not transferred or sold to third parties except as described in this policy, and is not used for advertising or to determine creditworthiness.

## Retention

We keep event records for as long as they remain useful for calculating statistics. Because comparing results across game versions is the purpose of the project, this may be indefinitely. Records contain no personal information.

## Security

Data is transmitted over HTTPS. API keys are required to submit data, and access to the stored data is limited to the project maintainers. No method of transmission or storage is perfectly secure, but we take reasonable steps to protect the data we hold.

## Your choices

- **Stop sending data:** remove your API key in the extension's options page, disable the extension, or uninstall it.
- **Delete data:** because we cannot tell which key belongs to whom, we can only locate your records if you tell us your API key ID. If you contact us with your API key ID, we will delete the records associated with it.

## Permissions

| Permission                                        | Why it is needed                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Access to `https://dogonline.net/*`               | The extension runs on the game site to read the results of the actions listed above. |
| Access to `https://wikidogbackend.onrender.com/*` | To send collected records to the server.                                             |
| `storage`                                         | To keep your API key, settings, and records waiting to be uploaded.                  |

The extension does not request access to any other websites.

## Children's privacy

The extension is not directed at children, and we do not knowingly collect personal information from anyone, including children.

## Changes to this policy

If this policy changes, the updated version will be published in the project's GitHub repository with a new "Last updated" date. If a change affects what data is collected or how it is used, it will also be noted in the extension's release notes.

## Contact

For questions about this policy, or to request deletion of the records tied to your API key ID, contact:

[issues](https://github.com/MrMeik/WikiDogExtension/issues)
